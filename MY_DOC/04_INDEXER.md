# 04_INDEXER.md

## Block Ingestion
- Uses `finalized` block tag where possible.
- Tracks `last_processed_block` in DB.

## Event Filtering
- Strict allowlist of contract addresses (CTF, MarketMaker).
- Idempotent processing based on `(blockNumber, txHash, logIndex)`.

## Checkpoints
- Atomic updates: (event processing + checkpoint update) in one transaction.
