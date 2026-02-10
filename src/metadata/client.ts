import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const METADATA_BASE_URL = process.env.METADATA_API_URL || 'https://clob.polymarket.com';

export interface MarketMetadata {
    conditionId: string;
    questionId: string;
    title: string;
    description: string;
    outcomes: string[];
}

export const fetchMarketMetadata = async (conditionId: string): Promise<MarketMetadata | null> => {
    try {
        // Example: Fetching from Polymarket CLOB API or dedicated metadata source
        // This is a placeholder for the actual API call logic
        const response = await axios.get(`${METADATA_BASE_URL}/markets/${conditionId}`);
        return response.data as MarketMetadata;
    } catch (error) {
        console.error(`Failed to fetch metadata for ${conditionId}:`, error);
        return null;
    }
};
