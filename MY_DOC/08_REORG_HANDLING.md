# 08_REORG_HANDLING.md

## Detection
- Indexer polls blocks N behind "latest".
- Compares `parentHash` of new blocks with stored `block_hash`.

## Rollback Strategy
1. Identify reorg depth.
2. DELETE from `events` where `block_number >= fork_point`.
3. Update `checkpoint` to `fork_point - 1`.
4. Re-index.
