"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { BookOpen, FileText } from "lucide-react"
import { UploadPapersSidebar } from "@/components/upload-papers-sidebar"
import { useReaderStore } from "@/lib/reader-store"

// Dynamically import CopilotChat
const CopilotChat = dynamic(() => import('@/components/copilot-chat'), {
  ssr: false
})

export default function ReaderPage() {
  const [papers, setPapers] = useState([])
  const [copilotChatOpen, setCopilotChatOpen] = useState(false)
  const [isCheckingTabs, setIsCheckingTabs] = useState(true)
  const { openPapers, activePaperId, hasHydrated, setHasHydrated } = useReaderStore()
  const router = useRouter()

  // Hydrate store and check for cached tabs first
  useEffect(() => {
    let hasRun = false;
    
    const checkTabsAndRedirect = async () => {
      if (hasRun) return;
      hasRun = true;
      
      try {
        // First, try to hydrate the store
        await useReaderStore.persist.rehydrate();
        setHasHydrated(true);
        
        // Small delay to ensure state is updated
        setTimeout(() => {
          const currentOpenPapers = useReaderStore.getState().openPapers;
          const currentActivePaperId = useReaderStore.getState().activePaperId;
          
          // Check if we have cached tabs and redirect to active paper
          if (currentOpenPapers.length > 0) {
            if (currentActivePaperId && currentOpenPapers.some(p => p.id === currentActivePaperId)) {
              // Redirect to the active paper
              router.replace(`/reader/${currentActivePaperId}`);
              return;
            } else {
              // Redirect to the first tab if no active paper
              router.replace(`/reader/${currentOpenPapers[0].id}`);
              return;
            }
          }
          
          // If no cached tabs, fetch papers from database
          fetch('/api/papers')
            .then(response => response.json())
            .then(data => {
              const papersList = data.papers || [];
              setPapers(papersList);
              
              // If papers exist in database, redirect to the first one
              if (papersList.length > 0) {
                router.replace(`/reader/${papersList[0].id}`);
                return;
              }
              setIsCheckingTabs(false);
            })
            .catch(error => {
              console.error('Error fetching papers:', error);
              setIsCheckingTabs(false);
            });
        }, 100);
        
      } catch (error) {
        console.error('Error checking tabs:', error);
        setIsCheckingTabs(false);
      }
    };

    checkTabsAndRedirect();
  }, [router, setHasHydrated])

  // Show loading state while checking for cached tabs
  if (isCheckingTabs) {
    return (
      <div className="flex flex-col min-h-screen bg-ivory">
        <header className="border-b shadow-sm bg-white">
          <div className="flex h-16 items-center px-4 md:px-6 relative">
            <Link href="/" className="flex items-center gap-2 mr-8">
              <div className="bg-royal-500 p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-sans font-bold text-royal-500">
                Eureka
              </span>
            </Link>
            <nav className="hidden md:flex gap-6 absolute left-1/2 transform -translate-x-1/2">
              <Link href="/reader" className="font-sans font-bold text-royal-700 underline underline-offset-4">Reader</Link>
              <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
              <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
              <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
            </nav>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 z-10">
            <UploadPapersSidebar onPaperClick={(paperId) => router.push(`/reader/${paperId}`)} onPaperDeleted={() => {}} onAllPapersDeleted={() => {}} />
          </div>
          
          {/* Loading state - invisible placeholder */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md opacity-0">
              {/* Invisible placeholder to prevent layout shift */}
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 z-10">
            <CopilotChat 
              isOpen={copilotChatOpen}
              onClose={() => setCopilotChatOpen(false)}
              initialContext=""
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-ivory">
      <header className="border-b shadow-sm bg-white">
        <div className="flex h-16 items-center px-4 md:px-6 relative">
          <Link href="/" className="flex items-center gap-2 mr-8">
            <div className="bg-royal-500 p-1.5 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-sans font-bold text-royal-500">
              Eureka
            </span>
          </Link>
          <nav className="hidden md:flex gap-6 absolute left-1/2 transform -translate-x-1/2">
            <Link href="/reader" className="font-sans font-bold text-royal-700 underline underline-offset-4">Reader</Link>
            <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
            <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
            <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
          </nav>
        </div>
      </header>

      {/* Main Layout with absolute positioning */}
      <div className="flex-1 relative overflow-hidden">
        {/* Left Sidebar */}
        <div className="absolute left-0 top-0 bottom-0 z-10">
          <UploadPapersSidebar onPaperClick={(paperId) => router.push(`/reader/${paperId}`)} onPaperDeleted={() => {}} onAllPapersDeleted={() => {}} />
        </div>

        {/* Main Content - Always Centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="inline-flex items-center justify-center rounded-full bg-royal-100 p-6 text-royal-500">
              <FileText className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-800">No Papers Open</h1>
              <p className="text-gray-500">
                Upload a paper using the sidebar or select an existing paper to start reading.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Copilot Chat */}
        <div className="absolute right-0 top-0 bottom-0 z-10">
          <CopilotChat 
            isOpen={copilotChatOpen}
            onClose={() => setCopilotChatOpen(false)}
            initialContext=""
          />
        </div>
      </div>
    </div>
  )
}