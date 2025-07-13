"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  MessageCircle,
  Trash2,
  Lightbulb,
  BookOpen,
  Brain,
  Sparkles,
  Video,
  BarChart3,
  Wrench,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  toolUsed?: string
  toolResult?: any
}

interface Tool {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  placeholder: string
  category: 'generation' | 'analysis' | 'visualization'
}

interface CopilotChatProps {
  isOpen: boolean
  onClose: () => void
  initialContext?: string
  paperId?: string
  autoPrompt?: string
  forceExpand?: boolean
}

const AVAILABLE_TOOLS: Tool[] = [
  {
    id: 'video-generation',
    name: 'Video Generation',
    description: 'Create educational videos',
    icon: <Video className="h-4 w-4" />,
    placeholder: 'Generate a video explaining...',
    category: 'generation'
  },
  {
    id: 'graph-generation',
    name: 'Graph Generation',
    description: 'Add to memory graphs',
    icon: <BarChart3 className="h-4 w-4" />,
    placeholder: 'Add to graph: concepts about...',
    category: 'visualization'
  }
]

export default function CopilotChat({ isOpen, onClose, initialContext, paperId, autoPrompt, forceExpand }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null)
  const [showTools, setShowTools] = useState(false)
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
      let welcomeContent = `Hello! I'm your research assistant powered by Gemini. I'm here to help you understand and analyze your papers.`;
      
      if (paperId) {
        welcomeContent = `Hello! I'm your research assistant. I have access to the current paper and can help you understand and analyze it. What would you like to explore?`;
      }
      
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: welcomeContent,
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, paperId])

  // Auto-expand when auto-prompt is provided or forceExpand is true
  useEffect(() => {
    if ((autoPrompt || forceExpand) && isOpen && isCollapsed) {
      setIsCollapsed(false)
    }
  }, [autoPrompt, forceExpand, isOpen, isCollapsed])

  // Handle auto-prompt when text is provided
  useEffect(() => {
    if (autoPrompt && isOpen && !isCollapsed) {
      setInputValue(`What does this mean: "${autoPrompt}"`)
    } else if (!autoPrompt) {
      setInputValue('') // Clear input when no auto-prompt
    }
  }, [autoPrompt, isOpen, isCollapsed])

  // Clear input when collapsing/expanding the chat
  useEffect(() => {
    if (isCollapsed) {
      setInputValue('')
    } else {
      // Clear input when expanding unless there's an auto-prompt
      if (!autoPrompt) {
        setInputValue('')
      }
    }
  }, [isCollapsed, autoPrompt])

  const handleToolExecution = async (tool: Tool, prompt: string) => {
    // Placeholder implementations for tools
    switch (tool.id) {
      case 'video-generation':
        return {
          type: 'video',
          status: 'placeholder',
          message: `Video generation tool activated for: "${prompt}". This is a placeholder - video generation will be implemented soon.`,
          placeholder: true
        }
      case 'graph-generation':
        return {
          type: 'graph',
          status: 'placeholder',
          message: `Graph generation tool activated for: "${prompt}". This is a placeholder - graph generation will be implemented soon.`,
          placeholder: true
        }
      default:
        return {
          type: 'error',
          message: 'Unknown tool selected'
        }
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
      toolUsed: selectedTool?.id
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = inputValue
    const currentTool = selectedTool
    setInputValue('')
    setIsLoading(true)

    try {
      // If a tool is selected, execute it instead of normal chat
      if (currentTool) {
        const toolResult = await handleToolExecution(currentTool, currentInput)
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: toolResult.message,
          isUser: false,
          timestamp: new Date(),
          toolResult: toolResult
        }

        setMessages(prev => [...prev, aiResponse])
        setSelectedTool(null) // Reset tool selection after use
      } else {
        // Normal chat flow
        const response = await fetch('/api/gemini/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: currentInput,
            paperId: paperId 
          }),
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
      }
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
    if (window.confirm('Are you sure you want to clear all messages?')) {
      setMessages([])
      setSelectedTool(null)
    }
  }

  const formatMessageContent = (content: string) => {
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
      .replace(/\n/g, '<br>')

    return { __html: formatted }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool)
    setShowTools(false)
    setInputValue(tool.placeholder)
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const renderToolResult = (toolResult: any) => {
    if (!toolResult) return null
    
    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-2">
          {toolResult.type === 'video' && <Video className="h-4 w-4 text-blue-500" />}
          {toolResult.type === 'graph' && <BarChart3 className="h-4 w-4 text-green-500" />}
          <span className="text-sm font-medium text-gray-700">
            {toolResult.type === 'video' ? 'Video Generation' : 'Graph Generation'}
          </span>
          {toolResult.placeholder && (
            <Badge variant="outline" className="text-xs">
              Placeholder
            </Badge>
          )}
        </div>
        {toolResult.placeholder && (
          <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
            This is a placeholder implementation. The actual tool will be implemented soon.
          </div>
        )}
      </div>
    )
  }

  // Always render the sidebar - don't hide it based on isOpen

  return (
    <div className={cn(
      isCollapsed
        ? "flex flex-col h-full bg-gray-50 border-l border-gray-200 transition-all duration-300 ease-in-out w-12"
        : "flex flex-col h-full bg-gray-50 border-l border-gray-200 transition-all duration-300 ease-in-out w-80"
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
            <span className="font-sans font-bold text-base text-royal-700">Research Copilot</span>
            <Bot className="h-5 w-5 text-royal-600" />
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className={messages.length === 0 ? "flex flex-col items-center justify-center h-full w-full" : "p-3 pl-4"}>
              {messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center w-full mt-20">
                  <div className="inline-flex items-center justify-center rounded-full bg-gray-100 p-4 mb-2">
                    <Bot className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm mb-1">Explore Research</p>
                  <p className="text-xs text-gray-500 text-center max-w-xs">Ask questions or use tools to analyze your papers!</p>
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
                          {message.toolUsed && (
                            <div className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              <span className="text-xs font-medium">
                                {AVAILABLE_TOOLS.find(t => t.id === message.toolUsed)?.name}
                              </span>
                            </div>
                          )}
                          <span className={cn(
                            "text-xs",
                            message.isUser ? "text-royal-100" : "text-gray-500"
                          )}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div 
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={formatMessageContent(message.content)}
                        />
                        {message.toolResult && renderToolResult(message.toolResult)}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-900 border border-gray-200 shadow-sm rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-3 w-3 text-royal-500" />
                          <Loader2 className="h-3 w-3 animate-spin text-royal-500" />
                          <span className="text-sm">
                            {selectedTool ? `Running ${selectedTool.name}...` : 'Analyzing...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Tools Section */}
          {showTools && (
            <div className="p-3 pl-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs font-medium text-gray-600 mb-2">Available Tools:</div>
              <div className="space-y-2">
                {AVAILABLE_TOOLS.map((tool) => (
                  <Button
                    key={tool.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-auto p-2 border-royal-200 hover:bg-royal-50 hover:text-royal-700"
                    onClick={() => handleToolSelect(tool)}
                  >
                    <div className="flex items-center gap-2 w-full min-w-0">
                      {tool.icon}
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium text-xs truncate">{tool.name}</div>
                        <div className="text-xs text-gray-500 truncate">{tool.description}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="p-3 pl-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs font-medium text-gray-600 mb-2">Quick Actions:</div>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-royal-200 hover:bg-royal-50 hover:text-royal-700"
                  onClick={() => setInputValue("Explain the key findings of this paper")}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Key Findings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-royal-200 hover:bg-royal-50 hover:text-royal-700"
                  onClick={() => setInputValue("Summarize the methodology used")}
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Methodology
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 pl-4 border-t border-gray-200 bg-white sticky bottom-0 z-10 mt-0">
            {/* Tool Selection Header */}
            {selectedTool && (
              <div className="mb-2 flex items-center justify-between p-2 bg-royal-50 rounded-lg border border-royal-200">
                <div className="flex items-center gap-2">
                  {selectedTool.icon}
                  <span className="text-sm font-medium text-royal-700">{selectedTool.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTool(null)}
                  className="h-6 w-6 p-0 hover:bg-royal-100"
                >
                  ×
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={selectedTool ? selectedTool.placeholder : "Ask about concepts, findings, methodology..."}
                  className="min-h-[56px] max-h-[160px] resize-none text-sm border-gray-300 focus:border-royal-500 focus:ring-royal-500 pr-10"
                  rows={2}
                />
                {/* Tools Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTools(!showTools)}
                  className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-gray-100"
                  title="Toggle Tools"
                >
                  <Wrench className="h-3 w-3" />
                </Button>
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