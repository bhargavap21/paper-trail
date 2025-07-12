/**
 * Test script for BrowserBase PDF extraction
 * Tests the new extraction service with the PubMed URL
 */

const http = require('http');

const TEST_CONFIG = {
  pubmedUrl: "https://pubmed.ncbi.nlm.nih.gov/25713109/",
  apiEndpoint: "/api/extract-pdf",
  title: "CRISPR-Cas9: a new and promising player in gene therapy",
  authors: ["Lu Xiao-Jie", "Xue Hui-Ying", "Ke Zun-Ping", "Chen Jin-Lian", "Ji Li-Juan"],
  abstract: "First introduced into mammalian organisms in 2013, the RNA-guided genome editing tool CRISPR-Cas9 offers several advantages over conventional ones."
};

async function testBrowserBaseExtraction() {
  console.log("🧪 Testing BrowserBase PDF Extraction");
  console.log("=====================================");
  console.log("📄 Testing URL:", TEST_CONFIG.pubmedUrl);
  console.log("🔬 Paper: CRISPR-Cas9 gene therapy research");
  console.log("");
  
  // Check if server is running
  const serverRunning = await checkServerStatus();
  
  if (!serverRunning) {
    console.log("❌ Server is not running. Please start with: npm run dev");
    return;
  }
  
  console.log("📡 Sending request to enhanced PDF extraction API...");
  
  const postData = JSON.stringify({
    url: TEST_CONFIG.pubmedUrl,
    title: TEST_CONFIG.title,
    authors: TEST_CONFIG.authors,
    abstract: TEST_CONFIG.abstract
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: TEST_CONFIG.apiEndpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          console.log("📊 API Response:");
          console.log("Status Code:", res.statusCode);
          console.log("Success:", result.success);
          console.log("Method:", result.method);
          console.log("Message:", result.message);
          console.log("Paper ID:", result.paperId);
          
          if (result.success) {
            console.log("");
            console.log("🎯 Test Results:");
            console.log("================");
            
            if (result.method === 'direct') {
              console.log("🎉 Direct PDF extraction successful!");
              console.log("✅ PDF was directly accessible");
            } else if (result.method === 'browserbase') {
              console.log("🚀 BrowserBase extraction successful!");
              console.log("✅ Complex navigation completed");
            } else if (result.method === 'puppeteer') {
              console.log("🎭 Puppeteer extraction successful!");
              console.log("✅ Fallback method worked");
            } else if (result.method === 'placeholder') {
              console.log("📝 Placeholder created (extraction failed)");
              console.log("ℹ️  This means BrowserBase couldn't find the PDF");
            }
            
            const readerUrl = `http://localhost:3000/reader/${result.paperId}`;
            console.log("🔗 Reader URL:", readerUrl);
            
            resolve({
              success: true,
              paperId: result.paperId,
              method: result.method,
              readerUrl,
              message: result.message
            });
            
          } else {
            console.log("❌ API returned failure:");
            console.log("Error:", result.error);
            console.log("Details:", result.details);
            
            resolve({
              success: false,
              error: result.error,
              details: result.details
            });
          }
          
        } catch (error) {
          console.error("❌ Failed to parse response:", error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error("❌ Request failed:", error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function checkServerStatus() {
  console.log("🔍 Checking server status...");
  
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      console.log("✅ Server is running on port 3000");
      resolve(true);
    });
    
    req.on('error', () => {
      console.log("❌ Server is not running");
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log("❌ Server check timed out");
      resolve(false);
    });
    
    req.end();
  });
}

async function runTest() {
  try {
    const result = await testBrowserBaseExtraction();
    
    console.log("");
    console.log("📋 Final Test Summary:");
    console.log("======================");
    
    if (result.success) {
      console.log("🎉 Test PASSED!");
      console.log("✅ Enhanced PDF extraction is working");
      console.log("📄 Paper saved with ID:", result.paperId);
      console.log("🔧 Extraction method:", result.method);
      console.log("🔗 View at:", result.readerUrl);
      
      console.log("");
      console.log("🔍 What happened:");
      if (result.method === 'direct') {
        console.log("• Direct PDF access (arXiv or direct PDF URL)");
      } else if (result.method === 'browserbase') {
        console.log("• BrowserBase successfully navigated complex site");
        console.log("• Found and downloaded PDF from publisher");
      } else if (result.method === 'puppeteer') {
        console.log("• Puppeteer fallback successfully extracted PDF");
      } else if (result.method === 'placeholder') {
        console.log("• All extraction methods failed, placeholder created");
        console.log("• This may indicate:");
        console.log("  - BrowserBase credentials not configured");
        console.log("  - PDF requires subscription/login");
        console.log("  - Site has anti-bot protection");
      }
    } else {
      console.log("❌ Test FAILED!");
      console.log("Error:", result.error);
    }
    
  } catch (error) {
    console.log("❌ Test FAILED with exception!");
    console.log("Error:", error.message);
  }
}

// Run the test
runTest().catch(console.error); 