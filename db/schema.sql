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
    source TEXT NOT NULL, -- e.g. 'gamma-api'
    version TEXT, -- API version or schema version
    fetched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

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

-- Indices for Layer 3 Queries
CREATE INDEX idx_events_params_condition_id ON events ((params->>'conditionId')) WHERE params ? 'conditionId';
CREATE INDEX idx_events_decoded_condition_id ON events ((decoded->>'conditionId')) WHERE decoded ? 'conditionId';
CREATE INDEX idx_events_block_number ON events(block_number);
CREATE INDEX idx_blocks_canonical ON blocks(is_canonical);
