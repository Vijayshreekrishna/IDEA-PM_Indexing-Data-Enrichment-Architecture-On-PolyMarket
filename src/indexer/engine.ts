import { rpcClient } from '../rpc/client';
import { query } from '../db';
import { decodeEventLog, parseAbi } from 'viem';
import { broadcastEvent, broadcastTrade } from '../api/websocket';

const ABIS = parseAbi([
    'event ConditionPreparation(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256 outcomeSlotCount)',
    'event PositionSplit(address indexed stakeholder, address indexed collateralToken, bytes32 indexed parentCollectionId, bytes32 conditionId, uint256[] partition, uint256 amount)',
    'event PositionMerge(address indexed stakeholder, address indexed collateralToken, bytes32 indexed parentCollectionId, bytes32 conditionId, uint256[] partition, uint256 amount)',
    'event PayoutRedemption(address indexed redeemer, address indexed collateralToken, bytes32 indexed parentCollectionId, bytes32 conditionId, uint256[] indexSets, uint256 payout)',
    'event OrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAmount, uint256 takerAmount, uint256 remainingAmount)',
    'event LimitOrderFilled(bytes32 indexed orderHash, address indexed maker, address indexed taker, uint256 makerAmount, uint256 takerAmount, uint256 remainingAmount)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
    'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
    'event ApprovalForAll(address indexed account, address indexed operator, bool approved)'
]);

const ALLOWLIST_ADDRESSES = [
    '0x4d97060515631227163836371db1068641981e31', // CTF 1
    '0x4d97dcd97ec945f40cf65f87097ace5ea0476045', // CTF 2 (Active)
    '0x4bfb9b0a3648011f49f05f21e534346e13605634', // Exchange 1
    '0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e', // Exchange 2 (Active)
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'  // USDC (Collateral)
];

const PIVOT_TARGETS_PADDED = ALLOWLIST_ADDRESSES
    .filter(a => a.toLowerCase() !== '0x2791bca1f2de4661ed88a30c99a7a9449aa84174')
    .map(a => '0x000000000000000000000000' + a.toLowerCase().replace('0x', ''));

const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 5000;
const CONFIRMATIONS = Number(process.env.BLOCK_CONFIRMATIONS) || 12;
const MAX_BLOCK_STEP = BigInt(500);

async function withRetry<T>(fn: () => Promise<T>, name: string, maxRetries = 8): Promise<T> {
    let delay = 2000; // Start with 2 seconds
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            const errorMsg = error.message || '';
            const isRateLimit = errorMsg.includes('Too many requests') ||
                errorMsg.includes('429') ||
                errorMsg.includes('rate limit') ||
                error.code === -32005 ||
                error.code === -32090; // Common rate limit codes

            if (isRateLimit && i < maxRetries - 1) {
                // Extract suggested retry time from error message if available
                const retryMatch = errorMsg.match(/retry in (\d+)s/);
                const suggestedDelay = retryMatch ? parseInt(retryMatch[1]) * 1000 : delay;
                const actualDelay = Math.max(delay, suggestedDelay);

                console.error(`[RETRY] ${name} hit rate limit. Waiting ${actualDelay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, actualDelay));
                delay = Math.min(delay * 2, 60000); // Cap at 60 seconds
                continue;
            }

            // For non-rate-limit errors, throw immediately
            if (!isRateLimit) {
                throw error;
            }

            throw error;
        }
    }
    throw new Error(`Max retries reached for ${name}`);
}

function tryDecodeLog(log: any) {
    try {
        const decoded = decodeEventLog({
            abi: ABIS,
            data: log.data,
            topics: log.topics,
        });
        return {
            eventName: decoded.eventName,
            args: decoded.args,
        };
    } catch (e) {
        return null; // Not in our ABI
    }
}

async function handleDomainEvents(decoded: any, log: any) {
    const { eventName, args } = decoded;
    const txHash = log.transactionHash;
    const blockNumber = log.blockNumber;
    const timestamp = new Date();

    if (eventName === 'OrderFilled' || eventName === 'LimitOrderFilled') {
        const conditionId = (args as any).conditionId || null;
        await query(`
            INSERT INTO trades (condition_id, tx_hash, maker, taker, maker_amount, taker_amount, side, block_number, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (tx_hash, maker, taker, maker_amount, taker_amount) DO NOTHING
        `, [
            conditionId,
            txHash,
            args.maker,
            args.taker,
            args.makerAmount.toString(),
            args.takerAmount.toString(),
            'buy',
            blockNumber.toString(),
            timestamp
        ]);

        broadcastTrade({
            condition_id: conditionId,
            tx_hash: txHash,
            maker: args.maker,
            taker: args.taker,
            maker_amount: args.makerAmount.toString(),
            taker_amount: args.takerAmount.toString(),
            block_number: blockNumber.toString()
        });

        console.error(`[DOMAIN] Trade broadcasted: ${txHash.slice(0, 10)}...`);
    }

    if (eventName === 'TransferSingle' || eventName === 'TransferBatch') {
        const { from, to, id, value, ids, values } = args;

        // Internal logic to update positions...
        // [Existing position update logic]

        if (eventName === 'TransferSingle') {
            const valStr = value.toString();
            const idStr = id.toString();
            if (from !== '0x0000000000000000000000000000000000000000') {
                await query(`INSERT INTO positions (owner, token_id, balance) VALUES ($1, $2, -($3::numeric)) ON CONFLICT (owner, token_id) DO UPDATE SET balance = positions.balance - $3::numeric, updated_at = CURRENT_TIMESTAMP`, [from, idStr, valStr]);
            }
            if (to !== '0x0000000000000000000000000000000000000000') {
                await query(`INSERT INTO positions (owner, token_id, balance) VALUES ($1, $2, $3::numeric) ON CONFLICT (owner, token_id) DO UPDATE SET balance = positions.balance + $3::numeric, updated_at = CURRENT_TIMESTAMP`, [to, idStr, valStr]);
            }
        }

        console.error(`[DOMAIN] Position event broadcasted`);
    }

    // Broadcast ALL decoded events to the live feed
    broadcastEvent({
        block_number: blockNumber.toString(),
        tx_hash: txHash,
        event_name: eventName,
        decoded: decoded,
        timestamp: timestamp
    });
}

export const indexer = {
    async getCheckpoint(): Promise<bigint> {
        const res = await query('SELECT last_processed_block FROM checkpoints WHERE indexer_id = $1', ['main']);
        if (res.rows.length === 0) return BigInt(0);
        return BigInt(res.rows[0].last_processed_block);
    },

    async updateCheckpoint(blockNumber: bigint) {
        await query(
            'INSERT INTO checkpoints (indexer_id, last_processed_block) VALUES ($1, $2) ON CONFLICT (indexer_id) DO UPDATE SET last_processed_block = $2, updated_at = CURRENT_TIMESTAMP',
            ['main', blockNumber]
        );
    },

    async processBlockRange(fromBlock: bigint, toBlock: bigint) {
        let current = fromBlock;
        const end = toBlock;
        console.error(`[INDEXER] Range: ${current} -> ${end}`);

        while (current <= end) {
            // [PAUSE CHECK] Check if admin paused mid-range
            const configRes = await query('SELECT value FROM system_config WHERE key = $1', ['is_paused']);
            const rawValue = configRes.rows.length > 0 ? configRes.rows[0].value : null;
            if (rawValue === true || rawValue === 'true' || rawValue === 1) {
                console.error(`[INDEXER] Range Processing HALTED - Admin Paused mid-batch.`);
                return; // Exit immediate range processing
            }

            const batchSize = BigInt(10);
            const target = current + batchSize - BigInt(1) > end ? end : current + batchSize - BigInt(1);
            console.error(`[INDEXER] Batch: ${current} -> ${target}`);

            const logs = await withRetry(
                () => rpcClient.getLogs({
                    fromBlock: current as any,
                    toBlock: target as any,
                    address: ALLOWLIST_ADDRESSES as `0x${string}`[]
                }),
                'getLogs'
            );

            console.error(`[INDEXER] Found ${logs.length} logs in batch.`);
            const processedTxs = new Set<string>();

            for (const log of logs) {
                // Ensure block exists
                await query(
                    'INSERT INTO blocks (block_number, block_hash, parent_hash, timestamp, is_canonical) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (block_number) DO NOTHING',
                    [log.blockNumber!.toString(), log.blockHash!, '0x0000', new Date(), true]
                );

                const addr = log.address.toLowerCase();
                const decoded = tryDecodeLog(log);
                const decodedJson = decoded ? JSON.stringify(decoded, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                ) : null;
                const logParams = JSON.stringify(log, (key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                );

                // Save direct log
                await query(
                    'INSERT INTO events (block_number, tx_hash, log_index, contract_address, event_name, params, decoded) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tx_hash, log_index) DO UPDATE SET decoded = $7',
                    [log.blockNumber!.toString(), log.transactionHash!, log.logIndex!.toString(), log.address, decoded?.eventName || 'Unknown', logParams, decodedJson]
                );

                if (decoded) {
                    await handleDomainEvents(decoded, log);
                }

                // Pivot logic
                let shouldPivot = ALLOWLIST_ADDRESSES.filter(a => a !== '0x2791bca1f2de4661ed88a30c99a7a9449aa84174').map(a => a.toLowerCase()).includes(addr);
                if (!shouldPivot && addr === '0x2791bca1f2de4661ed88a30c99a7a9449aa84174') {
                    const topics = log.topics.map((t: string) => t.toLowerCase());
                    shouldPivot = topics.some(t => PIVOT_TARGETS_PADDED.includes(t));
                }

                if (!shouldPivot || processedTxs.has(log.transactionHash!)) continue;
                processedTxs.add(log.transactionHash!);

                try {
                    // Adaptive delay for high-activity bursts
                    await new Promise(resolve => setTimeout(resolve, 200));

                    const receipt = await withRetry(
                        () => rpcClient.getTransactionReceipt({ hash: log.transactionHash! }),
                        `getTransactionReceipt(${log.transactionHash})`
                    );

                    console.error(`[INDEXER] PIVOTing tx ${log.transactionHash}: Found ${receipt.logs.length} logs`);

                    for (const innerLog of receipt.logs) {
                        const innerDecoded = tryDecodeLog(innerLog);
                        const innerLogParams = JSON.stringify(innerLog, (key, value) =>
                            typeof value === 'bigint' ? value.toString() : value
                        );
                        const innerDecodedJson = innerDecoded ? JSON.stringify(innerDecoded, (key, value) =>
                            typeof value === 'bigint' ? value.toString() : value
                        ) : null;

                        await query(
                            'INSERT INTO events (block_number, tx_hash, log_index, contract_address, event_name, params, decoded) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (tx_hash, log_index) DO UPDATE SET decoded = $7',
                            [innerLog.blockNumber!.toString(), innerLog.transactionHash!, innerLog.logIndex!.toString(), innerLog.address, innerDecoded?.eventName || 'Unknown', innerLogParams, innerDecodedJson]
                        );

                        if (innerDecoded) {
                            await handleDomainEvents(innerDecoded, innerLog);
                        }
                        // If it's a ConditionPreparation, we definitely want the title soon
                        if (innerDecoded?.eventName === 'ConditionPreparation') {
                            const args = innerDecoded.args as any;
                            console.error(`[INDEXER] Captured NEW Market: ${args.conditionId}`);
                        }
                    }
                } catch (e) {
                    console.error(`[INDEXER] Pivot failed for ${log.transactionHash}:`, e);
                }
            }

            current = target + BigInt(1);
            await this.updateCheckpoint(target);
        }
    },

    async start() {
        console.error('Starting indexer [v2.2.6]...');
        while (true) {
            try {
                // [ROBUST CHECK] Check if paused
                const configRes = await query('SELECT value FROM system_config WHERE key = $1', ['is_paused']);
                const rawValue = configRes.rows.length > 0 ? configRes.rows[0].value : null;
                const isPaused = rawValue === true || rawValue === 'true';

                if (isPaused) {
                    console.error(`[INDEXER] Indexing is PAUSED (Value: ${JSON.stringify(rawValue)}). Waiting...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }

                let lastProcessed = await this.getCheckpoint();
                if (lastProcessed < BigInt(67363000)) {
                    console.error('[INDEXER] Jumping to 67,363,000');
                    lastProcessed = BigInt(67363000);
                    await this.updateCheckpoint(lastProcessed);
                }

                const latestBlock = await withRetry(
                    () => rpcClient.getBlockNumber(),
                    'getBlockNumber'
                );

                const targetBlock = latestBlock - BigInt(CONFIRMATIONS);
                if (targetBlock > lastProcessed) {
                    const nextToProcess = targetBlock > lastProcessed + MAX_BLOCK_STEP ? lastProcessed + MAX_BLOCK_STEP : targetBlock;
                    await this.processBlockRange(lastProcessed + BigInt(1), nextToProcess);
                }
            } catch (error) {
                console.error('Indexer error:', error);
            }
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
    }
};
