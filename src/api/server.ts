import express from 'express';
import { createServer } from 'http';
import { query } from '../db';
import { initWebSocket } from './websocket';

const app = express();
app.use(express.json()); // [NEW] Enable JSON body parsing

// [NEW] BigInt Serialization Fix for REST API
const jsonReplacer = (key: string, value: any) =>
    typeof value === 'bigint' ? value.toString() : value;
app.set('json replacer', jsonReplacer);
app.set('json spaces', 2);

const port = process.env.PORT || 3000;

// [NEW] Admin Config Endpoints
app.get('/admin/config', async (req, res) => {
    try {
        const result = await query('SELECT key, value FROM system_config');
        const config: Record<string, any> = {};
        result.rows.forEach(r => config[r.key] = r.value);
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch config' });
    }
});

app.post('/admin/config', async (req, res) => {
    try {
        const { key, value } = req.body;
        await query(
            'INSERT INTO system_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
            [key, JSON.stringify(value)]
        );
        res.json({ success: true, key, value });
    } catch (error) {
        console.error('Admin Error:', error);
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// Update /events to include additional metrics
app.get('/markets/enriched', async (req, res) => {
    try {
        const result = await query(`
            SELECT condition_id, title, description, outcomes, liquidity, volume_24h, fetched_at
            FROM markets_metadata
            WHERE title IS NOT NULL
            ORDER BY fetched_at DESC
            LIMIT 20
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch enriched markets' });
    }
});

// Raw & Decoded Events Endpoint
app.get('/events', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                e.block_number, 
                e.tx_hash, 
                e.event_name, 
                e.decoded,
                m.title as market_title,
                m.description as market_description
            FROM events e
            LEFT JOIN markets_metadata m ON (
                (e.decoded->'args'->>'conditionId') = m.condition_id
                OR (e.params->>'conditionId') = m.condition_id
                OR (e.decoded->'args'->>'id')::text = ANY(SELECT jsonb_array_elements_text(m.clob_token_ids))
            )
            WHERE e.event_name != 'Unknown'
            ORDER BY e.block_number DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/market/:conditionId', async (req, res) => {
    const { conditionId } = req.params;

    try {
        const result = await query(`
      SELECT 
        m.title, 
        m.description, 
        e.tx_hash, 
        e.block_number, 
        b.timestamp as blockchain_time
      FROM markets_metadata m
      LEFT JOIN events e ON m.condition_id = (e.decoded->'args'->>'conditionId')
      LEFT JOIN blocks b ON e.block_number = b.block_number
      WHERE m.condition_id = $1
      LIMIT 1
    `, [conditionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Market data not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/trades', async (req, res) => {
    try {
        const result = await query(`
            SELECT t.*, m.title as market_title
            FROM trades t
            LEFT JOIN markets_metadata m ON t.condition_id = m.condition_id
            ORDER BY t.block_number DESC
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/positions/:address', async (req, res) => {
    const { address } = req.params;
    try {
        const result = await query(`
            SELECT p.*
            FROM positions p
            WHERE p.owner ILIKE $1 AND p.balance != 0
            ORDER BY p.updated_at DESC
        `, [address]);
        res.json(result.rows);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/stats', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                (SELECT count(*)::int FROM events) as total_events,
                (SELECT count(*)::int FROM trades) as total_trades,
                (SELECT count(*)::int FROM markets_metadata WHERE title IS NOT NULL) as unique_markets,
                (SELECT count(*)::int FROM markets_metadata WHERE liquidity > 0) as liquid_markets,
                (SELECT last_processed_block FROM checkpoints WHERE indexer_id = 'main') as last_block
        `);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create HTTP server and initialize WebSocket
const server = createServer(app);
initWebSocket(server);

server.listen(port, () => {
    console.log(`IDEA-PM API listening at http://localhost:${port}`);
    console.log(`WebSocket available at ws://localhost:${port}/ws`);
});
