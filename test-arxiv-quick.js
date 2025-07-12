/**
 * Quick arXiv PDF detection test
 */

const puppeteer = require('puppeteer');

async function quickArxivTest() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://arxiv.org/abs/2406.11274', { waitUntil: 'domcontentloaded' });
    
    // Look for download links
    const links = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('a').forEach(link => {
        if (link.href && (link.href.includes('pdf') || link.textContent.includes('PDF'))) {
          results.push({
            href: link.href,
            text: link.textContent.trim(),
            classes: link.className
          });
        }
      });
      return results;
    });
    
    console.log('PDF links found:');
    links.forEach(link => {
      console.log(`- ${link.text}: ${link.href}`);
    });
    
    // Try direct PDF URL construction
    const url = 'https://arxiv.org/abs/2406.11274';
    const pdfUrl = url.replace('/abs/', '/pdf/') + '.pdf';
    console.log('\nConstructed PDF URL:', pdfUrl);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickArxivTest();