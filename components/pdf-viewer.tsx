"use client"

import React, { useState, useEffect } from "react"
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut } from "lucide-react"

// Dynamically import react-pdf components with ssr: false to avoid canvas issues
const PDFComponents = dynamic(() => import('./pdf-components'), {
  ssr: false,
  loading: () => <div></div> // No loading spinner for faster tab switches
});

interface PDFViewerProps {
  url: string
  fileName?: string
  paperId?: string
  onAddToCopilotChat?: (text: string) => void
}

export function PDFViewer({ url, fileName, paperId, onAddToCopilotChat }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState(2.0)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [isValidPdf, setIsValidPdf] = useState<boolean>(true)

  // Reset error states when URL changes (when switching papers)
  useEffect(() => {
    setPdfError(null)
    setIsValidPdf(true)
    setCurrentPage(1) // Reset to page 1 when switching papers
    // Don't reset numPages to avoid unnecessary loading states
  }, [url])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPdfError(null)
    setIsValidPdf(true)
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF loading error:', error)
    setPdfError(error.message)
    setIsValidPdf(false)
    
    // Check if it's a text file issue
    if (error.message.includes('Invalid PDF structure') || error.message.includes('InvalidPDFException')) {
      console.log('Detected invalid PDF structure - likely a text file')
    }
  }

  function changeScale(delta: number) {
    setScale((prevScale) => {
      const newScale = prevScale + delta
      return newScale >= 0.5 && newScale <= 3.0 ? newScale : prevScale
    })
  }

  function handleCurrentPageChange(pageNumber: number) {
    setCurrentPage(pageNumber)
  }

  // Check if it's a text file based on URL
  const isTextFile = url.endsWith('.txt')
  
  return (
    <div className="w-full h-full">
      <div className="bg-white rounded-lg shadow-elegant p-4 w-full h-full flex flex-col">
        <div className="flex-1 overflow-auto">
          {pdfError && !isValidPdf ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                <h3 className="text-lg font-semibold text-red-800 mb-2">PDF Loading Error</h3>
                <p className="text-red-600 mb-4">
                  {pdfError.includes('Invalid PDF structure') 
                    ? 'This appears to be a placeholder document. The original PDF could not be extracted.' 
                    : 'Unable to load PDF document.'}
                </p>
                <p className="text-sm text-gray-600">
                  Please try accessing the original source document using the link above.
                </p>
              </div>
            </div>
          ) : isTextFile ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Text Document</h3>
                <p className="text-blue-600 mb-4">
                  This is a text-based placeholder. The original PDF could not be extracted.
                </p>
                <p className="text-sm text-gray-600">
                  Please access the original source document using the link above.
                </p>
              </div>
            </div>
          ) : (
            <PDFComponents 
              file={url} 
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              scale={scale}
              showAllPages={true}
              paperId={paperId}
              onAddToCopilotChat={onAddToCopilotChat}
              onCurrentPageChange={handleCurrentPageChange}
            />
          )}
        </div>
      </div>

      {/* Fixed Zoom Controls - Bottom Center */}
      {numPages && !pdfError && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-lg border border-gray-200">
          <Button 
            onClick={() => changeScale(-0.2)}
            disabled={scale <= 0.5}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium min-w-[50px] text-center">
            {Math.round((scale / 2.0) * 100)}%
          </span>
          
          <Button 
            onClick={() => changeScale(0.2)}
            disabled={scale >= 3.0}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <div className="border-l border-gray-300 pl-3 ml-2">
            <span className="text-xs text-gray-500">
              Page {currentPage} of {numPages}
            </span>
          </div>

        </div>
      )}
    </div>
  )
}