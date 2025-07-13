#!/usr/bin/env python3
"""
Debug script to run video generation directly and capture all console output
"""
import asyncio
import sys
import os
from video_generator import generate_summary_video

async def debug_video_generation():
    """Run video generation with full console output"""
    print("🔍 DEBUGGING VIDEO GENERATION WITH FULL CONSOLE OUTPUT")
    print("=" * 80)
    
    # Use a simple dummy PDF URL that we know works
    pdf_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    
    print(f"📄 Testing with PDF: {pdf_url}")
    print(f"🎯 Focus: Audio generation and video stitching pipeline")
    print("-" * 80)
    
    try:
        # Run the video generation and capture all output
        result = await generate_summary_video(pdf_url)
        
        print("-" * 80)
        print("🏁 GENERATION COMPLETED!")
        print(f"📊 Result: {result}")
        
        # Check the final video file
        video_path = result.get("video_path")
        if video_path and os.path.exists(video_path):
            print(f"📁 Video file exists: {video_path}")
            print(f"📏 File size: {os.path.getsize(video_path)} bytes")
            
            # Check audio streams
            import subprocess
            try:
                cmd = ["ffprobe", "-v", "quiet", "-show_streams", "-select_streams", "a", video_path]
                audio_result = subprocess.run(cmd, capture_output=True, text=True)
                if audio_result.stdout.strip():
                    print("✅ AUDIO STREAMS FOUND:")
                    print(audio_result.stdout)
                else:
                    print("❌ NO AUDIO STREAMS FOUND!")
                    
                # Show all streams
                cmd = ["ffprobe", "-v", "quiet", "-show_format", "-show_streams", video_path]
                all_result = subprocess.run(cmd, capture_output=True, text=True)
                print("📊 ALL STREAMS:")
                for line in all_result.stdout.split('\n'):
                    if 'codec_type' in line or 'nb_streams' in line:
                        print(f"  {line}")
                        
            except Exception as e:
                print(f"❌ Error checking streams: {e}")
        else:
            print(f"❌ Video file not found: {video_path}")
            
    except Exception as e:
        print(f"❌ ERROR during generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting debug video generation...")
    asyncio.run(debug_video_generation())
    print("✅ Debug session completed.")