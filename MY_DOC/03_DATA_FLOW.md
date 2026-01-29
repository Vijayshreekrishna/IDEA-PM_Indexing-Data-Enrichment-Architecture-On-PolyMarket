# 03_DATA_FLOW.md

## End-to-End Flow
1. **Poll**: `indexer` asks `rpc` for new blocks.
2. **Filter**: `indexer` extracts events for targeted contract addresses.
3. **Stage**: Events are stored in `db` as "pending/canonical".
4. **Enrich**: `metadata` fetches context based on `conditionId`.
5. **Finalize**: Data moves to queryable schemas.
6. **Query**: `api` serves the unified view.

## Verification Path
User query -> conditionId -> DB row -> txHash -> RPC proof.
