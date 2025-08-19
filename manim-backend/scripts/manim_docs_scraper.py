import requests
from bs4 import BeautifulSoup
import json
import time
import os
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Set

class ManimDocsScraper:
    def __init__(self, base_url: str = "https://3b1b.github.io/manim/"):
        self.base_url = base_url
        self.visited_urls: Set[str] = set()
        self.scraped_content: Dict[str, Dict] = {}
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
    
    def is_valid_url(self, url: str) -> bool:
        """Check if URL is within the Manim documentation domain"""
        parsed = urlparse(url)
        return parsed.netloc == "3b1b.github.io" and "/manim/" in parsed.path
    
    def extract_content(self, url: str) -> Dict:
        """Extract content from a single page"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract title
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "No Title"
            
            # Extract main content
            content_div = soup.find('div', class_='document') or soup.find('main') or soup.find('body')
            
            # Remove navigation, footer, and other non-content elements
            for element in soup.find_all(['nav', 'footer', 'script', 'style', '.navbar', '.sidebar']):
                element.decompose()
            
            # Extract text content
            content_text = content_div.get_text(separator='\n', strip=True) if content_div else ""
            
            # Extract code examples
            code_blocks = []
            for code in soup.find_all(['code', 'pre']):
                code_text = code.get_text().strip()
                if code_text and len(code_text) > 10:  # Filter out small code snippets
                    code_blocks.append(code_text)
            
            # Extract links for further crawling
            links = []
            for link in soup.find_all('a', href=True):
                href = link['href']
                full_url = urljoin(url, href)
                if self.is_valid_url(full_url) and full_url not in self.visited_urls:
                    links.append(full_url)
            
            return {
                'url': url,
                'title': title_text,
                'content': content_text,
                'code_examples': code_blocks,
                'links': links,
                'scraped_at': time.time()
            }
            
        except Exception as e:
            print(f"Error scraping {url}: {str(e)}")
            return None
    
    def crawl_recursively(self, start_url: str, max_pages: int = 100) -> Dict:
        """Recursively crawl the documentation site"""
        urls_to_visit = [start_url]
        pages_scraped = 0
        
        while urls_to_visit and pages_scraped < max_pages:
            current_url = urls_to_visit.pop(0)
            
            if current_url in self.visited_urls:
                continue
            
            print(f"Scraping: {current_url}")
            self.visited_urls.add(current_url)
            
            content = self.extract_content(current_url)
            if content:
                self.scraped_content[current_url] = content
                # Add new links to visit
                urls_to_visit.extend(content['links'])
                pages_scraped += 1
                
                # Be respectful - add delay between requests
                time.sleep(1)
        
        return self.scraped_content
    
    def save_to_file(self, filename: str = "manim_docs.json"):
        """Save scraped content to JSON file"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.scraped_content, f, indent=2, ensure_ascii=False)
        print(f"Saved {len(self.scraped_content)} pages to {filename}")
    
    def create_consolidated_text(self) -> str:
        """Create a single text file with all documentation content"""
        consolidated = []
        
        for url, content in self.scraped_content.items():
            consolidated.append(f"=== {content['title']} ===")
            consolidated.append(f"URL: {url}")
            consolidated.append(f"Content:\n{content['content']}")
            
            if content['code_examples']:
                consolidated.append("\nCode Examples:")
                for i, code in enumerate(content['code_examples'], 1):
                    consolidated.append(f"Example {i}:\n```python\n{code}\n```")
            
            consolidated.append("\n" + "="*80 + "\n")
        
        return "\n".join(consolidated)

def main():
    """Main function to run the scraper"""
    scraper = ManimDocsScraper()
    
    # Start crawling from the main documentation page
    print("Starting Manim documentation scraping...")
    scraped_data = scraper.crawl_recursively("https://3b1b.github.io/manim/", max_pages=50)
    
    # Save to JSON file
    scraper.save_to_file("manim_docs.json")
    
    # Create consolidated text file
    consolidated_text = scraper.create_consolidated_text()
    with open("manim_docs_consolidated.txt", 'w', encoding='utf-8') as f:
        f.write(consolidated_text)
    
    print(f"Scraping complete! Found {len(scraped_data)} pages")
    print("Files created:")
    print("- manim_docs.json (structured data)")
    print("- manim_docs_consolidated.txt (text for LLM)")

if __name__ == "__main__":
    main() 