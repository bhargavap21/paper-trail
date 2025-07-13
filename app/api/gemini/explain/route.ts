import { NextResponse } from 'next/server';
import { genAI, connectToDatabase, dbModels } from '@/lib/config';
import { ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

// This is a simple mock implementation. In a real application, you would:
// 1. Use the Google Generative AI SDK or API for Gemini
// 2. Implement proper error handling and rate limiting
// 3. Add authentication to protect the endpoint

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, paperId, graphContext } = body;
    
    if (!prompt) {
      return NextResponse.json(
        { error: "No prompt provided" },
        { status: 400 }
      );
    }
    
    console.log('Gemini Explain API - Prompt received:', prompt);
    console.log('Paper ID:', paperId);
    console.log('Graph Context:', graphContext ? 'Provided' : 'Not provided');
    
    // Get PDF file path if paperId is provided
    let pdfFilePath = null;
    if (paperId) {
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
            console.log('PDF file found for processing');
          } else {
            console.log('PDF file not found at:', fullPath);
          }
        } else {
          console.log('No paper found or no filePath for ID:', paperId);
        }
      } catch (error) {
        console.error('Error fetching paper file:', error);
      }
    }
    
    // --- Use Actual Gemini API ---
    let explanation = 'Failed to generate explanation.'; // Default error message
    try {
      // Get the generative model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      let result;
      
      if (pdfFilePath) {
        try {
          // Read PDF as base64
          const fileData = fs.readFileSync(pdfFilePath);
          const base64Data = fileData.toString('base64');
          
          // Create prompt with file data inline
          const promptWithFile = `You are a research assistant helping to analyze academic papers. I'm providing a PDF document for you to analyze.

Based on the content of this paper, please answer the following question: ${prompt}

Please provide a clear, detailed explanation that refers to the specific content, findings, and context from the paper.`;

          result = await model.generateContent([
            promptWithFile,
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data
              }
            }
          ]);
          
        } catch (pdfError: unknown) {
          const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown error';
          console.log("PDF processing failed, falling back to text-only:", errorMessage);
          throw pdfError; // Let the outer catch handle this
        }
      } else {
        let textOnlyPrompt = `You are a research assistant. Please answer the following question: ${prompt}`;
        
        // Add graph context if provided
        if (graphContext) {
          const { nodes, edges } = graphContext;
          
          // Format nodes and edges for context
          const nodesSummary = nodes.map((node: any) => `- "${node.text}" (from ${node.paperTitle || 'Unknown Paper'})`).join('\n');
          const edgesSummary = edges.map((edge: any) => `- Connection between nodes ${edge.source} and ${edge.target} (similarity: ${(edge.weight * 100).toFixed(1)}%)`).join('\n');
          
          textOnlyPrompt = `You are a research assistant analyzing a knowledge graph. Here is the current graph data:

NODES (${nodes.length} total):
${nodesSummary}

CONNECTIONS (${edges.length} total):
${edgesSummary}

SIMILARITY CALCULATION METHOD:
The similarity scores between nodes are calculated using cosine similarity on AI embeddings of the text content. Cosine similarity ranges from 0 to 1, where:
- 1.0 = Identical semantic meaning
- 0.8-0.9 = Very high semantic similarity
- 0.6-0.8 = High semantic similarity  
- 0.4-0.6 = Moderate semantic similarity
- 0.2-0.4 = Low semantic similarity
- 0.0-0.2 = Very low semantic similarity

Based on this graph data and the cosine similarity methodology, please answer the following question: ${prompt}

Provide insights about the connections, patterns, clusters, and relationships you observe in this knowledge graph. You can now interpret the similarity scores precisely using the cosine similarity scale provided above.`;
        } else {
          textOnlyPrompt += `

Note: No specific paper file is available for analysis. Please provide a general response based on your knowledge.`;
        }

        result = await model.generateContent(textOnlyPrompt);
      }
      
      if (!result || !result.response) {
        throw new Error("No response received from Gemini API");
      }

      const response = result.response;
      explanation = response.text(); // Get the text explanation

      if (!explanation || explanation.trim() === '') {
         throw new Error("Received empty explanation from Gemini API");
      }

      console.log("Gemini API response successful.");

    } catch (apiError: unknown) {
      console.error('Error calling Gemini API:', apiError);
      console.error('Error details:', JSON.stringify(apiError, null, 2));
      
      // Type assertion or check
      let errorMessage = "An unknown error occurred";
      if (apiError instanceof Error) {
        errorMessage = apiError.message;
        console.error('Error stack:', apiError.stack);
      }

      // Check if it's a file upload error
      if (errorMessage.includes('uploadFile') || errorMessage.includes('file')) {
        console.log('File upload error detected, trying fallback without PDF');
        try {
          const fallbackPrompt = `You are a research assistant. Please answer the following question: ${prompt}

Note: Unable to access the specific paper file, but please provide a helpful response based on your knowledge.`;

          const fallbackResult = await model.generateContent(fallbackPrompt);
          if (fallbackResult && fallbackResult.response) {
            explanation = fallbackResult.response.text();
            console.log("Fallback response successful");
          } else {
            throw new Error("Fallback also failed");
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          return NextResponse.json(
            { error: `Sorry, an error occurred while generating the explanation: ${errorMessage}` },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: `Sorry, an error occurred while generating the explanation: ${errorMessage}` },
          { status: 500 }
        );
      }
    }
    // --- End Gemini API Call ---

    // Return the explanation received from Gemini
    return NextResponse.json({ explanation });
    
  } catch (error) {
    // Catch errors in request processing (e.g., JSON parsing)
    console.error('Error processing explain request:', error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// Helper function to extract the concept from the prompt
function extractConcept(prompt: string): string {
  const matches = prompt.match(/"([^"]+)"/);
  if (matches && matches[1]) {
    const concept = matches[1].split(' ').slice(0, 4).join(' ');
    return concept.charAt(0).toUpperCase() + concept.slice(1);
  }
  return "Understanding This Concept";
}

// Helper function to generate a simple explanation based on the prompt
function generateExplanation(prompt: string): string {
  const conceptMatch = prompt.match(/"([^"]+)"/);
  const concept = conceptMatch ? conceptMatch[1] : "";
  
  if (concept.toLowerCase().includes('transformer')) {
    return "Transformers are neural network architectures that use a mechanism called 'attention' to weigh the importance of different words in a sequence. Unlike older models that process text one word at a time, transformers can look at an entire sequence simultaneously, making them much more efficient and effective for language tasks.";
  }
  
  if (concept.toLowerCase().includes('attention')) {
    return "Attention is a mechanism that allows a model to focus on specific parts of the input when producing output. It's like how humans can focus on certain words in a sentence while still being aware of the context. This allows the model to make more informed decisions by weighing the importance of different input elements.";
  }
  
  if (concept.toLowerCase().includes('neural')) {
    return "Neural networks are computing systems inspired by the human brain. They consist of interconnected 'neurons' that process information, learn patterns, and make decisions. In research papers, they form the foundation of modern machine learning approaches.";
  }
  
  // Default explanation for other concepts
  return `This concept refers to a specific approach or methodology in the research paper. Based on the context, it appears to be related to how researchers analyze and process information in their field of study.

The concept helps researchers organize their thinking and approach problems systematically, which is crucial for advancing knowledge in the field.`;
} 