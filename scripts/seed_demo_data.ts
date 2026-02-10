import { query } from '../src/db';

const DEMO_METADATA = [
    {
        condition_id: '0xd1e760f57415093db2e011f70015e1617be05d3441e64b896155cb783ba97b920fec2f2100c1aef',
        title: 'Will SpaceX launch Starship in February?',
        description: 'This market will resolve to "Yes" if SpaceX successfully launches Starship during the month of February 2026. Otherwise, this market will resolve to "No".',
        outcomes: ['Yes', 'No']
    },
    {
        condition_id: '0x000000000000000000003a3bd7bb9528e159577f7c2e685cc81a7650002e2',
        title: 'Will Bitcoin reach $150k in Q1?',
        description: 'Market resolves to Yes if BTC/USD hits 150,000 before April 1st.',
        outcomes: ['Yes', 'No']
    }
];

async function seed() {
    console.log('Seeding demo metadata...');
    for (const meta of DEMO_METADATA) {
        await query(
            'INSERT INTO markets_metadata (condition_id, title, description, outcomes, source, version) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (condition_id) DO UPDATE SET title = $2, description = $3, outcomes = $4, fetched_at = CURRENT_TIMESTAMP',
            [meta.condition_id, meta.title, meta.description, JSON.stringify(meta.outcomes), 'manual-seed', 'v1']
        );
        console.log(`✅ Seeded: ${meta.title}`);
    }
    process.exit(0);
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
