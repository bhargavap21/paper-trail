import fs from 'fs';
import path from 'path';

// Define types for memory items with embeddings
export interface MemoryItem {
  id: string;
  userId: string;
  paperId: string;
  text: string;
  source: string;
  createdAt: string;
  embedding?: number[]; // Vector embedding from OpenAI
  paperTitle?: string;
}

// Define type for graph edges
export interface GraphEdge {
  id: string;
  source: string; // Memory item ID
  target: string; // Memory item ID
  weight: number; // Cosine similarity score
  createdAt: string;
}

// Define type for memory item data
export interface MemoryItemData {
  userId: string;
  paperId: string;
  text: string;
  source: string;
  embedding?: number[];
  paperTitle?: string;
}

// Graph data structure
export interface GraphData {
  nodes: MemoryItem[];
  edges: GraphEdge[];
}

// Paths to the JSON files for storing data
const dataFilePath = path.join(process.cwd(), '.next', 'memory-db.json');
const edgesFilePath = path.join(process.cwd(), '.next', 'memory-edges.json');

// Ensure the directory exists
try {
  fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
} catch (e) {
  // Ignore errors if directory already exists
}

// Initialize files with empty arrays only if they don't exist
const initializeData = () => {
  try {
    // Only create files if they don't exist
    if (!fs.existsSync(dataFilePath)) {
      const initialData: MemoryItem[] = [];
      fs.writeFileSync(dataFilePath, JSON.stringify(initialData, null, 2));
      console.log('Initialized empty memory database');
    }
    
    if (!fs.existsSync(edgesFilePath)) {
      const initialEdges: GraphEdge[] = [];
      fs.writeFileSync(edgesFilePath, JSON.stringify(initialEdges, null, 2));
      console.log('Initialized empty edges database');
    }
  } catch (writeError) {
    console.error('Error initializing memory files:', writeError);
  }
};

initializeData();

// Helper function to read memory items
const readData = (): MemoryItem[] => {
  try {
    if (!fs.existsSync(dataFilePath)) {
      initializeData();
    }
    const jsonData = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(jsonData) as MemoryItem[];
  } catch (error) {
    console.error('Error reading memory data:', error);
    return [];
  }
};

// Helper function to read graph edges
const readEdges = (): GraphEdge[] => {
  try {
    if (!fs.existsSync(edgesFilePath)) {
      return [];
    }
    const jsonData = fs.readFileSync(edgesFilePath, 'utf-8');
    return JSON.parse(jsonData) as GraphEdge[];
  } catch (error) {
    console.error('Error reading edges data:', error);
    return [];
  }
};

// Helper function to write memory items
const writeData = (data: MemoryItem[]) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing memory data:', error);
  }
};

// Helper function to write graph edges
const writeEdges = (edges: GraphEdge[]) => {
  try {
    fs.writeFileSync(edgesFilePath, JSON.stringify(edges, null, 2));
  } catch (error) {
    console.error('Error writing edges data:', error);
  }
};

// Cosine similarity calculation
export const calculateCosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Database object using file storage
export const mockDb = {
  createMemoryItem: (data: MemoryItemData): MemoryItem => {
    const currentData = readData();
    const id = `memory-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const newItem: MemoryItem = { 
      id, 
      ...data, 
      createdAt: new Date().toISOString() 
    };
    currentData.push(newItem);
    writeData(currentData);
    console.log(`Added memory item to file: ${newItem.id}`);
    return newItem;
  },

  updateMemoryItem: (id: string, updates: Partial<MemoryItem>): MemoryItem | null => {
    const currentData = readData();
    const index = currentData.findIndex(item => item.id === id);
    
    if (index === -1) {
      return null;
    }

    currentData[index] = { ...currentData[index], ...updates };
    writeData(currentData);
    console.log(`Updated memory item: ${id}`);
    return currentData[index];
  },

  listMemoryItems: (filter?: { userId?: string }): MemoryItem[] => {
    const currentData = readData();
    console.log(`Listing memory items from file. Total: ${currentData.length}`);
    
    let result = currentData;
    if (filter?.userId) {
      result = currentData.filter(item => item.userId === filter.userId);
      console.log(`Filtered for user ${filter.userId}, found: ${result.length}`);
    }
    
    // Sort by most recent first
    return [...result].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  deleteMemoryItem: (id: string): boolean => {
    const currentData = readData();
    const initialLength = currentData.length;
    const filteredData = currentData.filter(item => item.id !== id);
    
    if (filteredData.length === initialLength) {
      return false; // Item not found
    }

    writeData(filteredData);
    
    // Also remove any edges that reference this node
    const currentEdges = readEdges();
    const filteredEdges = currentEdges.filter(
      edge => edge.source !== id && edge.target !== id
    );
    writeEdges(filteredEdges);
    
    console.log(`Deleted memory item and related edges: ${id}`);
    return true;
  },

  // Graph-specific operations
  createOrUpdateEdge: (source: string, target: string, weight: number): GraphEdge => {
    const currentEdges = readEdges();
    const edgeId = `${source}-${target}`;
    const reverseEdgeId = `${target}-${source}`;
    
    // Check if edge already exists (in either direction)
    const existingIndex = currentEdges.findIndex(
      edge => edge.id === edgeId || edge.id === reverseEdgeId
    );

    const edgeData: GraphEdge = {
      id: edgeId,
      source,
      target,
      weight,
      createdAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // Update existing edge
      currentEdges[existingIndex] = edgeData;
    } else {
      // Create new edge
      currentEdges.push(edgeData);
    }

    writeEdges(currentEdges);
    console.log(`Created/updated edge: ${source} -> ${target} (weight: ${weight})`);
    return edgeData;
  },

  getGraphData: (filter?: { userId?: string }): GraphData => {
    const nodes = mockDb.listMemoryItems(filter);
    const edges = readEdges();
    
    // Filter edges to only include those with valid nodes
    const nodeIds = new Set(nodes.map(node => node.id));
    const validEdges = edges.filter(
      edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return {
      nodes,
      edges: validEdges
    };
  },

  // Similarity processing
  processNewMemoryWithSimilarity: async (newItem: MemoryItem, threshold: number = 0.75): Promise<GraphEdge[]> => {
    if (!newItem.embedding) {
      console.warn('No embedding provided for similarity calculation');
      return [];
    }

    const existingItems = mockDb.listMemoryItems({ userId: newItem.userId });
    const newEdges: GraphEdge[] = [];

    console.log(`\n=== SIMILARITY ANALYSIS ===`);
    console.log(`New item: "${newItem.text}" (${newItem.id})`);
    console.log(`Comparing against ${existingItems.length} existing items`);
    console.log(`Threshold for connection: ${threshold} (${(threshold * 100).toFixed(1)}%)`);

    for (const existingItem of existingItems) {
      if (existingItem.id === newItem.id || !existingItem.embedding) {
        continue;
      }

      const similarity = calculateCosineSimilarity(newItem.embedding, existingItem.embedding);
      
      console.log(`📊 "${newItem.text}" ↔ "${existingItem.text}"`);
      console.log(`   Similarity: ${similarity.toFixed(4)} (${(similarity * 100).toFixed(2)}%)`);
      
      if (similarity > threshold) {
        console.log(`   ✅ CONNECTED! (Above ${(threshold * 100).toFixed(1)}% threshold)`);
        const edge = mockDb.createOrUpdateEdge(newItem.id, existingItem.id, similarity);
        newEdges.push(edge);
      } else {
        console.log(`   ❌ Not connected (Below ${(threshold * 100).toFixed(1)}% threshold)`);
      }
    }

    console.log(`\n🔗 Result: Created ${newEdges.length} new connections for "${newItem.text}"`);
    console.log(`=== END SIMILARITY ANALYSIS ===\n`);
    return newEdges;
  }
}; 