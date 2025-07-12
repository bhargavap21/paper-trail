import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, dbModels } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Connect to the database
    const db = await connectToDatabase();
    const papersCollection = db.collection(dbModels.papers);
    
    // Get URL parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    
    // Build the query
    let query = {};
    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { authors: { $regex: search, $options: 'i' } },
          { abstract: { $regex: search, $options: 'i' } }
        ]
      };
    }
    
    // Fetch papers with pagination
    const papers = await papersCollection
      .find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .skip(offset)
      .limit(limit)
      .toArray();
    
    // Get total count for pagination
    const totalCount = await papersCollection.countDocuments(query);
    
    // Transform the papers data to match the frontend interface
    const transformedPapers = papers.map(paper => ({
      id: paper._id.toString(),
      title: paper.title || 'Untitled Paper',
      authors: Array.isArray(paper.authors) ? paper.authors : 
               typeof paper.authors === 'string' ? [paper.authors] : [],
      abstract: paper.abstract || 'No abstract available',
      url: paper.url || paper.originalUrl || '',
      savedAt: paper.createdAt || paper.uploadedAt || new Date().toISOString(),
      status: paper.status || 'completed', // Assume completed if no status
      filePath: paper.filePath || null
    }));
    
    return NextResponse.json({
      papers: transformedPapers,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
    
  } catch (error) {
    console.error('Error fetching papers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch papers' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Connect to the database
    const db = await connectToDatabase();
    const papersCollection = db.collection(dbModels.papers);
    
    // Delete all papers
    const result = await papersCollection.deleteMany({});
    
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} papers`
    });
    
  } catch (error) {
    console.error('Error deleting all papers:', error);
    return NextResponse.json(
      { error: 'Failed to delete all papers' },
      { status: 500 }
    );
  }
}