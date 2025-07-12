/**
 * Direct test for PubMed PDF extraction with detailed logging
 */

const http = require('http');

async function testPubMedExtraction() {
  console.log('🧪 Testing PubMed PDF Extraction');
  console.log('================================');
  console.log('📄 URL: https://pubmed.ncbi.nlm.nih.gov/25713109/');
  console.log('🔬 Paper: CRISPR-Cas9 gene therapy research');
  console.log('');

  const postData = JSON.stringify({
    url: "https://pubmed.ncbi.nlm.nih.gov/25713109/",
    title: "CRISPR-Cas9: a new and promising player in gene therapy",
    authors: ["Lu Xiao-Jie", "Xue Hui-Ying", "Ke Zun-Ping", "Chen Jin-Lian", "Ji Li-Juan"],
    abstract: "First introduced into mammalian organisms in 2013, the RNA-guided genome editing tool CRISPR-Cas9 offers several advantages over conventional ones."
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/extract-pdf',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    console.log('📡 Sending extraction request...');
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          console.log('📊 API Response Details:');
          console.log('========================');
          console.log('Status Code:', res.statusCode);
          console.log('Success:', result.success);
          console.log('Method Used:', result.method);
          console.log('Message:', result.message);
          console.log('Paper ID:', result.paperId);
          console.log('Error:', result.error || 'None');
          console.log('');
          
          // Analyze the result
          if (result.success) {
            console.log('🎯 Extraction Analysis:');
            console.log('=======================');
            
            switch (result.method) {
              case 'direct':
                console.log('✅ SUCCESS: Direct PDF extraction');
                console.log('   → PDF was directly accessible (arXiv or direct link)');
                break;
                
              case 'browserbase':
                console.log('🚀 SUCCESS: BrowserBase extraction');
                console.log('   → BrowserBase successfully navigated complex site');
                console.log('   → Found and downloaded PDF from publisher');
                break;
                
              case 'puppeteer':
                console.log('🎭 SUCCESS: Puppeteer extraction');
                console.log('   → Puppeteer fallback successfully extracted PDF');
                break;
                
              case 'placeholder':
                console.log('📝 FALLBACK: Placeholder created');
                console.log('   → All extraction methods failed');
                console.log('   → Possible reasons:');
                console.log('     • BrowserBase initialization failed');
                console.log('     • PDF requires subscription/login');
                console.log('     • Site has anti-bot protection');
                console.log('     • No direct PDF link available');
                break;
                
              default:
                console.log('❓ UNKNOWN: Unexpected method:', result.method);
            }
            
            console.log('');
            console.log('🔗 View result at: http://localhost:3000/reader/' + result.paperId);
            
          } else {
            console.log('❌ FAILURE: Extraction completely failed');
            console.log('Error:', result.error);
            console.log('Details:', result.details);
          }
          
          resolve(result);
          
        } catch (error) {
          console.error('❌ Failed to parse API response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('• Make sure the development server is running: npm run dev');
      console.log('• Check if the server is accessible at http://localhost:3000');
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function checkServerLogs() {
  console.log('💡 Server Log Analysis:');
  console.log('=======================');
  console.log('To see detailed extraction logs, check your development server terminal for:');
  console.log('');
  console.log('🔍 BrowserBase Initialization:');
  console.log('   ✅ BrowserBase initialized successfully');
  console.log('   ❌ Failed to initialize BrowserBase');
  console.log('   ⚠️  BrowserBase credentials not found');
  console.log('');
  console.log('🚀 Extraction Process:');
  console.log('   🔍 Starting PDF extraction for: [URL]');
  console.log('   🌐 Navigating to: [URL]');
  console.log('   🧬 Extracting from PubMed...');
  console.log('   📄 Following PMC/DOI link: [URL]');
  console.log('   📄 Found PDF URL: [URL]');
  console.log('   ✅ PDF extracted successfully');
  console.log('');
  console.log('❌ Common Error Messages:');
  console.log('   • "BrowserBase not initialized"');
  console.log('   • "No full-text links found on PubMed page"');
  console.log('   • "No PDF found on publisher page"');
  console.log('   • "All extraction methods failed"');
}

async function runTest() {
  try {
    const result = await testPubMedExtraction();
    
    console.log('');
    checkServerLogs();
    
    console.log('');
    console.log('📋 Next Steps:');
    console.log('==============');
    
    if (result.method === 'placeholder') {
      console.log('🔧 To improve PDF extraction:');
      console.log('1. Check server logs for BrowserBase initialization errors');
      console.log('2. Verify BrowserBase credentials are valid');
      console.log('3. Try with a different PubMed URL that has free access');
      console.log('4. Test with an arXiv URL (should work with direct method)');
    } else {
      console.log('🎉 PDF extraction is working correctly!');
      console.log('✅ The BrowserBase integration is functional');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTest().catch(console.error); 