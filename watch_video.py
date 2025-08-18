#!/usr/bin/env python3
"""
Simple video watcher for Claude Code
Opens videos and provides basic analysis
"""
import os
import subprocess
import sys
from pathlib import Path
from moviepy import VideoFileClip

def get_latest_manim_video():
    """Find the latest manim video"""
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
    return latest_video

def analyze_video(video_path):
    """Analyze video properties"""
    try:
        clip = VideoFileClip(str(video_path))
        
        print(f"📹 Video Analysis:")
        print(f"  📁 File: {video_path.name}")
        print(f"  ⏱️  Duration: {clip.duration:.2f} seconds")
        print(f"  📐 Resolution: {clip.size[0]}x{clip.size[1]}")
        print(f"  🎬 FPS: {clip.fps}")
        print(f"  🔊 Has Audio: {clip.audio is not None}")
        if clip.audio:
            print(f"  🎵 Audio Duration: {clip.audio.duration:.2f}s")
        print(f"  📏 File Size: {video_path.stat().st_size / (1024*1024):.1f} MB")
        
        clip.close()
        return True
    except Exception as e:
        print(f"❌ Error analyzing video: {e}")
        return False

def open_video(video_path):
    """Open video in default player"""
    try:
        if sys.platform == "darwin":  # macOS
            subprocess.run(["open", str(video_path)])
        elif sys.platform == "win32":  # Windows
            subprocess.run(["start", str(video_path)], shell=True)
        else:  # Linux
            subprocess.run(["xdg-open", str(video_path)])
        
        print(f"🎬 Opened video in default player")
        return True
    except Exception as e:
        print(f"❌ Error opening video: {e}")
        return False

def main():
    """Watch the latest manim video"""
    print("🎬 Video Watcher for Claude Code")
    print("=" * 40)
    
    # Find latest video
    video_path = get_latest_manim_video()
    if not video_path:
        return
    
    print(f"📹 Latest video found: {video_path}")
    
    # Analyze the video
    if analyze_video(video_path):
        print("\n🎬 Opening video...")
        open_video(video_path)
    
    print(f"\n✅ Video ready! Path: {video_path}")

if __name__ == "__main__":
    main()