import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.RPC_URL) {
    throw new Error('RPC_URL is not defined in .env');
}

export const rpcClient = createPublicClient({
    chain: polygon,
    transport: http(process.env.RPC_URL),
});

export const getLatestBlock = async () => {
    return await rpcClient.getBlock({ blockTag: 'latest' });
};

export const getFinalizedBlock = async () => {
    // Falls back to latest if finalized tag is not supported or for chains like Polygon
    // and manually handles confirmation depth in the indexer logic.
    return await rpcClient.getBlock({ blockTag: 'latest' });
};
