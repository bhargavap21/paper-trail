import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, dbModels } from '@/lib/config';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Await params before accessing properties
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // Connect to the database
    const db = await connectToDatabase();
    const papersCollection = db.collection(dbModels.papers);
    
    // Try to parse the ID as an ObjectId (for MongoDB)
    let paper = null;
    try {
      const objectId = new ObjectId(id);
      paper = await papersCollection.findOne({ _id: objectId });
    } catch (error) {
      // If not a valid ObjectId, try finding by other means
      // This allows us to use demo IDs or other identifiers
      paper = await papersCollection.findOne({ id: id });
    }
    
    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }
    
    // Debug the file path
    console.log("Paper found:", {
      _id: paper._id,
      title: paper.title,
      filePath: paper.filePath 
    });
    
    // Ensure the file path starts with a forward slash
    if (paper.filePath && !paper.filePath.startsWith('/')) {
      paper.filePath = '/' + paper.filePath;
    }
    
    return NextResponse.json({ paper });
  } catch (error) {
    console.error('Error fetching paper:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paper' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const db = await connectToDatabase();
    const papersCollection = db.collection(dbModels.papers);
    let result;
    try {
      const objectId = new ObjectId(id);
      result = await papersCollection.deleteOne({ _id: objectId });
    } catch (error) {
      // If not a valid ObjectId, try deleting by other means
      result = await papersCollection.deleteOne({ id: id });
    }
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Paper not found or already deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting paper:', error);
    return NextResponse.json({ error: 'Failed to delete paper' }, { status: 500 });
  }
} 