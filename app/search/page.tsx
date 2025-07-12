"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { SearchHistorySidebar } from "@/components/search-history-sidebar"
import { useSearchHistory } from "@/hooks/use-search-history"
import { 
  BookOpen, 
  Search as SearchIcon, 
  Sparkles, 
  Loader2, 
  FileText, 
  ExternalLink,
  Clock,
  TrendingUp,
  Filter,
  SortAsc
} from "lucide-react"

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchStatus, setSearchStatus] = useState("")
  const [extractingPaper, setExtractingPaper] = useState<string | null>(null)
  
  const router = useRouter()
  const { 
    history, 
    isLoaded, 
    addToHistory, 
    removeFromHistory, 
    clearHistory 
  } = useSearchHistory()

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setIsSearching(true)
    setSearchStatus("Analyzing your research query...")
    setSearchResults([])
    
    try {
      console.log('Starting search with query:', query)
      
      // Call the search API
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
      
      console.log('API response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      setSearchStatus("Creating research task with Exa...")
      
      const data = await response.json()
      console.log('API response data:', data)
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setSearchStatus("Processing research results...")
      
      // Set the results
      console.log('Setting search results:', data.results?.length || 0, 'papers')
      setSearchResults(data.results || [])
      setSearchStatus("")
      
      // Add to search history
      addToHistory(query, data.results || [])
      
      console.log('Search completed successfully')
      
    } catch (error) {
      console.error('Search error:', error)
      setSearchStatus("")
      setSearchResults([])
      
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Detailed error:', errorMessage)
      
      // Set a user-friendly error message
      setSearchStatus(`Search failed: ${errorMessage}`)
      setTimeout(() => setSearchStatus(""), 5000) // Clear error after 5 seconds
    } finally {
      setIsSearching(false)
    }
  }

  const handleReadPaper = async (paper: any) => {
    try {
      console.log('Extracting PDF for paper:', paper.title)
      setExtractingPaper(paper.id)
      
      // Call the PDF extraction API
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: paper.url,
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract
        }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('PDF extraction response:', data)
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Open the reader page with the extracted paper
      window.open(`/reader/${data.paperId}`, '_blank')
      
    } catch (error) {
      console.error('Error extracting paper:', error)
      
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setSearchStatus(`Failed to extract paper: ${errorMessage}`)
      setTimeout(() => setSearchStatus(""), 5000)
      
    } finally {
      setExtractingPaper(null)
    }
  }

  const handleSelectHistory = (historyItem: any) => {
    setQuery(historyItem.query)
    if (historyItem.results && historyItem.results.length > 0) {
      setSearchResults(historyItem.results)
    } else {
      setSearchResults([])
    }
  }

  const handleNewSearch = () => {
    setQuery("")
    setSearchResults([])
    setSearchStatus("")
  }

  return (
    <div className="flex flex-col min-h-screen bg-ivory">
      {/* Header */}
      <header className="border-b shadow-sm bg-white">
        <div className="flex h-16 items-center px-4 md:px-6 relative">
          <Link href="/" className="flex items-center gap-2 mr-8">
            <div className="bg-royal-500 p-1.5 rounded-lg flex items-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-sans font-bold text-royal-500">Eureka</span>
          </Link>
          <nav className="hidden md:flex gap-6 absolute left-1/2 transform -translate-x-1/2">
            <Link href="/reader" className="font-sans font-medium text-royal-500 hover:text-royal-600">Reader</Link>
            <Link href="/search" className="font-sans font-bold text-royal-700 underline underline-offset-4">Search</Link>
            <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
            <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
          </nav>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 relative">
        {/* Search History Sidebar */}
        <SearchHistorySidebar
          history={history}
          isLoaded={isLoaded}
          onSelectHistory={handleSelectHistory}
          onRemoveHistory={removeFromHistory}
          onClearHistory={clearHistory}
          onNewSearch={handleNewSearch}
          currentQuery={query}
        />

        {/* Main Content */}
        <main className="absolute inset-0 py-8 overflow-auto pointer-events-none">
        <div className="flex justify-center w-full h-full">
          <div className="w-full max-w-4xl px-4 pointer-events-auto">
          {/* Page Header */}
          <div className="flex flex-col items-center space-y-4 text-center mb-10">
            <div className="inline-flex items-center justify-center rounded-full bg-royal-100 p-3 text-royal-500">
              <SearchIcon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-royal-500">Research Paper Discovery</h1>
            <p className="text-gray-600 max-w-2xl">
              Transform your research questions into comprehensive paper discovery. 
              Ask anything and we'll find the most relevant academic papers for you.
            </p>
          </div>

          {/* Search Interface */}
          <Card className="bg-white shadow-elegant mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-royal-700">
                <Sparkles className="h-5 w-5" />
                Ask Your Research Question
              </CardTitle>
              <CardDescription>
                Describe what you're looking for in natural language. We'll handle the rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Ask your research question here..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[80px] max-h-[200px] resize-none bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 rounded-2xl px-4 py-3 focus:border-royal-500 focus:ring-2 focus:ring-royal-500 focus:ring-offset-0 transition-all duration-200 shadow-sm"
                  style={{ fontSize: '20px' }}
                  disabled={isSearching}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Powered by Exa AI • Typical search takes 20-30 seconds</span>
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching || !query.trim()}
                  className="bg-royal-500 hover:bg-royal-600 text-white"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <SearchIcon className="h-4 w-4 mr-2" />
                      Discover Papers
                    </>
                  )}
                </Button>
              </div>

              {/* Search Status */}
              {searchStatus && (
                <div className="bg-royal-50 border border-royal-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-royal-700">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">{searchStatus}</span>
                  </div>
                </div>
              )}

              {/* Example Queries */}
              {!isSearching && searchResults.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Example Queries:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      "Latest advances in transformer architectures for NLP",
                      "Impact of CRISPR on gene therapy research",
                      "Quantum computing applications in cryptography",
                      "Machine learning approaches to drug discovery"
                    ].map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => setQuery(example)}
                        className="text-left text-sm text-royal-600 hover:text-royal-800 hover:bg-royal-50 p-2 rounded border border-transparent hover:border-royal-200 transition-colors"
                      >
                        "{example}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-6">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-royal-700">Search Results</h2>
                  <Badge variant="secondary" className="bg-royal-100 text-royal-700">
                    {searchResults.length} papers found
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <SortAsc className="h-4 w-4" />
                    Sort
                  </Button>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-4">
                {searchResults.map((paper, index) => (
                  <Card key={`${paper.id}-${index}`} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                                                 <div className="flex-1 space-y-3">
                           <div className="flex items-center gap-2">
                             <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                               <TrendingUp className="h-3 w-3 mr-1" />
                               {Math.round(paper.relevanceScore * 100)}% match
                             </Badge>
                             <span className="text-sm text-gray-500">{paper.venue} • {paper.year}</span>
                             {paper.citationCount > 0 && (
                               <Badge variant="secondary" className="text-xs">
                                 {paper.citationCount} citations
                               </Badge>
                             )}
                           </div>
                           
                           <div>
                             <h3 className="text-lg font-semibold text-gray-900 mb-2">
                               {paper.title}
                             </h3>
                             <p className="text-sm text-gray-600 mb-2">
                               {Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors || "Unknown authors"}
                             </p>
                             <p className="text-gray-700 line-clamp-3">
                               {paper.abstract}
                             </p>
                             {paper.keywords && paper.keywords.length > 0 && (
                               <div className="flex flex-wrap gap-1 mt-2">
                                 {paper.keywords.slice(0, 3).map((keyword: string, idx: number) => (
                                   <Badge key={idx} variant="outline" className="text-xs text-black border-gray-300">
                                     {keyword}
                                   </Badge>
                                 ))}
                               </div>
                             )}
                           </div>
                         </div>
                        
                                                 <div className="flex flex-col gap-2">
                           <Button 
                             size="sm" 
                             className="bg-royal-500 hover:bg-royal-600 text-white"
                             onClick={() => handleReadPaper(paper)}
                             disabled={isSearching || extractingPaper === paper.id}
                           >
                             {extractingPaper === paper.id ? (
                               <>
                                 <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                 Extracting...
                               </>
                             ) : (
                               <>
                                 <FileText className="h-4 w-4 mr-1" />
                                 Read
                               </>
                             )}
                           </Button>
                           <Button variant="outline" size="sm" asChild>
                             <a href={paper.url} target="_blank" rel="noopener noreferrer">
                               <ExternalLink className="h-4 w-4 mr-1" />
                               Source
                             </a>
                           </Button>
                         </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isSearching && searchResults.length === 0 && (
            <Card className="bg-white shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="bg-royal-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <SearchIcon className="h-8 w-8 text-royal-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Ready to Discover Papers
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Enter your research question above and we'll find the most relevant academic papers for you.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="text-center p-4">
                    <div className="bg-royal-50 p-3 rounded-lg mb-2">
                      <SearchIcon className="h-6 w-6 text-royal-500 mx-auto" />
                    </div>
                    <h4 className="font-medium text-sm">Smart Discovery</h4>
                    <p className="text-xs text-gray-500">AI-powered paper search</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="bg-royal-50 p-3 rounded-lg mb-2">
                      <TrendingUp className="h-6 w-6 text-royal-500 mx-auto" />
                    </div>
                    <h4 className="font-medium text-sm">Relevance Ranking</h4>
                    <p className="text-xs text-gray-500">Papers ranked by relevance</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="bg-royal-50 p-3 rounded-lg mb-2">
                      <FileText className="h-6 w-6 text-royal-500 mx-auto" />
                    </div>
                    <h4 className="font-medium text-sm">Full Content</h4>
                    <p className="text-xs text-gray-500">Extracted paper content</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
        </main>
      </div>
    </div>
  )
} 