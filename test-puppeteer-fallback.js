/**
 * Test Puppeteer fallback for PubMed → BMJ extraction
 */

const puppeteer = require('puppeteer');

async function testPuppeteerFallback() {
  console.log('🧪 Testing Puppeteer fallback for PubMed → BMJ...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (compatible; Research Paper Extractor)');
    
    console.log('🔗 Step 1: Navigating to PubMed...');
    await page.goto('https://pubmed.ncbi.nlm.nih.gov/25713109/', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    const title = await page.title();
    console.log('📄 PubMed title:', title.substring(0, 60) + '...');
    
    // Detect BMJ links (using our enhanced logic)
    const bmjLinks = await page.evaluate(() => {
      const links = [];
      const bmjSelectors = [
        'a[href*="jmg.bmj.com"]',
        'a[href*="bmj.com/lookup"]',
        'a[href*="doi.org/10.1136"]'
      ];
      
      bmjSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(link => {
          if (link.href) {
            links.push({
              url: link.href,
              text: link.textContent?.trim() || '',
              selector: selector
            });
          }
        });
      });
      
      return links;
    });
    
    console.log('📋 BMJ links found:', bmjLinks.length);
    
    if (bmjLinks.length > 0) {
      const targetLink = bmjLinks[0];
      console.log('🎯 Target BMJ URL:', targetLink.url);
      
      console.log('🔄 Step 2: Navigating to BMJ...');
      await page.goto(targetLink.url, { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
      });
      
      const bmjTitle = await page.title();
      console.log('📄 BMJ title:', bmjTitle.substring(0, 60) + '...');
      
      // Cookie consent handling
      try {
        await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 });
        await page.click('#onetrust-accept-btn-handler');
        await page.waitForTimeout(2000);
        console.log('✅ Accepted cookie consent');
      } catch (e) {
        console.log('ℹ️ No cookie consent found');
      }
      
      console.log('🔍 Step 3: Looking for PDF links...');
      const pdfResults = await page.evaluate(() => {
        const pdfs = [];
        const pdfSelectors = [
          'a[href*=".pdf"][href*="reprint"]',
          'a[href*=".pdf"][href*="full"]', 
          'a[href*=".full.pdf"]',
          'a[href*=".pdf"]'
        ];
        
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
      
      console.log('📄 PDF links found:', pdfResults.length);
      
      if (pdfResults.length > 0) {
        const pdfUrl = pdfResults[0].url;
        console.log('🎯 Found PDF:', pdfUrl);
        
        console.log('🧪 Step 4: Testing PDF accessibility...');
        
        // Test PDF access
        const pdfPage = await browser.newPage();
        await pdfPage.setExtraHTTPHeaders({
          'Accept': 'application/pdf,*/*',
          'Referer': page.url()
        });
        
        const pdfResponse = await pdfPage.goto(pdfUrl, { timeout: 15000 });
        const contentType = pdfResponse.headers()['content-type'] || '';
        const status = pdfResponse.status();
        
        console.log(`📊 PDF Response - Status: ${status}, Content-Type: ${contentType}`);
        
        if (contentType.includes('application/pdf')) {
          console.log('✅ PDF is accessible!');
          const buffer = await pdfResponse.buffer();
          console.log(`📏 PDF size: ${buffer.length} bytes`);
          
          await pdfPage.close();
          await browser.close();
          
          return { 
            success: true, 
            pdfUrl: pdfUrl, 
            pdfSize: buffer.length,
            method: 'puppeteer' 
          };
        } else {
          console.log('❌ PDF not accessible (paywall/login required)');
          await pdfPage.close();
        }
      } else {
        console.log('❌ No PDF links found on BMJ page');
      }
    } else {
      console.log('❌ No BMJ links found on PubMed page');
    }
    
  } catch (error) {
    console.error('❌ Puppeteer test failed:', error.message);
    return { success: false, error: error.message, method: 'puppeteer' };
  } finally {
    await browser.close();
  }
  
  return { success: false, reason: 'PDF not accessible or not found', method: 'puppeteer' };
}

testPuppeteerFallback()
  .then(result => {
    console.log('\n📊 Puppeteer Test Summary:');
    console.log('- Success:', result.success ? '✅ YES' : '❌ NO');
    console.log('- Method:', result.method);
    if (result.success) {
      console.log('- PDF URL:', result.pdfUrl);
      console.log('- PDF Size:', result.pdfSize, 'bytes');
      console.log('🎉 Puppeteer can handle PubMed → BMJ extraction!');
    } else {
      console.log('- Issue:', result.reason || result.error);
    }
  })
  .catch(console.error);