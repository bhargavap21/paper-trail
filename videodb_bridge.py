#!/usr/bin/env python3
"""
VideoDB Bridge for Claude Code
Simple integration to use VideoDB functionality from within VS Code
"""
import asyncio
import os
from pathlib import Path
from videodb_director_mcp import call_director, play_video

# Set the API key environment variable
os.environ['VIDEODB_API_KEY'] = 'sk-OE83CAz9ODMq3RHGPPs-RLj08HYsJsuZK2FSl9m43WY'

class VideoDBBridge:
    def __init__(self, api_key=None):
        self.api_key = api_key or "sk-OE83CAz9ODMq3RHGPPs-RLj08HYsJsuZK2FSl9m43WY"
        self.session_id = None
    
    async def analyze_and_watch_video(self, video_path: str):
        """Analyze video content and provide detailed assessment"""
        if not os.path.exists(video_path):
            print(f"❌ Video file not found: {video_path}")
            return None
        
        try:
            # First, analyze the video locally
            from moviepy import VideoFileClip
            import subprocess
            import sys
            
            print(f"📹 Analyzing video: {os.path.basename(video_path)}")
            
            # Get video properties
            clip = VideoFileClip(video_path)
            
            analysis = {
                "file_name": os.path.basename(video_path),
                "duration": clip.duration,
                "resolution": f"{clip.size[0]}x{clip.size[1]}",
                "fps": clip.fps,
                "has_audio": clip.audio is not None,
                "file_size_mb": os.path.getsize(video_path) / (1024*1024)
            }
            
            if clip.audio:
                analysis["audio_duration"] = clip.audio.duration
                analysis["audio_channels"] = clip.audio.nchannels
            
            # Print analysis
            print(f"\n📊 VIDEO ANALYSIS:")
            print(f"  📁 File: {analysis['file_name']}")
            print(f"  ⏱️  Duration: {analysis['duration']:.2f} seconds")
            print(f"  📐 Resolution: {analysis['resolution']}")
            print(f"  🎬 FPS: {analysis['fps']}")
            print(f"  🔊 Has Audio: {analysis['has_audio']}")
            if analysis['has_audio']:
                print(f"  🎵 Audio Duration: {analysis['audio_duration']:.2f}s")
                print(f"  🔈 Audio Channels: {analysis['audio_channels']}")
            print(f"  📏 File Size: {analysis['file_size_mb']:.1f} MB")
            
            # Open video in default player
            print(f"\n🎬 Opening video in default player...")
            if sys.platform == "darwin":  # macOS
                subprocess.run(["open", video_path])
            elif sys.platform == "win32":  # Windows
                subprocess.run(["start", video_path], shell=True)
            else:  # Linux
                subprocess.run(["xdg-open", video_path])
            
            # Try to use VideoDB Director for content analysis
            print(f"\n🤖 Using VideoDB Director for content analysis...")
            message = f"Analyze this video content and identify any issues with the manim-generated educational video. The video is {analysis['duration']:.1f} seconds long, {analysis['resolution']} resolution, and {'has audio' if analysis['has_audio'] else 'is silent'}. Please provide insights on content quality, pacing, visual clarity, and any technical issues."
            
            result = await call_director(message, self.session_id)
            
            if 'session_id' in result:
                self.session_id = result['session_id']
            
            print(f"\n🔍 VideoDB Director Analysis:")
            if 'content' in result:
                for content_item in result['content']:
                    if content_item.get('type') == 'text':
                        print(f"  📝 {content_item.get('text', 'No analysis provided')}")
            
            clip.close()
            return {**analysis, "director_analysis": result}
            
        except Exception as e:
            print(f"❌ Error analyzing video: {e}")
            import traceback
            print(f"📋 Traceback: {traceback.format_exc()}")
            return None
    
    async def play_stream(self, stream_url: str):
        """Play a video stream using VideoDB"""
        try:
            result = await play_video(stream_url)
            print(f"🎬 Playing video: {result}")
            return result
        except Exception as e:
            print(f"❌ Error playing video: {e}")
            return None
    
    async def get_latest_manim_video(self):
        """Find and return the latest manim video"""
        # Find the most recent video in outputs directory
        outputs_dir = Path("./manim-backend/outputs/")
        if not outputs_dir.exists():
            print("❌ Outputs directory not found")
            return None
        
        video_files = list(outputs_dir.glob("*.mp4"))
        if not video_files:
            print("❌ No video files found")
            return None
        
        # Get the most recent video
        latest_video = max(video_files, key=os.path.getctime)
        print(f"📹 Latest video: {latest_video}")
        return str(latest_video)
    
    async def watch_latest_video(self):
        """Find and watch the latest generated manim video"""
        video_path = await self.get_latest_manim_video()
        if not video_path:
            return None
        
        print(f"🎬 Analyzing and watching: {video_path}")
        result = await self.analyze_and_watch_video(video_path)
        return result

async def main():
    """Quick test/demo of the VideoDB bridge"""
    bridge = VideoDBBridge()
    
    print("🎬 VideoDB Bridge for Claude Code")
    print("=" * 40)
    
    # Watch the latest video
    result = await bridge.watch_latest_video()
    if result:
        print("✅ Video processing initiated!")
    else:
        print("❌ Failed to process video")

if __name__ == "__main__":
    asyncio.run(main())