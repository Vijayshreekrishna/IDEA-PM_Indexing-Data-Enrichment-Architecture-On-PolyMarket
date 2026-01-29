# 06_LINKING_KEYS.md

## Canonical IDs
- `conditionId`: Primary key for a prediction market event.
- `questionId`: Underlying oracle question ID.
- `marketId`: Polymarket-specific UUID.

## Join Logic
```sql
SELECT * FROM events 
JOIN metadata ON events.condition_id = metadata.condition_id;
```
No implicit joins based on timing or heuristics. Only explicit hash/ID keys.
