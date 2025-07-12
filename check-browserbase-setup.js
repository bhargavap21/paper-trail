/**
 * Quick check for BrowserBase environment setup
 */

require('dotenv').config();

console.log('🔍 Checking BrowserBase Environment Setup');
console.log('=========================================');

// Check environment variables
const hasApiKey = !!process.env.BROWSERBASE_API_KEY;
const hasProjectId = !!process.env.BROWSERBASE_PROJECT_ID;

console.log('✅ Environment Variables:');
console.log(`   BROWSERBASE_API_KEY: ${hasApiKey ? '✅ Set' : '❌ Missing'}`);
console.log(`   BROWSERBASE_PROJECT_ID: ${hasProjectId ? '✅ Set' : '❌ Missing'}`);

if (hasApiKey && hasProjectId) {
  console.log('');
  console.log('🎉 BrowserBase credentials are configured!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Run the test: node test-browserbase-extraction.js');
  console.log('3. Or use the search page and click "Read" on any result');
} else {
  console.log('');
  console.log('❌ Missing BrowserBase credentials');
  console.log('');
  console.log('🔧 To fix:');
  console.log('1. Add to your .env file:');
  console.log('   BROWSERBASE_API_KEY=your_api_key_here');
  console.log('   BROWSERBASE_PROJECT_ID=your_project_id_here');
  console.log('2. Restart your development server');
}

console.log('');
console.log('🔗 Get credentials at: https://browserbase.com'); 