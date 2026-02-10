-- IDEA-PM Schema Definition

-- Layer 1: On-Chain Truth
CREATE TABLE IF NOT EXISTS blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash TEXT NOT NULL UNIQUE,
    parent_hash TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    is_canonical BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    block_number BIGINT REFERENCES blocks(block_number) ON DELETE CASCADE,
    tx_hash TEXT NOT NULL,
    log_index INT NOT NULL,
    contract_address TEXT NOT NULL,
    event_name TEXT NOT NULL,
    params JSONB NOT NULL,
    decoded JSONB, -- [PHASE 2] Decoded event data
    UNIQUE (tx_hash, log_index)
);

-- Layer 2: Off-Chain Context
CREATE TABLE IF NOT EXISTS markets_metadata (
    condition_id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    outcomes JSONB,
    liquidity NUMERIC, -- [NEW] CLOB Metric
    volume_24h NUMERIC, -- [NEW] CLOB Metric
    clob_token_ids JSONB, -- [NEW] For CLOB cross-ref
    source TEXT NOT NULL, -- e.g. 'gamma-api'
    version TEXT, -- API version or schema version
    fetched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Layer 3: System State
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Initialize pause state
INSERT INTO system_config (key, value) VALUES ('is_paused', 'false') ON CONFLICT (key) DO NOTHING;

-- Keeping legacy markets table for on-chain truth if needed, but primarily using metadata for display
CREATE TABLE IF NOT EXISTS markets (
    condition_id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    market_id TEXT,
    title TEXT,
    description TEXT,
    outcomes JSONB,
    resolution_tx_hash TEXT,
    fetched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Layer 3: Linking & Indexer State
CREATE TABLE IF NOT EXISTS checkpoints (
    indexer_id TEXT PRIMARY KEY,
    last_processed_block BIGINT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Layer 3: Domain Optimized Tables
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    condition_id TEXT, -- Might be null if it's a generic order but usually we have it
    tx_hash TEXT NOT NULL,
    maker TEXT NOT NULL,
    taker TEXT NOT NULL,
    maker_amount NUMERIC NOT NULL,
    taker_amount NUMERIC NOT NULL,
    side TEXT, -- 'buy' or 'sell' (inferred)
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    UNIQUE (tx_hash, maker, taker, maker_amount, taker_amount)
);

CREATE TABLE IF NOT EXISTS positions (
    owner TEXT NOT NULL,
    token_id TEXT NOT NULL, -- The 1155 token ID
    balance NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (owner, token_id)
);

-- Indices for Layer 3 Queries
CREATE INDEX idx_events_params_condition_id ON events ((params->>'conditionId')) WHERE params ? 'conditionId';
CREATE INDEX idx_events_decoded_condition_id ON events ((decoded->>'conditionId')) WHERE decoded ? 'conditionId';
CREATE INDEX idx_events_block_number ON events(block_number);
CREATE INDEX idx_blocks_canonical ON blocks(is_canonical);
CREATE INDEX idx_trades_condition_id ON trades(condition_id);
CREATE INDEX idx_positions_owner ON positions(owner);
