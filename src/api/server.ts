import express from 'express';
import { query } from '../db';

const app = express();
const port = process.env.PORT || 3000;

// Raw & Decoded Events Endpoint
app.get('/events', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                e.block_number, 
                e.tx_hash, 
                e.log_index, 
                e.contract_address, 
                e.event_name, 
                e.params, 
                e.decoded,
                m.title as market_title
            FROM events e
            LEFT JOIN markets_metadata m ON COALESCE(e.decoded->'args'->>'conditionId', e.params->>'conditionId') = m.condition_id
            ORDER BY e.block_number DESC, e.log_index DESC 
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
        // Joining Layer 1 (events), Layer 2 (markets), and Linker logic
        const result = await query(`
      SELECT 
        m.title, 
        m.description, 
        e.tx_hash, 
        e.block_number, 
        e.params,
        b.timestamp as blockchain_time
      FROM markets m
      JOIN events e ON m.condition_id = (e.params->>'conditionId')
      JOIN blocks b ON e.block_number = b.block_number
      WHERE m.condition_id = $1
    `, [conditionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Market data not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`IDEA-PM API listening at http://localhost:${port}`);
});
