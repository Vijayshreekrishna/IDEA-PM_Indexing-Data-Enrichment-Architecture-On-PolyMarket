# 05_METADATA.md

## Source Management
- Primarily fetches from Polymarket API.
- Caches results locally to avoid rate limits.

## Versioning
- Metadata is tagged with `fetched_at` timestamp.
- If metadata changes (e.g., market description update), new versions are kept if relevant.
