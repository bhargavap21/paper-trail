// Test script for Gemini API
// Run with: node test-gemini.js
const fs = require('fs');
const path = require('path');

// Log env file status before loading dotenv
console.log("Environment file check:");
const envPaths = ['.env', '.env.local', '.env.development'];
envPaths.forEach(envPath => {
  try {
    const exists = fs.existsSync(envPath);
    if (exists) {
      const stats = fs.statSync(envPath);
      console.log(`✅ ${envPath} exists (size: ${stats.size} bytes)`);
    } else {
      console.log(`❌ ${envPath} does not exist`);
    }
  } catch (err) {
    console.log(`Error checking ${envPath}: ${err.message}`);
  }
});

// First check environment without dotenv
console.log("\nBefore loading dotenv:");
console.log(`GEMINI_API_KEY in process.env: ${process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`);

// Load dotenv explicitly from .env.local
require('dotenv').config({ path: '.env.local' });
console.log("\nAfter loading .env.local:");
console.log(`GEMINI_API_KEY in process.env: ${process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`);

// If key is present, show a masked version
if (process.env.GEMINI_API_KEY) {
  const key = process.env.GEMINI_API_KEY;
  const maskedKey = key.length > 8 ? 
    `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : 
    '(too short to mask)';
  console.log(`API Key loaded: ${maskedKey}`);
} else {
  console.log("❌ No API key found after loading .env.local");
  // Try loading dotenv from .env as fallback
  require('dotenv').config({ path: '.env' });
  console.log("\nAfter loading .env as fallback:");
  console.log(`GEMINI_API_KEY in process.env: ${process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`);
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiApi() {
  try {
    // Get API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('ERROR: No API key found in environment variables');
      
      // Check .env.local content
      try {
        if (fs.existsSync('.env.local')) {
          const content = fs.readFileSync('.env.local', 'utf8');
          console.log('\n.env.local contents (with API key masked):');
          console.log(content.replace(/([A-Za-z0-9_-]{10,})/g, '***MASKED***'));
        }
      } catch (err) {
        console.error('Error reading .env.local:', err.message);
      }
      
      return;
    }

    // Test if key looks valid (basic format check)
    if (apiKey === 'your_gemini_api_key_here' || apiKey.includes('your') || apiKey.length < 10) {
      console.error(`ERROR: API key appears to be a placeholder: "${apiKey}"`);
      console.log('Please replace with a real Gemini API key from https://ai.google.dev/');
      return;
    }
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different model variations
    const models = [
      'gemini-pro',
      'gemini-1.0-pro', 
      'gemini-1.5-flash'
    ];
    
    for (const modelName of models) {
      try {
        console.log(`\nTesting model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Simple test prompt
        const prompt = "Say 'Hello World! Gemini API is working correctly!'";
        console.log(`Sending prompt: "${prompt}"`);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`SUCCESS! Response from ${modelName}:`);
        console.log('-'.repeat(40));
        console.log(text);
        console.log('-'.repeat(40));
        console.log(`Model ${modelName} is working!\n`);
        
        // If we got here, we found a working model
        break;
      } catch (modelError) {
        console.error(`Error with model ${modelName}:`, modelError.message);
      }
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
console.log('\nStarting Gemini API test...');
testGeminiApi(); 