# 07_DATABASE.md

## Schema Invariants
- `block_number` NOT NULL
- `tx_hash` NOT NULL
- `log_index` NOT NULL
- UNIQUE (`block_hash`, `log_index`) OR (`tx_hash`, `log_index`)

## Tables
- `blocks`: Header info.
- `events`: Raw log data.
- `markets`: Enrichment context.
- `checkpoints`: Indexer progress.
