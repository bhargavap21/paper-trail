#!/usr/bin/env python3
"""
Quick Audio Pipeline Verification Script
Tests the complete audio pipeline with minimal setup
"""

import asyncio
import os
from voice_gen_fallback import generate_voice_with_fallback
from moviepy import VideoFileClip, AudioFileClip

async def quick_audio_test():
    """Quick test to verify audio pipeline works"""
    print("🧪 QUICK AUDIO PIPELINE TEST")
    print("=" * 50)
    
    # Test 1: Voice generation
    print("\n🎤 Testing voice generation...")
    test_text = "This is a quick test to verify audio generation works correctly."
    audio_path = "quick_test_audio.wav"
    
    try:
        result = await generate_voice_with_fallback(test_text, audio_path, "juniper")
        if result and os.path.exists(result):
            file_size = os.path.getsize(result)
            print(f"✅ Voice generation successful: {file_size} bytes")
            
            # Test audio loading
            try:
                audio_clip = AudioFileClip(result)
                print(f"🎵 Audio properties: {audio_clip.duration:.2f}s, {audio_clip.fps}Hz, {audio_clip.nchannels} channels")
                audio_clip.close()
                print("✅ Audio pipeline verification PASSED")
                
                # Cleanup
                os.remove(result)
                print("🧹 Cleanup completed")
                return True
            except Exception as e:
                print(f"❌ Audio loading failed: {e}")
                return False
        else:
            print("❌ Voice generation failed")
            return False
    except Exception as e:
        print(f"❌ Voice generation exception: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(quick_audio_test())
    if success:
        print("\n🎉 AUDIO PIPELINE IS WORKING!")
        print("✅ Ready for video generation with audio")
    else:
        print("\n❌ AUDIO PIPELINE FAILED!")
        print("🔧 Check API keys and voice generation setup")
    exit(0 if success else 1)