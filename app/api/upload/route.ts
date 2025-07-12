import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, dbModels, genAI } from '@/lib/config';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'public/uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating uploads directory:', error);
}

// GET handler to fetch all papers
export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const papersCollection = db.collection(dbModels.papers);
    
    // Fetch all papers, projecting only necessary fields for the sidebar
    const papers = await papersCollection.find({}, {
      projection: {
        _id: 1,
        title: 1,
        createdAt: 1 // Optional: for sorting or display
      }
    }).sort({ createdAt: -1 }).toArray(); // Sort by newest first
    
    return NextResponse.json({ papers });
  } catch (error) {
    console.error('API GET papers error:', error);
    return NextResponse.json({ error: 'Failed to fetch papers.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // For multipart form data
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      // Create unique filename
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const filePath = path.join(uploadDir, fileName);
      
      // Save the file
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      
      // Create paper in database
      const publicPath = `/uploads/${fileName}`;
      const db = await connectToDatabase();
      const papersCollection = db.collection(dbModels.papers);
      
      const paper = {
        title: file.name.replace(/\.pdf$/, ''),
        authors: [],
        abstract: '',
        content: '',
        filePath: publicPath,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = await papersCollection.insertOne(paper);
      // Create a new object including the inserted ID to return
      const savedPaper = {
        ...paper,
        _id: result.insertedId
      };
      
      return NextResponse.json({ paper: savedPaper });
    } 
    // For JSON data (from previous implementation)
    else {
      const body = await req.json();
      const { url, fileName, fileContent } = body;
      const db = await connectToDatabase();
      const papersCollection = db.collection(dbModels.papers);

      // Prepare paper object
      const paper: any = {
        title: fileName ? fileName.replace(/\.pdf$/, '') : '',
        authors: [],
        abstract: '',
        content: fileContent || '',
        url: url || '',
        filePath: fileName ? `/uploads/${fileName}` : '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Use Gemini API to extract info if content is available
      if (paper.content) {
        try {
          const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
          const titlePrompt = `Extract the title and authors from this research paper: ${paper.content.substring(0, 1000)}`;
          const titleResult = await model.generateContent(titlePrompt);
          const titleResponse = await titleResult.response;
          const titleText = titleResponse.text();
          
          const abstractPrompt = `Extract the abstract from this research paper: ${paper.content}`;
          const abstractResult = await model.generateContent(abstractPrompt);
          const abstractResponse = await abstractResult.response;
          const abstractText = abstractResponse.text();

          paper.title = titleText.split('\n')[0];
          paper.authors = titleText.split('\n')[1]?.split(',').map((author: string) => author.trim()) || [];
          paper.abstract = abstractText;
        } catch (error) {
          console.error('Error with Gemini API:', error);
          // Continue with default values if Gemini fails
        }
      }

      // Save to MongoDB
      const result = await papersCollection.insertOne(paper);
      // Create a new object including the inserted ID to return
      const savedPaper = {
        ...paper,
        _id: result.insertedId
      };

      return NextResponse.json({ paper: savedPaper });
    }
  } catch (error) {
    console.error('API upload error:', error);
    return NextResponse.json({ error: 'Failed to process paper.' }, { status: 500 });
  }
} 