/**
 * Simple test to debug BrowserBase initialization
 */

const { browserBasePDFExtractor } = require('./lib/browserbase-extractor');

async function testBrowserBaseInit() {
  console.log('🧪 Testing BrowserBase Initialization');
  console.log('====================================');
  
  try {
    console.log('🔍 Step 1: Initializing BrowserBase...');
    await browserBasePDFExtractor.init();
    console.log('✅ BrowserBase initialization completed');
    
    console.log('');
    console.log('🔍 Step 2: Testing with arXiv URL (should work with direct method)...');
    const arxivUrl = 'https://arxiv.org/abs/2301.07041';
    const result = await browserBasePDFExtractor.extractPDF(
      arxivUrl,
      'Test arXiv Paper',
      ['Test Author'],
      'Test abstract'
    );
    
    console.log('📊 arXiv Test Result:');
    console.log('Success:', result.success);
    console.log('Method:', result.method);
    console.log('Error:', result.error);
    console.log('PDF Buffer Size:', result.pdfBuffer ? result.pdfBuffer.length + ' bytes' : 'None');
    
    if (result.success) {
      console.log('✅ arXiv extraction successful!');
    } else {
      console.log('❌ arXiv extraction failed:', result.error);
    }
    
    console.log('');
    console.log('🔍 Step 3: Testing with PubMed URL (requires BrowserBase)...');
    const pubmedUrl = 'https://pubmed.ncbi.nlm.nih.gov/25713109/';
    const pubmedResult = await browserBasePDFExtractor.extractPDF(
      pubmedUrl,
      'CRISPR-Cas9: a new and promising player in gene therapy',
      ['Lu Xiao-Jie', 'Xue Hui-Ying'],
      'CRISPR-Cas9 gene therapy research'
    );
    
    console.log('📊 PubMed Test Result:');
    console.log('Success:', pubmedResult.success);
    console.log('Method:', pubmedResult.method);
    console.log('Error:', pubmedResult.error);
    console.log('PDF Buffer Size:', pubmedResult.pdfBuffer ? pubmedResult.pdfBuffer.length + ' bytes' : 'None');
    
    if (pubmedResult.success) {
      console.log('✅ PubMed extraction successful!');
    } else {
      console.log('❌ PubMed extraction failed:', pubmedResult.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    console.log('');
    console.log('🧹 Cleaning up...');
    await browserBasePDFExtractor.close();
  }
}

testBrowserBaseInit().catch(console.error); 