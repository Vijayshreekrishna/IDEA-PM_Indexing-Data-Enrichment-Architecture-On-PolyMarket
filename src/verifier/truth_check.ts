import { query } from '../db';
import { rpcClient } from '../rpc/client';

export const verifyTruth = async (txHash: string) => {
    console.log(`Verifying truth for transaction: ${txHash}...`);

    // 1. Check DB
    const dbResult = await query('SELECT * FROM events WHERE tx_hash = $1', [txHash]);
    if (dbResult.rows.length === 0) {
        console.log('[-] Transaction not found in local DB.');
        return;
    }
    console.log('[+] Found in local DB Layer 1.');

    // 2. Cross-reference with RPC
    const receipt = await rpcClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (receipt) {
        console.log(`[+] Verified on RPC. Block: ${receipt.blockNumber}, Status: ${receipt.status}`);
    } else {
        console.log('[-] NOT found on RPC. Potential chain fork or invalid hash.');
    }
};

// If run directly
if (require.main === module) {
    const tx = process.argv[2];
    if (tx) verifyTruth(tx);
}
