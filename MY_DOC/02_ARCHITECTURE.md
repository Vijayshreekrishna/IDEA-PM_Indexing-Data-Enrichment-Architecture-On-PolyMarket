# 02_ARCHITECTURE.md

## Module Boundaries
- `indexer/`: Responsible for block range management and polling.
- `rpc/`: Abstraction for calling nodes.
- `metadata/`: Fetching and caching human-readable context.
- `linker/`: Static logic to join L1 and L2 via L3 keys.
- `api/`: GraphQL/REST interface for the data.

## Trust Boundaries
- **Trusted**: Local Database, Local RPC Node.
- **Semi-Trusted**: External Metadata APIs (verified against L1 keys).

## Data Ownership
- The Database is the owner of the "Merged Truth".
- The Indexer owns the ingestion state (checkpoints).
