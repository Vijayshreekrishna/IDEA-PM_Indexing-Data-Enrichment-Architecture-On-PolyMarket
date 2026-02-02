import { indexer } from './indexer/engine';
import { metadataWorker } from './metadata/worker';
import './api/server'; // Start Express API
import dotenv from 'dotenv';

dotenv.config();

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

console.log('IDEA-PM Truth Machine Starting...');

// Start Metadata Enrichment Worker (Asynchronous)
metadataWorker.run().catch(err => {
    console.error('Metadata Worker failure:', err);
});

indexer.start().catch(err => {
    console.error('Fatal Indexer semi-failure:', err);
    process.exit(1);
});
