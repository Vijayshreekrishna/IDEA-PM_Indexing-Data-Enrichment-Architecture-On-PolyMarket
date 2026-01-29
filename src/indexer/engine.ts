import { rpcClient } from '../rpc/client';
import { query } from '../db';
import { parseAbiItem, Log } from 'viem';

const CTF_ADDRESS = '0x4D97060515631227163836371dB1068641981E31'; // Example CTF address
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL) || 5000;
const CONFIRMATIONS = Number(process.env.BLOCK_CONFIRMATIONS) || 12;

export const indexer = {
    async getCheckpoint() {
        const res = await query('SELECT last_processed_block FROM checkpoints WHERE indexer_id = $1', ['main']);
        return res.rows[0]?.last_processed_block || BigInt(0); // Start from 0 or a configured block
    },

    async updateCheckpoint(blockNumber: bigint) {
        await query(
            'INSERT INTO checkpoints (indexer_id, last_processed_block) VALUES ($1, $2) ON CONFLICT (indexer_id) DO UPDATE SET last_processed_block = $2, updated_at = CURRENT_TIMESTAMP',
            ['main', blockNumber]
        );
    },

    async processBlockRange(fromBlock: bigint, toBlock: bigint) {
        console.log(`Processing blocks from ${fromBlock} to ${toBlock}...`);

        for (let current = fromBlock; current <= toBlock; current++) {
            // 1. Fetch block data
            const block = await rpcClient.getBlock({ blockNumber: current });

            // 2. Persist block
            await query(
                'INSERT INTO blocks (block_number, block_hash, parent_hash, timestamp) VALUES ($1, $2, $3, $4) ON CONFLICT (block_number) DO NOTHING',
                [block.number, block.hash, block.parentHash, new Date(Number(block.timestamp) * 1000)]
            );

            // 3. Fetch logs for this block (specific to our allowlist)
            const logs = await rpcClient.getLogs({
                fromBlock: current,
                toBlock: current,
                address: CTF_ADDRESS as `0x${string}`
            });

            for (const log of logs) {
                await query(
                    'INSERT INTO events (block_number, tx_hash, log_index, contract_address, event_name, params) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (tx_hash, log_index) DO NOTHING',
                    [log.blockNumber, log.transactionHash, log.logIndex, log.address, 'Unknown', JSON.stringify(log)]
                );
            }

            await this.updateCheckpoint(current);
        }
    },

    async start() {
        console.log('Starting indexer...');
        while (true) {
            try {
                const lastProcessed = await this.getCheckpoint();
                const latestBlock = await rpcClient.getBlockNumber();
                const targetBlock = latestBlock - BigInt(CONFIRMATIONS);

                if (targetBlock > lastProcessed) {
                    await this.processBlockRange(lastProcessed + BigInt(1), targetBlock);
                }
            } catch (error) {
                console.error('Indexer error:', error);
            }
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
    }
};
