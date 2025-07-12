"use client"

import { useState, useEffect } from 'react';

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  resultsCount: number;
  results?: any[];
}

const STORAGE_KEY = 'eureka-search-history';
const MAX_HISTORY_ITEMS = 50;

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsedHistory = JSON.parse(stored);
          setHistory(parsedHistory);
        }
      } catch (error) {
        console.error('Error loading search history:', error);
      } finally {
        setIsLoaded(true);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('Error saving search history:', error);
      }
    }
  }, [history, isLoaded]);

  const addToHistory = (query: string, results: any[] = []) => {
    const newItem: SearchHistoryItem = {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      query: query.trim(),
      timestamp: Date.now(),
      resultsCount: results.length,
      results: results.slice(0, 10) // Store first 10 results for quick access
    };

    setHistory(prev => {
      // Remove duplicates (same query)
      const filtered = prev.filter(item => 
        item.query.toLowerCase() !== query.toLowerCase().trim()
      );
      
      // Add new item at the beginning and limit total items
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      return updated;
    });

    return newItem.id;
  };

  const removeFromHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const getHistoryItem = (id: string) => {
    return history.find(item => item.id === id);
  };

  const updateHistoryItem = (id: string, updates: Partial<SearchHistoryItem>) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  return {
    history,
    isLoaded,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getHistoryItem,
    updateHistoryItem
  };
}