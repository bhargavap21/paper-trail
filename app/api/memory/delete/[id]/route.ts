import { NextResponse } from 'next/server';
import { mockDb, calculateCosineSimilarity } from '../../db';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return new NextResponse('Memory item ID is required', { status: 400 });
    }

    console.log(`Attempting to delete memory item: ${id}`);

    // Delete the memory item and its associated edges
    const deleted = mockDb.deleteMemoryItem(id);

    if (!deleted) {
      return new NextResponse('Memory item not found', { status: 404 });
    }

    console.log(`Successfully deleted memory item: ${id}`);

    // Recalculate all similarities for remaining nodes
    console.log('Recalculating graph connections after deletion...');
    const remainingItems = mockDb.listMemoryItems({ userId: "demo-user" });
    
    if (remainingItems.length > 1) {
      try {
        // Recalculate similarities between all remaining pairs
        let newConnectionsCount = 0;
        for (let i = 0; i < remainingItems.length; i++) {
          for (let j = i + 1; j < remainingItems.length; j++) {
            const item1 = remainingItems[i];
            const item2 = remainingItems[j];
            
            if (item1.embedding && item2.embedding) {
              const similarity = calculateCosineSimilarity(item1.embedding, item2.embedding);
              
              if (similarity > 0.5) {
                mockDb.createOrUpdateEdge(item1.id, item2.id, similarity);
                newConnectionsCount++;
              }
            }
          }
        }
        
        console.log(`Recalculated ${newConnectionsCount} connections for ${remainingItems.length} remaining nodes`);
      } catch (recalcError) {
        console.error('Error recalculating graph connections:', recalcError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Memory item deleted and graph recalculated',
      deletedId: id,
      remainingNodes: remainingItems.length
    }, { status: 200 });

  } catch (error: any) {
    console.error('[MEMORY_DELETE]', error);
    return new NextResponse(`Internal Server Error: ${error.message}`, { status: 500 });
  }
} 