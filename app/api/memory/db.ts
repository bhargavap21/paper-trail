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
  graphId: string; // New field for memory graph association
}

// Define type for memory graphs
export interface MemoryGraph {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  isDefault?: boolean;
}

// Define type for graph edges
export interface GraphEdge {
  id: string;
  source: string; // Memory item ID
  target: string; // Memory item ID
  weight: number; // Cosine similarity score
  createdAt: string;
  graphId: string; // New field for memory graph association
}

// Define type for memory item data
export interface MemoryItemData {
  userId: string;
  paperId: string;
  text: string;
  source: string;
  embedding?: number[];
  paperTitle?: string;
  graphId: string; // New field for memory graph association
}

// Graph data structure
export interface GraphData {
  nodes: MemoryItem[];
  edges: GraphEdge[];
}

// Paths to the JSON files for storing data
const dataFilePath = path.join(process.cwd(), '.next', 'memory-db.json');
const edgesFilePath = path.join(process.cwd(), '.next', 'memory-edges.json');
const graphsFilePath = path.join(process.cwd(), '.next', 'memory-graphs.json');

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

    if (!fs.existsSync(graphsFilePath)) {
      const initialGraphs: MemoryGraph[] = [];
      fs.writeFileSync(graphsFilePath, JSON.stringify(initialGraphs, null, 2));
      console.log('Initialized empty graphs database');
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

// Helper function to read memory graphs
const readGraphs = (): MemoryGraph[] => {
  try {
    if (!fs.existsSync(graphsFilePath)) {
      return [];
    }
    const jsonData = fs.readFileSync(graphsFilePath, 'utf-8');
    return JSON.parse(jsonData) as MemoryGraph[];
  } catch (error) {
    console.error('Error reading graphs data:', error);
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

// Helper function to write memory graphs
const writeGraphs = (graphs: MemoryGraph[]) => {
  try {
    fs.writeFileSync(graphsFilePath, JSON.stringify(graphs, null, 2));
  } catch (error) {
    console.error('Error writing graphs data:', error);
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
  // Memory Graph Management
  createMemoryGraph: (userId: string, name: string, isDefault: boolean = false): MemoryGraph => {
    const currentGraphs = readGraphs();
    const id = `graph-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const newGraph: MemoryGraph = {
      id,
      name,
      userId,
      createdAt: new Date().toISOString(),
      isDefault
    };
    currentGraphs.push(newGraph);
    writeGraphs(currentGraphs);
    console.log(`Created memory graph: ${newGraph.id} (${name})`);
    return newGraph;
  },

  listMemoryGraphs: (userId: string): MemoryGraph[] => {
    const currentGraphs = readGraphs();
    return currentGraphs.filter(graph => graph.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  updateMemoryGraph: (id: string, updates: Partial<MemoryGraph>): MemoryGraph | null => {
    const currentGraphs = readGraphs();
    const index = currentGraphs.findIndex(graph => graph.id === id);
    
    if (index === -1) {
      return null;
    }

    currentGraphs[index] = { ...currentGraphs[index], ...updates };
    writeGraphs(currentGraphs);
    console.log(`Updated memory graph: ${id}`);
    return currentGraphs[index];
  },

  deleteMemoryGraph: (id: string): boolean => {
    const currentGraphs = readGraphs();
    const initialLength = currentGraphs.length;
    const filteredGraphs = currentGraphs.filter(graph => graph.id !== id);
    
    if (filteredGraphs.length === initialLength) {
      return false; // Graph not found
    }

    writeGraphs(filteredGraphs);
    
    // Also remove all memory items and edges associated with this graph
    const currentData = readData();
    const filteredData = currentData.filter(item => item.graphId !== id);
    writeData(filteredData);
    
    const currentEdges = readEdges();
    const filteredEdges = currentEdges.filter(edge => edge.graphId !== id);
    writeEdges(filteredEdges);
    
    console.log(`Deleted memory graph and all associated data: ${id}`);
    return true;
  },

  getOrCreateDefaultGraph: (userId: string): MemoryGraph => {
    const graphs = mockDb.listMemoryGraphs(userId);
    let defaultGraph = graphs.find(g => g.isDefault);
    
    if (!defaultGraph) {
      defaultGraph = mockDb.createMemoryGraph(userId, 'Default Graph', true);
    }
    
    return defaultGraph;
  },

  // Memory Item Management
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
    console.log(`Added memory item to file: ${newItem.id} (graph: ${data.graphId})`);
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

  listMemoryItems: (filter?: { userId?: string; graphId?: string }): MemoryItem[] => {
    const currentData = readData();
    console.log(`Listing memory items from file. Total: ${currentData.length}`);
    
    let result = currentData;
    if (filter?.userId) {
      result = result.filter(item => item.userId === filter.userId);
      console.log(`Filtered for user ${filter.userId}, found: ${result.length}`);
    }
    if (filter?.graphId) {
      result = result.filter(item => item.graphId === filter.graphId);
      console.log(`Filtered for graph ${filter.graphId}, found: ${result.length}`);
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
  createOrUpdateEdge: (source: string, target: string, weight: number, graphId: string): GraphEdge => {
    const currentEdges = readEdges();
    const edgeId = `${source}-${target}`;
    const reverseEdgeId = `${target}-${source}`;
    
    // Check if edge already exists (in either direction) for this graph
    const existingIndex = currentEdges.findIndex(
      edge => (edge.id === edgeId || edge.id === reverseEdgeId) && edge.graphId === graphId
    );

    const edgeData: GraphEdge = {
      id: edgeId,
      source,
      target,
      weight,
      graphId,
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
    console.log(`Created/updated edge: ${source} -> ${target} (weight: ${weight}, graph: ${graphId})`);
    return edgeData;
  },

  getGraphData: (filter?: { userId?: string; graphId?: string }): GraphData => {
    const nodes = mockDb.listMemoryItems(filter);
    const edges = readEdges();
    
    // Filter edges for the specific graph and valid nodes
    const nodeIds = new Set(nodes.map(node => node.id));
    const validEdges = edges.filter(edge => {
      const isValidNodes = nodeIds.has(edge.source) && nodeIds.has(edge.target);
      const isCorrectGraph = !filter?.graphId || edge.graphId === filter.graphId;
      return isValidNodes && isCorrectGraph;
    });

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

    const existingItems = mockDb.listMemoryItems({ 
      userId: newItem.userId, 
      graphId: newItem.graphId 
    });
    const newEdges: GraphEdge[] = [];

    console.log(`\n=== SIMILARITY ANALYSIS ===`);
    console.log(`New item: "${newItem.text}" (${newItem.id})`);
    console.log(`Graph: ${newItem.graphId}`);
    console.log(`Comparing against ${existingItems.length} existing items in same graph`);
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
        const edge = mockDb.createOrUpdateEdge(newItem.id, existingItem.id, similarity, newItem.graphId);
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