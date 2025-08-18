#!/usr/bin/env python3
"""
Enhanced FastAPI server that uses the improved Manim video generation system
"""
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import uuid
from datetime import datetime
from typing import Dict, Optional
import asyncio
import weave
import fitz  # PyMuPDF for PDF compression

# Set FFmpeg path for MoviePy before importing video_generator
os.environ['IMAGEIO_FFMPEG_EXE'] = '/opt/homebrew/bin/ffmpeg'

# Import our ENHANCED video generation pipeline
from enhanced_video_generator import enhanced_generate_summary_video, enhanced_generate_summary_video_upload

# Initialize Weave for API tracking (with fallback)
try:
    weave.init("enhanced-research-agent")
    print("✅ W&B Weave tracking initialized for ENHANCED project: enhanced-research-agent")
except Exception as e:
    print(f"⚠️  W&B Weave not available: {e}")
    print("📊 Enhanced server will run without tracking")

app = FastAPI(title="Enhanced Manim Video Generation API", version="2.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JSON file to store job status
JOBS_FILE = "enhanced_jobs.json"

class VideoRequest(BaseModel):
    pdf_url: str
    quality: str = "medium_quality"
    user_prompt: str = ""

class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    created_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
    video_path: Optional[str] = None
    pdf_source: Optional[str] = None
    success_rate: Optional[float] = None
    clips_generated: Optional[int] = None
    audio_coverage: Optional[float] = None
    enhancement_used: bool = True

def load_jobs() -> Dict:
    """Load jobs from JSON file"""
    try:
        if os.path.exists(JOBS_FILE):
            with open(JOBS_FILE, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Error loading jobs: {e}")
        return {}

def save_jobs(jobs: Dict):
    """Save jobs to JSON file"""
    try:
        with open(JOBS_FILE, 'w') as f:
            json.dump(jobs, f, indent=2)
    except Exception as e:
        print(f"Error saving jobs: {e}")

def update_job_status(job_id: str, status: str, **kwargs):
    """Update job status and save to file"""
    jobs = load_jobs()
    if job_id in jobs:
        jobs[job_id]["status"] = status
        if status in ["completed", "failed"]:
            jobs[job_id]["completed_at"] = datetime.now().isoformat()
        
        # Update additional fields
        for key, value in kwargs.items():
            jobs[job_id][key] = value
        
        save_jobs(jobs)
        print(f"📊 Enhanced job {job_id} status updated: {status}")

async def process_enhanced_video_from_url(job_id: str, pdf_url: str, user_prompt: str = ""):
    """Enhanced background task to process video from PDF URL"""
    print(f"🚀 Starting ENHANCED video generation for job {job_id}")
    print(f"📄 PDF URL: {pdf_url}")
    print(f"📝 User prompt: {user_prompt}")
    
    try:
        update_job_status(job_id, "processing")
        
        # Use the enhanced video generation system
        result = await enhanced_generate_summary_video(pdf_url, user_prompt)
        
        if result and result.get("video_path"):
            print(f"✅ Enhanced video generation successful for job {job_id}")
            print(f"📁 Video path: {result['video_path']}")
            print(f"📊 Success rate: {result.get('success_rate', 'N/A')}")
            print(f"🔊 Audio coverage: {result.get('audio_coverage', 'N/A')}")
            
            update_job_status(
                job_id, 
                "completed",
                video_path=result["video_path"],
                pdf_source=pdf_url,
                success_rate=result.get("success_rate"),
                clips_generated=result.get("successful_clips"),
                audio_coverage=result.get("audio_coverage"),
                enhancement_used=True
            )
        else:
            print(f"❌ Enhanced video generation failed for job {job_id}")
            update_job_status(
                job_id, 
                "failed", 
                error="Enhanced video generation failed - no output generated",
                pdf_source=pdf_url
            )
    
    except Exception as e:
        print(f"❌ Enhanced video generation error for job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        update_job_status(
            job_id, 
            "failed", 
            error=str(e),
            pdf_source=pdf_url
        )

async def process_enhanced_video_from_upload(job_id: str, pdf_path: str, user_prompt: str = ""):
    """Enhanced background task to process video from uploaded PDF"""
    print(f"🚀 Starting ENHANCED video generation from upload for job {job_id}")
    print(f"📁 PDF path: {pdf_path}")
    print(f"📝 User prompt: {user_prompt}")
    
    try:
        update_job_status(job_id, "processing")
        
        # Use the enhanced video generation system for uploads
        result = await enhanced_generate_summary_video_upload(pdf_path, user_prompt)
        
        if result and result.get("video_path"):
            print(f"✅ Enhanced upload video generation successful for job {job_id}")
            print(f"📁 Video path: {result['video_path']}")
            print(f"📊 Success rate: {result.get('success_rate', 'N/A')}")
            print(f"🔊 Audio coverage: {result.get('audio_coverage', 'N/A')}")
            
            update_job_status(
                job_id, 
                "completed",
                video_path=result["video_path"],
                pdf_source=pdf_path,
                success_rate=result.get("success_rate"),
                clips_generated=result.get("successful_clips"),
                audio_coverage=result.get("audio_coverage"),
                enhancement_used=True
            )
        else:
            print(f"❌ Enhanced upload video generation failed for job {job_id}")
            update_job_status(
                job_id, 
                "failed", 
                error="Enhanced upload video generation failed - no output generated",
                pdf_source=pdf_path
            )
    
    except Exception as e:
        print(f"❌ Enhanced upload video generation error for job {job_id}: {e}")
        import traceback
        traceback.print_exc()
        update_job_status(
            job_id, 
            "failed", 
            error=str(e),
            pdf_source=pdf_path
        )

@app.get("/")
async def root():
    """Enhanced API root endpoint"""
    return {
        "message": "Enhanced Manim Video Generation API", 
        "version": "2.0.0",
        "enhancements": [
            "Intelligent Manim code generation",
            "Content-aware template selection", 
            "Multi-stage validation pipeline",
            "Improved audio-video synchronization",
            "Higher success rates and reliability"
        ],
        "endpoints": [
            "/generate-video - Enhanced video generation from PDF URL",
            "/upload-pdf - Enhanced video generation from uploaded PDF",
            "/status/{job_id} - Get enhanced job status",
            "/video/{job_id} - Download generated video",
            "/jobs - List all enhanced jobs"
        ]
    }

@app.post("/generate-video")
async def generate_enhanced_video(video_request: VideoRequest, background_tasks: BackgroundTasks):
    """Enhanced endpoint to generate video from PDF URL"""
    job_id = str(uuid.uuid4())
    
    # Create job entry
    jobs = load_jobs()
    jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "pdf_source": video_request.pdf_url,
        "user_prompt": video_request.user_prompt,
        "enhancement_used": True
    }
    save_jobs(jobs)
    
    # Start enhanced background task
    background_tasks.add_task(
        process_enhanced_video_from_url, 
        job_id, 
        video_request.pdf_url,
        video_request.user_prompt
    )
    
    print(f"🎬 Enhanced video generation job {job_id} created for URL: {video_request.pdf_url}")
    
    return {
        "job_id": job_id,
        "status": "pending",
        "message": "Enhanced video generation started",
        "enhancement_features": [
            "Content-aware code generation",
            "Intelligent template selection",
            "Multi-stage validation",
            "Improved error recovery"
        ]
    }

@app.post("/upload-pdf")
async def upload_enhanced_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_prompt: str = Form("")
):
    """Enhanced endpoint to generate video from uploaded PDF"""
    job_id = str(uuid.uuid4())
    
    try:
        # Create uploads directory if it doesn't exist
        uploads_dir = "uploads"
        os.makedirs(uploads_dir, exist_ok=True)
        
        # Save uploaded file
        file_path = os.path.join(uploads_dir, f"{job_id}_{file.filename}")
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        print(f"📁 Enhanced PDF uploaded: {file_path} ({len(content)} bytes)")
        
        # Compress PDF if it's large (>10MB)
        if len(content) > 10 * 1024 * 1024:  # 10MB
            print(f"📦 Compressing large PDF...")
            try:
                compressed_path = file_path.replace('.pdf', '_compressed.pdf')
                doc = fitz.open(file_path)
                doc.save(compressed_path, garbage=4, deflate=True, clean=True)
                doc.close()
                
                # Replace with compressed version if smaller
                if os.path.getsize(compressed_path) < os.path.getsize(file_path):
                    os.remove(file_path)
                    file_path = compressed_path
                    print(f"✅ PDF compressed successfully")
                else:
                    os.remove(compressed_path)
                    print(f"⚠️  Compression didn't reduce size, using original")
            except Exception as e:
                print(f"⚠️  PDF compression failed: {e}")
        
        # Create job entry
        jobs = load_jobs()
        jobs[job_id] = {
            "job_id": job_id,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "pdf_source": file_path,
            "user_prompt": user_prompt,
            "original_filename": file.filename,
            "enhancement_used": True
        }
        save_jobs(jobs)
        
        # Start enhanced background task
        background_tasks.add_task(
            process_enhanced_video_from_upload, 
            job_id, 
            file_path,
            user_prompt
        )
        
        print(f"🎬 Enhanced upload video generation job {job_id} created for file: {file.filename}")
        
        return {
            "job_id": job_id,
            "status": "pending",
            "message": f"Enhanced video generation started for uploaded file: {file.filename}",
            "file_size_mb": len(content) / (1024 * 1024),
            "enhancement_features": [
                "Content-aware code generation",
                "Intelligent template selection", 
                "Multi-stage validation",
                "Improved error recovery"
            ]
        }
        
    except Exception as e:
        print(f"❌ Enhanced upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Enhanced upload failed: {str(e)}")

@app.get("/status/{job_id}")
async def get_enhanced_job_status(job_id: str):
    """Get enhanced job status with additional metrics"""
    jobs = load_jobs()
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Enhanced job not found")
    
    job_data = jobs[job_id]
    
    # Add enhancement metrics to response
    response = JobStatus(**job_data)
    
    print(f"📊 Enhanced job {job_id} status: {response.status}")
    
    return response

@app.get("/video/{job_id}")
async def download_enhanced_video(job_id: str):
    """Download the enhanced generated video"""
    jobs = load_jobs()
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Enhanced job not found")
    
    job = jobs[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Enhanced job status: {job['status']}")
    
    video_path = job.get("video_path")
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Enhanced video file not found")
    
    print(f"📥 Downloading enhanced video for job {job_id}: {video_path}")
    
    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=f"enhanced_summary_video_{job_id}.mp4"
    )

@app.get("/download/{job_id}")
async def download_enhanced_video_compat(job_id: str):
    """Download the enhanced generated video (compatibility endpoint for frontend)"""
    jobs = load_jobs()
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Enhanced job not found")
    
    job = jobs[job_id]
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Enhanced job status: {job['status']}")
    
    video_path = job.get("video_path")
    if not video_path or not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Enhanced video file not found")
    
    print(f"📥 Downloading enhanced video for job {job_id}: {video_path}")
    
    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=f"enhanced_summary_video_{job_id}.mp4"
    )

@app.get("/jobs")
async def list_enhanced_jobs():
    """List all enhanced jobs with their status"""
    jobs = load_jobs()
    
    # Sort by creation time (newest first)
    sorted_jobs = sorted(
        jobs.values(),
        key=lambda x: x.get("created_at", ""),
        reverse=True
    )
    
    print(f"📋 Listing {len(sorted_jobs)} enhanced jobs")
    
    return {
        "total_jobs": len(sorted_jobs),
        "jobs": sorted_jobs,
        "enhancement_info": {
            "version": "2.0.0",
            "features": [
                "Intelligent code generation",
                "Content-aware templates",
                "Multi-stage validation",
                "Improved reliability"
            ]
        }
    }

@app.get("/metrics")
async def get_enhanced_metrics():
    """Get enhanced system performance metrics"""
    jobs = load_jobs()
    
    if not jobs:
        return {"message": "No enhanced jobs found"}
    
    total_jobs = len(jobs)
    completed_jobs = sum(1 for job in jobs.values() if job.get("status") == "completed")
    failed_jobs = sum(1 for job in jobs.values() if job.get("status") == "failed")
    
    # Calculate enhanced metrics
    success_rates = [job.get("success_rate", 0) for job in jobs.values() if job.get("success_rate") is not None]
    audio_coverages = [job.get("audio_coverage", 0) for job in jobs.values() if job.get("audio_coverage") is not None]
    
    avg_success_rate = sum(success_rates) / len(success_rates) if success_rates else 0
    avg_audio_coverage = sum(audio_coverages) / len(audio_coverages) if audio_coverages else 0
    
    enhanced_jobs = sum(1 for job in jobs.values() if job.get("enhancement_used", False))
    
    return {
        "system_version": "Enhanced 2.0.0",
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs,
        "success_rate": completed_jobs / total_jobs if total_jobs > 0 else 0,
        "enhancement_metrics": {
            "enhanced_jobs": enhanced_jobs,
            "enhanced_percentage": enhanced_jobs / total_jobs if total_jobs > 0 else 0,
            "avg_clip_success_rate": avg_success_rate,
            "avg_audio_coverage": avg_audio_coverage
        },
        "improvements": {
            "intelligent_generation": True,
            "content_awareness": True,
            "multi_stage_validation": True,
            "improved_reliability": True
        }
    }

@app.delete("/jobs/{job_id}")
async def delete_enhanced_job(job_id: str):
    """Delete an enhanced job and its associated files"""
    jobs = load_jobs()
    
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Enhanced job not found")
    
    job = jobs[job_id]
    
    # Clean up video file if it exists
    video_path = job.get("video_path")
    if video_path and os.path.exists(video_path):
        try:
            os.remove(video_path)
            print(f"🗑️  Deleted enhanced video: {video_path}")
        except Exception as e:
            print(f"⚠️  Could not delete enhanced video: {e}")
    
    # Clean up PDF file if it was uploaded
    pdf_source = job.get("pdf_source")
    if pdf_source and pdf_source.startswith("uploads/") and os.path.exists(pdf_source):
        try:
            os.remove(pdf_source)
            print(f"🗑️  Deleted enhanced PDF: {pdf_source}")
        except Exception as e:
            print(f"⚠️  Could not delete enhanced PDF: {e}")
    
    # Remove job from records
    del jobs[job_id]
    save_jobs(jobs)
    
    print(f"🗑️  Enhanced job {job_id} deleted successfully")
    
    return {"message": f"Enhanced job {job_id} deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting Enhanced Manim Video Generation Server")
    print("=" * 60)
    print("Enhanced Features:")
    print("- Intelligent Manim code generation")
    print("- Content-aware template selection")
    print("- Multi-stage validation pipeline")
    print("- Improved audio-video synchronization")
    print("- Higher success rates and reliability")
    print("=" * 60)
    
    uvicorn.run(
        "enhanced_server:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )