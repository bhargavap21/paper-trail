import { MongoClient } from 'mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'eureka';

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your_gemini_api_key_here';
// Remove any trailing characters like % that might be in the key
const cleanGeminiKey = GEMINI_API_KEY.replace(/%$/, '');

// Initialize MongoDB client
export const mongoClient = new MongoClient(MONGODB_URI);

// Initialize Gemini API
export const genAI = new GoogleGenerativeAI(cleanGeminiKey);

// Database connection function
export async function connectToDatabase() {
  try {
    await mongoClient.connect();
    console.log('Connected to MongoDB');
    return mongoClient.db(MONGODB_DB_NAME);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Database models
export const dbModels = {
  papers: 'papers',
  users: 'users',
  highlights: 'highlights',
}; 