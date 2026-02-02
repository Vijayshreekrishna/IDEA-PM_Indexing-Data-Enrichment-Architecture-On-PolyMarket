# IDEA-PM

Deterministic, Verifiable Prediction Market Indexer.

## Mental Model
IDEA-PM is built on three immutable layers:
1. **Layer 1**: On-chain Truth (RPC)
2. **Layer 2**: Off-chain Context (Metadata)
3. **Layer 3**: Linking Keys (IDs & Hashes)

## Getting Started

### Option A: With Docker (Recommended)
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. `cp .env.example .env` (Add your `RPC_URL`).
3. Run: `docker compose -f docker/docker-compose.yml up -d`

### Option B: Manual Setup (No Docker)
1. **Database**: Install [PostgreSQL](https://www.postgresql.org/download/). Create a DB named `ideapm`.
2. **Schema**: Run `psql -d ideapm -f db/schema.sql`
3. **Environment**: Update `.env` with your local `DATABASE_URL`.
4. **Install**: `npm install`
5. **Run Indexer**: `npx ts-node src/index.ts`
6. **Run API**: `npx ts-node src/api/server.ts`

## Documentation
Full documentation is available in the `MY_DOC/` directory.
- Start with [00_OVERVIEW.md](file:///d:/VSK/IDEA-PM/MY_DOC/00_OVERVIEW.md)
