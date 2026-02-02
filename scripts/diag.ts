import { createPublicClient, http, toHex } from 'viem';
import { polygon } from 'viem/chains';

const client = createPublicClient({
    chain: polygon,
    transport: http('https://polygon.drpc.org'),
});

async function test() {
    const latest = await client.getBlockNumber();
    console.log(`Latest Block: ${latest}`);

    const from = latest - BigInt(50);
    console.log(`Scanning Range: ${from} -> ${latest}`);

    const logs = await client.getLogs({
        fromBlock: toHex(from),
        toBlock: toHex(latest),
        address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' // USDT
    });

    console.log(`Found ${logs.length} USDT logs in last 50 blocks.`);
}

test().catch(console.error);
