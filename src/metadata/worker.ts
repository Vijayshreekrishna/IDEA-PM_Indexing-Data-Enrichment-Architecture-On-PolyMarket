import { query } from '../db';

const POLL_INTERVAL = 10000; // 10 seconds
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com/markets';

async function fetchMarketMetadata(conditionId: string) {
    try {
        const url = `${GAMMA_API_BASE}?condition_id=${conditionId}`;
        console.error(`[METADATA] Calling: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            const market = data[0];
            return {
                title: market.question,
                description: market.description,
                outcomes: typeof market.outcomes === 'string' ? JSON.parse(market.outcomes) : market.outcomes,
                source: 'gamma-api',
                version: 'v1'
            };
        }
        return null;
    } catch (error) {
        console.error(`[METADATA] Failed to fetch ${conditionId}:`, error);
        return null;
    }
}

export const metadataWorker = {
    async run() {
        console.error('[METADATA] Worker started.');
        while (true) {
            try {
                // Find ONLY semantic condition IDs from decoded events
                const res = await query(`
                    SELECT DISTINCT 
                        decoded->'args'->>'conditionId' as condition_id 
                    FROM events 
                    WHERE decoded->'args'->>'conditionId' IS NOT NULL
                    AND decoded->'args'->>'conditionId' NOT IN (SELECT condition_id FROM markets_metadata)
                    LIMIT 20
                `);

                if (res.rows.length > 0) {
                    console.error(`[METADATA] Processing ${res.rows.length} new condition IDs.`);
                }

                for (const row of res.rows) {
                    const cid = row.condition_id;
                    const meta = await fetchMarketMetadata(cid);

                    await new Promise(resolve => setTimeout(resolve, 200));
                    if (meta) {
                        await query(
                            'INSERT INTO markets_metadata (condition_id, title, description, outcomes, source, version) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (condition_id) DO UPDATE SET title = $2, description = $3, outcomes = $4, fetched_at = CURRENT_TIMESTAMP',
                            [cid, meta.title, meta.description, meta.outcomes, meta.source, meta.version]
                        );
                        console.error(`[METADATA] Enriched: ${cid.slice(0, 10)}... -> ${meta.title}`);
                    } else {
                        await query(
                            'INSERT INTO markets_metadata (condition_id, source, version) VALUES ($1, $2, $3) ON CONFLICT (condition_id) DO NOTHING',
                            [cid, 'gamma-api-empty', 'v1']
                        );
                    }
                }
            } catch (error) {
                console.error('[METADATA] Worker error:', error);
            }
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
    }
};
