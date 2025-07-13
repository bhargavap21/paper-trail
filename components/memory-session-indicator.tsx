"use client"

import React, { useState, useEffect } from 'react';
import { Database, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemoryGraphSession } from '@/hooks/use-memory-graph-session';
import MemoryGraphSelectionModal from '@/components/memory-graph-selection-modal';
import { toast } from '@/components/ui/use-toast';

interface MemoryGraph {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  isDefault?: boolean;
}

interface MemorySessionIndicatorProps {
  className?: string;
  showChangeButton?: boolean;
  showDisconnectButton?: boolean;
}

export default function MemorySessionIndicator({ 
  className = "", 
  showChangeButton = true,
  showDisconnectButton = true 
}: MemorySessionIndicatorProps) {
  const [memoryGraphs, setMemoryGraphs] = useState<MemoryGraph[]>([]);
  const [showGraphModal, setShowGraphModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  const { sessionGraphId, setSessionGraphId, clearSessionGraphId, isSessionActive, getConnectedGraphName } = useMemoryGraphSession();

  // Load memory graphs
  useEffect(() => {
    const fetchGraphs = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/memory/graphs');
        if (response.ok) {
          const graphs = await response.json();
          setMemoryGraphs(graphs);
        }
      } catch (error) {
        console.error('Error fetching memory graphs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphs();
  }, []);

  const handleChangeGraph = () => {
    setShowGraphModal(true);
  };

  const handleGraphSelected = (graphId: string) => {
    setSessionGraphId(graphId);
    setShowGraphModal(false);
    
    const selectedGraph = memoryGraphs.find(g => g.id === graphId);
    toast({
      title: 'Graph Connected',
      description: `Connected to "${selectedGraph?.name || 'Memory'}" graph for this session.`,
    });
  };

  const handleDisconnect = () => {
    clearSessionGraphId();
    toast({
      title: 'Disconnected',
      description: 'Disconnected from memory graph. You can select a new graph when clipping.',
    });
  };

  const connectedGraphName = getConnectedGraphName(memoryGraphs);
  const connectedGraph = memoryGraphs.find(g => g.id === sessionGraphId);

  if (loading) {
    return (
      <div className={`flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <Database className="h-4 w-4 text-gray-400 mr-2 animate-pulse" />
        <span className="text-sm text-gray-500">Loading session...</span>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center justify-between p-3 border rounded-lg ${
        isSessionActive 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-gray-50 border-gray-200'
      } ${className}`}>
        <div className="flex items-center">
          <Database className={`h-4 w-4 mr-2 ${
            isSessionActive ? 'text-blue-600' : 'text-gray-400'
          }`} />
          <div>
            <span className={`text-sm font-medium ${
              isSessionActive ? 'text-blue-800' : 'text-gray-600'
            }`}>
              {isSessionActive ? 'Connected to:' : 'No graph connected'}
            </span>
            {isSessionActive && connectedGraphName && (
              <div className="text-sm text-blue-700">
                {connectedGraphName}
                {connectedGraph?.isDefault && (
                  <span className="text-xs text-blue-500 ml-1">(Default)</span>
                )}
              </div>
            )}
          </div>
        </div>

        {isSessionActive && (
          <div className="flex gap-1">
            {showChangeButton && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleChangeGraph}
                className="h-7 px-2 text-xs hover:bg-blue-100 text-blue-700"
                title="Change graph"
              >
                <Settings className="h-3 w-3 mr-1" />
                Change
              </Button>
            )}
            {showDisconnectButton && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDisconnect}
                className="h-7 px-2 text-xs hover:bg-red-100 text-red-600"
                title="Disconnect from graph"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {!isSessionActive && (
          <Button
            size="sm"
            onClick={handleChangeGraph}
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            Connect
          </Button>
        )}
      </div>

      {/* Memory Graph Selection Modal */}
      <MemoryGraphSelectionModal
        isOpen={showGraphModal}
        onClose={() => setShowGraphModal(false)}
        onGraphSelected={handleGraphSelected}
      />
    </>
  );
} 