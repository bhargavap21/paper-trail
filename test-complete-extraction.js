/**
 * Test complete extraction workflow with enhanced BrowserBase extractor
 */

require('dotenv').config();
const { BrowserBaseExtractor } = require('./lib/browserbase-extractor.ts');

async function testCompleteExtraction() {
  console.log('🧪 Testing complete extraction workflow...');
  
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  
  if (!apiKey || !projectId) {
    console.error('❌ Missing BrowserBase credentials');
    process.exit(1);
  }
  
  const extractor = new BrowserBaseExtractor(apiKey, projectId);
  const testUrl = 'https://pubmed.ncbi.nlm.nih.gov/25713109/';
  
  console.log(`🔗 Testing URL: ${testUrl}`);
  
  try {
    const result = await extractor.extractPDF(testUrl);
    
    console.log('\n📊 Extraction Results:');
    console.log('- Method used:', result.method);
    console.log('- Success:', result.pdfUrl ? '✅ YES' : '❌ NO');
    
    if (result.pdfUrl) {
      console.log('- PDF URL:', result.pdfUrl);
      console.log('- Title:', result.title || 'N/A');
      console.log('🎉 Complete extraction workflow successful!');
    } else {
      console.log('- Error:', result.error || 'Unknown error');
      console.log('- Method fallback chain completed');
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Complete extraction failed:', error.message);
    return { success: false, error: error.message };
  }
}

testCompleteExtraction()
  .then(result => {
    console.log('\n🏁 Test completed');
    process.exit(result.pdfUrl ? 0 : 1);
  })
  .catch(console.error);