import { NextRequest, NextResponse } from 'next/server'
import Exa from 'exa-js'

// Initialize Exa client
const exa = new Exa(process.env.EXA_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    console.log('=== ALTERNATIVE SEARCH API CALLED ===')
    console.log('Query:', query)

    // Try using the regular search API instead of research tasks
    const searchResults = await exa.search(query, {
      numResults: 10,
      includeDomains: ['arxiv.org', 'nature.com', 'science.org', 'pubmed.ncbi.nlm.nih.gov'],
      useAutoprompt: true
    })

    console.log('Search results:', searchResults)
    console.log('Number of results:', searchResults.results?.length || 0)

    // Process the results
    const processedResults = searchResults.results?.map((result: any, index: number) => ({
      id: result.id || `search-${index}`,
      title: result.title || 'Untitled',
      authors: result.author ? [result.author] : [],
      abstract: result.text || result.summary || 'No abstract available',
      venue: extractVenue(result.url),
      year: extractYear(result.publishedDate || result.url),
      url: result.url || '#',
      relevanceScore: result.score || (0.9 - index * 0.05),
      doi: extractDoi(result.url),
      citationCount: 0,
      keywords: [],
      type: 'research-paper'
    })) || []

    return NextResponse.json({
      success: true,
      query,
      results: processedResults,
      totalFound: processedResults.length,
      method: 'direct-search'
    })

  } catch (error) {
    console.error('Alternative search error:', error)
    return NextResponse.json(
      { 
        error: 'Alternative search failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function extractVenue(url: string): string {
  if (!url) return 'Unknown'
  
  if (url.includes('arxiv.org')) return 'arXiv'
  if (url.includes('nature.com')) return 'Nature'
  if (url.includes('science.org')) return 'Science'
  if (url.includes('pubmed')) return 'PubMed'
  if (url.includes('ieee.org')) return 'IEEE'
  if (url.includes('acm.org')) return 'ACM'
  
  return 'Academic Journal'
}

function extractYear(dateOrUrl: string): string {
  if (!dateOrUrl) return 'Unknown'
  
  // Try to extract year from date or URL
  const yearMatch = dateOrUrl.match(/\b(19|20)\d{2}\b/)
  return yearMatch ? yearMatch[0] : 'Unknown'
}

function extractDoi(url: string): string | null {
  if (!url) return null
  
  // Try to extract DOI from URL
  const doiMatch = url.match(/doi\.org\/(.+)/)
  return doiMatch ? doiMatch[1] : null
} 