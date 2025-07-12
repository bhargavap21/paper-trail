import { Stagehand } from '@browserbasehq/stagehand';
import puppeteer from 'puppeteer';

interface ExtractedData {
  pdfUrl?: string;
  title?: string;
  error?: string;
  method: 'browserbase' | 'puppeteer' | 'placeholder';
}

export class BrowserBaseExtractor {
  private apiKey: string;
  private projectId: string;

  constructor(apiKey: string, projectId: string) {
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  async extractPDF(url: string): Promise<ExtractedData> {
    console.log(`Starting extraction for: ${url}`);

    // Determine extraction strategy based on URL
    const isPubMed = url.includes('pubmed.ncbi.nlm.nih.gov');
    const isArxiv = url.includes('arxiv.org');
    
    console.log(`URL type detected: ${isPubMed ? 'PubMed' : isArxiv ? 'arXiv' : 'Generic'}`);

    try {
      const browserbaseResult = await this.extractWithBrowserBase(url);
      if (browserbaseResult.pdfUrl) {
        console.log('BrowserBase extraction successful');
        return browserbaseResult;
      }
    } catch (error) {
      console.log(`BrowserBase failed: ${error.message}`);
      
      if (error.message.includes('429') || error.message.includes('session')) {
        console.log('Session limit reached, falling back to Puppeteer...');
      }
    }

    console.log('Falling back to Puppeteer extraction...');
    try {
      const puppeteerResult = await this.extractWithPuppeteer(url);
      if (puppeteerResult.pdfUrl) {
        console.log('Puppeteer extraction successful');
        return puppeteerResult;
      }
    } catch (error) {
      console.log(`Puppeteer failed: ${error.message}`);
    }

    console.log('Both methods failed, creating placeholder');
    return {
      method: 'placeholder',
      error: 'PDF extraction failed, placeholder created'
    };
  }

  private async extractWithBrowserBase(url: string): Promise<ExtractedData> {
    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: this.apiKey,
      projectId: this.projectId,
      verbose: 1,
    });

    try {
      await stagehand.init();
      
      if (url.includes('pubmed.ncbi.nlm.nih.gov')) {
        return await this.extractFromPubMedWithBrowserBase(stagehand, url);
      } else if (url.includes('arxiv.org')) {
        return await this.extractFromArxivWithBrowserBase(stagehand, url);
      } else {
        return await this.extractGenericWithBrowserBase(stagehand, url);
      }
    } finally {
      await stagehand.close();
    }
  }

  private async extractFromPubMedWithBrowserBase(stagehand: any, url: string): Promise<ExtractedData> {
    console.log('Enhanced PubMed extraction with BrowserBase');
    
    await stagehand.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const title = await stagehand.page.title();
    console.log('PubMed title:', title.substring(0, 60) + '...');

    const links = await stagehand.page.evaluate(() => {
      const foundLinks: Array<{url: string, text: string, priority: number, type: string}> = [];
      
      const bmjSelectors = [
        'a[href*="jmg.bmj.com"]',
        'a[href*="bmj.com/lookup"]', 
        'a[href*="bmj.com"]',
        'a[href*="doi.org/10.1136"]'
      ];
      
      bmjSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(link => {
          if (link.href) {
            foundLinks.push({
              url: link.href,
              text: link.textContent?.trim() || '',
              priority: 90,
              type: 'BMJ'
            });
          }
        });
      });

      const pmcElements = document.querySelectorAll('a[href*="pmc.ncbi.nlm.nih.gov"]');
      pmcElements.forEach(link => {
        foundLinks.push({
          url: link.href,
          text: link.textContent?.trim() || '',
          priority: 100,
          type: 'PMC'
        });
      });

      const doiElements = document.querySelectorAll('a[href*="doi.org"]');
      doiElements.forEach(link => {
        if (!link.href.includes('10.1136')) {
          foundLinks.push({
            url: link.href,
            text: link.textContent?.trim() || '',
            priority: 70,
            type: 'DOI'
          });
        }
      });

      return foundLinks.sort((a, b) => b.priority - a.priority);
    });

    console.log(`Found ${links.length} links`);

    for (const link of links) {
      console.log(`Trying ${link.type} link: ${link.url}`);
      
      try {
        if (link.type === 'BMJ') {
          const result = await this.extractFromBMJWithBrowserBase(stagehand, link.url);
          if (result.pdfUrl) {
            return { ...result, title, method: 'browserbase' };
          }
        } else {
          const result = await this.extractGenericWithBrowserBase(stagehand, link.url);
          if (result.pdfUrl) {
            return { ...result, title, method: 'browserbase' };
          }
        }
      } catch (error) {
        console.log(`Failed to extract from ${link.type} link: ${error.message}`);
        continue;
      }
    }

    throw new Error('No valid PDF found in PubMed links');
  }

  private async extractFromArxivWithBrowserBase(stagehand: any, url: string): Promise<ExtractedData> {
    console.log('Enhanced arXiv extraction with BrowserBase');
    
    await stagehand.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const title = await stagehand.page.title();
    console.log('arXiv title:', title.substring(0, 60) + '...');

    // Method 1: Look for PDF download link on page
    const pdfLinks = await stagehand.page.evaluate(() => {
      const links: string[] = [];
      
      // arXiv specific selectors - looking for /pdf/ URLs (not .pdf extension)
      const arxivSelectors = [
        'a[href*="/pdf/"]',
        'a[href*="arxiv.org/pdf"]'
      ];
      
      arxivSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(link => {
          if (link.href && link.href.includes('/pdf/')) {
            links.push(link.href);
          }
        });
      });
      
      return [...new Set(links)]; // Remove duplicates
    });

    console.log(`Found ${pdfLinks.length} PDF links on arXiv`);

    if (pdfLinks.length > 0) {
      const pdfUrl = pdfLinks[0];
      console.log('Found arXiv PDF:', pdfUrl);
      return { pdfUrl, title, method: 'browserbase' };
    }

    // Method 2: Construct PDF URL from abstract URL
    if (url.includes('/abs/')) {
      const pdfUrl = url.replace('/abs/', '/pdf/');
      console.log('Constructed arXiv PDF URL:', pdfUrl);
      return { pdfUrl, title, method: 'browserbase' };
    }

    throw new Error('No PDF found on arXiv page');
  }

  private async extractFromBMJWithBrowserBase(stagehand: any, url: string): Promise<ExtractedData> {
    console.log('Enhanced BMJ extraction');
    
    await stagehand.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    try {
      await stagehand.page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 });
      await stagehand.page.click('#onetrust-accept-btn-handler');
      await stagehand.page.waitForTimeout(2000);
      console.log('Accepted cookie consent');
    } catch (e) {
      console.log('No cookie consent found');
    }

    const pdfResults = await stagehand.page.evaluate(() => {
      const pdfs: Array<{url: string, text: string, priority: number}> = [];
      
      const pdfSelectors = [
        { selector: '.article-pdf-download', priority: 120 },
        { selector: 'a.article-pdf-download', priority: 120 },
        { selector: 'a[href*=".pdf"][href*="reprint"]', priority: 100 },
        { selector: 'a[href*=".pdf"][href*="full"]', priority: 90 },
        { selector: 'a[href*=".full.pdf"]', priority: 85 },
        { selector: 'a[href*=".pdf"]', priority: 70 }
      ];
      
      pdfSelectors.forEach(({ selector, priority }) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const href = el.href || el.getAttribute('href');
          if (href) {
            // Handle relative URLs
            const fullUrl = href.startsWith('http') ? href : 
                           href.startsWith('/') ? window.location.origin + href : href;
            
            if (fullUrl.includes('.pdf')) {
              pdfs.push({
                url: fullUrl,
                text: el.textContent?.trim() || '',
                priority
              });
            }
          }
        });
      });
      
      return pdfs.sort((a, b) => b.priority - a.priority);
    });

    if (pdfResults.length > 0) {
      const pdfUrl = pdfResults[0].url;
      console.log('Found PDF:', pdfUrl);
      return { pdfUrl, method: 'browserbase' };
    }

    throw new Error('No PDF found on BMJ page');
  }

  private async extractGenericWithBrowserBase(stagehand: any, url: string): Promise<ExtractedData> {
    await stagehand.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const pdfLinks = await stagehand.page.evaluate(() => {
      const links: string[] = [];
      const pdfElements = document.querySelectorAll('a[href*=".pdf"]');
      pdfElements.forEach(link => {
        if (link.href) links.push(link.href);
      });
      return links;
    });

    if (pdfLinks.length > 0) {
      return { pdfUrl: pdfLinks[0], method: 'browserbase' };
    }

    throw new Error('No PDF found');
  }

  private async extractWithPuppeteer(url: string): Promise<ExtractedData> {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Research Paper Extractor)');
      
      if (url.includes('pubmed.ncbi.nlm.nih.gov')) {
        return await this.extractFromPubMedWithPuppeteer(page, url);
      } else if (url.includes('arxiv.org')) {
        return await this.extractFromArxivWithPuppeteer(page, url);
      } else {
        return await this.extractGenericWithPuppeteer(page, url);
      }
    } finally {
      await browser.close();
    }
  }

  private async extractFromPubMedWithPuppeteer(page: any, url: string): Promise<ExtractedData> {
    console.log('Enhanced PubMed extraction with Puppeteer');
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const title = await page.title();
    console.log('PubMed title:', title.substring(0, 60) + '...');

    const links = await page.evaluate(() => {
      const foundLinks: Array<{url: string, text: string, priority: number, type: string}> = [];
      
      const bmjSelectors = [
        'a[href*="jmg.bmj.com"]',
        'a[href*="bmj.com/lookup"]',
        'a[href*="doi.org/10.1136"]'
      ];
      
      bmjSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(link => {
          if (link.href) {
            foundLinks.push({
              url: link.href,
              text: link.textContent?.trim() || '',
              priority: 90,
              type: 'BMJ'
            });
          }
        });
      });

      const pmcElements = document.querySelectorAll('a[href*="pmc.ncbi.nlm.nih.gov"]');
      pmcElements.forEach(link => {
        foundLinks.push({
          url: link.href,
          text: link.textContent?.trim() || '',
          priority: 100,
          type: 'PMC'
        });
      });

      return foundLinks.sort((a, b) => b.priority - a.priority);
    });

    console.log(`Found ${links.length} links`);

    for (const link of links) {
      console.log(`Trying ${link.type} link: ${link.url}`);
      
      try {
        if (link.type === 'BMJ') {
          const result = await this.extractFromBMJWithPuppeteer(page, link.url);
          if (result.pdfUrl) {
            return { ...result, title, method: 'puppeteer' };
          }
        } else {
          await page.goto(link.url, { waitUntil: 'networkidle0', timeout: 30000 });
          const result = await this.extractGenericWithPuppeteer(page, link.url);
          if (result.pdfUrl) {
            return { ...result, title, method: 'puppeteer' };
          }
        }
      } catch (error) {
        console.log(`Failed to extract from ${link.type} link: ${error.message}`);
        continue;
      }
    }

    throw new Error('No valid PDF found in PubMed links');
  }

  private async extractFromArxivWithPuppeteer(page: any, url: string): Promise<ExtractedData> {
    console.log('Enhanced arXiv extraction with Puppeteer');
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const title = await page.title();
    console.log('arXiv title:', title.substring(0, 60) + '...');

    // Method 1: Look for PDF download link on page
    const pdfLinks = await page.evaluate(() => {
      const links: string[] = [];
      
      // arXiv specific selectors - looking for /pdf/ URLs (not .pdf extension)
      const arxivSelectors = [
        'a[href*="/pdf/"]',
        'a[href*="arxiv.org/pdf"]'
      ];
      
      arxivSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(link => {
          if (link.href && link.href.includes('/pdf/')) {
            links.push(link.href);
          }
        });
      });
      
      return [...new Set(links)]; // Remove duplicates
    });

    console.log(`Found ${pdfLinks.length} PDF links on arXiv`);

    if (pdfLinks.length > 0) {
      const pdfUrl = pdfLinks[0];
      console.log('Found arXiv PDF:', pdfUrl);
      return { pdfUrl, title, method: 'puppeteer' };
    }

    // Method 2: Construct PDF URL from abstract URL
    if (url.includes('/abs/')) {
      const pdfUrl = url.replace('/abs/', '/pdf/');
      console.log('Constructed arXiv PDF URL:', pdfUrl);
      return { pdfUrl, title, method: 'puppeteer' };
    }

    throw new Error('No PDF found on arXiv page');
  }

  private async extractFromBMJWithPuppeteer(page: any, url: string): Promise<ExtractedData> {
    console.log('Enhanced BMJ extraction with Puppeteer');
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    try {
      await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 3000 });
      await page.click('#onetrust-accept-btn-handler');
      await page.waitForTimeout(2000);
      console.log('Accepted cookie consent');
    } catch (e) {
      console.log('No cookie consent found');
    }

    const pdfResults = await page.evaluate(() => {
      const pdfs: Array<{url: string, text: string, priority: number}> = [];
      
      const pdfSelectors = [
        { selector: '.article-pdf-download', priority: 120 },
        { selector: 'a.article-pdf-download', priority: 120 },
        { selector: 'a[href*=".pdf"][href*="reprint"]', priority: 100 },
        { selector: 'a[href*=".pdf"][href*="full"]', priority: 90 },
        { selector: 'a[href*=".full.pdf"]', priority: 85 },
        { selector: 'a[href*=".pdf"]', priority: 70 }
      ];
      
      pdfSelectors.forEach(({ selector, priority }) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const href = el.href || el.getAttribute('href');
          if (href) {
            // Handle relative URLs
            const fullUrl = href.startsWith('http') ? href : 
                           href.startsWith('/') ? window.location.origin + href : href;
            
            if (fullUrl.includes('.pdf')) {
              pdfs.push({
                url: fullUrl,
                text: el.textContent?.trim() || '',
                priority
              });
            }
          }
        });
      });
      
      return pdfs.sort((a, b) => b.priority - a.priority);
    });

    if (pdfResults.length > 0) {
      const pdfUrl = pdfResults[0].url;
      console.log('Found PDF:', pdfUrl);
      
      const pdfPage = await page.browser().newPage();
      await pdfPage.setExtraHTTPHeaders({
        'Accept': 'application/pdf,*/*',
        'Referer': page.url()
      });
      
      try {
        const pdfResponse = await pdfPage.goto(pdfUrl, { timeout: 15000 });
        const contentType = pdfResponse.headers()['content-type'] || '';
        
        if (contentType.includes('application/pdf')) {
          console.log('PDF is accessible');
          await pdfPage.close();
          return { pdfUrl, method: 'puppeteer' };
        } else {
          console.log('PDF not accessible (paywall/login required)');
          await pdfPage.close();
          throw new Error('PDF not accessible');
        }
      } catch (error) {
        await pdfPage.close();
        throw error;
      }
    }

    throw new Error('No PDF found on BMJ page');
  }

  private async extractGenericWithPuppeteer(page: any, url: string): Promise<ExtractedData> {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    
    const pdfLinks = await page.evaluate(() => {
      const links: string[] = [];
      const pdfElements = document.querySelectorAll('a[href*=".pdf"]');
      pdfElements.forEach(link => {
        if (link.href) links.push(link.href);
      });
      return links;
    });

    if (pdfLinks.length > 0) {
      return { pdfUrl: pdfLinks[0], method: 'puppeteer' };
    }

    throw new Error('No PDF found');
  }
}

export default BrowserBaseExtractor;