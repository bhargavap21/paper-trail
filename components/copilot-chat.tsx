"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, Send, Bot, User, Loader2 } from 'lucide-react'

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
}

export default function CopilotChat({ isOpen, onClose, initialContext, paperId, autoPrompt }: CopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

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

  // Handle auto-prompt when text is provided
  useEffect(() => {
    if (autoPrompt && isOpen) {
      setInputValue(`What does this mean: "${autoPrompt}"`)
    }
  }, [autoPrompt, isOpen])

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
      // Just send the user's message directly to Gemini
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

  const formatMessageContent = (content: string) => {
    // Simple markdown-like formatting
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>')

    return { __html: formatted }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 z-50 flex flex-col">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-200 dark:border-slate-700">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-500" />
          Copilot Chat
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.isUser ? (
                    <User className="h-3 w-3" />
                  ) : (
                    <Bot className="h-3 w-3" />
                  )}
                  <span className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div 
                  className="text-sm"
                  dangerouslySetInnerHTML={formatMessageContent(message.content)}
                />
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2">
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
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1 min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 