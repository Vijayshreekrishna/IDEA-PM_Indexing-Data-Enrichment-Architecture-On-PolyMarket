# SYSTEM.md

## System Identity
IDEA-PM is a "truth machine" for Polymarket data. It prioritizes traceability and deterministic joins over performance or breadth.

## Core Guarantees
- RPC data is ground truth.
- No silent assumptions.
- Reorg safety via explicit rollbacks.

## Design Constraints
- PostgreSQL for ACID compliance.
- No magic joins.
- Strict ID linkage.
