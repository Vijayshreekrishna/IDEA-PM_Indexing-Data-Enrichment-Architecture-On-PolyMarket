# 09_DOCKER.md

## Services
- `postgres`: Data storage.
- `indexer`: The ingestion service.
- `api`: The query service.

## Persistence
- Volumes for `/var/lib/postgresql/data`.
- Env configuration via `.env`.
