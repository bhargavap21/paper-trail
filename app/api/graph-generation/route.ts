import { NextResponse } from 'next/server';
import { genAI, connectToDatabase, dbModels } from '@/lib/config';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { mockDb, calculateCosineSimilarity } from '../memory/db';
import { generateEmbedding } from '@/lib/openai-client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paperId, topic, clipCount, graphId } = body;
    
    if (!paperId || !topic || !clipCount || !graphId) {
      return NextResponse.json(
        { error: "Missing required fields: paperId, topic, clipCount, graphId" },
        { status: 400 }
      );
    }
    
    console.log('Graph Generation API - Processing request:', { paperId, topic, clipCount, graphId });
    
    // Get PDF file path
    let pdfFilePath = null;
    let paperTitle = 'Unknown Paper';
    
    try {
      const db = await connectToDatabase();
      const papersCollection = db.collection(dbModels.papers);
      
      let paper = null;
      try {
        const objectId = new ObjectId(paperId);
        paper = await papersCollection.findOne({ _id: objectId });
      } catch (error) {
        paper = await papersCollection.findOne({ id: paperId });
      }
      
      if (paper && paper.filePath) {
        // Convert relative path to absolute path
        const fullPath = path.join(process.cwd(), 'public', paper.filePath);
        
        // Check if file exists
        if (fs.existsSync(fullPath)) {
          pdfFilePath = fullPath;
          paperTitle = paper.title || 'Unknown Paper';
          console.log('PDF file found for processing:', fullPath);
        } else {
          console.log('PDF file not found at path:', fullPath);
        }
      } else {
        console.log('No paper found or no filePath');
      }
    } catch (error) {
      console.error('Error fetching paper:', error);
    }
    
    if (!pdfFilePath) {
      return NextResponse.json(
        { error: "PDF file not found for the specified paper" },
        { status: 404 }
      );
    }
    
    // Verify the target graph exists
    const userId = "demo-user";
    const graphs = mockDb.listMemoryGraphs(userId);
    const targetGraph = graphs.find(g => g.id === graphId);
    
    if (!targetGraph) {
      return NextResponse.json(
        { error: "Target memory graph not found" },
        { status: 404 }
      );
    }
    
    // Process PDF with Gemini
    const clips = await processPdfWithGemini(pdfFilePath, topic, clipCount, paperTitle);
    
    if (!clips || clips.length === 0) {
      return NextResponse.json(
        { error: "No clips could be generated from the PDF" },
        { status: 500 }
      );
    }
    
    // Add clips to memory graph
    const addedClips = [];
    const newEdges = [];
    
    for (const clip of clips) {
      try {
        // Generate embedding for the clip
        let embedding: number[] | undefined;
        try {
          const embeddingResponse = await generateEmbedding(clip);
          embedding = embeddingResponse.embedding;
        } catch (embeddingError) {
          console.error('Error generating embedding for clip:', embeddingError);
          // Continue without embedding - it's optional
        }
        
        // Create memory item
        const memoryItem = mockDb.createMemoryItem({
          userId,
          paperId,
          text: clip,
          source: 'graph-generation',
          embedding,
          paperTitle,
          graphId
        });
        
        addedClips.push(memoryItem);
        
        // Calculate similarities and create edges if embedding was generated
        if (embedding) {
          const existingItems = mockDb.listMemoryItems({ userId, graphId });
          const similarityThreshold = 0.3; // Default threshold
          
          for (const existingItem of existingItems) {
            if (existingItem.id === memoryItem.id || !existingItem.embedding) {
              continue;
            }
            
            const similarity = calculateCosineSimilarity(embedding, existingItem.embedding);
            
            if (similarity >= similarityThreshold) {
              const edge = mockDb.createOrUpdateEdge(memoryItem.id, existingItem.id, similarity, graphId);
              newEdges.push(edge);
            }
          }
        }
      } catch (error) {
        console.error('Error adding clip to memory:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully generated ${addedClips.length} clips and added them to the memory graph`,
      addedClips,
      newEdges,
      graphId,
      graphName: targetGraph.name
    });
    
  } catch (error) {
    console.error('Graph generation error:', error);
    return NextResponse.json(
      { error: "Internal server error during graph generation" },
      { status: 500 }
    );
  }
}

async function processPdfWithGemini(pdfFilePath: string, topic: string, clipCount: number, paperTitle: string): Promise<string[]> {
  try {
    console.log('Processing PDF with Gemini...');
    
    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfFilePath);
    
    // Convert PDF to base64 for Gemini
    const base64Pdf = pdfBuffer.toString('base64');
    
    const prompt = `
You are an expert research assistant tasked with extracting key concepts and important sentences from academic papers.

Please analyze the attached PDF document "${paperTitle}" and extract exactly ${clipCount} important sentences or concepts related to: "${topic}".

Requirements:
1. Extract EXACTLY ${clipCount} items (no more, no less)
2. Focus specifically on content related to: "${topic}"
3. Each extracted item should be a complete, meaningful sentence or concept
4. Prioritize sentences that contain key insights, definitions, or important findings
5. Ensure extracted content is directly relevant to the specified topic
6. Keep each extracted item concise but complete (ideally 1-2 sentences)
7. Return only the extracted content, one item per line
8. Do not include any additional commentary or formatting

Format your response as a simple list, one item per line, like this:
Item 1 text here
Item 2 text here
Item 3 text here
`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Pdf
        }
      },
      { text: prompt }
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini response received');
    
    // Parse the response to extract individual clips
    const clips = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('Item '))
      .slice(0, clipCount); // Ensure we don't exceed the requested count
    
    console.log(`Extracted ${clips.length} clips from PDF`);
    
    return clips;
    
  } catch (error) {
    console.error('Error processing PDF with Gemini:', error);
    throw error;
  }
} 