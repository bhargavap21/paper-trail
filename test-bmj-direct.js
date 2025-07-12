/**
 * Test BMJ page directly to see what PDF links are available
 */

const puppeteer = require('puppeteer');

async function testBMJDirect() {
  console.log('🏥 Testing BMJ page directly...');
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Set to false to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (compatible; Research Paper Extractor)');
    
    const bmjUrl = 'https://jmg.bmj.com/lookup/pmidlookup?view=long&pmid=25713109';
    console.log('🔗 Navigating to BMJ URL:', bmjUrl);
    
    await page.goto(bmjUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const title = await page.title();
    console.log('📄 BMJ page title:', title);
    
    // Handle cookie consent
    try {
      await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 });
      await page.click('#onetrust-accept-btn-handler');
      await page.waitForTimeout(2000);
      console.log('✅ Accepted cookie consent');
    } catch (e) {
      console.log('ℹ️ No cookie consent found');
    }
    
    // Check all links on the page
    const allLinks = await page.evaluate(() => {
      const links = [];
      const allLinkElements = document.querySelectorAll('a');
      allLinkElements.forEach(link => {
        if (link.href) {
          links.push({
            url: link.href,
            text: link.textContent?.trim() || '',
            classes: link.className || ''
          });
        }
      });
      return links;
    });
    
    console.log(`📋 Total links found: ${allLinks.length}`);
    
    // Filter for PDF-related links
    const pdfRelatedLinks = allLinks.filter(link => 
      link.url.includes('.pdf') || 
      link.text.toLowerCase().includes('pdf') ||
      link.text.toLowerCase().includes('full text') ||
      link.text.toLowerCase().includes('download')
    );
    
    console.log(`📄 PDF-related links: ${pdfRelatedLinks.length}`);
    pdfRelatedLinks.forEach((link, i) => {
      console.log(`${i + 1}. ${link.text} -> ${link.url}`);
    });
    
    // Test our current PDF selectors
    const currentSelectors = [
      'a[href*=".pdf"][href*="reprint"]',
      'a[href*=".pdf"][href*="full"]',
      'a[href*=".full.pdf"]',
      'a[href*=".pdf"]'
    ];
    
    console.log('\n🔍 Testing current PDF selectors:');
    for (const selector of currentSelectors) {
      const elements = await page.$$(selector);
      console.log(`${selector}: ${elements.length} matches`);
      
      if (elements.length > 0) {
        const sampleHrefs = await page.evaluate((sel) => {
          const els = document.querySelectorAll(sel);
          return Array.from(els).slice(0, 3).map(el => ({
            href: el.href,
            text: el.textContent?.trim() || ''
          }));
        }, selector);
        console.log('  Sample matches:', sampleHrefs);
      }
    }
    
    // Check if we can find the actual PDF download
    const fullTextLinks = await page.evaluate(() => {
      const links = [];
      const fullTextSelectors = [
        'a[href*="full"]',
        'a[class*="full"]',
        'a[title*="full"]',
        '[data-track*="pdf"]',
        '.pdf-link',
        '.full-text'
      ];
      
      fullTextSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.href) {
            links.push({
              url: el.href,
              text: el.textContent?.trim() || '',
              selector: selector,
              classes: el.className || ''
            });
          }
        });
      });
      
      return links;
    });
    
    console.log('\n🔍 Full text / PDF download links:');
    fullTextLinks.forEach((link, i) => {
      console.log(`${i + 1}. [${link.selector}] ${link.text} -> ${link.url}`);
    });
    
    // Wait for user to see the page
    console.log('\n⏱️ Waiting 10 seconds for you to see the page...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testBMJDirect()
  .then(() => console.log('✅ BMJ direct test completed'))
  .catch(console.error);