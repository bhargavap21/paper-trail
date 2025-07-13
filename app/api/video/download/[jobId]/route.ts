import { NextRequest, NextResponse } from 'next/server'

// Configuration for the manim backend server
const MANIM_SERVER_URL = process.env.MANIM_SERVER_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    console.log(`Attempting to download video for job: ${jobId}`)
    console.log(`Manim server URL: ${MANIM_SERVER_URL}`)

    // Forward the request directly to the manim backend server
    const manimResponse = await fetch(`${MANIM_SERVER_URL}/download/${jobId}`, {
      method: 'GET',
    })

    if (!manimResponse.ok) {
      console.error(`Manim server responded with status: ${manimResponse.status}`)
      
      if (manimResponse.status === 404) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        )
      }
      
      if (manimResponse.status === 400) {
        const errorText = await manimResponse.text()
        console.error('Manim server error:', errorText)
        return NextResponse.json(
          { error: 'Video not ready yet' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: `Manim server error: ${manimResponse.status}` },
        { status: manimResponse.status }
      )
    }

    // Get the video content as a stream
    const videoArrayBuffer = await manimResponse.arrayBuffer()
    
    console.log(`Successfully downloaded video: ${videoArrayBuffer.byteLength} bytes`)
    
    // Return the video with proper headers for inline viewing
    return new NextResponse(videoArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoArrayBuffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="video_${jobId}.mp4"`,
      },
    })

  } catch (error) {
    console.error('Error downloading video:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}