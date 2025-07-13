"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { X, Plus, Edit2, Check, X as XIcon } from "lucide-react"
import { MemoryGraph } from "@/app/api/memory/db"

interface MemoryTabsProps {
  graphs: MemoryGraph[]
  activeGraphId: string
  onTabChange: (id: string) => void
  onTabClose: (id: string) => void
  onTabCreate: (name: string) => void
  onTabRename: (id: string, newName: string) => void
}

export function MemoryTabs({ 
  graphs, 
  activeGraphId, 
  onTabChange, 
  onTabClose, 
  onTabCreate,
  onTabRename 
}: MemoryTabsProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newGraphName, setNewGraphName] = useState("")
  const [editingGraphId, setEditingGraphId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const handleCreateGraph = () => {
    if (newGraphName.trim()) {
      onTabCreate(newGraphName.trim())
      setNewGraphName("")
      setIsCreateDialogOpen(false)
    }
  }

  const handleStartEdit = (graph: MemoryGraph) => {
    setEditingGraphId(graph.id)
    setEditingName(graph.name)
  }

  const handleSaveEdit = () => {
    if (editingGraphId && editingName.trim()) {
      onTabRename(editingGraphId, editingName.trim())
    }
    setEditingGraphId(null)
    setEditingName("")
  }

  const handleCancelEdit = () => {
    setEditingGraphId(null)
    setEditingName("")
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: 'create' | 'edit') => {
    if (e.key === 'Enter') {
      if (action === 'create') {
        handleCreateGraph()
      } else {
        handleSaveEdit()
      }
    } else if (e.key === 'Escape') {
      if (action === 'create') {
        setIsCreateDialogOpen(false)
        setNewGraphName("")
      } else {
        handleCancelEdit()
      }
    }
  }

  return (
    <div className="bg-gray-50 min-h-[40px] border-b border-gray-200">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-0 min-h-[40px] items-center">
          {graphs.map((graph) => (
            <div
              key={graph.id}
              className={`flex items-center px-4 py-2 border-r border-b-2 min-w-[180px] max-w-[240px] font-sans ${
                graph.id === activeGraphId
                  ? "border-b-royal-500 bg-white"
                  : "border-b-transparent hover:bg-gray-100"
              }`}
            >
              {editingGraphId === graph.id ? (
                <div className="flex items-center w-full gap-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'edit')}
                    className="text-sm h-6 border-royal-300 focus:border-royal-500"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 hover:bg-green-100"
                    onClick={handleSaveEdit}
                  >
                    <Check className="h-3 w-3 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0 hover:bg-red-100"
                    onClick={handleCancelEdit}
                  >
                    <XIcon className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              ) : (
                <>
                  <button 
                    className={`flex-1 text-sm font-medium truncate text-left ${
                      graph.id === activeGraphId ? 'text-royal-700' : 'text-gray-700'
                    }`}
                    onClick={() => onTabChange(graph.id)}
                  >
                    {graph.name}
                  </button>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 opacity-50 hover:opacity-100 hover:bg-gray-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit(graph)
                      }}
                      title="Rename graph"
                    >
                      <Edit2 className="h-3 w-3 text-gray-500" />
                    </Button>
                    {!graph.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 opacity-50 hover:opacity-100 hover:bg-gray-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          onTabClose(graph.id)
                        }}
                        title="Delete graph"
                      >
                        <X className="h-3 w-3 text-gray-500" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          
          {/* Add New Graph Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 text-gray-600 hover:text-royal-600 hover:bg-royal-50 border-b-2 border-b-transparent"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Graph
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Memory Graph</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label htmlFor="graph-name" className="text-sm font-medium text-gray-700 mb-2 block">
                    Graph Name
                  </label>
                  <Input
                    id="graph-name"
                    placeholder="Enter graph name..."
                    value={newGraphName}
                    onChange={(e) => setNewGraphName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'create')}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false)
                      setNewGraphName("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateGraph}
                    disabled={!newGraphName.trim()}
                    className="bg-royal-500 hover:bg-royal-600 text-white"
                  >
                    Create Graph
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
} 