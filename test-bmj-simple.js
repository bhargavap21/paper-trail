/**
 * Simple BMJ page test to understand the structure
 */

const puppeteer = require('puppeteer');

async function testBMJSimple() {
  console.log('🏥 Testing BMJ page structure...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (compatible; Research Paper Extractor)');
    
    const bmjUrl = 'https://jmg.bmj.com/lookup/pmidlookup?view=long&pmid=25713109';
    console.log('🔗 Navigating to BMJ URL:', bmjUrl);
    
    await page.goto(bmjUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    console.log('✅ Page loaded');
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Check if this is a redirect page or actual article page
    const currentUrl = page.url();
    console.log('🔗 Current URL:', currentUrl);
    
    // Look for any "Full Text" or "PDF" buttons/links
    const links = await page.evaluate(() => {
      const links = [];
      
      // Get all links
      const allLinks = document.querySelectorAll('a');
      allLinks.forEach(link => {
        const text = link.textContent?.trim().toLowerCase() || '';
        const href = link.href || '';
        
        if (text.includes('full') || text.includes('pdf') || text.includes('download') ||
            href.includes('full') || href.includes('.pdf')) {
          links.push({
            text: link.textContent?.trim() || '',
            href: href,
            classes: link.className || ''
          });
        }
      });
      
      return links;
    });
    
    console.log(`📄 Found ${links.length} relevant links:`);
    links.forEach((link, i) => {
      console.log(`${i + 1}. "${link.text}" -> ${link.href}`);
    });
    
    // Check for specific PDF selectors
    const pdfChecks = await page.evaluate(() => {
      const selectors = [
        'a[href*=".pdf"]',
        'a[href*="full"]',
        'a[href*="reprint"]',
        '.pdf-link',
        '[data-track*="pdf"]'
      ];
      
      const results = {};
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        results[selector] = elements.length;
        if (elements.length > 0) {
          results[selector + '_sample'] = Array.from(elements).slice(0, 2).map(el => ({
            href: el.href,
            text: el.textContent?.trim()
          }));
        }
      });
      
      return results;
    });
    
    console.log('\n🔍 PDF selector results:');
    Object.entries(pdfChecks).forEach(([key, value]) => {
      console.log(`${key}: ${JSON.stringify(value)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testBMJSimple()
  .then(() => console.log('✅ Test completed'))
  .catch(console.error);