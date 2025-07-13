"use client"

import React, { useState, useEffect, useRef } from 'react'
import { XIcon, Clipboard, CheckCircle, Loader2, Lightbulb, Trash2, Share2, ChevronDown, Database, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { useMemoryGraphSession } from '@/hooks/use-memory-graph-session'
import MemoryGraphSelectionModal from '@/components/memory-graph-selection-modal'

// Define Highlight interface here instead of importing it
interface Highlight {
  _id?: string;
  page: number;
  position: {
    boundingRect: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      height: number;
    };
    text: string;
  };
  text?: string;
  summary?: string;
  context?: string;
  note?: string;
}

// Memory graph interface
interface MemoryGraph {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  isDefault?: boolean;
}

// Helper function to format markdown-like text into HTML elements
function formatText(text: string): React.ReactNode {
  // Basic replacement for markdown elements - can be expanded
  const html = text
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-3 mb-2">$1</h1>') // H1
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-3 mb-1 text-slate-800 dark:text-slate-200">$1</h2>') // H2
    .replace(/^\* (.*$)/gm, '<li class="ml-4 list-disc">$1</li>') // Unordered list item (*)
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>') // Unordered list item (-)
    .replace(/\n/g, '<br />') // Convert newlines to <br> for paragraph breaks

  // Wrap list items in <ul> if necessary (compatible approach)
  const wrappedHtml = html.replace(/(?:<li.*?<\/li>\s*<br\s*\/>\s*)+<li.*?<\/li>/g, (match) => {
    // Remove trailing <br /> tags within the list block before wrapping
    const cleanedMatch = match.replace(/(<br\s*\/>\s*)+$/g, '');
    return `<ul>${cleanedMatch.replace(/<br\s*\/>/g, '')}</ul>`; 
  }).replace(/^(<li.*?<\/li>)$/gm, '<ul>$1</ul>'); // Wrap single list items

  return <div dangerouslySetInnerHTML={{ __html: wrappedHtml }} />;
}

// Component for typing animation
function TypingAnimation({ text, speed = 10, onComplete }: {
  text: string;
  speed?: number;
  onComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;

    let index = 0;
    setDisplayedText('');
    setIsComplete(false);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(prev => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <div className="typing-animation">
      {displayedText ? formatText(displayedText) : null}
      {!isComplete && <span className="typing-cursor">|</span>}
    </div>
  );
}

interface HighlightPopupProps {
  highlight: Highlight
  paperId: string
  onClose: () => void
  position: { x: number; y: number }
  onDelete?: (highlight: Highlight) => void
  onSaveNote?: (noteText: string) => void
  isNoteMode?: boolean
  onAddToCopilotChat?: (text: string) => void
}

export default function HighlightPopup({ highlight, paperId, onClose, position, onDelete, onSaveNote, isNoteMode: initialNoteMode = false, onAddToCopilotChat }: HighlightPopupProps) {
  const [clipStatus, setClipStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [isClipping, setIsClipping] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('Text selected. Ready to chat about it!'); // Keep local summary
  const [isNoteMode, setIsNoteMode] = useState<boolean>(initialNoteMode);
  const [noteText, setNoteText] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [memoryGraphs, setMemoryGraphs] = useState<MemoryGraph[]>([]);
  const [loadingGraphs, setLoadingGraphs] = useState<boolean>(false);
  const [showGraphModal, setShowGraphModal] = useState<boolean>(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Use the session-based graph selection hook
  const { sessionGraphId, setSessionGraphId, clearSessionGraphId, isSessionActive } = useMemoryGraphSession();
  
  // Compute session graph from the loaded graphs
  const sessionGraph = memoryGraphs.find(g => g.id === sessionGraphId);

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        // Don't close if clicking on a dropdown/select content
        const target = event.target as Element;
        if (target.closest('[data-radix-popper-content-wrapper]') || 
            target.closest('[role="listbox"]') ||
            target.closest('[data-state="open"]') ||
            target.closest('.select-content')) {
          return;
        }
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [onClose]);

  // Load memory graphs for display purposes
  useEffect(() => {
    const fetchGraphs = async () => {
      setLoadingGraphs(true);
      try {
        const response = await fetch('/api/memory/graphs');
        if (response.ok) {
          const graphs = await response.json();
          setMemoryGraphs(graphs);
        }
      } catch (error) {
        console.error('Error fetching memory graphs:', error);
      } finally {
        setLoadingGraphs(false);
      }
    };

    fetchGraphs();
  }, []);

  // Initialize summary and note based on highlight prop
  useEffect(() => {
    console.log('HighlightPopup DEBUG:', {
      highlightId: highlight._id,
      hasId: !!highlight._id,
      hasDeleteHandler: !!onDelete,
      deleteButtonShouldShow: !!(highlight._id && onDelete)
    });

    if (highlight.summary) {
      setSummary(highlight.summary);
    } else {
      const text = highlight.text || highlight.position.text;
      if (!text) {
        setSummary('No text available.');
      } else {
        setSummary('Text selected. Click "Explain" for details.'); // Update initial summary
      }
    }
    
    // Set note text if it exists on the highlight
    if (highlight.note) {
      setNoteText(highlight.note);
    }
    
    // Reset note mode when highlight changes
    setIsNoteMode(false);

  }, [highlight]);

  // Update isNoteMode when initialNoteMode prop changes
  useEffect(() => {
    setIsNoteMode(initialNoteMode);
  }, [initialNoteMode]);

  const handleClip = async () => {
    if (isClipping) return; // Prevent multiple clicks

    console.log('handleClip called - isSessionActive:', isSessionActive, 'sessionGraphId:', sessionGraphId);

    // If no session graph is selected, show the graph selection modal
    if (!isSessionActive) {
      console.log('No session active, showing graph selection modal');
      setShowGraphModal(true);
      return;
    }

    console.log('Session active, performing clip with graph:', sessionGraphId);
    await performClip(sessionGraphId!);
  };

  const performClip = async (graphId: string) => {
    setIsClipping(true);
    setClipStatus('loading');
    
    console.log('Clipping highlight to memory, paper ID:', paperId, 'graph ID:', graphId);

    try {
      const textToClip = highlight.text || highlight.position.text;
      
      if (!textToClip) {
        throw new Error('Missing text for memory clip.');
      }
      
      // Use paperId if available, or 'default' if not
      const paperIdToUse = paperId || 'default';
      
      const response = await fetch('/api/memory/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paperId: paperIdToUse, 
          text: textToClip,
          graphId: graphId
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to clip to memory: ${errorText}`);
      }
      
      const result = await response.json();
      setClipStatus('success');
      
      const selectedGraph = memoryGraphs.find(g => g.id === graphId);
      toast({
        title: 'Success',
        description: `Highlight clipped to "${selectedGraph?.name || 'Memory'}" graph!`,
      });
    } catch (error) {
      console.error('Error clipping highlight:', error);
      setClipStatus('error');
      toast({
        title: 'Error',
        description: 'Could not save clip to Memory.',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => {
        setClipStatus('idle');
        setIsClipping(false);
      }, 2000);
    }
  };

  const handleGraphSelected = async (graphId: string) => {
    // Set the session graph
    setSessionGraphId(graphId);
    setShowGraphModal(false);
    
    // Perform the clip with the selected graph
    await performClip(graphId);
  };

  const handleChangeGraph = () => {
    setShowGraphModal(true);
  };

  const handleAddToCopilotChat = () => {
    const selectedText = highlight.text || highlight.position.text;
    if (!selectedText) {
      console.error('No text selected to add to chat');
      return;
    }

    if (onAddToCopilotChat) {
      onAddToCopilotChat(selectedText);
      onClose(); // Close the popup when adding to chat
    }
  };

  const handleDelete = () => {
    console.log('Delete button clicked with highlight:', highlight);
    const isTemporary = !highlight._id;

    if (isTemporary) {
      console.log('Deleting temporary highlight');
      onClose();
      if (onDelete) onDelete(highlight); // Notify parent to remove from local state
      return;
    }

    if (!onDelete) {
      console.error('Cannot delete highlight: Missing onDelete handler');
      return;
    }

    console.log('Deleting highlight with ID:', highlight._id);
    onDelete(highlight); // Call parent's delete handler
  };

  // Log visible state of delete button
  console.log("Delete button visibility state:", {
    shouldShowDelete: !!onDelete, // Show if handler exists (ID check happens in handleDelete)
    highlightId: highlight._id,
    hasDeleteHandler: !!onDelete
  });

  const handleTakeNote = () => {
    setIsNoteMode(true);
  };

  const handleSaveNote = async () => {
    if (isSavingNote) return; // Prevent multiple saves
    
    setIsSavingNote(true);
    try {
      // If parent provided onSaveNote callback, use it
      if (onSaveNote) {
        onSaveNote(noteText);
        setIsNoteMode(false);
        return;
      }
      
      // Otherwise, use the original implementation
      // Only send API request if highlight has an ID
      if (highlight._id) {
        const apiUrl = `/api/papers/${paperId}/highlights/${highlight._id}/note`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: noteText }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to save note: ${errorText}`);
        }
        
        // Could display success message here
      }
      
      // Exit note mode
      setIsNoteMode(false);
    } catch (error) {
      console.error('Error saving note:', error);
      // Could display error message here
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCancelNote = () => {
    // If there was a previous note, restore it
    if (highlight.note) {
      setNoteText(highlight.note);
    }
    setIsNoteMode(false);
  };

  return (
    <>
      <Card
        ref={popupRef}
        className={`absolute z-50 bg-white shadow-lg rounded-lg p-4 border border-slate-200 transition-all duration-300 ${isNoteMode ? 'w-[500px] max-w-[90vw]' : 'w-96'}`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          maxHeight: isNoteMode ? '70vh' : 'auto',
          overflowY: isNoteMode ? 'auto' : 'visible'
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-md font-medium text-slate-900 flex items-center">
            {isNoteMode ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="text-yellow-500 mr-2 h-5 w-5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"></path>
                  <path d="m15 9-6 6"></path>
                  <path d="m9 9 6 6"></path>
                </svg>
                Add Your Note
              </>
            ) : (
              <>
                <Lightbulb className="text-amber-500 mr-2 h-5 w-5" />
                Understanding This Concept
              </>
            )}
          </h3>
          <div className="flex gap-2">
            {/* Share Button (Functionality TBD) */}
            <Button size="sm" variant="ghost" className="p-1 h-7 w-7" title="Share highlight">
              <Share2 className="h-4 w-4" />
            </Button>
            {/* Delete Button */}
            {onDelete && ( // Only render if onDelete prop is provided
              <Button
                size="sm"
                variant="ghost"
                className="p-1 h-7 w-7 hover:bg-red-100 hover:text-red-600"
                title="Delete highlight"
                onClick={handleDelete}
                disabled={isClipping || isNoteMode} // Disable while other actions are in progress
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
              aria-label="Close"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Highlighted Text */}
        <div className="mb-3 text-sm text-slate-800 max-h-24 overflow-y-auto bg-slate-100 p-2 rounded border border-slate-200 italic">
          "{highlight.text || highlight.position.text || "Selected text"}"
        </div>

        {/* Note Taking UI */}
        {isNoteMode ? (
          <div className="mb-4">
            <textarea
              className="w-full h-32 p-3 bg-yellow-50 border border-yellow-200 rounded-md shadow-inner text-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
              placeholder="Type your notes here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelNote}
                className="border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="bg-yellow-500 hover:bg-yellow-600 text-white"
              >
                {isSavingNote ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  "Save Note"
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Summary Area - Only show when not in note mode */
          <div className="mb-4 min-h-[3rem]">
            <div className="text-sm text-slate-700">
              {summary}
            </div>
          </div>
        )}

        {/* Display existing note if there is one and not in note mode */}
        {!isNoteMode && noteText && (
          <div className="mb-4 bg-yellow-50 p-3 rounded-md border border-yellow-200">
            <h4 className="text-sm font-medium text-yellow-800 mb-1">Your Note:</h4>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{noteText}</p>
          </div>
        )}

        {/* Connected Memory Graph Display */}
        {!isNoteMode && (
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Connected Memory Graph:
              </label>
              {isSessionActive && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleChangeGraph}
                  className="p-1 h-6 text-xs hover:bg-slate-100"
                  title="Change graph"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Change
                </Button>
              )}
            </div>
            <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center">
              <Database className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-800 font-medium">
                {isSessionActive && sessionGraph 
                  ? `${sessionGraph.name}${sessionGraph.isDefault ? ' (Default)' : ''}`
                  : 'No graph connected'
                }
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            {!isNoteMode && (
              <>
                {/* Clip Button */}
                <Button
                  onClick={handleClip}
                  disabled={isClipping || clipStatus === 'success' || loadingGraphs} // Disable while clipping or on success
                  className="flex-1 bg-royal-600 hover:bg-royal-700 text-white flex items-center justify-center gap-2"
                >
                  {clipStatus === 'idle' && (
                    <>
                      <Clipboard size={16} />
                      <span>{!isSessionActive ? 'Connect & Clip' : 'Clip To Memory'}</span>
                    </>
                  )}
                  {clipStatus === 'loading' && <><Loader2 size={16} className="animate-spin" /><span>Saving...</span></>}
                  {clipStatus === 'success' && <><CheckCircle size={16} /><span>Saved!</span></>}
                  {clipStatus === 'error' && <><XIcon size={16} /><span>Save Error</span></>}
                </Button>

                {/* Add to Copilot Chat Button */}
                <Button
                  onClick={handleAddToCopilotChat}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>Add to Copilot Chat</span>
                </Button>
              </>
            )}
          </div>
          
          {/* Take Note Button - Only show when not in note mode */}
          {!isNoteMode && (
            <Button
              onClick={handleTakeNote}
              className="bg-yellow-500 hover:bg-yellow-600 text-white w-full mt-2 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              <span>Take Note</span>
            </Button>
          )}
        </div>

        {/* Styles */}
        <style jsx global>{`
          .typing-cursor {
            display: inline-block;
            width: 2px; /* More visible cursor */
            height: 1em;
            background-color: currentColor;
            margin-left: 2px;
            animation: blink 1s step-end infinite;
          }
          @keyframes blink {
            from, to { opacity: 1; }
            50% { opacity: 0; }
          }
          /* Basic prose styling adjustments */
          .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 { color: #1e293b; }
          .prose p, .prose li, .prose blockquote, .prose td, .prose th { color: #475569; }
          .prose strong { color: #0f172a; }
          .prose code { color: #334155; background-color: #f1f5f9; padding: 0.1em 0.3em; border-radius: 0.25em; }
          .prose a { color: #2563eb; }
          .prose ul { list-style-type: disc; padding-left: 1.5em; }
        `}</style>
      </Card>

      {/* Memory Graph Selection Modal */}
      <MemoryGraphSelectionModal
        isOpen={showGraphModal}
        onClose={() => setShowGraphModal(false)}
        onGraphSelected={handleGraphSelected}
      />
    </>
  )
} 