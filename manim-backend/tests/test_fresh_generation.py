#!/usr/bin/env python3
"""
Test fresh clip generation to verify the issue is fixed
"""
import asyncio
import sys
import os
import json

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_fresh_generation():
    """Test fresh generation with the actual content"""
    print("🧪 Testing fresh clip generation...")
    
    try:
        from simple_video_generator import SimpleVideoGenerator
        
        generator = SimpleVideoGenerator()
        
        # Test with a simple config similar to what the server uses
        test_config = [{
            "title": "Quantum Computing Basics",
            "voice_over": "Quantum computing harnesses quantum mechanical phenomena like superposition and entanglement to perform computations that would be impossible for classical computers.",
            "description": "Introduction to quantum computing concepts"
        }]
        
        print(f"🎬 Testing with config: {test_config[0]['title']}")
        
        result = await generator.generate_simple_manim_clips(test_config)
        
        if result["successful_clips"] > 0:
            clip_path = result["clip_paths"][0]
            print(f"✅ Clip generated: {clip_path}")
            
            # Check if the file exists and get its duration
            if os.path.exists(clip_path):
                import subprocess
                cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', clip_path]
                probe_result = subprocess.run(cmd, capture_output=True, text=True)
                
                if probe_result.returncode == 0:
                    data = json.loads(probe_result.stdout)
                    duration = float(data['format']['duration'])
                    print(f"📊 Clip duration: {duration:.2f} seconds")
                    
                    # Extract a frame to verify content
                    frame_cmd = ['ffmpeg', '-y', '-i', clip_path, '-ss', '3', '-vframes', '1', 'fresh_test_frame.png']
                    frame_result = subprocess.run(frame_cmd, capture_output=True, text=True)
                    
                    if frame_result.returncode == 0:
                        print(f"✅ Frame extracted: fresh_test_frame.png")
                        print(f"🔍 Please check fresh_test_frame.png to verify content shows 'Quantum Computing' not 'Duration Test'")
                        return True
                    else:
                        print(f"❌ Frame extraction failed: {frame_result.stderr}")
                        return False
                else:
                    print(f"❌ Could not probe video: {probe_result.stderr}")
                    return False
            else:
                print(f"❌ Clip file not found: {clip_path}")
                return False
        else:
            print(f"❌ No clips generated successfully")
            print(f"📋 Generation details: {result['generation_details']}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_fresh_generation())
    if success:
        print("\n🎉 Fresh generation test PASSED! The issue should be fixed.")
    else:
        print("\n❌ Fresh generation test FAILED!")