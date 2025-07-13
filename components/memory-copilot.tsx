"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Trash2,
  Brain,
  Sparkles,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GraphNode } from '@/components/semantic-graph'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface MemoryCopilotProps {
  isOpen: boolean
  onClose: () => void
  autoPrompt?: string
  forceExpand?: boolean
  selectedConnection?: {
    sourceNode: GraphNode | null
    targetNode: GraphNode | null
  } | null
  onConnectionExplained?: () => void
  graphData?: {
    nodes: GraphNode[]
    edges: any[]
  }
  activeGraphId?: string
}

export default function MemoryCopilot({ isOpen, onClose, autoPrompt, forceExpand, selectedConnection, onConnectionExplained, graphData, activeGraphId }: MemoryCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isCollapsed && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen, isCollapsed])

  // Add initial welcome message when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeContent = `Hello! I'm your memory graph assistant powered by Gemini. I can help you understand connections between your research concepts and answer questions about your memory graph.`;
      
      const welcomeMessage: Message = {
        id: 'welcome',
        content: welcomeContent,
        isUser: false,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, messages.length])

  // Handle auto-prompt
  useEffect(() => {
    if (autoPrompt && !isCollapsed) {
      setInputValue(autoPrompt)
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }, [autoPrompt, isCollapsed])

  // Handle force expand
  useEffect(() => {
    if (forceExpand) {
      setIsCollapsed(false)
    }
  }, [forceExpand])

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue('')
    setIsLoading(true)

    try {
      // Check if this is a graph insights request
      const isGraphInsightsRequest = currentInput.includes("Give me insights based on the node connections in the graph and similarity matrix")
      
      let requestBody: any = { prompt: currentInput }
      
      // If it's a graph insights request, include the graph context
      if (isGraphInsightsRequest && graphData && activeGraphId) {
        requestBody.graphContext = {
          nodes: graphData.nodes,
          edges: graphData.edges,
          graphId: activeGraphId
        }
      }
      
      // Use the same Gemini API as the reader view but without paperId
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || `API Error: ${response.status}`)
      }

      const data = await response.json()
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: data.explanation || 'Sorry, I could not generate a response.',
        isUser: false,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('Error sending message:', error)
      let errorContent = 'Sorry, I encountered an error. Please try again.';
      
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        if (error.message.includes('API Error')) {
          errorContent = `${error.message}. Please try again.`;
        }
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorContent,
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const formatMessageContent = (content: string) => {
    // Basic formatting for line breaks
    const formatted = content.replace(/\n/g, '<br />')
    return { __html: formatted }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const handleExplainConnection = () => {
    if (!selectedConnection?.sourceNode || !selectedConnection?.targetNode) return
    
    // Generate the auto-prompt for explaining the connection
    const prompt = `Explain how these two ideas connect to each other:
Idea 1: ${selectedConnection.sourceNode.text}
Idea 2: ${selectedConnection.targetNode.text}`
    
    // Set the input value and send the message
    setInputValue(prompt)
    
    // Auto-send the message
    setTimeout(() => {
      sendMessage()
    }, 100)
    
    // Clear the selected connection
    if (onConnectionExplained) {
      onConnectionExplained()
    }
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-gray-50 border-l border-gray-200 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-12" : "w-80"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 pl-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-7 w-7 p-0 hover:bg-gray-100"
          >
            {isCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          {!isCollapsed && messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 text-gray-400"
              title="Clear Chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-2 pl-2">
            <span className="font-sans font-bold text-base text-royal-700">Memory Copilot</span>
            <Bot className="h-5 w-5 text-royal-600" />
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 overflow-hidden">
            <div className={messages.length === 0 ? "flex flex-col items-center justify-center h-full w-full min-h-[400px]" : "p-3 pl-4"}>
              {messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center w-full">
                  <div className="inline-flex items-center justify-center rounded-full bg-gray-100 p-4 mb-2">
                    <Bot className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm mb-1">Memory Assistant</p>
                  <p className="text-xs text-gray-500 text-center max-w-xs">Ask about connections and concepts in your memory graph!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          message.isUser
                            ? 'bg-royal-500 text-white shadow-sm'
                            : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.isUser ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                          <span className={cn(
                            "text-xs",
                            message.isUser ? "text-royal-100" : "text-gray-500"
                          )}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div 
                          className="text-sm leading-relaxed break-words"
                          dangerouslySetInnerHTML={formatMessageContent(message.content)}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-900 border border-gray-200 shadow-sm rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-3 w-3 text-royal-500" />
                          <Loader2 className="h-3 w-3 animate-spin text-royal-500" />
                          <span className="text-sm">Analyzing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="p-3 pl-4 border-t border-gray-200 bg-gray-50">
            <div className="text-xs font-medium text-gray-600 mb-2">Quick Actions:</div>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-royal-200 hover:bg-royal-50 hover:text-royal-700"
                onClick={() => setInputValue("Give me insights based on the node connections in the graph and similarity matrix")}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Graph Insights
              </Button>

              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs border-royal-200",
                  selectedConnection?.sourceNode && selectedConnection?.targetNode
                    ? "hover:bg-royal-50 hover:text-royal-700 text-royal-600 border-royal-400"
                    : "text-gray-400 border-gray-200 cursor-not-allowed"
                )}
                onClick={handleExplainConnection}
                disabled={!selectedConnection?.sourceNode || !selectedConnection?.targetNode}
              >
                <Brain className="h-3 w-3 mr-1" />
                Explain Connection Between Nodes
              </Button>
            </div>
          </div>

          {/* Input */}
          <div className="p-3 pl-4 border-t border-gray-200 bg-white sticky bottom-0 z-10 mt-0">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about connections, concepts, or patterns..."
                  className="min-h-[56px] max-h-[160px] resize-none text-sm border-gray-300 focus:border-royal-500 focus:ring-royal-500 pr-10"
                  rows={2}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                className="bg-royal-500 hover:bg-royal-600 text-white h-10 px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 