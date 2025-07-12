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
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

interface CopilotChatProps {
  isOpen: boolean
  onClose: () => void
  initialContext?: string
  paperId?: string
  autoPrompt?: string
  forceExpand?: boolean
}

export default function CopilotChat({ isOpen, onClose, initialContext, paperId, autoPrompt, forceExpand }: CopilotChatProps) {
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
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        content: `Hello! I'm your AI assistant powered by Gemini. How can I help you today?`,
        isUser: false,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, messages.length])

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

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputValue }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
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

  // Always render the sidebar - don't hide it based on isOpen

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
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
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
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-royal-700">Copilot</span>
            <Bot className="h-5 w-5 text-royal-600" />
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messages.length}
              </Badge>
            )}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-3 pl-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Ask me anything about your papers!</p>
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
                            ? 'bg-royal-500 text-white'
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
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={formatMessageContent(message.content)}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-900 border border-gray-200 shadow-sm rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Bot className="h-3 w-3" />
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 pl-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm border-gray-300 focus:border-royal-500"
                rows={1}
              />
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