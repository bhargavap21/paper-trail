"use client"

import { useState, useEffect, useRef, RefCallback } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import dynamic from "next/dynamic"
import { useToast } from "@/hooks/use-toast"

// Dynamically import the HighlightPopup component
const HighlightPopup = dynamic(() => import('./highlight-popup'), {
  ssr: false,
});

// Set worker source - only executed on client
if (typeof window !== 'undefined') {
  // Use version 2.12.313 to match what react-pdf is using internally
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@2.12.313/build/pdf.worker.min.js`;
}

interface PDFComponentsProps {
  file: string
  onLoadSuccess: ({ numPages }: { numPages: number }) => void
  onLoadError?: (error: Error) => void
  pageNumber?: number
  scale: number
  showAllPages?: boolean
  paperId?: string
  onAddToCopilotChat?: (text: string) => void
  onCurrentPageChange?: (pageNumber: number) => void
}

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

interface PopupState {
  visible: boolean;
  highlight: Highlight | null;
  position: { x: number; y: number };
  mode: 'view' | 'note';
}

interface HighlightProps {
  highlight: Highlight;
  onClick: (highlight: Highlight) => void;
}

// A cleaner NoteBubble component
const NoteBubble = ({ 
  highlight, 
  containerRef, 
  pageRef, // Pass the specific page DOM element
  onEdit,
  onDelete,
  scale,
  pageNum
}: { 
  highlight: Highlight; 
  containerRef: React.RefObject<HTMLDivElement | null>;
  pageRef: HTMLDivElement; // Changed to mandatory HTMLDivElement
  onEdit: () => void;
  onDelete: () => void;
  scale: number;
  pageNum: number;
}) => {
  const [lineEnd, setLineEnd] = useState<{ x: number; y: number } | null>(null);
  const noteBubbleRef = useRef<HTMLDivElement>(null); // Ref for the note bubble itself

  // Calculate the END position of the line (center of the highlight)
  useEffect(() => {
    if (!containerRef.current || !pageRef) {
      console.error(`DEBUG NoteBubble (Page ${pageNum}): Missing refs for line end calculation.`);
      setLineEnd(null);
      return;
    }

    const calculateHighlightCenter = () => {
      try {
        const containerRect = containerRef.current!.getBoundingClientRect();
        const pageRect = pageRef.getBoundingClientRect();
        
        if (pageRect.width === 0 || pageRect.height === 0) {
          setLineEnd(null);
          return;
        }

        const highlightRect = highlight.position.boundingRect;
        const scaledX1 = highlightRect.x1 * scale;
        const scaledWidth = highlightRect.width * scale;
        const scaledY1 = highlightRect.y1 * scale;
        const scaledHeight = highlightRect.height * scale;
        
        // Highlight center coordinates relative to the VIEWPORT
        const highlightViewportCenterX = pageRect.left + scaledX1 + (scaledWidth / 2);
        const highlightViewportCenterY = pageRect.top + scaledY1 + (scaledHeight / 2);

        // Convert viewport coordinates to coordinates relative to the CONTAINER
        const lineEndX = highlightViewportCenterX - containerRect.left;
        const lineEndY = highlightViewportCenterY - containerRect.top;
        
        // console.log(`DEBUG NoteBubble (Page ${pageNum}): Calculated line end`, { lineEndX, lineEndY });
        setLineEnd({ x: lineEndX, y: lineEndY });

      } catch (error) {
        console.error(`DEBUG NoteBubble (Page ${pageNum}): Error calculating line end`, error);
        setLineEnd(null);
      }
    };

    calculateHighlightCenter();
    window.addEventListener('scroll', calculateHighlightCenter, true);
    window.addEventListener('resize', calculateHighlightCenter);
    
    return () => {
      window.removeEventListener('scroll', calculateHighlightCenter, true);
      window.removeEventListener('resize', calculateHighlightCenter);
    };
  }, [highlight, containerRef, pageRef, scale, pageNum]);

  // Fixed dimensions for the note bubble
  const BUBBLE_WIDTH = 180;
  const ICON_SIZE = 14;

  // Calculate the top position dynamically based on the highlight's center Y
  const noteTopPosition = lineEnd ? lineEnd.y - 40 : 0; // Adjust vertical offset (e.g., 40px above highlight center)

  // console.log(`DEBUG NoteBubble (Page ${pageNum}): Rendering`, { hasLineEnd: !!lineEnd, noteTopPosition });

  // Don't render if we haven't calculated the line endpoint
  if (!lineEnd) {
    return null;
  }

  return (
    <div
      ref={noteBubbleRef} // Add ref to the bubble itself
      className="absolute right-0 mr-[-200px]" // Position outside container to the right
      style={{
        width: `${BUBBLE_WIDTH}px`,
        top: `${noteTopPosition}px`,
        zIndex: 999,
      }}
      data-note-page={pageNum}
      data-highlight-id={highlight._id}
    >
      {/* SVG Container for the line - Positioned absolutely to cover area needed */}
      <svg
        className="absolute pointer-events-none overflow-visible"
        style={{
          // Position SVG relative to the main container edge, extending leftwards
          right: '100%', // Start SVG at the right edge of the parent div (which is mr-[-200px])
          top: 0,
          width: '200px', // Width needed to draw the line back
          height: '100%', // Match bubble height? Or calculate dynamically?
          transform: `translateY(40px)` // Offset Y to align start point with roughly bubble middle
        }}
      >
        {lineEnd && (
          <line
            // Line starts from the right edge of the SVG container (effectively the left edge of the bubble)
            x1={200} // Start X at the far right of the SVG viewport
            y1={0}    // Start Y at the top of the SVG (adjust with transform)
            // Line ends at the calculated highlight center, adjusted for SVG position
            x2={lineEnd.x - (containerRef.current?.getBoundingClientRect().right ?? 0) + 200 + 200} // X relative to SVG viewport
            y2={lineEnd.y - noteTopPosition - 40} // Y relative to SVG viewport
            stroke="#FFD700"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}
      </svg>

      {/* Note Bubble Content */}
      <div
        className="relative bg-yellow-50 border border-yellow-200 rounded-lg shadow-md p-2"
        style={{ width: '100%' }}
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="text-sm font-medium text-yellow-800">Note (P{pageNum})</h4>
          <div className="flex space-x-1">
            <button
              onClick={onEdit}
              className="text-gray-500 hover:text-gray-700 p-1 rounded"
              title="Edit note"
            >
              {/* SVG icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={ICON_SIZE} height={ICON_SIZE}>
                <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="text-gray-500 hover:text-red-500 p-1 rounded"
              title="Delete note"
            >
              {/* SVG icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={ICON_SIZE} height={ICON_SIZE}>
                <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
          {highlight.note}
        </p>
      </div>
    </div>
  );
};

export default function PDFComponents({ file, onLoadSuccess, onLoadError, pageNumber = 1, scale, showAllPages = false, paperId = '', onAddToCopilotChat, onCurrentPageChange }: PDFComponentsProps) {
  // Basic state
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string>(file);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [visiblePages, setVisiblePages] = useState<number[]>([]);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  
  // Popup state with mode
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    highlight: null,
    position: { x: 0, y: 0 },
    mode: 'view'
  });
  

  
  // Debouncing to prevent duplicate text selections
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const [lastProcessedText, setLastProcessedText] = useState<string>("");
  
  const { toast } = useToast();
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<HTMLDivElement[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Debug: Log highlights and pages info
  useEffect(() => {
    if (highlights.length > 0) {
      console.log(`DEBUG: Total highlights: ${highlights.length}`);
      
      // Group highlights by page
      const highlightsByPage = highlights.reduce((acc, h) => {
        if (!acc[h.page]) acc[h.page] = { total: 0, withNotes: 0 };
        acc[h.page].total += 1;
        if (h.note) acc[h.page].withNotes += 1;
        return acc;
      }, {} as Record<number, { total: number; withNotes: number }>);
      
      console.log('DEBUG: Highlights by page:', highlightsByPage);
      console.log('DEBUG: Rendered pages:', Array.from(renderedPages));
    }
  }, [highlights, renderedPages]);

  // Initialize page refs when numPages changes
  useEffect(() => {
    console.log(`DEBUG: Initializing refs for ${numPages} pages`);
    pageRefs.current = Array(numPages).fill(null);
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    // Setup intersection observer to track visible pages
    observerRef.current = new IntersectionObserver((entries) => {
      const newVisiblePages: number[] = [];
      
      entries.forEach(entry => {
        const pageNum = parseInt(entry.target.getAttribute('data-page') || '0', 10);
        if (pageNum > 0) {
          if (entry.isIntersecting) {
            newVisiblePages.push(pageNum);
          }
        }
      });
      
      if (newVisiblePages.length > 0) {
        setVisiblePages(newVisiblePages);
        // Call the callback with the first visible page (or minimum page number)
        if (onCurrentPageChange) {
          const currentPage = Math.min(...newVisiblePages);
          onCurrentPageChange(currentPage);
        }
      }
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.3
    });
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [numPages]);

  // Ensure file path is correct
  useEffect(() => {
    if (file && !file.startsWith('http') && !file.startsWith('blob')) {
      const path = file.startsWith('/') ? file : `/${file}`;
      setFileUrl(window.location.origin + path);
    } else {
      setFileUrl(file);
    }
  }, [file]);

  // Load stored highlights on component mount
  useEffect(() => {
    if (paperId) {
      fetchHighlights();
    }
  }, [paperId]);

  // Fetch highlights from API
  const fetchHighlights = async () => {
    try {
      if (!paperId) return;
      
      const response = await fetch(`/api/papers/${paperId}/highlights`);
      if (!response.ok) {
        throw new Error('Failed to fetch highlights');
      }
      
      const data = await response.json();
      console.log(`DEBUG: Fetched ${data.highlights?.length || 0} highlights from API`);
      setHighlights(data.highlights || []);
    } catch (error) {
      console.error('Error fetching highlights:', error);
    }
  };

  // Handle PDF error
  const handleError = (err: Error) => {
    console.error("PDF Error:", err);
    setError(err.message);
    // Call the error callback if provided
    if (onLoadError) {
      onLoadError(err);
    }
  };

  // Handle PDF load success
  const handleDocumentLoadSuccess = (data: { numPages: number }) => {
    console.log(`DEBUG: PDF loaded successfully with ${data.numPages} pages`);
    setNumPages(data.numPages);
    onLoadSuccess(data);
  };

  // Close popup and reset state
  const closePopup = () => {
    setPopup({
      visible: false,
      highlight: null,
      position: { x: 0, y: 0 },
      mode: 'view'
    });
  };

  // Store page element references and track when pages are rendered
  const setPageRef: RefCallback<HTMLDivElement> = (element: HTMLDivElement | null) => {
    if (!element) return;
    
    const pageNum = parseInt(element.dataset.page || '0', 10);
    if (pageNum > 0 && pageNum <= numPages) {
      // Store the page reference
      pageRefs.current[pageNum - 1] = element;
      
      // Track this page as rendered, only update if it's not already tracked
      setRenderedPages(prev => {
        if (!prev.has(pageNum)) {
          const updated = new Set(prev);
          updated.add(pageNum);
          console.log(`DEBUG: Tracking page ${pageNum} as rendered.`);
          return updated;
        }
        return prev; // No change needed
      });
      
      // Observe for visibility
      if (observerRef.current) {
        // Check if already observing to prevent duplicates (might not be strictly necessary but safe)
        // This requires storing observed elements or a different approach
        // For now, just observe. IntersectionObserver handles duplicates internally.
        observerRef.current.observe(element);
      }
      
      // Removed the forced setHighlights update from here to prevent loops
      // console.log(`DEBUG: Page ${pageNum} reference set, page element:`, element);
    }
  };

  // Delete highlight from backend
  const deleteHighlight = async (highlightId: string) => {
    if (!paperId) return;
    try {
      const response = await fetch(`/api/papers/${paperId}/highlights/${highlightId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete highlight from server');
      }
    } catch (error) {
      console.error('Error deleting highlight:', error);
      toast({
        title: 'Error',
        description: 'Could not delete highlight from server.',
        variant: 'destructive',
      });
    }
  };

  // Handle highlight selection and creation
  const handleTextSelection = async (currentPage: number) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    try {
      // Get selected text
      const text = selection.toString().trim();
      if (!text) return;

      // Prevent duplicate processing of the same text
      if (isProcessingSelection || text === lastProcessedText) {
        console.log('Skipping duplicate text selection:', text);
        selection.removeAllRanges();
        return;
      }

      // Set processing flag and remember text
      setIsProcessingSelection(true);
      setLastProcessedText(text);

      // Get selection bounding rect
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (!rect.width || !rect.height) return;

      // Get page element
      const pageElement = pageRefs.current[currentPage - 1];
      if (!pageElement) {
        console.error(`DEBUG: Page element reference not available for page ${currentPage}`);
        return;
      }

      // Get page position
      const pageRect = pageElement.getBoundingClientRect();
      
      // Calculate position relative to page (normalized for scale)
      const relativeRect = {
        x1: (rect.left - pageRect.left) / scale,
        y1: (rect.top - pageRect.top) / scale,
        x2: (rect.right - pageRect.left) / scale,
        y2: (rect.bottom - pageRect.top) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
      };

      // Check for overlapping highlights
      const hasOverlap = highlights.some(h => {
        if (h.page !== currentPage) return false;
        
        const r1 = h.position.boundingRect;
        const r2 = relativeRect;
        
        if (r1.x1 + r1.width < r2.x1 || r2.x1 + r2.width < r1.x1) return false;
        if (r1.y1 + r1.height < r2.y1 || r2.y1 + r2.height < r1.y1) return false;
        
        return true;
      });

      if (hasOverlap) {
        toast({
          title: 'Error',
          description: 'This text overlaps with an existing highlight.',
          variant: 'destructive',
        });
        return;
      }

      // Create highlight object
      const highlight: Highlight = {
        page: currentPage,
        position: {
          boundingRect: relativeRect,
          text,
        },
      };

      console.log(`DEBUG: Creating new highlight on page ${currentPage}`, highlight);

      // Get context for better summaries
      let context = "";
      try {
        const textLayerElements = pageElement.querySelectorAll(".react-pdf__Page__textContent");
        if (textLayerElements.length > 0) {
          const texts = Array.from(textLayerElements)
            .map(el => el.textContent || "")
            .filter(text => text.trim().length > 0);
          context = texts.join(" ");
        }
      } catch (error) {
        console.error("Error extracting context from page:", error);
      }

      // Calculate popup position
      const popupX = relativeRect.x2 * scale + 10;
      let popupY = relativeRect.y1 * scale + (relativeRect.height * scale / 2);
      
      const pageWidth = pageElement.clientWidth;
      const popupWidth = 400;
      
      const adjustedX = popupX + popupWidth > pageWidth
        ? Math.max(10, relativeRect.x1 * scale - popupWidth - 10)
        : popupX;

      // Close any existing popup
      closePopup();

      // Add highlight to state
      setHighlights(prev => [...prev, highlight]);
      
      // Show popup for new highlight
      setPopup({
        visible: true,
        highlight: {
          ...highlight,
          context: context || undefined
        },
        position: {
          x: adjustedX,
          y: popupY
        },
        mode: 'view'
      });
      
      // Clear selection
      selection.removeAllRanges();

      // Save highlight to backend
      if (paperId) {
        try {
          const response = await fetch(`/api/papers/${paperId}/highlights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: highlight.text || highlight.position.text,
              position: highlight.position,
              page: highlight.page,
              context: context
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save highlight to server');
          }
          
          const data = await response.json();
          
          if (data.highlight && data.highlight._id) {
            const serverHighlightId = data.highlight._id;
            
            console.log(`DEBUG: Received highlight ID from server: ${serverHighlightId}`);
            
            // Update highlight with server ID
            setHighlights(prev => 
              prev.map(h => {
                if (h.page === highlight.page && 
                    h.position.boundingRect.x1 === highlight.position.boundingRect.x1 &&
                    h.position.boundingRect.y1 === highlight.position.boundingRect.y1) {
                  return { 
                    ...h, 
                    _id: serverHighlightId,
                    summary: data.highlight.summary || h.summary
                  };
                }
                return h;
              })
            );
            
            // Update popup
            setPopup(prev => {
              if (prev.visible && prev.highlight) {
                return {
                  ...prev,
                  highlight: {
                    ...prev.highlight,
                    _id: serverHighlightId,
                    summary: data.highlight.summary || prev.highlight.summary
                  }
                };
              }
              return prev;
            });
          }
        } catch (error) {
          console.error("Error saving highlight:", error);
          toast({
            title: 'Error',
            description: 'Failed to save highlight to server.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error("Error creating highlight:", error);
    } finally {
      // Always reset processing flag
      setIsProcessingSelection(false);
      // Clear last processed text after a delay to allow legitimate re-selections
      setTimeout(() => {
        setLastProcessedText("");
      }, 2000);
    }
  };

  // Handle clicking on a highlight
  const handleHighlightClick = (highlight: Highlight) => {
    console.log(`DEBUG: Clicked highlight on page ${highlight.page}`, highlight);
    
    // Toggle current highlight
    if (popup.visible && popup.highlight?._id === highlight._id) {
      closePopup();
      return;
    }

    // Close existing popup
    closePopup();

    // Get page element
    const pageElement = pageRefs.current[highlight.page - 1];
    if (!pageElement) {
      console.error(`DEBUG: Page reference not available for page ${highlight.page}`);
      return;
    }
    
    // Calculate popup position
    const highlightRect = highlight.position.boundingRect;
    const popupX = highlightRect.x2 * scale + 10;
    const popupY = highlightRect.y1 * scale + (highlightRect.height * scale / 2);
    
    // Check if popup would go off page edge
    const pageWidth = pageElement.clientWidth;
    const popupWidth = 400;
    
    const adjustedX = popupX + popupWidth > pageWidth
      ? Math.max(10, highlightRect.x1 * scale - popupWidth - 10)
      : popupX;
    
    // Show popup
    setPopup({
      visible: true,
      highlight: highlight,
      position: {
        x: adjustedX,
        y: popupY
      },
      mode: 'view'
    });
  };

  // Start editing a note
  const handleStartEditNote = (highlight: Highlight) => {
    console.log(`DEBUG: Starting note edit for highlight on page ${highlight.page}`, highlight);
    
    // First close any existing popup
    closePopup();
    
    // Get page element
    const pageElement = pageRefs.current[highlight.page - 1];
    if (!pageElement) {
      console.error(`DEBUG: Page reference not available for page ${highlight.page} when trying to edit note`);
      return;
    }
    
    // Calculate popup position (same as handleHighlightClick)
    const highlightRect = highlight.position.boundingRect;
    const popupX = highlightRect.x2 * scale + 10;
    const popupY = highlightRect.y1 * scale + (highlightRect.height * scale / 2);
    
    const pageWidth = pageElement.clientWidth;
    const popupWidth = 400;
    
    const adjustedX = popupX + popupWidth > pageWidth
      ? Math.max(10, highlightRect.x1 * scale - popupWidth - 10)
      : popupX;
    
    // Show popup in note mode
    setPopup({
      visible: true,
      highlight: highlight,
      position: {
        x: adjustedX,
        y: popupY
      },
      mode: 'note'
    });
  };

  // Save a note for a highlight
  const handleSaveNote = async (highlight: Highlight, noteText: string) => {
    try {
      if (!highlight.page || highlight.page <= 0 || highlight.page > numPages) {
        console.error(`DEBUG: Invalid page number in highlight being saved: ${highlight.page}`);
        return;
      }
      
      console.log(`DEBUG: Saving note for highlight on page ${highlight.page}`, { 
        highlightId: highlight._id,
        pageRef: !!pageRefs.current[highlight.page - 1],
        noteText: noteText.substring(0, 20) + (noteText.length > 20 ? '...' : '')
      });
      
      // Create updated highlight with note
      const updatedHighlight = { 
        ...highlight, 
        note: noteText 
      };
      
      // Update highlights array
      setHighlights(prev => 
        prev.map(h => {
          // Match by ID if available
          if (highlight._id && h._id === highlight._id) {
            return updatedHighlight;
          }
          // Or match by position
          if (!highlight._id && h.page === highlight.page && 
              h.position.boundingRect.x1 === highlight.position.boundingRect.x1 &&
              h.position.boundingRect.y1 === highlight.position.boundingRect.y1) {
            return updatedHighlight;
          }
          return h;
        })
      );
      
      // Save to backend if we have an ID
      if (highlight._id && paperId) {
        const response = await fetch(`/api/papers/${paperId}/highlights/${highlight._id}/note`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: noteText }),
        });

        if (!response.ok) {
          throw new Error('Failed to save note to server');
        }
        
        console.log(`DEBUG: Note saved to server for highlight ${highlight._id}`);
      }
      
      // Wait a bit to make sure state is updated before closing popup
      setTimeout(() => {
        // Close popup
        closePopup();
        
        // No need to force re-render here, the state update for highlights already happened
      }, 200);
      
      toast({
        title: 'Note saved',
        description: 'Your note has been saved successfully.',
      });
      
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Could not save note. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle deleting a highlight
  const handleDeleteHighlight = (highlight: Highlight) => {
    console.log(`DEBUG: Deleting highlight on page ${highlight.page}`, { highlightId: highlight._id });
    
    // Remove highlight locally
    setHighlights(prev => {
      if (highlight._id) {
        // For highlights with an ID, filter by ID
        return prev.filter(h => h._id !== highlight._id);
      } else {
        // For temporary highlights without an ID, filter by position
        return prev.filter(h => 
          h.page !== highlight.page || 
          h.position.boundingRect.x1 !== highlight.position.boundingRect.x1 ||
          h.position.boundingRect.y1 !== highlight.position.boundingRect.y1
        );
      }
    });
    
    // Delete from backend if it has an ID
    if (highlight._id && paperId) {
      deleteHighlight(highlight._id);
    }
    
    // Close the popup
    closePopup();
    
    toast({
      title: 'Highlight removed',
      description: 'The highlight and explanation have been removed.',
    });
  };



  // Handle when a page successfully loads
  const handlePageLoadSuccess = (pageNum: number) => {
    console.log(`DEBUG: Page ${pageNum} loaded successfully`);
    
    // Force a re-render of highlights on this page after a short delay
    setTimeout(() => {
      const highlightsOnPage = highlights.filter(h => h.page === pageNum);
      if (highlightsOnPage.length > 0) {
        console.log(`DEBUG: Page ${pageNum} loaded with ${highlightsOnPage.length} highlights`);
        setHighlights(prev => [...prev]); // Force re-render
      }
    }, 200);
  };

  // Render a single page with highlights
  const renderPage = (pageNum: number) => {
    // IMPORTANT: Get the current page ref. It might be null initially.
    const currentPageRef = pageRefs.current[pageNum - 1];

    // Get highlights for this page
    const highlightsForPage = highlights.filter(h => h.page === pageNum);
    const highlightsWithNotes = highlightsForPage.filter(h => h.note);

    return (
      <div
        key={`page_${pageNum}`}
        className="relative mb-8 pdf-page-container" // Added class for potential styling/selection
        ref={setPageRef} // Assigns the ref to pageRefs.current[pageNum - 1]
        data-page={pageNum}
        onMouseUp={() => handleTextSelection(pageNum)}
      >
        {/* PDF Page Component */}
        <Page
          pageNumber={pageNum}
          scale={scale}
          renderTextLayer={true}
          renderAnnotationLayer={false}
          className="shadow-xl"
          loading={
            <div className="flex justify-center items-center h-[200px]">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-royal-500"></div>
            </div>
          }
          onLoadSuccess={() => handlePageLoadSuccess(pageNum)}
        />

        {/* Highlight Overlays */}
        {highlightsForPage.map((highlight, index) => (
          <div
            key={`highlight-${highlight._id || index}-${pageNum}`}
            className={`absolute cursor-pointer transition-colors duration-200 highlight-overlay ${highlight.note ? 'has-note' : ''}`}
            style={{
              border: '1px solid',
              backgroundColor: highlight.note ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 226, 143, 0.6)', // Different bg for notes
              borderColor: highlight.note ? '#FFD700' : 'rgba(230, 186, 73, 0.8)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              left: highlight.position.boundingRect.x1 * scale,
              top: highlight.position.boundingRect.y1 * scale,
              height: highlight.position.boundingRect.height * scale,
              width: highlight.position.boundingRect.width * scale,
              zIndex: 10,
            }}
            onClick={() => handleHighlightClick(highlight)}
            title={highlight.note ? "Note attached. Click to view/edit." : "Click to view or add note"}
            data-page={pageNum}
            data-has-note={!!highlight.note}
            data-highlight-id={highlight._id || `temp-${index}`}
          />
        ))}

        {/* Render NoteBubbles outside the PDF - CRITICAL CHANGE HERE */}
        {/* Notes are positioned relative to the MAIN CONTAINER, not the page div */}
        {/* So, we render them OUTSIDE the page loop, once, filtering by rendered pages */}

        {/* Popup for this page (positioned relative to page content) */}
        {popup.visible &&
         popup.highlight &&
         popup.highlight.page === pageNum && (
          <div
            className="absolute highlight-popup"
            style={{
              left: popup.position.x,
              top: popup.position.y,
              transform: 'translateY(-50%)',
              zIndex: 50,
              pointerEvents: 'auto'
            }}
            data-popup-page={pageNum}
            data-popup-mode={popup.mode}
          >
                        <HighlightPopup
              highlight={{
                ...popup.highlight,
                text: popup.highlight.text || popup.highlight.position.text || "",
              }}
              paperId={paperId}
              onClose={closePopup}
              position={{ x: 0, y: 0 }}
              onDelete={handleDeleteHighlight}
              onSaveNote={(noteText) => handleSaveNote(popup.highlight!, noteText)}
              isNoteMode={popup.mode === 'note'}
              onAddToCopilotChat={onAddToCopilotChat}
            />
          </div>
        )}
      </div> // End of page container div
    );
  };

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error loading PDF</p>
          <p className="text-sm">{error}</p>
          <p className="text-sm mt-2">URL: {fileUrl}</p>
        </div>
      )}

      {/* Main container for PDF and absolutely positioned notes */}
      <div className="relative w-full h-full overflow-auto" ref={containerRef}>
        {/* PDF Document Rendering Area */}
        <div className="pdf-document-area flex-shrink-0 flex justify-center">
          <Document
            file={fileUrl}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleError}
            loading={
              <div className="flex justify-center items-center h-[20vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-royal-500"></div>
              </div>
            }
            error={
              <div className="flex justify-center items-center h-[80vh] text-center">
                <div>
                  <p className="text-red-500 font-medium mb-2">Error loading PDF</p>
                  <p className="text-gray-500 text-sm">Please try again or upload a different file.</p>
                  <p className="text-gray-500 text-xs mt-4">URL: {fileUrl}</p>
                </div>
              </div>
            }
            className="w-full"
          >
            <div className="relative flex flex-col items-center">
              {showAllPages
                ? Array.from(new Array(numPages), (_, index) => renderPage(index + 1))
                : renderPage(pageNumber)
              }
            </div>
          </Document>
        </div>

        {/* Absolutely Positioned Notes Area - Rendered once outside page loop */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none note-bubbles-container">
            {highlights
                .filter(h => h.note && pageRefs.current[h.page - 1]) // Ensure pageRef exists for the note's page
                .map((highlight, index) => (
                    <NoteBubble
                        key={`note-${highlight._id || index}-${highlight.page}`}
                        highlight={highlight}
                        containerRef={containerRef} // Pass the main container ref
                        pageRef={pageRefs.current[highlight.page - 1]!} // Pass the specific page div element (non-null asserted)
                        onEdit={() => handleStartEditNote(highlight)}
                        onDelete={() => handleDeleteHighlight(highlight)}
                        scale={scale}
                        pageNum={highlight.page}
                    />
                ))
            }
        </div>


      </div>


    </>
  );
}