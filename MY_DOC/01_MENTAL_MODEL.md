# 01_MENTAL_MODEL.md

## The 3-Layer Model

### Layer 1: On-Chain Truth (RPC)
- **Source**: Ethereum/Polygon RPC.
- **Data**: Transactions, logs, block numbers.
- **Rule**: Immutable. Never inferred.

### Layer 2: Off-Chain Context (Metadata)
- **Source**: Polymarket API / Indexer APIs.
- **Data**: Market titles, choice descriptions, outcome conditions.
- **Rule**: Helpful but secondary. References Layer 1.

### Layer 3: Linking Keys (IDs & Hashes)
- **Bridges**: `conditionId`, `questionId`, `txHash`.
- **Constraint**: No implicit joins. Only explicit keys.

## Examples
- **Insight**: "The Lakers won the game."
- **Layer 2**: Market title "Lakers vs Celtics", Choice "Lakers".
- **Layer 3**: `conditionId: 0x...`
- **Layer 1**: `LogEvent: TransitionedToState(1)` at `txHash: 0x...`
