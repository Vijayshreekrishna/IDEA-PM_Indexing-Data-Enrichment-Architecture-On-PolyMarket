# 00_OVERVIEW.md

## Why this exists
IDEA-PM is a deterministic indexing system for Polymarket-style prediction markets. It provides a "truth engine" that bridges the gap between raw blockchain data and human-readable market context.

## Guarantees
- Every data point is traceable to an on-chain event.
- Off-chain metadata never replaces or corrupts on-chain facts.
- Reorg safety is baked into the ingestion pipeline.

## Failure Modes
- RPC Unavailability: Ingestion pauses but doesn't corrupt.
- Metadata API Mismatch: Logs warning; falls back to raw on-chain data.
- Database Connection Loss: Total system pause.

## Intentional Non-Goals
- Real-time trading execution.
- Orderbook management.
- General-purpose blockchain indexing (not for general wallets).
