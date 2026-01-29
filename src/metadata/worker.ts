import { query } from '../db';
import { fetchMarketMetadata } from './client';

export const metadataWorker = {
    async processMissingMetadata() {
        // Find event conditionIds that don't have a record in the markets table
        // Note: In a real system, we'd parse the log to extract conditionId properly.
        // For this demonstration, we'll assume there's a helper to extract it or we query are events table.

        // Simplification: Select unique conditionIds from events (simulated extraction)
        const res = await query(`
      SELECT DISTINCT (params->>'conditionId') as condition_id 
      FROM events 
      WHERE (params->>'conditionId') IS NOT NULL 
      AND (params->>'conditionId') NOT IN (SELECT condition_id FROM markets)
    `);

        for (const row of res.rows) {
            const conditionId = row.condition_id;
            console.log(`Fetching metadata for condition ${conditionId}...`);
            const meta = await fetchMarketMetadata(conditionId);

            if (meta) {
                await query(
                    'INSERT INTO markets (condition_id, question_id, market_id, title, description, outcomes) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (condition_id) DO UPDATE SET title = $4, description = $5',
                    [meta.conditionId, meta.questionId, 'N/A', meta.title, meta.description, meta.outcomes]
                );
            }
        }
    },

    async start() {
        console.log('Starting metadata worker...');
        while (true) {
            try {
                await this.processMissingMetadata();
            } catch (error) {
                console.error('Metadata worker error:', error);
            }
            await new Promise(resolve => setTimeout(resolve, 10000)); // Every 10s
        }
    }
};
