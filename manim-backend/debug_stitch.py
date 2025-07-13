#!/usr/bin/env python3

import os
from moviepy import VideoFileClip, concatenate_videoclips
from video_generator import normalize_video_clip, stitch_videos

def test_stitch():
    """Test stitching function to debug audio issue"""
    
    # Find the latest final clips
    clips_dir = "clips"
    final_clips = []
    
    for i in range(4):
        clip_path = f"{clips_dir}/final_{i}.mp4"
        if os.path.exists(clip_path):
            final_clips.append(clip_path)
    
    print(f"Found {len(final_clips)} final clips")
    
    # Test each clip individually
    for i, path in enumerate(final_clips):
        clip = VideoFileClip(path)
        print(f"Clip {i+1}: {os.path.basename(path)}")
        print(f"  Audio: {clip.audio}")
        print(f"  Has audio track: {clip.audio is not None}")
        
        # Test normalization
        normalized = normalize_video_clip(clip)
        print(f"  Normalized audio: {normalized.audio}")
        print(f"  Normalized has audio: {normalized.audio is not None}")
        
        # Don't compare clips, just close them
        if id(normalized) != id(clip):
            clip.close()
        # Keep normalized clip open for now
    
    # Test manual concatenation
    print("\n=== Testing manual concatenation ===")
    clips = []
    for path in final_clips[:2]:  # Test with first 2 clips
        clip = VideoFileClip(path)
        print(f"Loading {os.path.basename(path)}: audio = {clip.audio}")
        clips.append(clip)
    
    # Direct concatenation
    print("Direct concatenation...")
    final = concatenate_videoclips(clips, method="chain")
    print(f"Result audio: {final.audio}")
    final.write_videofile("test_direct_concat.mp4", logger=None)
    
    # Check result
    print("Checking result...")
    os.system("ffprobe -v quiet -show_entries stream=codec_type -of csv=p=0 test_direct_concat.mp4")
    
    # Clean up
    final.close()
    for clip in clips:
        clip.close()
    
    # Test with normalization
    print("\n=== Testing with normalization ===")
    clips = []
    for path in final_clips[:2]:
        clip = VideoFileClip(path)
        normalized = normalize_video_clip(clip)
        print(f"Normalized {os.path.basename(path)}: audio = {normalized.audio}")
        clips.append(normalized)
        if id(normalized) != id(clip):
            clip.close()
    
    final = concatenate_videoclips(clips, method="chain")
    print(f"Normalized result audio: {final.audio}")
    final.write_videofile("test_normalized_concat.mp4", logger=None)
    
    print("Checking normalized result...")
    os.system("ffprobe -v quiet -show_entries stream=codec_type -of csv=p=0 test_normalized_concat.mp4")
    
    # Clean up
    final.close()
    for clip in clips:
        clip.close()

if __name__ == "__main__":
    test_stitch()