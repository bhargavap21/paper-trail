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
  ChevronRight,
  Upload,
  Plus,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

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
  onPaperDeleted?: (paperId: string) => void
  onAllPapersDeleted?: () => void
}

export function UploadPapersSidebar({ onPaperClick, onPaperDeleted, onAllPapersDeleted }: UploadPapersSidebarProps = {}) {
  const [papers, setPapers] = useState<SavedPaper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredPapers, setFilteredPapers] = useState<SavedPaper[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadSavedPapers()
  }, [])

  // Refresh papers when window regains focus (when user comes back to the app)
  useEffect(() => {
    const handleFocus = () => {
      loadSavedPapers()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Also refresh papers periodically to catch updates from other users
  useEffect(() => {
    const interval = setInterval(() => {
      loadSavedPapers()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  // Refresh papers when navigating back to reader view
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible again, refresh papers
        loadSavedPapers()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
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
    console.log('📄 Loading papers from MongoDB...')
    setIsLoading(true)
    try {
      const response = await fetch('/api/papers')
      if (response.ok) {
        const data = await response.json()
        const papersList = data.papers || []
        console.log(`📄 Loaded ${papersList.length} papers from MongoDB:`, papersList.map((p: SavedPaper) => p.title))
        setPapers(papersList)
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
        // Notify parent component that a paper was deleted
        if (onPaperDeleted) {
          onPaperDeleted(paperId)
        }
      } else {
        console.error('Failed to delete paper')
      }
    } catch (error) {
      console.error('Error deleting paper:', error)
    }
  }

  const deleteAllPapers = async () => {
    if (!window.confirm('Are you sure you want to delete ALL papers? This action cannot be undone!')) {
      return
    }

    // Double confirmation for such a destructive action
    if (!window.confirm('This will permanently delete all papers from your database. Are you absolutely sure?')) {
      return
    }

    try {
      const response = await fetch('/api/papers', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const data = await response.json()
        setPapers([])
        alert(`Successfully deleted ${data.deletedCount} papers`)
        
        // Notify parent component that all papers were deleted
        if (onAllPapersDeleted) {
          onAllPapersDeleted()
        }
        
        // Redirect to reader page (blank state) since all papers are deleted
        router.push('/reader')
      } else {
        console.error('Failed to delete all papers')
        alert('Failed to delete all papers')
      }
    } catch (error) {
      console.error('Error deleting all papers:', error)
      alert('Error deleting all papers')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        })
        return
      }
      setFile(selectedFile)
    }
  }

  const handleFileUpload = async () => {
    if (!file) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast({
          title: "Upload successful",
          description: `${data.paper.title} has been uploaded and processed.`,
        })
        setUploadDialogOpen(false)
        setFile(null)
        await loadSavedPapers() // Refresh the papers list
        
        // Open the newly uploaded paper in a new tab
        // Give it a small delay to ensure the paper is available in the database
        setTimeout(() => {
          if (onPaperClick) {
            onPaperClick(data.paper._id.toString())
          } else {
            router.push(`/reader/${data.paper._id}`)
          }
        }, 100)
      } else {
        throw new Error(data.error || "Unknown error")
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error processing your paper. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlSubmit = async () => {
    if (!url) return

    setIsUploading(true)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({
          title: "Paper imported",
          description: `${data.paper.title} has been imported and processed.`,
        })
        setUploadDialogOpen(false)
        setUrl("")
        await loadSavedPapers() // Refresh the papers list
        // Open in new tab instead of replacing current view
        if (onPaperClick) {
          onPaperClick(data.paper._id)
        } else {
          router.push(`/reader/${data.paper._id}`)
        }
      } else {
        throw new Error(data.error || "Unknown error")
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "There was an error importing the paper. Please check the URL and try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
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
    <>
      <div className={cn(
        "flex flex-col h-full bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-12" : "w-80"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 pl-4 border-b border-gray-200 bg-white">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-royal-600" />
              <span className="font-sans font-bold text-royal-700">Papers</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            {!isCollapsed && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSavedPapers}
                  disabled={isLoading}
                  className="h-7 w-7 p-0 border-royal-200 hover:bg-royal-50"
                  title="Refresh Papers from MongoDB"
                >
                  <RefreshCw className={cn("h-4 w-4 text-royal-600", isLoading && "animate-spin")} />
                </Button>
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 border-royal-200 hover:bg-royal-50"
                      title="Upload Paper"
                    >
                      <Plus className="h-4 w-4 text-royal-600" />
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Paper</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => document.getElementById("sidebar-file-upload")?.click()}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm font-medium break-words overflow-hidden px-2" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                      }}>
                        {file ? file.name : "Click to select PDF"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF up to 50MB"}
                      </p>
                      <Input
                        id="sidebar-file-upload"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                    <Button
                      onClick={handleFileUpload}
                      disabled={!file || isUploading}
                      className="w-full bg-royal-500 hover:bg-royal-600 text-white"
                    >
                      {isUploading ? "Uploading..." : "Upload Paper"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-7 w-7 p-0 hover:bg-gray-100"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
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
                              // Open in new tab within the same window
                              onPaperClick(paper.id)
                            } else {
                              // Fallback: open in browser tab
                              window.open(`/reader/${paper.id}`, '_blank')
                            }
                          }
                        }}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => deletePaper(paper.id, e)}
                              className="opacity-80 hover:opacity-100 h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 transition-all flex-shrink-0 text-gray-400 hover:text-red-600 mt-0.5"
                              title="Delete paper"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <h4 className="text-sm font-medium text-black leading-tight break-words overflow-hidden flex-1 min-w-0" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word'
                            }}>
                              {paper.title}
                            </h4>
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

            {/* Delete All Papers Button - Bottom of Sidebar */}
            {papers.length > 0 && (
              <div className="p-3 pl-4 border-t border-gray-200 bg-white">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteAllPapers}
                  className="w-full text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete All Papers ({papers.length})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}