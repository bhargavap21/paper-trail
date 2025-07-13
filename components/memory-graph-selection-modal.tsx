"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Database } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface MemoryGraph {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  isDefault?: boolean;
}

interface MemoryGraphSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGraphSelected: (graphId: string) => void;
}

export default function MemoryGraphSelectionModal({ 
  isOpen, 
  onClose, 
  onGraphSelected 
}: MemoryGraphSelectionModalProps) {
  const [memoryGraphs, setMemoryGraphs] = useState<MemoryGraph[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newGraphName, setNewGraphName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  // Load memory graphs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchGraphs();
    }
  }, [isOpen]);

  const fetchGraphs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/memory/graphs');
      if (response.ok) {
        const graphs = await response.json();
        setMemoryGraphs(graphs);
        
        // Auto-select default graph if available
        const defaultGraph = graphs.find((g: MemoryGraph) => g.isDefault);
        if (defaultGraph) {
          setSelectedGraphId(defaultGraph.id);
        } else if (graphs.length > 0) {
          setSelectedGraphId(graphs[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching memory graphs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load memory graphs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewGraph = async () => {
    if (!newGraphName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a graph name.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/memory/graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGraphName.trim() }),
      });

      if (response.ok) {
        const newGraph = await response.json();
        setMemoryGraphs(prev => [...prev, newGraph]);
        setSelectedGraphId(newGraph.id);
        setIsCreatingNew(false);
        setNewGraphName('');
        toast({
          title: 'Success',
          description: `Created new memory graph "${newGraph.name}".`,
        });
      } else {
        throw new Error('Failed to create graph');
      }
    } catch (error) {
      console.error('Error creating memory graph:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new memory graph.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSelectGraph = () => {
    if (!selectedGraphId) {
      toast({
        title: 'Error',
        description: 'Please select a memory graph.',
        variant: 'destructive',
      });
      return;
    }

    onGraphSelected(selectedGraphId);
    onClose();
  };

  const handleCancel = () => {
    setIsCreatingNew(false);
    setNewGraphName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Connect to Memory Graph
          </DialogTitle>
          <DialogDescription>
            Choose which memory graph to connect to for this session. All your clips will be saved to the selected graph.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Loading graphs...</span>
            </div>
          ) : (
            <>
              {!isCreatingNew ? (
                <>
                  {/* Existing Graphs Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="graph-select">Select Memory Graph</Label>
                    <Select value={selectedGraphId} onValueChange={setSelectedGraphId}>
                      <SelectTrigger id="graph-select">
                        <SelectValue placeholder="Choose a memory graph..." />
                      </SelectTrigger>
                      <SelectContent>
                        {memoryGraphs.map((graph) => (
                          <SelectItem key={graph.id} value={graph.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{graph.name}</span>
                              {graph.isDefault && (
                                <span className="text-xs text-gray-500 ml-2">(Default)</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Create New Graph Button */}
                  <Button
                    variant="outline"
                    onClick={() => setIsCreatingNew(true)}
                    className="w-full border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Memory Graph
                  </Button>
                </>
              ) : (
                <>
                  {/* Create New Graph Form */}
                  <div className="space-y-2">
                    <Label htmlFor="new-graph-name">New Graph Name</Label>
                    <Input
                      id="new-graph-name"
                      placeholder="Enter graph name..."
                      value={newGraphName}
                      onChange={(e) => setNewGraphName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateNewGraph();
                        }
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreatingNew(false);
                        setNewGraphName('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateNewGraph}
                      disabled={creating || !newGraphName.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        {!loading && !isCreatingNew && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSelectGraph}
              disabled={!selectedGraphId}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Connect to Graph
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 