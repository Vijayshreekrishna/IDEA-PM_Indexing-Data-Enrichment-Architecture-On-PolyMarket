import { indexer } from './indexer/engine';
import dotenv from 'dotenv';

dotenv.config();

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

console.log('IDEA-PM Truth Machine Starting...');
indexer.start().catch(err => {
    console.error('Fatal Indexer semi-failure:', err);
    process.exit(1);
});
