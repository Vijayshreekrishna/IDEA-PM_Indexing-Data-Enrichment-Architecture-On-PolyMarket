# 07_DATABASE.md

## Overview
IDEA-PM uses a PostgreSQL database to maintain a "truth engine" for Polymarket data. The schema is organized into three distinct layers to ensure traceability, enrichment, and performance.

---

## 🏗️ Architecture Layers

### Layer 1: On-Chain Truth
Provides raw, immutable data fetched directly from the RPC provider.
- `blocks`: Header information (timestamp, hashes).
- `events`: Raw event logs and initial JSON parameter extraction.

### Layer 2: Off-Chain Context
Enriches on-chain facts with human-readable information from external APIs.
- `markets_metadata`: Titles, descriptions, and outcomes linked via `condition_id`.

### Layer 3: Domain Optimized Tables
Derived data structures built dynamically from Layer 1 and 2 for fast UI querying.
- `trades`: Reconstructed trade history with sides (Buy/Sell) and amounts.
- `positions`: Real-time user balances for ERC-1155 tokens.
- `checkpoints`: Indexer synchronization state.
- `system_config`: Control flags (e.g., `is_paused`).

---

## 📄 SQL Schema definition

```sql
-- Core Blockchain Tables
CREATE TABLE blocks (
    block_number BIGINT PRIMARY KEY,
    block_hash TEXT NOT NULL UNIQUE,
    timestamp TIMESTAMPTZ NOT NULL,
    is_canonical BOOLEAN DEFAULT TRUE
);

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    block_number BIGINT REFERENCES blocks(block_number),
    tx_hash TEXT NOT NULL,
    event_name TEXT NOT NULL,
    params JSONB NOT NULL,
    decoded JSONB,
    UNIQUE (tx_hash, log_index)
);

-- Metadata & Enrichment
CREATE TABLE markets_metadata (
    condition_id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    outcomes JSONB,
    liquidity NUMERIC,
    volume_24h NUMERIC,
    clob_token_ids JSONB,
    fetched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Derived Domain Logic
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    condition_id TEXT,
    tx_hash TEXT NOT NULL,
    maker TEXT NOT NULL,
    taker TEXT NOT NULL,
    maker_amount NUMERIC NOT NULL,
    taker_amount NUMERIC NOT NULL,
    side TEXT,
    timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE positions (
    owner TEXT NOT NULL,
    token_id TEXT NOT NULL,
    balance NUMERIC NOT NULL DEFAULT 0,
    PRIMARY KEY (owner, token_id)
);
```

## 🗝️ Database Invariants
- **Traceability**: Every trade must be linkable to an `events.tx_hash`.
- **Integrity**: `block_number` is the primary key for synchronization.
- **Atomic Operations**: Indexer checkpoints are updated only after a block's events are fully processed.
