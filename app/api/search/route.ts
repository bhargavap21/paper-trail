import { NextRequest, NextResponse } from 'next/server'
import Exa from 'exa-js'

// Initialize Exa client
const exa = new Exa(process.env.EXA_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }

    console.log('=== SEARCH API CALLED ===')
    console.log('Query:', query)

    // Step 1: Search using Exa's direct search API
    console.log('Searching with Exa direct search API...')
    const searchResults = await exa.search(query, {
      numResults: 15,
      includeDomains: ['arxiv.org', 'nature.com', 'science.org', 'pubmed.ncbi.nlm.nih.gov', 'ieee.org', 'acm.org'],
      useAutoprompt: true
    })

    console.log('Search completed')
    console.log('Number of results:', searchResults.results?.length || 0)
    if (searchResults.results && searchResults.results.length > 0) {
      console.log('First result sample:', JSON.stringify(searchResults.results[0], null, 2))
    }

    // Step 2: Process and format the results
    const results = await processDirectSearchResults(searchResults.results || [])
    
    console.log(`Processed ${results.length} papers`)
    if (results.length > 0) {
      console.log('First processed result:', JSON.stringify(results[0], null, 2))
    }

    return NextResponse.json({
      success: true,
      query,
      results,
      totalFound: results.length,
      method: 'direct-search'
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to search papers', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

async function processExaResults(result: any): Promise<any[]> {
  try {
    console.log('Processing Exa results...')
    console.log('Raw result structure:', JSON.stringify(result, null, 2))
    
    // The result structure may vary, so we need to handle it flexibly
    let papers: any[] = []
    
    if (typeof result === 'string') {
      console.log('Result is string, length:', result.length)
      console.log('String preview:', result.substring(0, 200) + '...')
      // If result is a string, try to extract paper information
      papers = extractPapersFromText(result)
      console.log('Extracted papers from text:', papers.length)
    } else if (result && typeof result === 'object') {
      console.log('Result is object, keys:', Object.keys(result))
      // If result is structured data
      if (Array.isArray(result)) {
        console.log('Result is array, length:', result.length)
        papers = result
      } else if (result.papers && Array.isArray(result.papers)) {
        console.log('Found result.papers array, length:', result.papers.length)
        papers = result.papers
      } else if (result.results && Array.isArray(result.results)) {
        console.log('Found result.results array, length:', result.results.length)
        papers = result.results
      } else {
        console.log('Trying to extract from object structure...')
        // Try to extract from the object structure
        papers = extractPapersFromObject(result)
        console.log('Extracted papers from object:', papers.length)
      }
    } else {
      console.log('Result is neither string nor object:', typeof result, result)
    }

    console.log('Papers before processing:', papers.length)
    if (papers.length > 0) {
      console.log('Sample paper before processing:', JSON.stringify(papers[0], null, 2))
    }

    // Normalize and enhance paper data
    const processedPapers = papers.map((paper, index) => {
      console.log(`Processing paper ${index}:`, typeof paper, Object.keys(paper || {}))
      return {
        id: paper.id || `paper-${index}`,
        title: paper.title || extractTitle(paper) || `Research Paper ${index + 1}`,
        authors: normalizeAuthors(paper.authors || paper.author || []),
        abstract: paper.abstract || paper.summary || paper.description || 'Abstract not available',
        venue: paper.venue || paper.journal || paper.conference || 'Unknown',
        year: paper.year || paper.date || extractYear(paper) || 'Unknown',
        url: paper.url || paper.link || paper.doi || '#',
        relevanceScore: paper.relevanceScore || calculateRelevanceScore(paper, index),
        doi: paper.doi || null,
        citationCount: paper.citationCount || paper.citations || 0,
        keywords: paper.keywords || [],
        type: paper.type || 'research-paper'
      }
    })

    console.log('Papers after processing:', processedPapers.length)

    // Sort by relevance score
    processedPapers.sort((a, b) => b.relevanceScore - a.relevanceScore)

    const finalResults = processedPapers.slice(0, 20) // Return top 20 papers
    
    // If we still have no results, create some mock results based on the original query
    if (finalResults.length === 0) {
      console.log('No results found, creating fallback results...')
      return createFallbackResults(result)
    }
    
    return finalResults

  } catch (error) {
    console.error('Error processing Exa results:', error)
    return createFallbackResults(result)
  }
}

function createFallbackResults(originalResult: any): any[] {
  console.log('Creating fallback results from:', typeof originalResult)
  
  // Create some mock results based on the research content
  const fallbackPapers = [
    {
      id: 'fallback-1',
      title: 'Research Summary Generated by Exa AI',
      authors: ['Exa Research Team'],
      abstract: typeof originalResult === 'string' ? 
        originalResult.substring(0, 300) + '...' : 
        'This is a research summary generated by Exa AI based on your query.',
      venue: 'Exa Research',
      year: new Date().getFullYear().toString(),
      url: '#',
      relevanceScore: 0.85,
      doi: null,
      citationCount: 0,
      keywords: [],
      type: 'research-summary'
    }
  ]
  
  return fallbackPapers
}

function extractPapersFromText(text: string): any[] {
  console.log('Extracting papers from text, length:', text.length)
  
  // Simple text parsing to extract paper information
  const papers: any[] = []
  
  // Look for common patterns in academic text
  const titlePattern = /(?:Title:|Paper:|Study:)\s*(.+?)(?:\n|Author:|By:)/gi
  const authorPattern = /(?:Author(?:s)?:|By:)\s*(.+?)(?:\n|Abstract:|Summary:)/gi
  const abstractPattern = /(?:Abstract:|Summary:)\s*(.+?)(?:\n\n|\nTitle:|\nPaper:)/gi
  
  let match
  let paperIndex = 0
  
  // Try to find titles
  while ((match = titlePattern.exec(text)) !== null && paperIndex < 20) {
    console.log(`Found title pattern ${paperIndex}:`, match[1].trim())
    papers.push({
      title: match[1].trim(),
      abstract: 'Abstract extracted from research summary',
      relevanceScore: 0.8 - (paperIndex * 0.05)
    })
    paperIndex++
  }
  
  // If no structured patterns found, try to split by common delimiters
  if (papers.length === 0) {
    console.log('No structured patterns found, trying alternative parsing...')
    const lines = text.split('\n').filter(line => line.trim().length > 10)
    console.log('Found lines:', lines.length)
    
    // Look for lines that might be paper titles (longer lines, possibly with years)
    const potentialTitles = lines.filter(line => 
      line.length > 20 && 
      line.length < 200 && 
      !line.toLowerCase().includes('abstract:') &&
      !line.toLowerCase().includes('author:')
    )
    
    console.log('Potential titles found:', potentialTitles.length)
    
    potentialTitles.slice(0, 10).forEach((title, index) => {
      console.log(`Adding potential paper ${index}:`, title.substring(0, 100))
      papers.push({
        title: title.trim(),
        abstract: 'Abstract extracted from research content',
        relevanceScore: 0.8 - (index * 0.05)
      })
    })
  }
  
  console.log('Final papers extracted from text:', papers.length)
  return papers
}

function extractPapersFromObject(obj: any): any[] {
  const papers: any[] = []
  
  // Recursively search for paper-like objects
  function searchForPapers(item: any, depth = 0) {
    if (depth > 3) return // Prevent infinite recursion
    
    if (typeof item === 'object' && item !== null) {
      if (item.title && (item.abstract || item.summary)) {
        papers.push(item)
      } else if (Array.isArray(item)) {
        item.forEach(subItem => searchForPapers(subItem, depth + 1))
      } else {
        Object.values(item).forEach(value => searchForPapers(value, depth + 1))
      }
    }
  }
  
  searchForPapers(obj)
  return papers
}

function extractTitle(paper: any): string | null {
  if (typeof paper === 'string') {
    const lines = paper.split('\n')
    return lines[0] || null
  }
  return null
}

function normalizeAuthors(authors: any): string[] {
  if (Array.isArray(authors)) {
    return authors.map(author => 
      typeof author === 'string' ? author : author.name || author.toString()
    )
  } else if (typeof authors === 'string') {
    return authors.split(',').map(author => author.trim())
  }
  return []
}

function extractYear(paper: any): string | null {
  const text = JSON.stringify(paper)
  const yearMatch = text.match(/\b(19|20)\d{2}\b/)
  return yearMatch ? yearMatch[0] : null
}

function calculateRelevanceScore(paper: any, index: number): number {
  // Simple relevance scoring based on position and available metadata
  let score = 0.9 - (index * 0.05)
  
  // Boost score based on available metadata
  if (paper.citationCount && paper.citationCount > 10) score += 0.1
  if (paper.venue && paper.venue.toLowerCase().includes('nature')) score += 0.1
  if (paper.venue && paper.venue.toLowerCase().includes('science')) score += 0.1
  if (paper.doi) score += 0.05
  
  return Math.max(0.1, Math.min(1.0, score))
}

async function processDirectSearchResults(results: any[]): Promise<any[]> {
  try {
    console.log('Processing direct search results:', results.length)
    
    const processedResults = results.map((result: any, index: number) => {
      console.log(`Processing result ${index}:`, result.title || 'No title')
      
      // Generate a unique ID using URL hash or fallback to index
      const uniqueId = result.url ? 
        `search-${Buffer.from(result.url).toString('base64').slice(0, 8)}-${index}` : 
        `search-${Date.now()}-${index}`
      
      return {
        id: uniqueId,
        title: result.title || 'Untitled Research Paper',
        authors: result.author ? [result.author] : extractAuthorsFromTitle(result.title),
        abstract: result.text || result.summary || 'Abstract not available - click to view full paper',
        venue: extractVenueFromUrl(result.url),
        year: extractYearFromUrl(result.publishedDate || result.url),
        url: result.url || '#',
        relevanceScore: result.score || (0.9 - index * 0.05),
        doi: extractDoiFromUrl(result.url),
        citationCount: 0,
        keywords: extractKeywordsFromTitle(result.title),
        type: 'research-paper'
      }
    })

    console.log('Processed results:', processedResults.length)
    return processedResults

  } catch (error) {
    console.error('Error processing direct search results:', error)
    return []
  }
}

function extractVenueFromUrl(url: string): string {
  if (!url) return 'Unknown'
  
  if (url.includes('arxiv.org')) return 'arXiv'
  if (url.includes('nature.com')) return 'Nature'
  if (url.includes('science.org')) return 'Science'
  if (url.includes('pubmed')) return 'PubMed'
  if (url.includes('ieee.org')) return 'IEEE'
  if (url.includes('acm.org')) return 'ACM'
  if (url.includes('springer.com')) return 'Springer'
  if (url.includes('elsevier.com')) return 'Elsevier'
  
  return 'Academic Journal'
}

function extractYearFromUrl(dateOrUrl: string): string {
  if (!dateOrUrl) return 'Unknown'
  
  // Try to extract year from date or URL
  const yearMatch = dateOrUrl.match(/\b(19|20)\d{2}\b/)
  return yearMatch ? yearMatch[0] : 'Unknown'
}

function extractDoiFromUrl(url: string): string | null {
  if (!url) return null
  
  // Try to extract DOI from URL
  const doiMatch = url.match(/doi\.org\/(.+)/)
  return doiMatch ? doiMatch[1] : null
}

function extractAuthorsFromTitle(title: string): string[] {
  if (!title) return []
  
  // Simple heuristic - if title contains "by" or "et al", try to extract
  const byMatch = title.match(/by\s+(.+?)(?:\s|$)/i)
  if (byMatch) {
    return [byMatch[1]]
  }
  
  return []
}

function extractKeywordsFromTitle(title: string): string[] {
  if (!title) return []
  
  // Extract potential keywords from title
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'using', 'through', 'via']
  const words = title.toLowerCase().split(/\s+/).filter(word => 
    word.length > 3 && !commonWords.includes(word)
  )
  
  return words.slice(0, 5) // Return first 5 potential keywords
} 