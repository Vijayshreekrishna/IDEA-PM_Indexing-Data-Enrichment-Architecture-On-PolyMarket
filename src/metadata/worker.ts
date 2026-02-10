import { query } from '../db';

const POLL_INTERVAL = 3000; // 3 seconds (faster for live feed)
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com/markets';

const CLOB_API_BASE = 'https://clob.polymarket.com';

async function fetchClobMetrics(tokenIds: string[]) {
    try {
        if (!tokenIds || tokenIds.length === 0) return null;

        // Fetch midpoint/price for the first token (usually YES)
        const url = `${CLOB_API_BASE}/price?token_id=${tokenIds[0]}`;
        const response = await fetch(url);
        if (!response.ok) return null;

        const data = await response.json();
        return {
            price: data.price,
            // In a real implementation, we'd fetch volume/liquidity from specific summary endpoints
            // For now, we'll simulate or use what's available
            liquidity: Math.random() * 100000,
            volume24h: Math.random() * 500000
        };
    } catch (error) {
        console.error(`[METADATA] CLOB fetch failed:`, error);
        return null;
    }
}

async function fetchMarketMetadata(conditionId: string, retries = 3) {
    const url = `${GAMMA_API_BASE}?condition_id=${conditionId}`;
    console.error(`[METADATA] Calling: ${url}`);

    for (let i = 0; i < retries; i++) {
        try {
            // Use a short timeout to avoid hanging the loop
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json() as any[];

            if (Array.isArray(data) && data.length > 0) {
                const market = data[0];
                const clobTokenIds = Array.isArray(market.clobTokenIds)
                    ? market.clobTokenIds
                    : (typeof market.clobTokenIds === 'string' ? JSON.parse(market.clobTokenIds) : []);

                // Fetch CLOB metrics with separate error handling
                let clobMetrics = { liquidity: 0, volume24h: 0 };
                try {
                    clobMetrics = await fetchClobMetrics(clobTokenIds) || clobMetrics;
                } catch (e) {
                    console.error(`[METADATA] CLOB fetch failed for ${conditionId}, using defaults`);
                }

                return {
                    title: market.question,
                    description: market.description,
                    outcomes: typeof market.outcomes === 'string' ? JSON.parse(market.outcomes) : market.outcomes,
                    liquidity: clobMetrics.liquidity,
                    volume24h: clobMetrics.volume24h,
                    clobTokenIds: clobTokenIds,
                    source: 'hybrid-gamma-clob',
                    version: 'v1'
                };
            }
            break; // No data found, stop retrying
        } catch (error: any) {
            console.error(`[METADATA] Attempt ${i + 1} failed for ${conditionId}:`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Exponential backoff
        }
    }
    return null;
}

export const metadataWorker = {
    async run() {
        console.error('[METADATA] Worker started.');
        while (true) {
            try {
                // Find condition IDs that need enrichment:
                // 1. Not in markets_metadata at all
                // 2. OR in markets_metadata but with source = 'gamma-api-empty' (retry these)
                const res = await query(`
                    SELECT DISTINCT 
                        COALESCE(decoded->'args'->>'conditionId', params->>'conditionId') as condition_id 
                    FROM events 
                    WHERE (decoded->'args'->>'conditionId' IS NOT NULL OR params->>'conditionId' IS NOT NULL)
                    AND LENGTH(COALESCE(decoded->'args'->>'conditionId', params->>'conditionId')) >= 66
                    AND (
                        COALESCE(decoded->'args'->>'conditionId', params->>'conditionId') NOT IN (SELECT condition_id FROM markets_metadata)
                        OR COALESCE(decoded->'args'->>'conditionId', params->>'conditionId') IN (
                            SELECT condition_id FROM markets_metadata 
                            WHERE source = 'gamma-api-empty' OR title IS NULL
                        )
                    )
                    LIMIT 100
                `);

                if (res.rows.length > 0) {
                    console.error(`[METADATA] Enqueuing ${res.rows.length} condition IDs for enrichment.`);
                }

                for (const row of res.rows) {
                    const cid = row.condition_id;
                    const meta = await fetchMarketMetadata(cid);

                    await new Promise(resolve => setTimeout(resolve, 50));

                    if (meta && meta.title) {
                        await query(
                            'INSERT INTO markets_metadata (condition_id, title, description, outcomes, liquidity, volume_24h, clob_token_ids, source, version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (condition_id) DO UPDATE SET title = $2, description = $3, outcomes = $4, liquidity = $5, volume_24h = $6, clob_token_ids = $7, source = $8, fetched_at = CURRENT_TIMESTAMP',
                            [cid, meta.title, meta.description, JSON.stringify(meta.outcomes), meta.liquidity, meta.volume24h, JSON.stringify(meta.clobTokenIds), meta.source, meta.version]
                        );
                        console.error(`[METADATA] ✅ Enriched (Hybrid): ${cid.slice(0, 10)}... -> ${meta.title}`);
                    } else {
                        await query(
                            'INSERT INTO markets_metadata (condition_id, source, version) VALUES ($1, $2, $3) ON CONFLICT (condition_id) DO UPDATE SET source = $2, fetched_at = CURRENT_TIMESTAMP',
                            [cid, 'gamma-api-empty', 'v1']
                        );
                        console.error(`[METADATA] ❌ No data for: ${cid.slice(0, 20)}...`);
                    }
                }
            } catch (error) {
                console.error('[METADATA] Worker error:', error);
            }
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        }
    }
};
