# 10_GIT_WORKFLOW.md

## Commit Rules
- Atomic commits.
- Descriptive messages.
- Format: `type: description` (e.g., `feat: implementation of indexer`).

## Example Flow
1. Design schema.
2. `git commit -m "db: add initial schema and constraints"`
3. Implement RPC.
4. `git commit -m "indexer: implement RPC block ingestion"`
