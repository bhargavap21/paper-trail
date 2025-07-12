"use client"

import React, { useState, useEffect, useRef } from 'react'
import { XIcon, Clipboard, CheckCircle, Loader2, Lightbulb, Trash2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'

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
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [onClose]);

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

  }, [highlight]); // Depend only on highlight

  // Update isNoteMode when initialNoteMode prop changes
  useEffect(() => {
    setIsNoteMode(initialNoteMode);
  }, [initialNoteMode]);

  const handleClip = async () => {
    if (isClipping) return; // Prevent multiple clicks

    setIsClipping(true);
    setClipStatus('loading');
    
    // Debug logging to identify the issue
    console.log('Debug - Clipping with:', {
      paperId,
      highlightText: highlight.text,
      positionText: highlight.position?.text,
      highlight: highlight
    });
    
    console.log('Clipping highlight to memory, paper ID:', paperId);

    try {
      const textToClip = highlight.text || highlight.position.text;
      
      // More detailed debug
      console.log('Clip check values:', {
        hasPaperId: !!paperId,
        hasTextToClip: !!textToClip,
        paperId,
        textToClipLength: textToClip?.length
      });
      
      // Only require text, use a fallback ID if paperId is missing
      if (!textToClip) {
        throw new Error('Missing text for memory clip.');
      }
      
      // Use paperId if available, or 'default' if not
      const paperIdToUse = paperId || 'default';
      
      const response = await fetch('/api/memory/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperId: paperIdToUse, text: textToClip }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to clip to memory: ${errorText}`);
      }
      setClipStatus('success');
      toast({
        title: 'Success',
        description: 'Highlight clipped to Memory!',
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
    <Card
      ref={popupRef}
      className={`absolute z-50 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-4 border border-slate-200 dark:border-slate-700 transition-all duration-300 ${isNoteMode ? 'w-[500px] max-w-[90vw]' : 'w-96'}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        maxHeight: isNoteMode ? '70vh' : 'auto',
        overflowY: isNoteMode ? 'auto' : 'visible'
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-md font-medium text-slate-900 dark:text-slate-100 flex items-center">
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
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <XIcon size={16} />
          </button>
        </div>
      </div>

      {/* Highlighted Text */}
      <div className="mb-3 text-sm text-slate-800 dark:text-slate-200 max-h-24 overflow-y-auto bg-slate-100 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600 italic">
        "{highlight.text || highlight.position.text || "Selected text"}"
      </div>

      {/* Note Taking UI */}
      {isNoteMode ? (
        <div className="mb-4">
          <textarea
            className="w-full h-32 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md shadow-inner text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
            placeholder="Type your notes here..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <div className="flex justify-end space-x-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelNote}
              className="border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={isSavingNote}
              className="bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-600 dark:hover:bg-yellow-700"
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
          <div className="text-sm text-slate-700 dark:text-slate-300">
            {summary}
          </div>
        </div>
      )}

      {/* Display existing note if there is one and not in note mode */}
      {!isNoteMode && noteText && (
        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Your Note:</h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{noteText}</p>
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
                disabled={isClipping || clipStatus === 'success'} // Disable while clipping or on success
                className="flex-1 bg-royal-600 hover:bg-royal-700 text-white flex items-center justify-center gap-2 dark:bg-royal-700 dark:hover:bg-royal-800"
              >
                {clipStatus === 'idle' && <><Clipboard size={16} /><span>Clip To Memory</span></>}
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
        /* Basic prose styling adjustments for dark mode */
        .dark .prose h1, .dark .prose h2, .dark .prose h3, .dark .prose h4, .dark .prose h5, .dark .prose h6 { color: #f1f5f9; }
        .dark .prose p, .dark .prose li, .dark .prose blockquote, .dark .prose td, .dark .prose th { color: #cbd5e1; }
        .dark .prose strong { color: #f8fafc; }
        .dark .prose code { color: #e2e8f0; background-color: #334155; padding: 0.1em 0.3em; border-radius: 0.25em; }
        .dark .prose a { color: #7dd3fc; }
        .dark .prose ul { list-style-type: disc; padding-left: 1.5em; } /* Ensure lists are styled */
        .prose ul { list-style-type: disc; padding-left: 1.5em; } /* Ensure lists are styled for light mode */
      `}</style>
    </Card>
  )
} 