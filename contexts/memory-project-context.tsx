"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';

interface MemoryProjectContextType {
  activeProjectId: string | null;
  setActiveProjectId: (projectId: string | null) => void;
  clearActiveProject: () => void;
}

const MemoryProjectContext = createContext<MemoryProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'eureka-active-memory-project';

export function MemoryProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);

  // Load active project from session storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setActiveProjectIdState(stored);
      }
    }
  }, []);

  const setActiveProjectId = (projectId: string | null) => {
    setActiveProjectIdState(projectId);
    if (typeof window !== 'undefined') {
      if (projectId) {
        sessionStorage.setItem(STORAGE_KEY, projectId);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const clearActiveProject = () => {
    setActiveProjectId(null);
  };

  return (
    <MemoryProjectContext.Provider
      value={{
        activeProjectId,
        setActiveProjectId,
        clearActiveProject,
      }}
    >
      {children}
    </MemoryProjectContext.Provider>
  );
}

export function useMemoryProject() {
  const context = useContext(MemoryProjectContext);
  if (context === undefined) {
    throw new Error('useMemoryProject must be used within a MemoryProjectProvider');
  }
  return context;
}