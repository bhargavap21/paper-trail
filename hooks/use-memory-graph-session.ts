import { useState, useEffect } from 'react';

interface MemoryGraph {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  isDefault?: boolean;
}

interface UseMemoryGraphSessionReturn {
  sessionGraphId: string | null;
  setSessionGraphId: (graphId: string) => void;
  clearSessionGraphId: () => void;
  isSessionActive: boolean;
  getConnectedGraphName: (graphs: MemoryGraph[]) => string | null;
}

const SESSION_STORAGE_KEY = 'memory-graph-session';

export function useMemoryGraphSession(): UseMemoryGraphSessionReturn {
  const [sessionGraphId, setSessionGraphIdState] = useState<string | null>(null);

  // Load session graph ID from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedGraphId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedGraphId) {
        setSessionGraphIdState(storedGraphId);
      }
    }
  }, []);

  const setSessionGraphId = (graphId: string) => {
    setSessionGraphIdState(graphId);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_STORAGE_KEY, graphId);
    }
  };

  const clearSessionGraphId = () => {
    setSessionGraphIdState(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const getConnectedGraphName = (graphs: MemoryGraph[]): string | null => {
    if (!sessionGraphId) return null;
    const graph = graphs.find(g => g.id === sessionGraphId);
    return graph ? graph.name : null;
  };

  return {
    sessionGraphId,
    setSessionGraphId,
    clearSessionGraphId,
    isSessionActive: sessionGraphId !== null,
    getConnectedGraphName,
  };
} 