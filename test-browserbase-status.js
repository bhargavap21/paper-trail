/**
 * Test BrowserBase status and session availability
 */

require('dotenv').config();

async function testBrowserBaseStatus() {
  console.log('🧪 Testing BrowserBase Status...');
  console.log('API Key present:', !!process.env.BROWSERBASE_API_KEY);
  console.log('Project ID present:', !!process.env.BROWSERBASE_PROJECT_ID);
  
  try {
    const { Stagehand } = require('@browserbasehq/stagehand');
    
    console.log('🚀 Attempting BrowserBase initialization...');
    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      verbose: 1,
    });

    await stagehand.init();
    console.log('✅ BrowserBase initialized successfully!');
    
    // Test basic navigation
    console.log('🔗 Testing navigation to PubMed...');
    await stagehand.page.goto('https://pubmed.ncbi.nlm.nih.gov/25713109/', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    const title = await stagehand.page.title();
    console.log('📄 Page title:', title.substring(0, 60) + '...');
    
    // Test link detection (our enhanced logic)
    const linkAnalysis = await stagehand.page.evaluate(() => {
      const links = {
        bmjLinks: [],
        doiLinks: [],
        pmcLinks: []
      };
      
      // BMJ links
      const bmjSelectors = [
        'a[href*="jmg.bmj.com"]',
        'a[href*="bmj.com/lookup"]',
        'a[href*="bmj.com"]'
      ];
      
      bmjSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(link => {
          if (link.href) {
            links.bmjLinks.push({
              url: link.href,
              text: link.textContent?.trim() || '',
              selector: selector
            });
          }
        });
      });
      
      // DOI links (BMJ pattern)
      const doiElements = document.querySelectorAll('a[href*="doi.org/10.1136"]');
      doiElements.forEach(link => {
        links.doiLinks.push({
          url: link.href,
          text: link.textContent?.trim() || ''
        });
      });
      
      // PMC links
      const pmcElements = document.querySelectorAll('a[href*="pmc.ncbi.nlm.nih.gov"]');
      pmcElements.forEach(link => {
        links.pmcLinks.push({
          url: link.href,
          text: link.textContent?.trim() || ''
        });
      });
      
      return links;
    });
    
    console.log('🔍 Link Detection Results:');
    console.log(`  📰 BMJ links found: ${linkAnalysis.bmjLinks.length}`);
    console.log(`  🔗 DOI links (BMJ): ${linkAnalysis.doiLinks.length}`);
    console.log(`  📚 PMC links found: ${linkAnalysis.pmcLinks.length}`);
    
    if (linkAnalysis.bmjLinks.length > 0) {
      console.log('📋 Sample BMJ link:', linkAnalysis.bmjLinks[0].url);
      
      // Test navigation to BMJ
      console.log('🔄 Testing BMJ navigation...');
      await stagehand.page.goto(linkAnalysis.bmjLinks[0].url, { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });
      
      const bmjTitle = await stagehand.page.title();
      console.log('📄 BMJ page title:', bmjTitle.substring(0, 60) + '...');
      
      // Test PDF detection on BMJ page
      const pdfLinks = await stagehand.page.evaluate(() => {
        const pdfSelectors = [
          'a[href*=".pdf"][href*="reprint"]',
          'a[href*=".pdf"][href*="full"]',
          'a[href*=".full.pdf"]',
          'a[href*=".pdf"]'
        ];
        
        const pdfs = [];
        pdfSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el.href && el.href.includes('.pdf')) {
              pdfs.push({
                url: el.href,
                text: el.textContent?.trim() || '',
                selector: selector
              });
            }
          });
        });
        
        return pdfs;
      });
      
      console.log('📄 PDF links found on BMJ:', pdfLinks.length);
      if (pdfLinks.length > 0) {
        console.log('🎯 Sample PDF link:', pdfLinks[0].url);
      }
    }
    
    await stagehand.close();
    console.log('✅ BrowserBase test completed successfully!');
    
    return { success: true, bmjLinks: linkAnalysis.bmjLinks.length, pdfLinks: pdfLinks?.length || 0 };
    
  } catch (error) {
    console.error('❌ BrowserBase test failed:', error.message);
    
    if (error.message.includes('429')) {
      console.log('🚫 Session limit exceeded - this is likely why extraction is failing');
      console.log('💡 Solution: Wait for session to expire or upgrade BrowserBase plan');
    } else if (error.message.includes('401') || error.message.includes('403')) {
      console.log('🔑 Authentication issue - check API credentials');
    } else {
      console.log('Stack trace:', error.stack?.split('\n').slice(0, 3).join('\n'));
    }
    
    return { success: false, error: error.message };
  }
}

testBrowserBaseStatus()
  .then(result => {
    console.log('\n📊 Test Summary:');
    console.log('- BrowserBase Status:', result.success ? '✅ Working' : '❌ Failed');
    if (result.success) {
      console.log('- BMJ Links Detected:', result.bmjLinks);
      console.log('- PDF Links Found:', result.pdfLinks);
    } else {
      console.log('- Error:', result.error);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(console.error);