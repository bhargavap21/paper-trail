import { NextRequest, NextResponse } from 'next/server'
import Exa from 'exa-js'

// Initialize Exa client
const exa = new Exa(process.env.EXA_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    console.log('=== DEBUG SEARCH API CALLED ===')
    console.log('Query:', query)

    // Create a simple research task
    const taskStub = await exa.research.createTask({
      instructions: `Find information about: ${query}`,
      model: 'exa-research',
      output: {
        inferSchema: true
      }
    })

    console.log('Task created with ID:', taskStub.id)

    // Poll for completion
    const task = await exa.research.pollTask(taskStub.id)
    
    console.log('Task status:', task.status)
    console.log('Raw task object keys:', Object.keys(task))
    console.log('Full task object:', JSON.stringify(task, null, 2))
    console.log('Task result exists:', !!task.result)
    console.log('Task result type:', typeof task.result)
    
    // Return the raw result for debugging
    return NextResponse.json({
      success: true,
      taskId: taskStub.id,
      taskStatus: task.status,
      resultType: typeof task.result,
      resultKeys: task.result && typeof task.result === 'object' ? Object.keys(task.result) : null,
      rawResult: task.result,
      fullTask: task,
      query
    })

  } catch (error) {
    console.error('Debug search error:', error)
    return NextResponse.json(
      { 
        error: 'Debug search failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    )
  }
} 