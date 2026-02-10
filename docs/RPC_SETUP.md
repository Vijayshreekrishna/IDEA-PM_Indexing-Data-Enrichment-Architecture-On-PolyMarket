# RPC Provider Setup Guide

## Current Issue
The public Polygon RPC endpoint (`https://polygon-rpc.com`) has strict rate limits that cause indexing to fail frequently.

## Solution: Use a Dedicated RPC Provider

### Recommended Providers (All have free tiers)

#### 1. **Alchemy** (Recommended)
- **Free Tier**: 300M compute units/month
- **Setup**:
  1. Sign up at https://www.alchemy.com/
  2. Create a new app (select Polygon network)
  3. Copy your HTTP endpoint
  4. Update `.env`: `RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY`

#### 2. **Infura**
- **Free Tier**: 100k requests/day
- **Setup**:
  1. Sign up at https://www.infura.io/
  2. Create a new project
  3. Copy your Polygon endpoint
  4. Update `.env`: `RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_PROJECT_ID`

#### 3. **QuickNode**
- **Free Tier**: Limited requests
- **Setup**:
  1. Sign up at https://www.quicknode.com/
  2. Create a Polygon endpoint
  3. Copy your HTTP URL
  4. Update `.env`: `RPC_URL=YOUR_QUICKNODE_URL`

#### 4. **Ankr** (Public, but better than polygon-rpc.com)
- **Free**: Public endpoint with higher limits
- **Setup**:
  - Update `.env`: `RPC_URL=https://rpc.ankr.com/polygon`

## How to Update

1. **Stop the indexer**:
   ```powershell
   docker compose -f docker/docker-compose.yml down
   ```

2. **Update `.env` file**:
   ```env
   RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   ```

3. **Rebuild and restart**:
   ```powershell
   docker compose -f docker/docker-compose.yml up -d --build
   ```

4. **Monitor logs**:
   ```powershell
   docker compose -f docker/docker-compose.yml logs -f indexer
   ```

## Improved Retry Logic

I've updated the indexer with better retry handling:
- ✅ Increased max retries from 5 to 8
- ✅ Starting delay increased to 2 seconds
- ✅ Parses "retry in Xs" from error messages
- ✅ Exponential backoff capped at 60 seconds
- ✅ Better error detection for rate limits

## Performance Tips

### Reduce Block Step Size
If you're still hitting limits, reduce the batch size in `.env`:
```env
MAX_BLOCK_STEP=100  # Default is 500
```

### Increase Poll Interval
Give the RPC more breathing room:
```env
POLL_INTERVAL=10000  # 10 seconds instead of 5
```

## Verification

After switching RPC providers, you should see:
- ✅ No more "Too many requests" errors
- ✅ Faster indexing speed
- ✅ More reliable data capture

## Cost Comparison

| Provider | Free Tier | Paid Plans Start At |
|----------|-----------|---------------------|
| Alchemy  | 300M CU/mo | $49/mo |
| Infura   | 100k req/day | $50/mo |
| QuickNode | Limited | $9/mo |
| Ankr     | Public (rate limited) | N/A |

**Recommendation**: Start with Alchemy's free tier - it's more than enough for IDEA-PM's needs.
