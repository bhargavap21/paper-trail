# Manim Video Generation Backend Setup

## Overview
This guide explains how to set up the manim backend for video generation integration with the paper-trail application.

## Prerequisites
- Python 3.8+
- Node.js (for the main application)
- System dependencies for manim (cairo, pkg-config)

## Setup Steps

### 1. Install System Dependencies (macOS)
```bash
brew install cairo pkg-config
```

### 2. Set Up Python Environment
```bash
cd /path/to/manim_video_generation-main
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Create a `.env.local` file in your paper-trail project root:
```bash
# Manim Video Generation Backend
MANIM_SERVER_URL=http://localhost:8000
```

### 4. Start the Manim Backend Server
```bash
cd /path/to/manim_video_generation-main
source venv/bin/activate
python server.py
```

**Note**: The server may prompt for W&B (Weights & Biases) authentication. You can:
- Skip authentication by pressing Ctrl+C and continuing
- Or provide your W&B API key if you want tracking

### 5. Start the Paper-Trail Frontend
```bash
cd /path/to/paper-trail-1
npm run dev
```

## Testing the Integration

### 1. Test API Endpoint
```bash
curl -X POST http://localhost:3000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test video generation", "paperId": "test123"}'
```

### 2. Test in UI
1. Open the paper-trail application
2. Open a paper in the reader
3. Click the copilot chat button
4. Select the "Video Generation" tool
5. Enter a prompt like "Generate a video summarizing this paper"
6. Click send

## How It Works

### Architecture
1. **Frontend**: Next.js application with React components
2. **API Layer**: Next.js API routes (`/api/video/generate`)
3. **Backend**: Python FastAPI server with manim integration
4. **Job System**: Async job processing with status polling

### Flow
1. User requests video generation via UI
2. Frontend sends request to `/api/video/generate`
3. API checks if manim backend is available
4. If available: submits job to manim backend, returns job ID
5. If not available: returns placeholder response
6. Frontend polls job status for real generations
7. Updates UI with progress and final result

### API Endpoints

#### Video Generation
- **POST** `/api/video/generate`
- **GET** `/api/video/generate?jobId=<id>` (status check)

#### Manim Backend
- **POST** `/generate-video-url` (submit job)
- **GET** `/jobs/<job_id>` (check status)
- **GET** `/download/<job_id>` (download video)

## Current Status

✅ **Completed**:
- API endpoint integration
- Job status polling
- UI components with loading states
- Error handling and fallbacks
- Placeholder system for offline development

🔄 **In Progress**:
- Manim backend server setup
- File upload/download handling
- Video player integration

📋 **TODO**:
- W&B authentication bypass
- File system integration
- Video storage and serving
- Progress indicators
- Download functionality

## Troubleshooting

### Common Issues

1. **Manim server not starting**
   - Check Python dependencies: `pip install -r requirements.txt`
   - Install system dependencies: `brew install cairo pkg-config`
   - Check for port conflicts on 8000

2. **API returns placeholder responses**
   - Ensure manim server is running on port 8000
   - Check network connectivity: `curl http://localhost:8000/api-info`
   - Verify MANIM_SERVER_URL environment variable

3. **Job polling not working**
   - Check browser console for errors
   - Verify job ID is returned from initial request
   - Ensure polling intervals are appropriate

### Development Tips

1. **Testing without manim backend**
   - The system gracefully falls back to placeholder responses
   - All UI components work in placeholder mode

2. **Debugging job status**
   - Check browser network tab for polling requests
   - Monitor manim server logs for job processing

3. **Performance considerations**
   - Polling interval is 10 seconds (configurable)
   - Timeout after 5 minutes (30 attempts)
   - Background processing doesn't block UI

## Next Steps

1. **Set up manim backend server** (priority)
2. **Test end-to-end video generation**
3. **Implement file upload/download**
4. **Add video player integration**
5. **Optimize performance and error handling** 