"use client"

import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  History, 
  Search, 
  Trash2, 
  Calendar,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SearchHistoryItem } from '@/hooks/use-search-history';
import { cn } from '@/lib/utils';

interface SearchHistorySidebarProps {
  history: SearchHistoryItem[];
  isLoaded: boolean;
  onSelectHistory: (item: SearchHistoryItem) => void;
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
  onNewSearch: () => void;
  currentQuery?: string;
}

export function SearchHistorySidebar({
  history,
  isLoaded,
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
  onNewSearch,
  currentQuery = ''
}: SearchHistorySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatTimestamp = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateQuery = (query: string, maxLength: number = 50) => {
    if (query.length <= maxLength) return query;
    return query.substring(0, maxLength) + '...';
  };

  const groupHistoryByDate = (history: SearchHistoryItem[]) => {
    const groups: { [key: string]: SearchHistoryItem[] } = {};
    
    history.forEach(item => {
      const date = new Date(item.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    return groups;
  };

  const groupedHistory = groupHistoryByDate(history);

  return (
    <div className={cn(
      "flex flex-col bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-12" : "w-80"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-royal-600" />
            <span className="font-sans font-bold text-royal-700">Search History</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <>
          {/* History List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {!isLoaded ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  Loading history...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No search history yet</p>
                  <p className="text-xs mt-1">Your searches will appear here</p>
                </div>
              ) : (
                Object.entries(groupedHistory).map(([groupName, items]) => (
                  <div key={groupName} className="mb-4">
                    <div className="flex items-center gap-2 px-2 py-1 mb-2">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {groupName}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "group relative rounded-lg p-3 cursor-pointer transition-colors",
                            "hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200",
                            item.query.toLowerCase().trim() === currentQuery.toLowerCase().trim() 
                              ? "bg-royal-50 border-royal-200 shadow-sm" 
                              : "bg-transparent"
                          )}
                          onClick={() => onSelectHistory(item)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-sans font-medium text-gray-900 leading-tight">
                                {truncateQuery(item.query)}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(item.timestamp)}
                                </span>
                                {item.resultsCount > 0 && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                    <FileText className="h-2.5 w-2.5 mr-1" />
                                    {item.resultsCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Delete this search from history?')) {
                                  onRemoveHistory(item.id);
                                }
                              }}
                              className="opacity-60 hover:opacity-100 h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600 transition-all"
                              title="Delete search"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          {history.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearHistory}
                className="w-full font-sans font-medium text-red-600 hover:text-red-700 hover:bg-red-50 text-sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All History
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}