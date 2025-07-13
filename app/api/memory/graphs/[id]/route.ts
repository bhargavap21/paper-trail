import { NextResponse } from 'next/server';
import { mockDb } from '../../db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return new NextResponse('Graph name is required', { status: 400 });
    }

    const updatedGraph = mockDb.updateMemoryGraph(params.id, { name: name.trim() });
    
    if (!updatedGraph) {
      return new NextResponse('Graph not found', { status: 404 });
    }

    return NextResponse.json(updatedGraph);
  } catch (error: any) {
    console.error('[MEMORY_GRAPHS_PUT]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const success = mockDb.deleteMemoryGraph(params.id);
    
    if (!success) {
      return new NextResponse('Graph not found', { status: 404 });
    }

    return NextResponse.json({ message: 'Graph deleted successfully' });
  } catch (error: any) {
    console.error('[MEMORY_GRAPHS_DELETE]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
} 