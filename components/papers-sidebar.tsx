"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, X, FileText, BookOpen, Upload, Plus, Trash2, Brain } from "lucide-react"

interface PapersSidebarProps {
  isOpen: boolean
  onClose: () => void
  activePaperId: string
}

// Define type for fetched paper data
interface PaperData {
  _id: string;
  title: string;
  createdAt?: string; // Optional for sorting
}

export function PapersSidebar({ isOpen, onClose, activePaperId }: PapersSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [papers, setPapers] = useState<PaperData[]>([]) // State to hold fetched papers
  const [loading, setLoading] = useState(true) // Loading state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [quizLoading, setQuizLoading] = useState(false) // Quiz generation loading state
  const router = useRouter() // Initialize router

  // Fetch papers on component mount
  useEffect(() => {
    const fetchPapers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/upload'); // Fetch from the GET endpoint
        if (!response.ok) {
          throw new Error('Failed to fetch papers');
        }
        const data = await response.json();
        setPapers(data.papers || []);
      } catch (error) {
        console.error('Error fetching papers for sidebar:', error);
        setPapers([]); // Reset papers on error
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, []); // Empty dependency array ensures this runs only once on mount

  const filteredPapers = papers.filter(
    (paper) =>
      paper.title.toLowerCase().includes(searchQuery.toLowerCase())
      // Add search by author/year if needed later
  )

  // Delete paper handler
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/papers/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete paper');
      }
      
      // If the deleted paper is currently open, navigate to another paper
      if (id === activePaperId) {
        // Find the index of the deleted paper
        const index = filteredPapers.findIndex(p => p._id === id);
        
        // Remove the deleted paper from state
        const updatedPapers = papers.filter(p => p._id !== id);
        setPapers(updatedPapers);
        
        // Find the next paper to show (or the previous one if we deleted the last paper)
        if (updatedPapers.length > 0) {
          // If there's a next paper, show it
          if (index < updatedPapers.length) {
            router.push(`/reader/${updatedPapers[index]._id}`);
          } 
          // Otherwise show the last paper
          else if (index > 0) {
            router.push(`/reader/${updatedPapers[updatedPapers.length - 1]._id}`);
          }
        } else {
          // If no papers left, go to an empty reader state
          router.push('/reader');
        }
      } else {
        // If the deleted paper is not the active one, just update state
        setPapers((prev) => prev.filter((p) => p._id !== id));
      }
    } catch (error) {
      alert('Error deleting paper.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      id="sidebar"
      className={`fixed inset-y-0 left-0 z-20 w-72 bg-white border-r shadow-lg transform transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-royal-500 p-1.5 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-sans font-bold text-royal-500">Papers</span>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search papers..."
              className="pl-10 focus-royal-blue font-sans"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Papers List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading papers...</div>
            ) : filteredPapers.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No papers found.</div>
            ) : (
              filteredPapers.map((paper) => (
                <div key={paper._id} className="group relative">
                  <Link href={`/reader/${paper._id}`} passHref legacyBehavior>
                    <a
                      className={`block p-3 rounded-lg cursor-pointer transition-all font-sans ${
                        paper._id === activePaperId
                          ? "bg-royal-50 border border-royal-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                      onClick={(e) => {
                        if (paper._id === activePaperId) {
                          // e.preventDefault();
                        }
                        if (window.innerWidth < 768) {
                          onClose();
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-md ${
                            paper._id === activePaperId
                              ? "bg-royal-100 text-royal-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-sm font-medium truncate ${
                              paper._id === activePaperId ? "text-royal-600" : "text-gray-800"
                            }`}
                          >
                            {paper.title}
                          </h3>
                        </div>
                        {/* Delete button always visible */}
                        <button
                          className="flex-shrink-0 p-1 rounded hover:bg-red-100 transition-colors"
                          title="Delete paper"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(paper._id); }}
                          disabled={deletingId === paper._id}
                        >
                          {deletingId === paper._id ? (
                            <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </button>
                      </div>
                    </a>
                  </Link>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 border-t space-y-3">
          {/* Quiz Button - only show if there's an active paper */}
          {activePaperId && (
            <Link href={`/quiz/${activePaperId}`}>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-sans font-medium gap-2"
                disabled={quizLoading}
                onClick={() => setQuizLoading(true)}
              >
                {quizLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Take Quiz
                  </>
                )}
              </Button>
            </Link>
          )}
          
          <Link href="/reader">
            <Button className="w-full bg-royal-500 hover:bg-royal-600 text-white font-sans font-medium gap-2">
              <Upload className="h-4 w-4" />
              Upload New Paper
            </Button>
          </Link>
          <div className="text-center">
            <Link
              href="/memory"
              className="text-sm text-royal-500 hover:text-royal-600 font-sans flex items-center justify-center gap-1"
            >
              <Plus className="h-3 w-3" />
              Import from Memory
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
