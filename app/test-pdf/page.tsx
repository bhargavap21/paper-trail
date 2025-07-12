"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import dynamic from 'next/dynamic'

// Dynamically import the PDF components
const PDFComponents = dynamic(() => import('../../components/pdf-components'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
});

export default function TestPdfPage() {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  
  // Direct path to a PDF file in your uploads directory
  const pdfUrl = "/uploads/1745727146284-A_Study_Of_Cyber_Security_Challenges_And_Its_Emerg.pdf"
  
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    console.log("PDF loaded successfully with", numPages, "pages");
    setNumPages(numPages)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">PDF Test Page</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">PDF Viewer Test</h2>
        <p className="mb-4">Testing direct PDF rendering from: {pdfUrl}</p>
        
        <PDFComponents
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          pageNumber={pageNumber}
          scale={scale}
        />
        
        <div className="flex items-center justify-between mt-4">
          <Button 
            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
          >
            Previous Page
          </Button>
          
          <span>
            Page {pageNumber} of {numPages || '-'}
          </span>
          
          <Button
            onClick={() => setPageNumber(prev => numPages ? Math.min(prev + 1, numPages) : prev)}
            disabled={numPages !== null && pageNumber >= numPages}
          >
            Next Page
          </Button>
        </div>
      </div>
      
      <div className="text-center">
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    </div>
  )
} 