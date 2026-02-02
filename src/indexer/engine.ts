import { rpcClient } from '../rpc/client';
import { query } from '../db';
import { decodeEventLog, parseAbi } from 'viem';

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
            const batchSize = BigInt(10);
            const target = current + batchSize - BigInt(1) > end ? end : current + batchSize - BigInt(1);
            console.error(`[INDEXER] Batch: ${current} -> ${target}`);

            const logs = await rpcClient.getLogs({
                fromBlock: current as any,
                toBlock: target as any,
                address: ALLOWLIST_ADDRESSES as `0x${string}`[]
            });

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

                // Pivot logic
                let shouldPivot = ALLOWLIST_ADDRESSES.filter(a => a !== '0x2791bca1f2de4661ed88a30c99a7a9449aa84174').map(a => a.toLowerCase()).includes(addr);
                if (!shouldPivot && addr === '0x2791bca1f2de4661ed88a30c99a7a9449aa84174') {
                    const topics = log.topics.map((t: string) => t.toLowerCase());
                    shouldPivot = topics.some(t => PIVOT_TARGETS_PADDED.includes(t));
                }

                if (!shouldPivot || processedTxs.has(log.transactionHash!)) continue;
                processedTxs.add(log.transactionHash!);

                try {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    const receipt = await rpcClient.getTransactionReceipt({ hash: log.transactionHash! });
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
        console.error('Starting indexer [v2.2.3]...');
        while (true) {
            try {
                let lastProcessed = await this.getCheckpoint();
                if (lastProcessed < BigInt(67363000)) {
                    console.error('[INDEXER] Jumping to 67,363,000');
                    lastProcessed = BigInt(67363000);
                    await this.updateCheckpoint(lastProcessed);
                }
                const latestBlock = await rpcClient.getBlockNumber();
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
