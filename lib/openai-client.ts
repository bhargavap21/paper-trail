import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingResponse {
  embedding: number[];
  tokens: number;
}

/**
 * Generate embedding vector for a given text using OpenAI's text-embedding-3-small model
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResponse> {
  try {
    console.log(`Generating embedding for text: "${text.substring(0, 100)}..."`);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;
    const tokens = response.usage?.total_tokens || 0;

    console.log(`Generated embedding with ${embedding.length} dimensions, ${tokens} tokens`);
    
    return {
      embedding,
      tokens
    };
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch generate embeddings for multiple texts
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<EmbeddingResponse[]> {
  try {
    console.log(`Generating batch embeddings for ${texts.length} texts`);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      encoding_format: 'float',
    });

    const results = response.data.map((item, index) => ({
      embedding: item.embedding,
      tokens: Math.floor((response.usage?.total_tokens || 0) / texts.length) // Approximate tokens per text
    }));

    console.log(`Generated ${results.length} embeddings`);
    return results;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default openai; 