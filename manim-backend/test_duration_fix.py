#!/usr/bin/env python3
"""
Test the duration fix for the simple video generator
"""
import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_duration_fix():
    """Test that clips now generate with proper duration"""
    print("🧪 Testing duration fix...")
    
    try:
        from simple_video_generator import SimpleVideoGenerator
        
        generator = SimpleVideoGenerator()
        
        # Test single clip generation
        test_config = [{
            "title": "Test Clip Duration",
            "voice_over": "This is a test clip to verify that our duration fix works properly and generates clips that are 10-15 seconds long.",
            "description": "A test animation with multiple elements and longer duration"
        }]
        
        print(f"🎬 Testing single clip generation...")
        clips_result = await generator.generate_simple_manim_clips(test_config)
        
        if clips_result["successful_clips"] > 0:
            clip_path = clips_result["clip_paths"][0]
            print(f"✅ Clip generated: {clip_path}")
            
            # Check duration
            import subprocess
            import json
            
            cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', clip_path]
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                data = json.loads(result.stdout)
                duration = float(data['format']['duration'])
                print(f"📊 Clip duration: {duration:.2f} seconds")
                
                if duration >= 8.0:
                    print(f"✅ Duration fix successful! Clip is {duration:.2f}s (>= 8s)")
                    return True
                else:
                    print(f"❌ Duration still too short: {duration:.2f}s (< 8s)")
                    return False
            else:
                print(f"❌ Could not check duration: {result.stderr}")
                return False
        else:
            print(f"❌ Clip generation failed")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_duration_fix())
    if success:
        print("\n🎉 Duration fix test PASSED!")
    else:
        print("\n❌ Duration fix test FAILED!")