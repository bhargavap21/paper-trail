import { NextResponse } from 'next/server';
import { mockDb, calculateCosineSimilarity } from '../db';

export async function POST(req: Request) {
  try {
    console.log('=== RECALCULATING ALL SIMILARITIES ===');
    
    const { threshold = 0.5 } = await req.json().catch(() => ({}));
    console.log(`Using threshold: ${threshold} (${(threshold * 100).toFixed(1)}%)`);
    
    // Get all memory items with embeddings
    const allItems = mockDb.listMemoryItems({});
    const itemsWithEmbeddings = allItems.filter(item => item.embedding);
    
    console.log(`Found ${itemsWithEmbeddings.length} items with embeddings`);
    
    // Clear existing edges
    const emptyEdges: any[] = [];
    require('fs').writeFileSync(
      require('path').join(process.cwd(), '.next', 'memory-edges.json'),
      JSON.stringify(emptyEdges, null, 2)
    );
    
    let totalNewEdges = 0;
    
    // Calculate all pairwise similarities
    for (let i = 0; i < itemsWithEmbeddings.length; i++) {
      for (let j = i + 1; j < itemsWithEmbeddings.length; j++) {
        const itemA = itemsWithEmbeddings[i];
        const itemB = itemsWithEmbeddings[j];
        
        if (!itemA.embedding || !itemB.embedding) continue;
        
        const similarity = calculateCosineSimilarity(itemA.embedding, itemB.embedding);
        
        console.log(`📊 "${itemA.text}" ↔ "${itemB.text}"`);
        console.log(`   Similarity: ${similarity.toFixed(4)} (${(similarity * 100).toFixed(2)}%)`);
        
        if (similarity > threshold) {
          console.log(`   ✅ CREATING CONNECTION!`);
          mockDb.createOrUpdateEdge(itemA.id, itemB.id, similarity);
          totalNewEdges++;
        } else {
          console.log(`   ❌ Below threshold`);
        }
      }
    }
    
    console.log(`\n🔗 RECALCULATION COMPLETE: Created ${totalNewEdges} connections`);
    console.log(`=== END RECALCULATION ===\n`);
    
    // Return updated graph data
    const graphData = mockDb.getGraphData({});
    
    return NextResponse.json({
      success: true,
      message: `Recalculated with ${threshold * 100}% threshold`,
      newEdgesCount: totalNewEdges,
      graphData
    });
    
  } catch (error: any) {
    console.error('[RECALCULATE_ERROR]', error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
} 