import { NextResponse } from 'next/server';
import { mockDb } from '../db';

export async function GET(req: Request) {
  try {
    const userId = "demo-user"; // Use demo user ID
    
    const graphs = mockDb.listMemoryGraphs(userId);
    
    // If no graphs exist, create a default one
    if (graphs.length === 0) {
      const defaultGraph = mockDb.createMemoryGraph(userId, 'Default Graph', true);
      return NextResponse.json([defaultGraph]);
    }
    
    return NextResponse.json(graphs);
  } catch (error: any) {
    console.error('[MEMORY_GRAPHS_GET]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = "demo-user"; // Use demo user ID
    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return new NextResponse('Graph name is required', { status: 400 });
    }

    const newGraph = mockDb.createMemoryGraph(userId, name.trim(), false);
    
    return NextResponse.json(newGraph, { status: 201 });
  } catch (error: any) {
    console.error('[MEMORY_GRAPHS_POST]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
} 