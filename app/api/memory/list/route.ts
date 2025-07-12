import { NextResponse } from 'next/server';
import { mockDb } from '../db';

export async function GET(req: Request) {
  try {
    // Use a mock/default userId instead of requiring authentication
    const userId = "demo-user";

    // Get complete graph data (nodes and edges) for this user
    const graphData = mockDb.getGraphData({ userId });
    
    console.log(`Retrieved graph data: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);

    return NextResponse.json(graphData, { status: 200 });
  } catch (error: any) {
    console.error('[MEMORY_LIST_GET]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
} 