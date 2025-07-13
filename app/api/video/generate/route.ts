import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase, dbModels } from '@/lib/config'
import { ObjectId } from 'mongodb'
import fs from 'fs'
import path from 'path'

// Configuration for the manim backend server
const MANIM_SERVER_URL = process.env.MANIM_SERVER_URL || 'http://localhost:8000'

interface ManimJobResponse {
  job_id: string
  status: string
  message: string
}

interface ManimJobStatus {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  completed_at?: string
  error?: string
  video_path?: string
  pdf_source?: string
}

async function getPaperContent(paperId: string) {
  try {
    const db = await connectToDatabase()
    const paper = await db.collection(dbModels.papers).findOne({ _id: new ObjectId(paperId) })
    return paper
  } catch (error) {
    console.error('Error fetching paper:', error)
    return null
  }
}

async function uploadPaperToManim(paperContent: any): Promise<string | null> {
  try {
    if (!paperContent?.filePath) {
      console.log('No filePath found in paperContent:', paperContent)
      return null
    }

    console.log('Uploading paper to manim backend via file upload')
    console.log('Paper title:', paperContent.title)
    console.log('Paper filePath:', paperContent.filePath)
    
    // Read the actual PDF file from the uploads directory
    const filePath = path.join(process.cwd(), 'public', paperContent.filePath)
    
    if (!fs.existsSync(filePath)) {
      console.error('PDF file not found at path:', filePath)
      return null
    }
    
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath)
    console.log('File size:', fileBuffer.length, 'bytes')
    
    // Create FormData to upload the file
    const formData = new FormData()
    const blob = new Blob([fileBuffer], { type: 'application/pdf' })
    formData.append('file', blob, paperContent.originalName || 'paper.pdf')
    
    console.log('Uploading PDF file to manim backend...')
    
    const response = await fetch(`${MANIM_SERVER_URL}/generate-video-upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Manim server error: ${response.status} - ${errorText}`)
    }

    const result: ManimJobResponse = await response.json()
    console.log('Manim job created successfully:', result.job_id)
    return result.job_id
  } catch (error) {
    console.error('Error uploading to manim:', error)
    return null
  }
}

async function checkJobStatus(jobId: string): Promise<ManimJobStatus | null> {
  try {
    const response = await fetch(`${MANIM_SERVER_URL}/jobs/${jobId}`)
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch (error) {
    console.error('Error checking job status:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, paperId, paperContext } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('Video generation request:', { prompt, paperId, paperContext })

    // Check if manim server is available
    let isManimpAvailable = false
    try {
      const healthCheck = await fetch(`${MANIM_SERVER_URL}/api-info`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })
      isManimpAvailable = healthCheck.ok
    } catch (error) {
      console.log('Manim server not available, using placeholder response')
    }

    if (isManimpAvailable) {
      // Real integration with manim backend
      try {
        // Retrieve actual paper content from database
        console.log('Attempting to retrieve paper with ID:', paperId)
        const paperContent = paperId ? await getPaperContent(paperId) : null
        
        console.log('Retrieved paper content:', paperContent ? {
          title: paperContent.title,
          filePath: paperContent.filePath,
          hasContent: !!paperContent.content
        } : 'null')
        
        if (!paperContent) {
          console.log('No paper content found, paperId:', paperId)
          console.log('Available paperContext length:', paperContext?.length || 0)
          return NextResponse.json({
            success: false,
            error: 'Paper not found',
            details: `Could not retrieve paper with ID: ${paperId}`
          }, { status: 404 })
        }
        
        console.log('Using actual paper for manim generation:', paperContent.title)
        
        const jobId = await uploadPaperToManim(paperContent)
          
        if (jobId) {
          // Return job information for tracking
          const videoResult = {
            id: jobId,
            status: 'processing',
            title: `Educational Video: ${prompt.slice(0, 50)}...`,
            description: `Generated video explaining: ${prompt}`,
            videoUrl: null,
            thumbnailUrl: null,
            duration: '0:00',
            createdAt: new Date().toISOString(),
            jobId: jobId,
            metadata: {
              prompt,
              paperId,
              hasContext: !!paperContext,
              contextLength: paperContext?.length || 0,
              paperTitle: paperContent.title,
              paperFilePath: paperContent.filePath
            }
          }

          return NextResponse.json({
            success: true,
            message: 'Video generation started successfully',
            video: videoResult,
            isPlaceholder: false,
            jobId: jobId
          })
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to start video generation',
            details: 'Could not create job with manim backend'
          }, { status: 500 })
        }
      } catch (error) {
        console.error('Error with manim integration:', error)
        // Fall through to placeholder response
      }
    }

    // Placeholder response (when manim is not available or integration fails)
    await new Promise(resolve => setTimeout(resolve, 2000))

    const mockVideoResult = {
      id: `video-${Date.now()}`,
      status: 'completed',
      title: `Educational Video: ${prompt.slice(0, 50)}...`,
      description: `Generated video explaining: ${prompt}`,
      videoUrl: null,
      thumbnailUrl: null,
      duration: '0:00',
      createdAt: new Date().toISOString(),
      metadata: {
        prompt,
        paperId,
        hasContext: !!paperContext,
        contextLength: paperContext?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Video generation request processed successfully',
      video: mockVideoResult,
      isPlaceholder: true
    })

  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process video generation request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Add a GET endpoint to check job status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const jobStatus = await checkJobStatus(jobId)
    
    if (!jobStatus) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job: jobStatus
    })

  } catch (error) {
    console.error('Error checking job status:', error)
    return NextResponse.json(
      { error: 'Failed to check job status' },
      { status: 500 }
    )
  }
} 