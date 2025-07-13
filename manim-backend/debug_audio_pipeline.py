#!/usr/bin/env python3
"""
Comprehensive audio pipeline debugging script
Tests every component of the video generation pipeline step by step
"""

import os
import asyncio
import sys
from pathlib import Path
import subprocess

def log_step(step_name, details=""):
    """Enhanced logging function"""
    print(f"\n{'='*60}")
    print(f"🔍 STEP: {step_name}")
    if details:
        print(f"📋 {details}")
    print(f"{'='*60}")

def check_file_audio(file_path):
    """Check if file has audio stream"""
    if not os.path.exists(file_path):
        return False, "File does not exist"
    
    try:
        result = subprocess.run([
            'ffprobe', '-v', 'quiet', '-show_entries', 
            'stream=codec_type', '-of', 'csv=p=0', file_path
        ], capture_output=True, text=True)
        
        streams = result.stdout.strip().split('\n')
        has_video = 'video' in streams
        has_audio = 'audio' in streams
        file_size = os.path.getsize(file_path)
        
        return has_audio, f"Video: {has_video}, Audio: {has_audio}, Size: {file_size} bytes"
    except Exception as e:
        return False, f"Error checking: {e}"

async def test_step_1_environment():
    """Test 1: Environment and API Key Access"""
    log_step("1. ENVIRONMENT CHECK", "Verifying API keys and environment")
    
    # Check LMNT API key
    api_key = os.getenv('LMNT_API_KEY')
    print(f"🔑 LMNT API Key: {'✅ Present' if api_key else '❌ Missing'}")
    if api_key:
        print(f"🔑 Key starts with: {api_key[:10]}...")
    
    # Check working directory
    cwd = os.getcwd()
    print(f"📁 Working Directory: {cwd}")
    
    # Check FFmpeg
    try:
        ffmpeg_result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        print(f"🎬 FFmpeg: ✅ Available")
    except:
        print(f"🎬 FFmpeg: ❌ Not found")
    
    # Check Python environment
    print(f"🐍 Python: {sys.executable}")
    print(f"🐍 Version: {sys.version}")
    
    return True

async def test_step_2_voice_generation():
    """Test 2: Voice Generation in Current Context"""
    log_step("2. VOICE GENERATION TEST", "Testing LMNT voice generation directly")
    
    try:
        from voice_gen_fallback import generate_voice_with_fallback
        
        test_text = "This is a test of voice generation with Juniper voice in the current execution context."
        test_output = "debug_voice_test.wav"
        
        print(f"🎤 Testing voice generation...")
        print(f"📝 Text: {test_text}")
        print(f"📁 Output: {test_output}")
        
        result = await generate_voice_with_fallback(test_text, test_output, "juniper")
        
        if result and os.path.exists(result):
            file_size = os.path.getsize(result)
            print(f"✅ Voice generation successful: {file_size} bytes")
            return True, result
        else:
            print(f"❌ Voice generation failed")
            return False, None
            
    except Exception as e:
        print(f"❌ Voice generation exception: {e}")
        return False, None

async def test_step_3_individual_clips():
    """Test 3: Individual Clip Generation with Audio"""
    log_step("3. INDIVIDUAL CLIP TEST", "Testing single clip with voice generation")
    
    try:
        from manim_generator import generate_manim_clips
        from voice_gen_fallback import generate_voice_with_fallback
        from video_generator import combine_video_with_audio_sync
        
        # Create test clip config
        test_clips = [{
            "type": "manim",
            "code": """class SimpleScene(Scene):
    def construct(self):
        title = Text('Test Audio Clip', font_size=48)
        self.play(Write(title))
        self.wait(2)""",
            "voice_over": "This is a test clip to verify that audio generation and combination works correctly."
        }]
        
        print(f"🎬 Generating test Manim clip...")
        output_dir = "debug_clips"
        os.makedirs(output_dir, exist_ok=True)
        
        video_paths = await generate_manim_clips(test_clips, output_dir, "medium_quality")
        
        if video_paths and video_paths[0]:
            video_path = video_paths[0]
            print(f"✅ Video clip generated: {video_path}")
            
            has_audio, info = check_file_audio(video_path)
            print(f"📊 Video info: {info}")
            
            # Generate voice for this clip
            print(f"🎤 Generating voice for clip...")
            audio_path = f"{output_dir}/test_audio.wav"
            voice_result = await generate_voice_with_fallback(test_clips[0]['voice_over'], audio_path, "juniper")
            
            if voice_result and os.path.exists(voice_result):
                print(f"✅ Voice generated: {os.path.getsize(voice_result)} bytes")
                
                # Combine video and audio
                print(f"🔗 Combining video and audio...")
                final_path = f"{output_dir}/test_final.mp4"
                combined_result = combine_video_with_audio_sync(video_path, audio_path, final_path)
                
                if os.path.exists(combined_result):
                    has_final_audio, final_info = check_file_audio(combined_result)
                    print(f"📊 Final clip info: {final_info}")
                    print(f"🎵 Final has audio: {'✅' if has_final_audio else '❌'}")
                    return has_final_audio, combined_result
                else:
                    print(f"❌ Failed to combine video and audio")
                    return False, None
            else:
                print(f"❌ Voice generation failed")
                return False, None
        else:
            print(f"❌ Video clip generation failed")
            return False, None
            
    except Exception as e:
        print(f"❌ Individual clip test exception: {e}")
        import traceback
        traceback.print_exc()
        return False, None

async def test_step_4_concatenation():
    """Test 4: Video Concatenation with Audio"""
    log_step("4. CONCATENATION TEST", "Testing video concatenation preserves audio")
    
    try:
        from moviepy import VideoFileClip, concatenate_videoclips
        
        # Use the clip from step 3
        test_clip_path = "debug_clips/test_final.mp4"
        
        if not os.path.exists(test_clip_path):
            print(f"❌ Test clip not found: {test_clip_path}")
            return False, None
        
        print(f"🎬 Loading test clip...")
        clip1 = VideoFileClip(test_clip_path)
        clip2 = VideoFileClip(test_clip_path)  # Duplicate for testing
        
        print(f"📊 Clip 1 audio: {clip1.audio}")
        print(f"📊 Clip 2 audio: {clip2.audio}")
        
        print(f"🔗 Concatenating clips...")
        final_clip = concatenate_videoclips([clip1, clip2], method="chain")
        
        print(f"📊 Concatenated audio: {final_clip.audio}")
        
        output_path = "debug_clips/concatenated_test.mp4"
        print(f"💾 Writing concatenated video...")
        final_clip.write_videofile(output_path, logger=None, audio=True, audio_codec='aac')
        
        # Check result
        has_audio, info = check_file_audio(output_path)
        print(f"📊 Concatenated result: {info}")
        print(f"🎵 Has audio: {'✅' if has_audio else '❌'}")
        
        # Cleanup
        clip1.close()
        clip2.close()
        final_clip.close()
        
        return has_audio, output_path
        
    except Exception as e:
        print(f"❌ Concatenation test exception: {e}")
        import traceback
        traceback.print_exc()
        return False, None

async def test_step_5_full_pipeline():
    """Test 5: Full Pipeline Simulation"""
    log_step("5. FULL PIPELINE TEST", "Testing complete video generation pipeline")
    
    try:
        from video_generator import generate_summary_video_upload
        
        pdf_path = "/Users/bhargavap/Downloads/untitled folder 3/paper-trail-1/public/uploads/1752363261041-molecules-19-19066.pdf"
        
        if not os.path.exists(pdf_path):
            print(f"❌ PDF not found: {pdf_path}")
            return False, None
        
        print(f"📄 Testing full pipeline with PDF...")
        print(f"📁 PDF: {pdf_path}")
        
        result = await generate_summary_video_upload(pdf_path)
        
        if result and result.get('video_path'):
            video_path = result['video_path']
            print(f"✅ Pipeline completed: {video_path}")
            
            has_audio, info = check_file_audio(video_path)
            print(f"📊 Pipeline result: {info}")
            print(f"🎵 Has audio: {'✅' if has_audio else '❌'}")
            
            return has_audio, video_path
        else:
            print(f"❌ Pipeline failed")
            return False, None
            
    except Exception as e:
        print(f"❌ Full pipeline exception: {e}")
        import traceback
        traceback.print_exc()
        return False, None

async def main():
    """Run comprehensive audio debugging"""
    print("🚀 STARTING COMPREHENSIVE AUDIO DEBUG")
    print(f"⏰ Timestamp: {os.popen('date').read().strip()}")
    
    results = {}
    
    # Test each step
    results['environment'] = await test_step_1_environment()
    results['voice_generation'] = await test_step_2_voice_generation()
    results['individual_clips'] = await test_step_3_individual_clips()
    results['concatenation'] = await test_step_4_concatenation()
    results['full_pipeline'] = await test_step_5_full_pipeline()
    
    # Summary
    log_step("SUMMARY", "Test Results")
    for test_name, (success, details) in results.items():
        if isinstance(success, bool):
            status = "✅" if success else "❌"
            print(f"{status} {test_name}: {details if details else ('PASS' if success else 'FAIL')}")
        else:
            print(f"ℹ️  {test_name}: COMPLETED")
    
    print(f"\n🏁 DEBUG COMPLETE")

if __name__ == "__main__":
    asyncio.run(main())