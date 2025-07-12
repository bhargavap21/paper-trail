"use client"

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Search, 
  Calendar,
  Users,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SavedPaper {
  id: string
  title: string
  authors: string[]
  abstract: string
  url: string
  savedAt: string
  status: 'processing' | 'completed' | 'error'
}

interface UploadPapersSidebarProps {
  onPaperClick?: (paperId: string) => void
}

export function UploadPapersSidebar({ onPaperClick }: UploadPapersSidebarProps = {}) {
  const [papers, setPapers] = useState<SavedPaper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredPapers, setFilteredPapers] = useState<SavedPaper[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    loadSavedPapers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = papers.filter(paper => 
        paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.authors.some(author => author.toLowerCase().includes(searchQuery.toLowerCase()))
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

  const deletePaper = async (paperId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!window.confirm('Are you sure you want to delete this paper?')) {
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
    <div className={cn(
      "flex flex-col bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-12" : "w-80"
    )}>
      {/* Header */}
      <div className="flex items-center justify-center p-3 pl-4 border-b border-gray-200 bg-white relative">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-royal-600" />
            <span className="font-sans font-bold text-royal-700">Papers</span>
            {papers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {papers.length}
              </Badge>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 hover:bg-gray-100 absolute right-3"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <>
          {/* Search */}
          <div className="p-3 pl-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search papers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm border-gray-300 focus:border-royal-500"
              />
            </div>
          </div>

          {/* Papers List */}
          <ScrollArea className="flex-1">
            <div className="p-2 pl-4">
              {isLoading ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                  Loading papers...
                </div>
              ) : filteredPapers.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{searchQuery ? 'No papers found' : 'No papers yet'}</p>
                  <p className="text-xs mt-1">
                    {searchQuery ? 'Try adjusting your search' : 'Upload your first paper'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="group relative rounded-lg p-3 cursor-pointer transition-colors hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
                      onClick={() => {
                        if (paper.status === 'completed') {
                          if (onPaperClick) {
                            onPaperClick(paper.id)
                          } else {
                            window.open(`/reader/${paper.id}`, '_blank')
                          }
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-black leading-tight break-words overflow-hidden flex-1 min-w-0" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}>
                            {paper.title}
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => deletePaper(paper.id, e)}
                            className="opacity-60 hover:opacity-100 h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 transition-opacity flex-shrink-0"
                            title="Delete paper"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {paper.status !== 'completed' && (
                            <Badge className={cn(getStatusColor(paper.status), "text-xs px-1.5 py-0.5")}>
                              {paper.status === 'processing' ? 'Processing' : 'Error'}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDate(paper.savedAt)}
                          </span>
                        </div>

                        {paper.authors.length > 0 && (
                          <p className="text-xs text-gray-600 flex items-center gap-1 break-words">
                            <Users className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate">
                              {paper.authors.slice(0, 2).join(", ")}
                              {paper.authors.length > 2 && ` +${paper.authors.length - 2} more`}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  )
}