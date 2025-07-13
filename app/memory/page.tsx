"use client"

import { useState, useEffect, useCallback } from "react"
import NextLink from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { BookOpen, Brain, Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import SemanticGraph, { type GraphData, type GraphNode, type GraphEdge as SemanticGraphEdge } from "@/components/semantic-graph"
import SimilarityMatrix from "@/components/similarity-matrix"
import { MemoryTabs } from "@/components/memory-tabs"
import { MemoryGraph } from "@/app/api/memory/db"
import { useMemoryGraphSession } from "@/hooks/use-memory-graph-session"
import dynamic from "next/dynamic"

// Dynamically import MemoryCopilot
const MemoryCopilot = dynamic(() => import('@/components/memory-copilot'), {
  ssr: false,
})

// Load A-Frame only when needed for this page
const AFrameScript = dynamic(() => import('@/components/aframe-script'), { ssr: false })

interface MemoryItem {
  id: string;
  text: string;
  paperId: string;
  paperTitle?: string;
  createdAt: string;
  graphId: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  graphId: string;
}

export default function MemoryPage() {
  const { toast } = useToast()
  const { sessionGraphId } = useMemoryGraphSession()
  const [graphs, setGraphs] = useState<MemoryGraph[]>([])
  const [activeGraphId, setActiveGraphId] = useState<string>("")
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5) // 50% default
  const [updatingThreshold, setUpdatingThreshold] = useState(false)
  
  // Copilot state
  const [copilotOpen, setCopilotOpen] = useState(true)
  const [copilotAutoPrompt, setCopilotAutoPrompt] = useState<string>('')
  const [forceExpandCopilot, setForceExpandCopilot] = useState(false)
  
  // Selected connection state for copilot
  const [selectedConnection, setSelectedConnection] = useState<{
    sourceNode: GraphNode | null
    targetNode: GraphNode | null
  } | null>(null)
  


  // Fetch memory graphs
  const fetchGraphs = useCallback(async () => {
    try {
      console.log('Fetching memory graphs...')
      const response = await fetch('/api/memory/graphs')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Received graphs:', data)
      
      setGraphs(data)
      
      // Set active graph with priority: session graph > default graph > first graph
      if (data.length > 0 && !activeGraphId) {
        let targetGraph: MemoryGraph | undefined
        
        // First priority: session-stored graph (if it exists in the list)
        if (sessionGraphId) {
          targetGraph = data.find((g: MemoryGraph) => g.id === sessionGraphId)
        }
        
        // Second priority: default graph
        if (!targetGraph) {
          targetGraph = data.find((g: MemoryGraph) => g.isDefault)
        }
        
        // Third priority: first graph
        if (!targetGraph) {
          targetGraph = data[0]
        }
        
        if (targetGraph) {
          setActiveGraphId(targetGraph.id)
        }
      }
    } catch (error) {
      console.error('Error fetching graphs:', error)
      toast({
        title: "Error",
        description: `Failed to load memory graphs: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    }
  }, [activeGraphId, sessionGraphId, toast])

  // Fetch graph data from API
  const fetchGraphData = useCallback(async (graphId: string, customThreshold?: number) => {
    try {
      console.log(`Fetching graph data for graph: ${graphId}`)
      const url = `/api/memory/list?graphId=${graphId}`
      const response = await fetch(url)
      
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
      console.log('Node data sample:', nodes.slice(0, 2))
      console.log('Edge data sample:', edges.slice(0, 2))
      
      // If we have a custom threshold, recalculate edges
      if (customThreshold !== undefined && nodes.length > 1) {
        console.log(`Recalculating edges with threshold: ${customThreshold}`)
        try {
          const recalcResponse = await fetch('/api/memory/recalculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threshold: customThreshold, graphId })
          })
          
          if (recalcResponse.ok) {
            const recalcData = await recalcResponse.json()
            if (recalcData.graphData) {
              console.log('Recalculated graph data:', recalcData.graphData)
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
      
      console.log('Setting graph data with nodes:', nodes.length, 'edges:', edges.length)
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
      await fetchGraphs()
      setLoading(false)
    }
    
    loadData()
  }, [fetchGraphs])

  // Load graph data when active graph changes
  useEffect(() => {
    if (activeGraphId) {
      fetchGraphData(activeGraphId, similarityThreshold)
    }
  }, [activeGraphId, similarityThreshold, fetchGraphData])

  // Handle threshold change
  const handleThresholdChange = async (newThreshold: number[]) => {
    setUpdatingThreshold(true)
    setSimilarityThreshold(newThreshold[0])
    
    if (activeGraphId) {
      await fetchGraphData(activeGraphId, newThreshold[0])
    }
    
    setUpdatingThreshold(false)
  }

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    if (activeGraphId) {
      await fetchGraphData(activeGraphId, similarityThreshold)
    }
    setRefreshing(false)
    toast({
      title: "Refreshed",
      description: "Memory graph updated"
    })
  }

  // Handle tab change
  const handleTabChange = (graphId: string) => {
    setActiveGraphId(graphId)
  }

  // Handle tab creation
  const handleTabCreate = async (name: string) => {
    try {
      const response = await fetch('/api/memory/graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })

      if (!response.ok) {
        throw new Error('Failed to create graph')
      }

      const newGraph = await response.json()
      setGraphs(prev => [...prev, newGraph])
      setActiveGraphId(newGraph.id)
      
      toast({
        title: "Graph Created",
        description: `Memory graph "${name}" created successfully`
      })
    } catch (error) {
      console.error('Error creating graph:', error)
      toast({
        title: "Error",
        description: "Failed to create memory graph",
        variant: "destructive"
      })
    }
  }

  // Handle tab rename
  const handleTabRename = async (graphId: string, newName: string) => {
    try {
      const response = await fetch(`/api/memory/graphs/${graphId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      })

      if (!response.ok) {
        throw new Error('Failed to rename graph')
      }

      const updatedGraph = await response.json()
      setGraphs(prev => prev.map(g => g.id === graphId ? updatedGraph : g))
      
      toast({
        title: "Graph Renamed",
        description: `Memory graph renamed to "${newName}"`
      })
    } catch (error) {
      console.error('Error renaming graph:', error)
      toast({
        title: "Error",
        description: "Failed to rename memory graph",
        variant: "destructive"
      })
    }
  }

  // Handle tab close
  const handleTabClose = async (graphId: string) => {
    const graphToDelete = graphs.find(g => g.id === graphId)
    if (!graphToDelete) return

    if (!window.confirm(`Are you sure you want to delete the memory graph "${graphToDelete.name}"? This will permanently delete all memory items and connections in this graph.`)) {
      return
    }

    try {
      const response = await fetch(`/api/memory/graphs/${graphId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete graph')
      }

      setGraphs(prev => prev.filter(g => g.id !== graphId))
      
      // If we deleted the active graph, switch to another one
      if (activeGraphId === graphId) {
        const remainingGraphs = graphs.filter(g => g.id !== graphId)
        if (remainingGraphs.length > 0) {
          setActiveGraphId(remainingGraphs[0].id)
        } else {
          setActiveGraphId("")
        }
      }
      
      toast({
        title: "Graph Deleted",
        description: `Memory graph "${graphToDelete.name}" deleted successfully`
      })
    } catch (error) {
      console.error('Error deleting graph:', error)
      toast({
        title: "Error",
        description: "Failed to delete memory graph",
        variant: "destructive"
      })
    }
  }

  // Handle node deletion
  const handleNodeDelete = useCallback(async (nodeId: string) => {
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
  }, [toast])

  // Handle node click (navigate to paper)
  const handleNodeClick = useCallback((node: GraphNode) => {
    console.log('Node clicked:', node)
    // You could implement additional actions here like showing more details
  }, [])

  // Handle edge clicks for connection explanation - store selected connection
  const handleEdgeClick = useCallback((edge: SemanticGraphEdge, sourceNode: GraphNode, targetNode: GraphNode, position?: { x: number; y: number }) => {
    console.log('Edge clicked:', edge, sourceNode, targetNode)
    
    // Store the selected connection for the copilot
    setSelectedConnection({
      sourceNode,
      targetNode
    })
    
    // Ensure copilot is open
    setCopilotOpen(true)
  }, [])



  // Set up real-time updates (polling every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !refreshing && !updatingThreshold && activeGraphId) {
        fetchGraphData(activeGraphId, similarityThreshold)
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [fetchGraphData, loading, refreshing, updatingThreshold, activeGraphId, similarityThreshold])

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
            <p className="text-gray-600">Loading memory graphs...</p>
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
      <header className="border-b bg-white shadow-sm sticky top-0 z-30">
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

      {/* Memory Graph Tabs */}
      {graphs.length > 0 && (
        <div className="sticky top-16 z-20 bg-white">
          <MemoryTabs
            graphs={graphs}
            activeGraphId={activeGraphId}
            onTabChange={handleTabChange}
            onTabClose={handleTabClose}
            onTabCreate={handleTabCreate}
            onTabRename={handleTabRename}
          />
        </div>
      )}

      {/* Main Content with Sidebar Layout */}
      <div className="flex-1 relative overflow-hidden">
        {/* Main Content */}
        <div className="absolute top-0 bottom-0 left-0 right-80 overflow-auto scrollbar-hide">
          <main className="py-6">
            <div className="container px-4">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-2 mb-6">
                  <Brain className="h-6 w-6 text-royal-500" />
                  <h1 className="text-3xl font-sans font-bold text-royal-500">Semantic Memory Graph</h1>
                  {activeGraphId && (
                    <div className="bg-royal-100 px-3 py-1 rounded-full">
                      <span className="text-sm font-medium text-royal-700">
                        {graphs.find(g => g.id === activeGraphId)?.name || 'Unknown Graph'}
                      </span>
                    </div>
                  )}
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
                  <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                    {/* Main Graph */}
                    <div className="lg:col-span-5">
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
                            onEdgeClick={handleEdgeClick}
                            height="700px"
                          />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Similarity Matrix */}
                    <div className="lg:col-span-2">
                      <SimilarityMatrix 
                        refreshTrigger={refreshTrigger} 
                        currentThreshold={similarityThreshold}
                        graphId={activeGraphId}
                      />
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <Card className="mt-6 bg-royal-50 border-royal-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-royal-700 mb-2">How to Use Multiple Memory Graphs</h3>
                    <ul className="text-sm text-royal-600 space-y-1">
                      <li>• <strong>Create new graphs</strong> using the "New Graph" button in the tabs</li>
                      <li>• <strong>Switch between graphs</strong> by clicking on the tabs</li>
                      <li>• <strong>Rename graphs</strong> by clicking the edit icon on any tab</li>
                      <li>• <strong>Delete graphs</strong> by clicking the X icon (default graph cannot be deleted)</li>
                      <li>• <strong>Clip to specific graphs</strong> when highlighting text in papers</li>
                      <li>• <strong>Each graph is independent</strong> - connections only form within the same graph</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>

        {/* Right Sidebar - Memory Copilot */}
        <div className="absolute right-0 top-0 bottom-0 z-10">
          <MemoryCopilot
            isOpen={copilotOpen}
            onClose={() => setCopilotOpen(false)}
            autoPrompt={copilotAutoPrompt}
            forceExpand={forceExpandCopilot}
            selectedConnection={selectedConnection}
            onConnectionExplained={() => setSelectedConnection(null)}
            graphData={graphData}
            activeGraphId={activeGraphId}
          />
        </div>
      </div>
    </div>
  )
}
