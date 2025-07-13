import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, dbModels } from '@/lib/config';
import { ObjectId } from 'mongodb';

// DELETE: Remove a highlight by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, highlightId: string }> }
) {
  try {
    console.log("DELETE highlight - Start");
    const resolvedParams = await params;
    const paperId = resolvedParams.id;
    const highlightId = resolvedParams.highlightId;
    
    console.log("Deleting highlight:", { paperId, highlightId });
    
    if (!highlightId) {
      return NextResponse.json(
        { error: 'Missing highlight ID' },
        { status: 400 }
      );
    }

    // Connect to the database
    const db = await connectToDatabase();
    const highlightsCollection = db.collection(dbModels.highlights);
    
    // Create ObjectId from the highlight ID
    let objectId;
    try {
      objectId = new ObjectId(highlightId);
    } catch (error) {
      console.error('Invalid ObjectId format:', error);
      return NextResponse.json(
        { error: 'Invalid highlight ID format' },
        { status: 400 }
      );
    }
    
    // Delete the highlight
    const result = await highlightsCollection.deleteOne({ 
      _id: objectId,
      paperId: paperId
    });
    
    if (result.deletedCount === 0) {
      console.log('Highlight not found or already deleted');
      return NextResponse.json(
        { error: 'Highlight not found or already deleted' },
        { status: 404 }
      );
    }
    
    console.log('Highlight deleted successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Highlight deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return NextResponse.json(
      { error: 'Failed to delete highlight' },
      { status: 500 }
    );
  }
} 