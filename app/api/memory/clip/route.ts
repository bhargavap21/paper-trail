import { NextResponse } from 'next/server';
import { mockDb } from '../db';
import { generateEmbedding } from '@/lib/openai-client';

export async function POST(req: Request) {
  try {
    console.log('=== MEMORY CLIP API CALLED ===');
    
    // Use a mock/default userId instead of requiring authentication
    const userId = "demo-user"; // Fixed demo user ID
    
    const body = await req.json();
    console.log('Request body:', body);
    
    const { paperId, text, paperTitle, graphId } = body;

    if (!paperId || !text) {
      console.error('Missing required fields:', { paperId: !!paperId, text: !!text });
      return new NextResponse('Missing paperId or text', { status: 400 });
    }

    // Get or create default graph if no graphId provided
    const targetGraphId = graphId || mockDb.getOrCreateDefaultGraph(userId).id;
    console.log(`Using graph ID: ${targetGraphId}`);

    console.log(`Processing clip for paper ${paperId}: "${text.substring(0, 100)}..." (graph: ${targetGraphId})`);

    // Step 0: Check for duplicate text to prevent double-clipping within the same graph
    const existingItems = mockDb.listMemoryItems({ userId, graphId: targetGraphId });
    const duplicateItem = existingItems.find(item => 
      item.text.trim().toLowerCase() === text.trim().toLowerCase() && 
      item.paperId === paperId
    );
    
    if (duplicateItem) {
      console.log(`Duplicate text detected in graph ${targetGraphId}, returning existing item: ${duplicateItem.id}`);
      return NextResponse.json({
        memoryItem: duplicateItem,
        newEdges: [],
        message: "Text already exists in this memory graph",
        hasEmbedding: !!duplicateItem.embedding,
        isDuplicate: true
      }, { status: 200 });
    }

    // Step 1: Generate embedding for the clipped text
    let embedding: number[] | undefined;
    try {
      console.log('Attempting to generate embedding...');
      const embeddingResponse = await generateEmbedding(text);
      embedding = embeddingResponse.embedding;
      console.log(`Generated embedding with ${embedding.length} dimensions`);
    } catch (embeddingError) {
      console.error('Failed to generate embedding:', embeddingError);
      // Continue without embedding - we'll still store the text
      console.warn('Continuing without embedding due to OpenAI API error');
    }

    // Step 2: Create the memory item with embedding
    const memoryItem = mockDb.createMemoryItem({
      userId: userId,
      paperId: paperId,
      text: text,
      source: 'clip',
      embedding: embedding,
      paperTitle: paperTitle,
      graphId: targetGraphId
    });

    console.log(`Memory item created: ${memoryItem.id} (graph: ${targetGraphId})`);

    // Step 3: If we have an embedding, calculate similarities and create edges
    let newEdges: any[] = [];
    if (embedding) {
      try {
        console.log('Processing similarities with other memory items in the same graph...');
        console.log(`Current threshold for connections: 0.5 (50%)`);
        newEdges = await mockDb.processNewMemoryWithSimilarity(memoryItem, 0.5);
        console.log(`Created ${newEdges.length} new edges based on similarity > 50%`);
      } catch (similarityError) {
        console.error('Error processing similarities:', similarityError);
        // Continue without similarity processing
      }
    } else {
      console.log('No embedding available, skipping similarity processing');
    }

    // Step 4: Return the result with graph data
    const response = {
      memoryItem,
      newEdges,
      message: `Clipped text successfully to ${targetGraphId}. ${newEdges.length} connections found.`,
      hasEmbedding: !!embedding,
      graphId: targetGraphId
    };

    console.log('Returning response:', response);
    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('[MEMORY_CLIP_POST]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
} 