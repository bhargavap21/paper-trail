import { NextResponse } from 'next/server';
import { mockDb } from '../db';

export async function GET(req: Request) {
  try {
    const userId = "demo-user";
    
    // Parse query parameters
    const url = new URL(req.url);
    const graphId = url.searchParams.get('graphId');
    
    console.log('=== MEMORY LIST API CALLED ===');
    console.log(`User: ${userId}, Graph filter: ${graphId || 'all'}`);
    
    // Ensure default graph exists
    const defaultGraph = mockDb.getOrCreateDefaultGraph(userId);
    const targetGraphId = graphId || defaultGraph.id;
    
    console.log(`Using graph ID: ${targetGraphId}`);
    
    // Get filtered data
    const graphData = mockDb.getGraphData({ 
      userId, 
      graphId: targetGraphId 
    });
    
    console.log(`Found ${graphData.nodes.length} nodes and ${graphData.edges.length} edges in graph ${targetGraphId}`);
    
    return NextResponse.json(graphData);
  } catch (error: any) {
    console.error('[MEMORY_LIST_GET]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
} 