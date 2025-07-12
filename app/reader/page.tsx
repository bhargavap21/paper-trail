"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, FileUp, LinkIcon, ArrowLeft, FileText, UploadIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { UploadPapersSidebar } from "@/components/upload-papers-sidebar"

export default function ReaderPage() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Validate file type
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  }

  const handleFileUpload = async () => {
    if (!file) return

    setIsUploading(true)

    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Upload successful",
          description: `${data.paper.title} has been uploaded and processed.`,
        })
        // Redirect to library view with the new paper ID
        router.push(`/reader/${data.paper._id}`)
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
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Paper imported",
          description: `${data.paper.title} has been imported and processed.`,
        })
        router.push(`/reader/${data.paper._id}`)
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

  return (
    <div className="flex flex-col min-h-screen bg-ivory">
      <header className="border-b shadow-sm bg-white">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-royal-500 p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-royal-500">
                Eureka
              </span>
            </Link>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/" className="font-sans font-medium text-royal-500 hover:text-royal-600">Home</Link>
            <Link href="/reader" className="font-sans font-bold text-royal-700 underline underline-offset-4">Reader</Link>
            <Link href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</Link>
            <Link href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</Link>
            <Link href="/memory" className="font-sans font-medium text-royal-500 hover:text-royal-600">Memory</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="font-sans font-medium text-royal-500 border-royal-200 rounded-lg shadow-sm hover:shadow bg-white">Log in</Button>
            <Button size="sm" className="font-sans font-bold bg-royal-500 hover:bg-royal-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all">Sign up</Button>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1">
        {/* Papers Sidebar */}
        <UploadPapersSidebar onPaperClick={(paperId) => router.push(`/reader/${paperId}`)} />

        {/* Main Content */}
        <main className="flex-1 py-8 overflow-auto">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="flex flex-col items-center space-y-6 text-center mb-10">
              <div className="inline-flex items-center justify-center rounded-full bg-royal-100 p-3 text-royal-500">
                <UploadIcon className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Upload Research Paper</h1>
              <p className="text-gray-500 max-w-md">
                Upload a PDF file or provide a URL to a research paper to get started with PaperMind's advanced features.
              </p>
            </div>

            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 p-1 bg-gray-100 rounded-lg">
                <TabsTrigger
                  value="upload"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:text-royal-500 data-[state=active]:shadow-sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Upload PDF
                </TabsTrigger>
                <TabsTrigger
                  value="url"
                  className="rounded-md data-[state=active]:bg-white data-[state=active]:text-royal-500 data-[state=active]:shadow-sm"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Import from URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload">
                <Card className="border shadow-elegant overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col items-center">
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-12 w-full text-center cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => document.getElementById("file-upload")?.click()}
                      >
                        <div className="flex flex-col items-center space-y-4">
                          <div className="p-4 bg-royal-50 rounded-full">
                            <FileUp className="h-12 w-12 text-royal-500" />
                          </div>
                          <div>
                            <p className="font-medium text-lg">
                              {file ? file.name : "Drag and drop your PDF here or click to browse"}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF up to 50MB"}
                            </p>
                          </div>
                        </div>
                        <Input id="file-upload" type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                      </div>

                      <div className="p-6 w-full bg-gray-50">
                        <Button
                          className="w-full bg-royal-500 hover:bg-royal-600 shadow-md hover:shadow-lg transition-all"
                          size="lg"
                          onClick={handleFileUpload}
                          disabled={!file || isUploading}
                        >
                          {isUploading ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            "Upload Paper"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="url">
                <Card className="border shadow-elegant overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col space-y-6">
                      <div className="flex flex-col space-y-2">
                        <label htmlFor="paper-url" className="text-sm font-medium">
                          Paper URL
                        </label>
                        <div className="flex">
                          <div className="relative flex-grow">
                            <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <Input
                              id="paper-url"
                              placeholder="https://arxiv.org/pdf/2303.08774.pdf"
                              className="pl-10 border-2 focus-royal-blue"
                              value={url}
                              onChange={(e) => setUrl(e.target.value)}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Supports direct PDF links from arXiv, ACL Anthology, IEEE Xplore, and other academic repositories
                        </p>
                      </div>

                      <Button
                        className="w-full bg-royal-500 hover:bg-royal-600 shadow-md hover:shadow-lg transition-all"
                        size="lg"
                        onClick={handleUrlSubmit}
                        disabled={!url || isUploading}
                      >
                        {isUploading ? (
                          <>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Importing...
                          </>
                        ) : (
                          "Import Paper"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Want to try it out first?{" "}
                <Link
                  href="/reader/demo"
                  className="font-medium text-royal-500 hover:text-royal-600 underline underline-offset-4"
                >
                  View a demo paper
                </Link>
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4">
                <div className="p-3 bg-royal-50 rounded-full mb-4">
                  <FileText className="h-6 w-6 text-royal-500" />
                </div>
                <h3 className="font-medium mb-2">Multiple Formats</h3>
                <p className="text-sm text-gray-500">Support for PDF, arXiv, DOI, and direct URLs to academic papers.</p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="p-3 bg-royal-50 rounded-full mb-4">
                  <BookOpen className="h-6 w-6 text-royal-500" />
                </div>
                <h3 className="font-medium mb-2">Automatic Extraction</h3>
                <p className="text-sm text-gray-500">
                  We extract metadata, citations, and structure for better organization.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="p-3 bg-royal-50 rounded-full mb-4">
                  <LinkIcon className="h-6 w-6 text-royal-500" />
                </div>
                <h3 className="font-medium mb-2">Browser Extension</h3>
                <p className="text-sm text-gray-500">
                  Save papers directly from journal websites with our browser extension.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}