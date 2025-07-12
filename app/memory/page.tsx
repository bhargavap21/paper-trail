"use client"

import { useState, useEffect, useCallback } from "react"
import NextLink from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { BookOpen, Brain, ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import { useRouter } from 'next/navigation'
import { useToast } from "@/hooks/use-toast"
import SemanticGraph, { type GraphData, type GraphNode } from "@/components/semantic-graph"
import SimilarityMatrix from "@/components/similarity-matrix"
import dynamic from "next/dynamic"

// Load A-Frame only when needed for this page
const AFrameScript = dynamic(() => import('@/components/aframe-script'), { ssr: false })

interface MemoryItem {
  id: string;
  text: string;
  paperId: string;
  paperTitle?: string;
  createdAt: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

export default function MemoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5) // 50% default
  const [updatingThreshold, setUpdatingThreshold] = useState(false)

  // Fetch graph data from API
  const fetchGraphData = useCallback(async (customThreshold?: number) => {
    try {
      console.log('Fetching graph data...')
      const response = await fetch('/api/memory/list')
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Received graph data:', data)
      
      // Validate the received data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format received from API')
      }
      
      const nodes = Array.isArray(data.nodes) ? data.nodes : []
      const edges = Array.isArray(data.edges) ? data.edges : []
      
      console.log(`Validated data: ${nodes.length} nodes, ${edges.length} edges`)
      
      // If we have a custom threshold, recalculate edges
      if (customThreshold !== undefined && nodes.length > 1) {
        console.log(`Recalculating edges with threshold: ${customThreshold}`)
        try {
          const recalcResponse = await fetch('/api/memory/recalculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threshold: customThreshold })
          })
          
          if (recalcResponse.ok) {
            const recalcData = await recalcResponse.json()
            if (recalcData.graphData) {
              setGraphData(recalcData.graphData)
              setRefreshTrigger(prev => prev + 1)
              return
            }
          }
        } catch (recalcError) {
          console.error('Error recalculating with custom threshold:', recalcError)
          // Fall back to original data
        }
      }
      
      setGraphData({ nodes, edges })
      setRefreshTrigger(prev => prev + 1) // Trigger similarity matrix refresh
    } catch (error) {
      console.error('Error fetching graph data:', error)
      toast({
        title: "Error",
        description: `Failed to load memory graph: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
      // Set empty data on error to prevent crashes
      setGraphData({ nodes: [], edges: [] })
    }
  }, [toast])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchGraphData(similarityThreshold)
      setLoading(false)
    }
    
    loadData()
  }, [fetchGraphData, similarityThreshold])

  // Handle threshold change
  const handleThresholdChange = async (newThreshold: number[]) => {
    const threshold = newThreshold[0]
    setSimilarityThreshold(threshold)
    setUpdatingThreshold(true)
    
    console.log(`Threshold changed to: ${threshold} (${(threshold * 100).toFixed(0)}%)`)
    
    // Debounce the API call to avoid too many requests
    setTimeout(async () => {
      await fetchGraphData(threshold)
      setUpdatingThreshold(false)
      toast({
        title: "Threshold Updated",
        description: `Similarity threshold set to ${(threshold * 100).toFixed(0)}%`
      })
    }, 300)
  }

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchGraphData(similarityThreshold)
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "Memory graph updated"
    })
  }

  // Handle node deletion
  const handleNodeDelete = async (nodeId: string) => {
    try {
      console.log(`Deleting node: ${nodeId}`)
      
      const response = await fetch(`/api/memory/delete/${nodeId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete memory item')
      }

      // Update local state immediately
      setGraphData(prev => ({
        nodes: prev.nodes.filter(node => node.id !== nodeId),
        edges: prev.edges.filter(edge => 
          edge.source !== nodeId && edge.target !== nodeId
        )
      }))

      toast({
        title: "Deleted",
        description: "Memory item removed from graph"
      })

      // Trigger similarity matrix refresh
      setRefreshTrigger(prev => prev + 1)

    } catch (error: any) {
      console.error('Error deleting node:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete memory item",
        variant: "destructive"
      })
    }
  }

  // Handle node click (navigate to paper)
  const handleNodeClick = (node: GraphNode) => {
    console.log('Node clicked:', node)
    // You could implement additional actions here like showing more details
  }

  // Set up real-time updates (polling every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing && !updatingThreshold) {
        fetchGraphData(similarityThreshold)
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [fetchGraphData, loading, refreshing, updatingThreshold, similarityThreshold])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-ivory">
        {/* Header */}
        <header className="border-b bg-white shadow-sm">
          <div className="flex h-16 items-center px-4 md:px-6 relative">
            <NextLink href="/" className="flex items-center gap-2 mr-8">
              <div className="bg-royal-500 p-1.5 rounded-lg">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-sans font-bold text-royal-500">Eureka</span>
            </NextLink>
            <nav className="hidden md:flex gap-6 absolute left-1/2 transform -translate-x-1/2">
              <NextLink href="/reader" className="font-sans font-medium text-royal-500 hover:text-royal-600">Reader</NextLink>
              <NextLink href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</NextLink>
              <NextLink href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</NextLink>
              <NextLink href="/memory" className="font-sans font-bold text-royal-700 underline underline-offset-4">Memory</NextLink>
            </nav>
          </div>
        </header>

        {/* Loading State */}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-royal-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading memory graph...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-ivory">
      {/* Load A-Frame for this page only */}
      <AFrameScript />
      
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="flex h-16 items-center px-4 md:px-6 relative">
          <NextLink href="/" className="flex items-center gap-2 mr-8">
            <div className="bg-royal-500 p-1.5 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-sans font-bold text-royal-500">Eureka</span>
          </NextLink>
          <nav className="hidden md:flex gap-6 absolute left-1/2 transform -translate-x-1/2">
            <NextLink href="/reader" className="font-sans font-medium text-royal-500 hover:text-royal-600">Reader</NextLink>
            <NextLink href="/search" className="font-sans font-medium text-royal-500 hover:text-royal-600">Search</NextLink>
            <NextLink href="/library" className="font-sans font-medium text-royal-500 hover:text-royal-600">Library</NextLink>
            <NextLink href="/memory" className="font-sans font-bold text-royal-700 underline underline-offset-4">Memory</NextLink>
          </nav>
          <div className="flex items-center gap-4 ml-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1 text-royal-500 hover:bg-royal-100"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 text-royal-500 hover:bg-royal-100"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6">
        <div className="container px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Brain className="h-6 w-6 text-royal-500" />
              <h1 className="text-3xl font-sans font-bold text-royal-500">Semantic Memory Graph</h1>
            </div>

            {/* Graph or Empty State */}
            {graphData.nodes.length === 0 ? (
              <Card className="bg-white shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="bg-royal-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Brain className="h-8 w-8 text-royal-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    No Memory Items Yet
                  </h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Start highlighting text in papers to build your semantic knowledge graph. 
                    Similar concepts will automatically connect based on AI embeddings.
                  </p>
                  <NextLink href="/reader">
                    <Button className="bg-royal-500 hover:bg-royal-600 text-white">
                      Upload Your First Paper
                    </Button>
                  </NextLink>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Graph */}
                <div className="lg:col-span-2">
                  <Card className="bg-white shadow-sm">
                    <CardContent className="p-6">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h2 className="text-lg font-semibold text-royal-700">
                              Knowledge Graph
                            </h2>
                            <p className="text-sm text-gray-600">
                              Nodes represent clipped sentences. Connections show semantic similarity {'>'}{(similarityThreshold * 100).toFixed(0)}%.
                            </p>
                          </div>
                          <div className="text-sm text-gray-600">
                            Last updated: {new Date().toLocaleTimeString()}
                          </div>
                        </div>
                        
                        {/* Similarity Threshold Slider */}
                        <div className="bg-royal-50 border border-royal-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <label className="text-sm font-medium text-royal-700">
                                Similarity Threshold
                              </label>
                              <p className="text-xs text-royal-600">
                                Adjust to show more or fewer connections
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-royal-700">
                                {(similarityThreshold * 100).toFixed(0)}%
                              </span>
                              {updatingThreshold && (
                                <RefreshCw className="h-4 w-4 animate-spin text-royal-500" />
                              )}
                            </div>
                          </div>
                          
                          <Slider
                            value={[similarityThreshold]}
                            onValueChange={handleThresholdChange}
                            min={0.1}
                            max={0.9}
                            step={0.05}
                            className="w-full"
                            disabled={updatingThreshold}
                          />
                          
                          <div className="flex justify-between text-xs text-royal-600 mt-1">
                            <span>10% (More connections)</span>
                            <span>50% (Balanced)</span>
                            <span>90% (Fewer connections)</span>
                          </div>
                        </div>
                      </div>
                      
                      <SemanticGraph
                        graphData={graphData}
                        onNodeClick={handleNodeClick}
                        onNodeDelete={handleNodeDelete}
                        height="700px"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Similarity Matrix */}
                <div className="lg:col-span-1">
                  <SimilarityMatrix 
                    refreshTrigger={refreshTrigger} 
                    currentThreshold={similarityThreshold}
                  />
                </div>
              </div>
            )}

            {/* Instructions */}
            <Card className="mt-6 bg-royal-50 border-royal-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-royal-700 mb-2">How to Use</h3>
                <ul className="text-sm text-royal-600 space-y-1">
                  <li>• <strong>Clip sentences</strong> in the PDF reader to add them to your memory</li>
                  <li>• <strong>Hover over nodes</strong> to see the full sentence text</li>
                  <li>• <strong>Click nodes</strong> to see details and navigate to the source paper</li>
                  <li>• <strong>Search</strong> to highlight matching nodes in green</li>
                  <li>• <strong>Adjust threshold</strong> with the slider to control connection sensitivity</li>
                  <li>• <strong>Debug panel</strong> on the right shows all similarity scores in real-time</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
