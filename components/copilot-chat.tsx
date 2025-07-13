"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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

interface GraphGenerationWorkflow {
  isActive: boolean
  step: 'topic' | 'clipCount' | 'graphSelection' | 'processing' | 'complete'
  topic: string
  clipCount: number
  selectedGraphId: string
  availableGraphs: Array<{ id: string; name: string }>
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
  const [graphWorkflow, setGraphWorkflow] = useState<GraphGenerationWorkflow>({
    isActive: false,
    step: 'topic',
    topic: '',
    clipCount: 5,
    selectedGraphId: '',
    availableGraphs: []
  })
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
    switch (tool.id) {
      case 'video-generation':
        try {
          // Get paper context if available
          let paperContext = initialContext
          
          const response = await fetch('/api/video/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              prompt,
              paperId,
              paperContext
            }),
          })

          if (!response.ok) {
            throw new Error(`Video generation failed: ${response.status}`)
          }

          const data = await response.json()
          
          const result = {
            type: 'video',
            status: data.video.status,
            message: data.message,
            video: data.video,
            isPlaceholder: data.isPlaceholder,
            success: data.success,
            jobId: data.jobId
          }

          // Start polling for job status if we have a job ID
          if (data.jobId && !data.isPlaceholder) {
            // We'll need to implement polling in the message handling
            result.needsPolling = true
          }

          return result
        } catch (error) {
          console.error('Video generation error:', error)
          return {
            type: 'video',
            status: 'error',
            message: `Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`,
            error: true
          }
        }
        
      case 'graph-generation':
        // Initialize graph generation workflow
        await initializeGraphGeneration()
        return {
          type: 'graph',
          status: 'workflow',
          message: `Starting graph generation workflow. Please follow the steps below to configure your graph generation.`,
          workflow: true
        }
      default:
        return {
          type: 'error',
          message: 'Unknown tool selected'
        }
    }
  }

  const pollJobStatus = async (jobId: string, messageId: string) => {
    const maxAttempts = 30 // 5 minutes with 10 second intervals
    let attempts = 0

    const poll = async () => {
      try {
        const response = await fetch(`/api/video/generate?jobId=${jobId}`)
        const result = await response.json()

        if (result.success && result.job) {
          const job = result.job
          
          // Update the message with current status
          setMessages(prev => prev.map(msg => 
            msg.id === messageId
              ? { 
                  ...msg, 
                  toolResult: { 
                    ...msg.toolResult,
                    status: job.status,
                    message: job.status === 'completed' ? 'Video generation completed!' :
                            job.status === 'failed' ? `Generation failed: ${job.error}` :
                            job.status === 'processing' ? 'Generating video...' :
                            'Video generation in progress...',
                    video: job.status === 'completed' ? {
                      ...msg.toolResult.video,
                      status: 'completed',
                      videoUrl: job.video_path ? `/api/video/download/${jobId}` : null
                    } : msg.toolResult.video,
                    isLoading: job.status === 'pending' || job.status === 'processing'
                  }
                }
              : msg
          ))

          // Continue polling if not finished
          if (job.status === 'pending' || job.status === 'processing') {
            attempts++
            if (attempts < maxAttempts) {
              setTimeout(poll, 10000) // Poll every 10 seconds
            } else {
              // Timeout
              setMessages(prev => prev.map(msg => 
                msg.id === messageId
                  ? { 
                      ...msg, 
                      toolResult: { 
                        ...msg.toolResult,
                        status: 'error',
                        message: 'Video generation timed out',
                        isLoading: false
                      }
                    }
                  : msg
              ))
            }
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error)
        // Continue polling on error, but don't update the message
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000)
        }
      }
    }

    // Start polling after a short delay
    setTimeout(poll, 5000)
  }

  const initializeGraphGeneration = async () => {
    // Fetch available memory graphs
    try {
      const response = await fetch('/api/memory/graphs')
      const graphs = await response.json()
      
      setGraphWorkflow({
        isActive: true,
        step: 'topic',
        topic: '',
        clipCount: 5,
        selectedGraphId: '',
        availableGraphs: graphs.map((g: any) => ({ id: g.id, name: g.name }))
      })
    } catch (error) {
      console.error('Error fetching graphs:', error)
      setGraphWorkflow({
        isActive: true,
        step: 'topic',
        topic: '',
        clipCount: 5,
        selectedGraphId: '',
        availableGraphs: []
      })
    }
  }

  const executeGraphGeneration = async () => {
    if (!paperId || !graphWorkflow.topic || !graphWorkflow.selectedGraphId) {
      return
    }

    setGraphWorkflow(prev => ({ ...prev, step: 'processing' }))

    try {
      const response = await fetch('/api/graph-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId,
          topic: graphWorkflow.topic,
          clipCount: graphWorkflow.clipCount,
          graphId: graphWorkflow.selectedGraphId
        })
      })

      const result = await response.json()

      if (response.ok) {
        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `✅ Graph generation completed successfully!\n\nAdded ${result.addedClips.length} clips to "${result.graphName}" graph.\nCreated ${result.newEdges.length} new connections.\n\nTopic: "${graphWorkflow.topic}"\nClips generated: ${result.addedClips.length}`,
          isUser: false,
          timestamp: new Date(),
          toolResult: {
            type: 'graph',
            status: 'success',
            data: result
          }
        }
        setMessages(prev => [...prev, successMessage])
        setGraphWorkflow(prev => ({ ...prev, step: 'complete', isActive: false }))
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `❌ Graph generation failed: ${result.error}`,
          isUser: false,
          timestamp: new Date(),
          toolResult: {
            type: 'graph',
            status: 'error',
            error: result.error
          }
        }
        setMessages(prev => [...prev, errorMessage])
        setGraphWorkflow(prev => ({ ...prev, step: 'topic', isActive: false }))
      }
    } catch (error) {
      console.error('Graph generation error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `❌ Graph generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isUser: false,
        timestamp: new Date(),
        toolResult: {
          type: 'graph',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
      setMessages(prev => [...prev, errorMessage])
      setGraphWorkflow(prev => ({ ...prev, step: 'topic', isActive: false }))
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
          // Add a loading message for video generation
          let loadingMessageId = ''
          if (currentTool.id === 'video-generation') {
            loadingMessageId = (Date.now() + 1).toString()
            const loadingMessage: Message = {
              id: loadingMessageId,
              content: `🎬 Generating video for: "${currentInput}"`,
              isUser: false,
              timestamp: new Date(),
              toolResult: {
                type: 'video',
                status: 'processing',
                message: 'Generating your educational video... This may take a moment.',
                isLoading: true
              }
            }
            setMessages(prev => [...prev, loadingMessage])
          }
        
        const toolResult = await handleToolExecution(currentTool, currentInput)
        
        // Update the loading message with the result for video generation
        if (currentTool.id === 'video-generation') {
          setMessages(prev => prev.map(msg => 
            msg.toolResult?.isLoading ? {
              ...msg,
              content: `Used ${currentTool.name}: ${currentInput}`,
              toolResult: toolResult
            } : msg
          ))

          // Start polling if we have a job ID and need polling
          if (toolResult.jobId && toolResult.needsPolling) {
            pollJobStatus(toolResult.jobId, loadingMessageId)
          }
        } else {
          // For other tools, add a new message
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: toolResult.message,
            isUser: false,
            timestamp: new Date(),
            toolResult: toolResult
          }
          
          setMessages(prev => [...prev, aiResponse])
        }
        
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
          {toolResult.status && (
            <Badge 
              variant={toolResult.status === 'completed' ? 'default' : 
                     toolResult.status === 'error' ? 'destructive' : 
                     toolResult.status === 'processing' ? 'secondary' : 'outline'} 
              className="text-xs"
            >
              {toolResult.status === 'processing' ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processing
                </div>
              ) : toolResult.status}
            </Badge>
          )}
          {toolResult.isPlaceholder && (
            <Badge variant="outline" className="text-xs">
              Placeholder
            </Badge>
          )}
          {toolResult.workflow && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
              Workflow
            </Badge>
          )}
          {toolResult.status === 'success' && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
              Success
            </Badge>
          )}
          {toolResult.status === 'error' && (
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
              Error
            </Badge>
          )}
        </div>
        
        {toolResult.message && (
          <div className="text-sm text-gray-600 mb-2">
            {toolResult.message}
          </div>
        )}
        
        {toolResult.type === 'video' && toolResult.video && (
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900 mb-1">
                {toolResult.video.title}
              </div>
              <div className="text-xs text-blue-700">
                {toolResult.video.description}
              </div>
            </div>
            
            {toolResult.video.metadata && (
              <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Paper Context:</span>
                  <span className="font-medium">
                    {toolResult.video.metadata.hasContext ? 
                      `${toolResult.video.metadata.contextLength} chars` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{toolResult.video.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium">{new Date(toolResult.video.createdAt).toLocaleString()}</span>
                </div>
              </div>
            )}
            
            {toolResult.isPlaceholder && (
              <div className="text-sm text-orange-700 bg-gradient-to-r from-orange-50 to-yellow-50 p-3 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Ready for Video Generation!</span>
                </div>
                <div className="text-xs text-orange-600">
                  The video generation system is successfully integrated. When the manim backend is connected, 
                  this will generate an actual educational video based on your prompt and paper context.
                </div>
              </div>
            )}
            
            {!toolResult.isPlaceholder && toolResult.video.videoUrl && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-800 mb-2">Video Ready!</div>
                <video 
                  controls 
                  className="w-full rounded border"
                  poster={toolResult.video.thumbnailUrl}
                  preload="metadata"
                  onError={(e) => {
                    console.error('Video load error:', e);
                    // Show error message to user
                    const target = e.target as HTMLVideoElement;
                    target.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-400';
                    errorDiv.textContent = 'Failed to load video. The video may still be processing or there was an error.';
                    target.parentNode?.insertBefore(errorDiv, target);
                  }}
                >
                  <source src={toolResult.video.videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => window.open(toolResult.video.videoUrl, '_blank')}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                  >
                    Download Video
                  </button>
                  <button
                    onClick={() => {
                      const video = document.querySelector('video') as HTMLVideoElement;
                      if (video) {
                        video.load(); // Reload the video
                      }
                    }}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Reload
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {toolResult.type === 'graph' && toolResult.placeholder && (
          <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
            This is a placeholder implementation. The actual tool will be implemented soon.
          </div>
        )}
        
        {toolResult.workflow && (
          <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
            Use the workflow panel above to configure and run graph generation.
          </div>
        )}
        
        {toolResult.status === 'success' && toolResult.data && (
          <div className="text-sm text-gray-600 bg-green-50 p-2 rounded border-l-4 border-green-400">
            <div className="font-medium mb-1">Graph Generation Complete</div>
            <div className="text-xs space-y-1">
              <div>Added to: {toolResult.data.graphName}</div>
              <div>Clips generated: {toolResult.data.addedClips.length}</div>
              <div>New connections: {toolResult.data.newEdges.length}</div>
            </div>
          </div>
        )}
        
        {toolResult.error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-400">
            ❌ {toolResult.message}
          </div>
        )}
        
        {toolResult.status === 'error' && toolResult.error && (
          <div className="text-sm text-gray-600 bg-red-50 p-2 rounded border-l-4 border-red-400">
            <div className="font-medium mb-1">Generation Failed</div>
            <div className="text-xs">{toolResult.error}</div>
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

          {/* Graph Generation Workflow */}
          {graphWorkflow.isActive && (
            <div className="p-3 pl-4 border-t border-gray-200 bg-white">
              <Card className="border-royal-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-500" />
                    Graph Generation Setup
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure how to extract and add content to your memory graph
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Step 1: Topic */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      1. What topics should I focus on?
                    </Label>
                    <Input
                      placeholder="e.g., latent space, neural networks, attention mechanisms"
                      value={graphWorkflow.topic}
                      onChange={(e) => setGraphWorkflow(prev => ({ ...prev, topic: e.target.value }))}
                      className="text-xs"
                      disabled={graphWorkflow.step === 'processing'}
                    />
                  </div>

                  {/* Step 2: Clip Count */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      2. How many clips to generate? ({graphWorkflow.clipCount})
                    </Label>
                    <Slider
                      value={[graphWorkflow.clipCount]}
                      onValueChange={(value) => setGraphWorkflow(prev => ({ ...prev, clipCount: value[0] }))}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                      disabled={graphWorkflow.step === 'processing'}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1</span>
                      <span>20</span>
                    </div>
                  </div>

                  {/* Step 3: Graph Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      3. Which memory graph to add to?
                    </Label>
                    <Select 
                      value={graphWorkflow.selectedGraphId} 
                      onValueChange={(value) => setGraphWorkflow(prev => ({ ...prev, selectedGraphId: value }))}
                      disabled={graphWorkflow.step === 'processing'}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select a memory graph" />
                      </SelectTrigger>
                      <SelectContent>
                        {graphWorkflow.availableGraphs.map((graph) => (
                          <SelectItem key={graph.id} value={graph.id}>
                            {graph.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generate Button */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={executeGraphGeneration}
                      disabled={!graphWorkflow.topic || !graphWorkflow.selectedGraphId || graphWorkflow.step === 'processing'}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs"
                    >
                      {graphWorkflow.step === 'processing' ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-3 w-3 mr-2" />
                          Generate Graph
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setGraphWorkflow(prev => ({ ...prev, isActive: false }))}
                      variant="outline"
                      className="text-xs"
                      disabled={graphWorkflow.step === 'processing'}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
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