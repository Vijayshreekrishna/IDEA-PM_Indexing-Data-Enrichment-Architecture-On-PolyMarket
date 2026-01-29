# 11_USER_MANUAL.md

## Running the system
1. Setup `.env` with RPC URLs.
2. `docker-compose up -d`.
3. Monitor logs: `docker logs idea-pm-indexer`.

## Verifying Data
Run SQL query:
```sql
SELECT tx_hash FROM events WHERE condition_id = '0x...';
```
Verify `tx_hash` on PolygonScan.
