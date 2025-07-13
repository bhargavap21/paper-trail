import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, dbModels, genAI } from '@/lib/config';
import { ObjectId } from 'mongodb';

// POST: Create a new highlight with AI summary
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("POST highlights - Start");
    
    const { text, position, page, context } = await request.json();
    const resolvedParams = await params;
    const paperId = resolvedParams.id;
    
    console.log("Request data:", { 
      paperId, 
      textLength: text?.length || 0,
      position: position ? "provided" : "missing",
      page,
      contextProvided: !!context
    });
    
    if (!text || !position || page === undefined) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: 'Missing required fields: text, position, or page' },
        { status: 400 }
      );
    }

    // Fetch paper data for context if needed
    let fullContext = context || "";
    if (!fullContext) {
      try {
        console.log("Fetching paper data for context");
        const db = await connectToDatabase();
        const papersCollection = db.collection(dbModels.papers);
        
        // Try to get the paper by ID
        let paper = null;
        try {
          const objectId = new ObjectId(paperId);
          paper = await papersCollection.findOne({ _id: objectId });
        } catch (error) {
          // If not a valid ObjectId, try finding by other means
          paper = await papersCollection.findOne({ id: paperId });
        }
        
        if (paper) {
          // Build context from paper data
          const sections = [];
          if (paper.title) sections.push(`Title: ${paper.title}`);
          if (paper.abstract) sections.push(`Abstract: ${paper.abstract}`);
          if (paper.sections && Array.isArray(paper.sections)) {
            paper.sections.forEach(section => {
              if (section.title && section.content) {
                sections.push(`${section.title}: ${section.content}`);
              }
            });
          }
          fullContext = sections.join("\n\n");
          console.log(`Built context from paper data (${fullContext.length} chars)`);
        }
      } catch (contextError) {
        console.error("Error fetching paper context:", contextError);
      }
    }

    // Generate AI summary
    let summary = "";
    try {
      console.log("Generating AI summary with text:", text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      
      // Create direct connection to Gemini API to avoid potential issues
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      // Create a more contextual prompt with the full document
      let prompt = "";
      if (fullContext) {
        prompt = `You are an advanced AI tutor helping a student understand complex academic concepts.

###DOCUMENT CONTEXT###
${fullContext.substring(0, 10000)}
###END CONTEXT###

The student has highlighted this specific passage:
"${text}"

First, explain what this highlighted text means in the simplest possible terms, as if explaining to someone who is new to this subject.
Then, explain why this concept is important in the broader context of the paper.
Keep your explanation concise (3-4 sentences) but ensure it really helps the reader understand both the highlighted text and its significance.
Focus on making complex technical concepts accessible and clear.`;
      } else {
        prompt = `You are an advanced AI tutor helping a student understand complex academic concepts.

The student has highlighted this text from an academic paper:
"${text}"

Explain this concept in the simplest possible terms, as if explaining to someone who is new to this subject.
Break down any technical jargon or complex ideas into accessible language.
Keep your explanation concise (3-4 sentences) but make sure the student truly understands both the concept and why it matters.`;
      }
      
      console.log("Sending prompt to Gemini...");
      const result = await model.generateContent(prompt);
      
      if (!result) {
        throw new Error("No result from Gemini API");
      }
      
      console.log("Gemini response received");
      const response = await result.response;
      summary = response.text();
      
      if (!summary || summary.trim() === '') {
        throw new Error("Empty summary from Gemini API");
      }
      
      console.log("AI summary generated:", summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      
      // Fallback - generate a simple summary based on the text
      try {
        console.log("Using fallback summary generation");
        // Create a basic summary by taking the first sentence or first 100 chars
        const firstSentenceMatch = text.match(/^(.*?[.!?])\s/);
        if (firstSentenceMatch && firstSentenceMatch[1]) {
          summary = `Summary: ${firstSentenceMatch[1]}`;
        } else {
          const shortText = text.substring(0, Math.min(100, text.length));
          summary = `This text discusses: ${shortText}${text.length > 100 ? '...' : ''}`;
        }
        console.log("Generated fallback summary:", summary);
      } catch (fallbackError) {
        console.error("Fallback summary generation failed:", fallbackError);
        summary = "This highlighted text contains important information.";
      }
    }

    // Connect to the database
    console.log("Connecting to database");
    const db = await connectToDatabase();
    const highlightsCollection = db.collection(dbModels.highlights);
    
    // Create a new highlight document
    const highlight = {
      paperId,
      text,
      summary,
      position,
      page,
      createdAt: new Date(),
    };
    
    // Insert the highlight into the database
    console.log("Saving highlight to database");
    const result = await highlightsCollection.insertOne(highlight);
    console.log("Highlight saved, ID:", result.insertedId);
    
    return NextResponse.json({ 
      highlight: { ...highlight, _id: result.insertedId } 
    });
  } catch (error) {
    console.error('Error creating highlight:', error);
    return NextResponse.json(
      { error: 'Failed to create highlight' },
      { status: 500 }
    );
  }
}

// GET: Retrieve all highlights for a paper
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("GET highlights - Start");
    const resolvedParams = await params;
    const paperId = resolvedParams.id;
    console.log("Fetching highlights for paperId:", paperId);
    
    // Connect to the database
    const db = await connectToDatabase();
    const highlightsCollection = db.collection(dbModels.highlights);
    
    // Find all highlights for this paper
    const highlights = await highlightsCollection
      .find({ paperId })
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log(`Found ${highlights.length} highlights`);
    
    return NextResponse.json({ highlights });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch highlights' },
      { status: 500 }
    );
  }
} 