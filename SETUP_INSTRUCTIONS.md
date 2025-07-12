# 🧠 Semantic Memory System Setup Instructions

## Prerequisites

You need to set up your OpenAI API key to enable the embedding functionality.

## Step 1: Create Environment File

Create a `.env.local` file in your project root with the following content:

```bash
# Required: Your OpenAI API key
OPENAI_API_KEY=your_actual_openai_api_key_here

# Optional: MongoDB connection (if using MongoDB instead of file storage)
MONGODB_URI=your_mongodb_connection_string

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:8080
```

**Important:** Replace `your_actual_openai_api_key_here` with your real OpenAI API key.

## Step 2: Install Dependencies (Already Done)

The following packages have been installed:
- `openai` - OpenAI SDK for embeddings
- `cytoscape` - Graph visualization library
- `cytoscape-cose-bilkent` - Advanced graph layout algorithm

## Step 3: Test the System

1. **Start your development server** (should already be running on port 8080):
   ```bash
   pnpm dev -p 8080
   ```

2. **Upload a research paper:**
   - Go to http://localhost:8080/upload
   - Upload a PDF research paper

3. **Clip sentences:**
   - Open the paper in the reader
   - Highlight/select text to "clip" sentences
   - Each clipped sentence will:
     - Generate an OpenAI embedding
     - Calculate similarity with existing clips
     - Create connections if similarity > 75%

4. **View the semantic graph:**
   - Go to http://localhost:8080/memory
   - See your clipped sentences as nodes
   - Connected sentences show semantic similarity
   - Use the interactive controls

## How It Works

### 🔧 Backend Processing
1. **Clip API** (`/api/memory/clip`):
   - Receives clipped text
   - Calls OpenAI Embeddings API (text-embedding-3-small)
   - Stores text + embedding vector
   - Calculates cosine similarity with existing items
   - Creates edges for similarities > 0.75

2. **Memory Database** (`/api/memory/db.ts`):
   - File-based storage (`.next/memory-db.json` and `.next/memory-edges.json`)
   - Stores nodes (sentences) and edges (connections)
   - Handles similarity calculations

3. **Graph API** (`/api/memory/list`):
   - Returns complete graph data (nodes + edges)
   - Used by frontend for visualization

### 🎨 Frontend Visualization
1. **Cytoscape.js Graph**:
   - Interactive node-link diagram
   - COSE-Bilkent layout algorithm
   - Nodes sized by text length
   - Edge thickness = similarity strength
   - Distance between nodes = inverse similarity

2. **Features**:
   - Hover: See full sentence text
   - Click: View node details + paper navigation
   - Search: Highlight matching nodes
   - Real-time updates (30-second polling)
   - Manual refresh button

## Graph Layout Algorithm

The system uses **COSE-Bilkent** layout with these principles:
- **Node Repulsion**: 4500 (spreads nodes apart)
- **Edge Length**: Inversely proportional to similarity (similar nodes closer)
- **Edge Elasticity**: Proportional to similarity (stronger connections)
- **Animation**: Smooth transitions when graph updates

## Testing Workflow

1. **Upload 2-3 research papers** on related topics
2. **Clip 5-10 sentences** from each paper covering:
   - Similar concepts (should connect)
   - Different concepts (should stay separate)
3. **Check the memory graph**:
   - Similar sentences should be connected with thick lines
   - Dissimilar sentences should have no connections
   - Related concepts should cluster together

## Troubleshooting

### No embeddings generated
- Check your `.env.local` file has correct `OPENAI_API_KEY`
- Check browser console for API errors
- Verify OpenAI API key has sufficient credits

### Graph not updating
- Click the "Refresh" button
- Check browser console for API errors
- Verify files exist: `.next/memory-db.json` and `.next/memory-edges.json`

### No connections appearing
- Lower the similarity threshold in `clip/route.ts` (change 0.75 to 0.5)
- Clip more similar sentences
- Check that embeddings are being generated

## Customization

### Similarity Threshold
Edit `app/api/memory/clip/route.ts` line with `processNewMemoryWithSimilarity(memoryItem, 0.75)` and change `0.75` to your desired threshold.

### Graph Layout
Edit `components/semantic-graph.tsx` layout options to adjust node spacing, edge properties, etc.

### Update Frequency
Edit `app/memory/page.tsx` real-time polling interval (currently 30 seconds).

## API Endpoints

- `POST /api/memory/clip` - Clip new sentence with embedding
- `GET /api/memory/list` - Get graph data (nodes + edges)
- `DELETE /api/memory/delete/[id]` - Delete memory item

Your semantic memory system is now ready! 🚀 