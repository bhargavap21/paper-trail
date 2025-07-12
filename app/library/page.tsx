"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  BookOpen, 
  Search, 
  FileText, 
  Calendar,
  Users,
  ExternalLink,
  Loader2,
  Filter,
  SortAsc,
  Trash2
} from "lucide-react"

interface SavedPaper {
  id: string
  title: string
  authors: string[]
  abstract: string
  url: string
  savedAt: string
  status: 'processing' | 'completed' | 'error'
}

export default function LibraryPage() {
  const [papers, setPapers] = useState<SavedPaper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredPapers, setFilteredPapers] = useState<SavedPaper[]>([])

  useEffect(() => {
    loadSavedPapers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = papers.filter(paper => 
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.authors.some(author => author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        paper.abstract.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredPapers(filtered)
    } else {
      setFilteredPapers(papers)
    }
  }, [searchQuery, papers])

  const loadSavedPapers = async () => {
    try {
      const response = await fetch('/api/papers')
      if (response.ok) {
        const data = await response.json()
        setPapers(data.papers || [])
      } else {
        console.error('Failed to load papers:', response.statusText)
        setPapers([])
      }
    } catch (error) {
      console.error('Error loading papers:', error)
      setPapers([])
    } finally {
      setIsLoading(false)
    }
  }

  const deletePaper = async (paperId: string) => {
    if (!window.confirm('Are you sure you want to delete this paper from your library?')) {
      return
    }

    try {
      const response = await fetch(`/api/papers/${paperId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setPapers(papers.filter(paper => paper.id !== paperId))
      } else {
        console.error('Failed to delete paper')
      }
    } catch (error) {
      console.error('Error deleting paper:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200'
      case 'processing': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'error': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
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
            <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
            <Link href="/library" className="font-sans font-bold text-royal-700 underline underline-offset-4">Library</Link>
            <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="container max-w-6xl mx-auto px-4">
          {/* Page Header */}
          <div className="flex flex-col items-center space-y-4 text-center mb-10">
            <div className="inline-flex items-center justify-center rounded-full bg-royal-100 p-3 text-royal-500">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-royal-500">Research Library</h1>
            <p className="text-gray-600 max-w-2xl">
              Access your saved research papers, highlights, and notes. Continue reading where you left off.
            </p>
          </div>

          {/* Search and Filters */}
          <Card className="bg-white shadow-elegant mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-royal-700">
                <Search className="h-5 w-5" />
                Search Your Library
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search papers by title, author, or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-royal-200 focus:border-royal-500"
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <SortAsc className="h-4 w-4" />
                  Sort
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Papers List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-royal-500" />
              <span className="ml-2 text-gray-600">Loading your library...</span>
            </div>
          ) : filteredPapers.length === 0 ? (
            <Card className="bg-white shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="bg-royal-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-royal-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'No papers found' : 'No papers in your library yet'}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {searchQuery 
                    ? 'Try adjusting your search terms or browse all papers.' 
                    : 'Start by searching for papers and clicking "Read" to add them to your library.'
                  }
                </p>
                <div className="flex gap-4 justify-center">
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery("")}>
                      Clear Search
                    </Button>
                  )}
                  <Button asChild className="bg-royal-500 hover:bg-royal-600">
                    <Link href="/search">
                      <Search className="h-4 w-4 mr-2" />
                      Discover Papers
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-royal-700">Your Library</h2>
                  <Badge variant="secondary" className="bg-royal-100 text-royal-700">
                    {filteredPapers.length} paper{filteredPapers.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              {/* Papers Grid */}
              <div className="space-y-4">
                {filteredPapers.map((paper) => (
                  <Card key={paper.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(paper.status)}>
                              {paper.status === 'completed' ? 'Ready' : 
                               paper.status === 'processing' ? 'Processing...' : 'Error'}
                            </Badge>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Saved {formatDate(paper.savedAt)}
                            </span>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {paper.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors || "Unknown authors"}
                            </p>
                            <p className="text-gray-700 line-clamp-2">
                              {paper.abstract}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {paper.status === 'completed' ? (
                            <Button size="sm" className="bg-royal-500 hover:bg-royal-600 text-white" asChild>
                              <Link href={`/reader/${paper.id}`}>
                                <FileText className="h-4 w-4 mr-1" />
                                Read
                              </Link>
                            </Button>
                          ) : paper.status === 'processing' ? (
                            <Button size="sm" disabled>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Processing...
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled>
                              Error
                            </Button>
                          )}
                          
                          <Button variant="outline" size="sm" asChild>
                            <a href={paper.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Source
                            </a>
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deletePaper(paper.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}