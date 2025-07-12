import { NextResponse } from 'next/server';
import { genAI } from '@/lib/config'; // Assuming genAI is configured here

// This is a simple mock implementation. In a real application, you would:
// 1. Use the Google Generative AI SDK or API for Gemini
// 2. Implement proper error handling and rate limiting
// 3. Add authentication to protect the endpoint

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt } = body;
    
    if (!prompt) {
      return NextResponse.json(
        { error: "No prompt provided" },
        { status: 400 }
      );
    }
    
    console.log('Gemini Explain API - Prompt received:', prompt);
    
    // --- Use Actual Gemini API ---
    let explanation = 'Failed to generate explanation.'; // Default error message
    try {
      // Get the generative model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      console.log("Calling Gemini API with model: gemini-1.5-flash...");
      const result = await model.generateContent(prompt);
      
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
      
      // Type assertion or check
      let errorMessage = "An unknown error occurred";
      if (apiError instanceof Error) {
        errorMessage = apiError.message;
      }

      explanation = `Sorry, an error occurred while generating the explanation: ${errorMessage}`;
      // Return a 500 status specifically for API errors
       return NextResponse.json(
        { error: explanation },
        { status: 500 } 
      );
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