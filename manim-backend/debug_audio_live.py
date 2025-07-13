#!/usr/bin/env python3
"""
Debug script to trace audio loss in video generation pipeline.
This mimics the exact steps from the main pipeline to identify where audio is lost.
"""

import os
import subprocess
from moviepy.editor import VideoFileClip, concatenate_videoclips
from pathlib import Path

def check_video_audio(filepath, description=""):
    """Check if video file has audio and print details."""
    print(f"\n🔍 CHECKING: {description or filepath}")
    print(f"📁 File: {filepath}")
    
    if not os.path.exists(filepath):
        print(f"❌ File does not exist!")
        return False
    
    # Check file size
    size = os.path.getsize(filepath)
    print(f"📊 Size: {size:,} bytes ({size/1024/1024:.2f} MB)")
    
    # Use ffprobe to check streams
    try:
        cmd = ['ffprobe', '-v', 'quiet', '-show_streams', filepath]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        video_streams = 0
        audio_streams = 0
        
        for line in result.stdout.split('\n'):
            if 'codec_type=video' in line:
                video_streams += 1
            elif 'codec_type=audio' in line:
                audio_streams += 1
        
        print(f"🎬 Video streams: {video_streams}")
        print(f"🔊 Audio streams: {audio_streams}")
        
        # Also check with MoviePy to see if it can detect audio
        try:
            clip = VideoFileClip(filepath)
            print(f"🎭 MoviePy duration: {clip.duration:.2f}s")
            print(f"🔊 MoviePy has audio: {clip.audio is not None}")
            if clip.audio:
                print(f"🎵 Audio duration: {clip.audio.duration:.2f}s")
            clip.close()
        except Exception as e:
            print(f"⚠️ MoviePy error: {e}")
        
        return audio_streams > 0
        
    except Exception as e:
        print(f"❌ Error checking streams: {e}")
        return False

def debug_concatenation():
    """Debug the concatenation process step by step."""
    print("🚀 STARTING AUDIO DEBUG - CONCATENATION PROCESS")
    print("=" * 60)
    
    clips_dir = Path("clips")
    
    # Check individual final clips
    final_clips = []
    for i in range(4):  # Based on job showing 4 clips
        clip_path = clips_dir / f"final_{i}.mp4"
        if clip_path.exists():
            has_audio = check_video_audio(str(clip_path), f"Final clip {i}")
            final_clips.append(str(clip_path))
        else:
            print(f"❌ Missing clip: {clip_path}")
    
    # Check thank you video
    thank_you_path = clips_dir / "thank_you_with_audio.mp4"
    check_video_audio(str(thank_you_path), "Thank you video")
    
    if len(final_clips) > 0 and thank_you_path.exists():
        print(f"\n🔗 TESTING CONCATENATION WITH {len(final_clips)} clips + thank you")
        
        # Test concatenation using MoviePy (same as main pipeline)
        try:
            print("📹 Loading clips with MoviePy...")
            clips = []
            
            for i, clip_path in enumerate(final_clips):
                print(f"  Loading clip {i}: {clip_path}")
                clip = VideoFileClip(clip_path)
                clips.append(clip)
                print(f"    ✅ Loaded: {clip.duration:.2f}s, audio={clip.audio is not None}")
            
            # Load thank you clip
            print(f"  Loading thank you: {thank_you_path}")
            thank_you = VideoFileClip(str(thank_you_path))
            clips.append(thank_you)
            print(f"    ✅ Loaded: {thank_you.duration:.2f}s, audio={thank_you.audio is not None}")
            
            print("🔄 Concatenating clips...")
            final_video = concatenate_videoclips(clips, method="compose")
            
            print(f"✅ Concatenated video created: {final_video.duration:.2f}s, audio={final_video.audio is not None}")
            
            # Save test output
            test_output = "debug_concat_test.mp4"
            print(f"💾 Saving test video: {test_output}")
            
            final_video.write_videofile(
                test_output,
                codec='libx264',
                audio_codec='aac',
                verbose=True,
                logger='bar'
            )
            
            # Check the saved result
            check_video_audio(test_output, "Test concatenated video")
            
            # Cleanup
            for clip in clips:
                clip.close()
            final_video.close()
            
        except Exception as e:
            print(f"❌ Concatenation failed: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("🏁 AUDIO DEBUG COMPLETE")

if __name__ == "__main__":
    os.chdir("/Users/bhargavap/Downloads/untitled folder 3/manim_video_generation-main")
    debug_concatenation()