#!/usr/bin/env python3
"""
Simple Video Generator - Using the improved generative-manim approach
High-quality, reliable video generation with minimal complexity
"""
import asyncio
import os
import json
import subprocess
import tempfile
import base64
from pathlib import Path
from typing import Dict, List, Any, Optional
import weave

# Import the scalable dataset-enhanced generator for improved quality and scalability
from scalable_dataset_enhanced_generator import ScalableDatasetEnhancedManimGenerator
from voice_gen_fallback import generate_voice_with_fallback as generate_voice
from veo_gen import generate_veo_thank_you_clip

# MoviePy imports with error handling
try:
    from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips
    print("✅ MoviePy imported successfully")
except ImportError as e:
    print(f"❌ MoviePy import failed: {e}")
    raise

class SimpleVideoGenerator:
    """Scalable dataset-enhanced video generator using intelligent similarity scoring for large datasets"""
    
    def __init__(self):
        self.manim_generator = ScalableDatasetEnhancedManimGenerator()
        # Generate unique session ID to prevent file conflicts
        import uuid
        self.session_id = str(uuid.uuid4())[:8]
        
    @weave.op()
    async def generate_simple_manim_clips(self, clips_config: List[Dict]) -> Dict[str, Any]:
        """Generate Manim clips using dataset-enhanced approach"""
        
        print(f"🎬 Generating {len(clips_config)} video clips with scalable dataset-enhanced approach...")
        
        results = {
            "successful_clips": 0,
            "failed_clips": 0,
            "clip_paths": [],
            "generation_details": []
        }
        
        for i, clip_config in enumerate(clips_config):
            clip_name = f"simple_clip_{self.session_id}_{i:03d}"
            print(f"\n🎬 Generating clip {i+1}/{len(clips_config)}: {clip_name}")
            
            try:
                # Get the voice-over text or description
                voice_text = clip_config.get('voice_over', '')
                clip_description = voice_text if voice_text else f"Animation for clip {i+1}"
                
                print(f"📝 Clip description: {clip_description[:100]}...")
                
                # Generate Manim code
                generation_result = await self.manim_generator.generate_manim_code(clip_description)
                
                if generation_result["success"]:
                    # Execute the generated code
                    video_path = await self._execute_manim_code(
                        generation_result["code"], 
                        clip_name
                    )
                    
                    if video_path and os.path.exists(video_path):
                        results["clip_paths"].append(video_path)
                        results["successful_clips"] += 1
                        results["generation_details"].append({
                            "clip_index": i,
                            "method": generation_result["method"],
                            "status": "success",
                            "video_path": video_path
                        })
                        print(f"✅ Clip {i+1} generated successfully: {video_path}")
                    else:
                        results["failed_clips"] += 1
                        results["generation_details"].append({
                            "clip_index": i,
                            "method": generation_result["method"],
                            "status": "failed",
                            "error": "Video file not created"
                        })
                        print(f"❌ Clip {i+1} failed: Video file not created")
                else:
                    results["failed_clips"] += 1
                    results["generation_details"].append({
                        "clip_index": i,
                        "method": "none",
                        "status": "failed",
                        "error": "Code generation failed"
                    })
                    print(f"❌ Clip {i+1} failed: Code generation failed")
                    
            except Exception as e:
                results["failed_clips"] += 1
                results["generation_details"].append({
                    "clip_index": i,
                    "method": "none",
                    "status": "failed",
                    "error": str(e)
                })
                print(f"❌ Clip {i+1} failed with error: {e}")
        
        print(f"\n📊 CLIP GENERATION SUMMARY:")
        print(f"  🎯 Target clips: {len(clips_config)}")
        print(f"  ✅ Successfully generated: {results['successful_clips']}")
        print(f"  ❌ Failed: {results['failed_clips']}")
        print(f"  📁 Clip paths: {results['clip_paths']}")
        
        return results
    
    async def _execute_manim_code(self, code: str, clip_name: str) -> Optional[str]:
        """Execute Manim code and return video path"""
        
        try:
            # Create temporary file for the code
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
                temp_file.write(code)
                temp_file_path = temp_file.name
            
            # Create output directory
            output_dir = f"simple_clips/{clip_name}"
            os.makedirs(output_dir, exist_ok=True)
            
            # Run Manim command (simplified like generative-manim)
            cmd = [
                "manim", temp_file_path, "GenScene",  # Use GenScene as class name
                "-o", clip_name,
                "--media_dir", output_dir,
                "-v", "WARNING",  # Reduce verbosity
                "-qm",  # Medium quality
                "--resolution", "1280,720",
                "--frame_rate", "24"
            ]
            
            print(f"🎬 Running Manim command: {' '.join(cmd)}")
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                # Find the main output video file (not partial files)
                video_files = list(Path(output_dir).rglob("*.mp4"))
                if video_files:
                    # Filter out partial files directory
                    main_files = [f for f in video_files if "partial_movie_files" not in str(f)]
                    
                    if main_files:
                        # Look for the main output file (clip_name.mp4)
                        main_file = None
                        for file in main_files:
                            if file.name == f"{clip_name}.mp4":
                                main_file = file
                                break
                        
                        if main_file and main_file.exists():
                            print(f"✅ Found main video file: {main_file}")
                            return str(main_file)
                        else:
                            # Get the largest main file (not partial)
                            largest_main = max(main_files, key=lambda f: f.stat().st_size)
                            print(f"✅ Found largest main file: {largest_main}")
                            return str(largest_main)
                    else:
                        # Fallback to partial files if no main files found
                        largest_video = max(video_files, key=lambda f: f.stat().st_size)
                        print(f"⚠️ Using partial file as fallback: {largest_video}")
                        return str(largest_video)
                else:
                    print(f"❌ No video files found in {output_dir}")
                    return None
            else:
                print(f"❌ Manim execution failed: {stderr.decode()}")
                return None
                
        except Exception as e:
            print(f"❌ Manim execution error: {e}")
            return None
        finally:
            # Clean up temporary file
            if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    @weave.op()
    def combine_video_with_audio_sync(self, video_path: str, audio_path: str, output_path: str) -> str:
        """Combine video with audio using FFmpeg for perfect sync"""
        
        print(f"\n🔗 AUDIO-VIDEO COMBINATION:")
        print(f"📹 Video path: {video_path}")
        print(f"🎵 Audio path: {audio_path}")
        print(f"📁 Output path: {output_path}")
        
        if not os.path.exists(video_path) or not os.path.exists(audio_path):
            print(f"❌ Missing input files")
            return video_path
        
        try:
            # Get video and audio durations
            def get_duration(file_path):
                cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', file_path]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.returncode == 0:
                    data = json.loads(result.stdout)
                    return float(data['format']['duration'])
                return 0
            
            video_duration = get_duration(video_path)
            audio_duration = get_duration(audio_path)
            
            print(f"⏱️ Video duration: {video_duration:.2f}s")
            print(f"🎵 Audio duration: {audio_duration:.2f}s")
            
            # Use the longer duration and loop/extend as needed
            if audio_duration > video_duration:
                # Extend video to match audio
                print(f"🔄 Extending video to match audio duration")
                cmd = [
                    'ffmpeg', '-y',
                    '-i', video_path,
                    '-i', audio_path,
                    '-filter_complex', f'[0:v]loop=loop=-1:size=1:start=0[v];[v]trim=0:{audio_duration}[vout]',
                    '-map', '[vout]',
                    '-map', '1:a',
                    '-c:v', 'libx264',
                    '-c:a', 'aac',
                    '-shortest',
                    output_path
                ]
            else:
                # Simple combination
                cmd = [
                    'ffmpeg', '-y',
                    '-i', video_path,
                    '-i', audio_path,
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-shortest',
                    output_path
                ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0 and os.path.exists(output_path):
                print(f"✅ Audio-video combination successful: {os.path.getsize(output_path)} bytes")
                return output_path
            else:
                print(f"❌ FFmpeg failed: {result.stderr}")
                return video_path
                
        except Exception as e:
            print(f"❌ Audio-video combination error: {e}")
            return video_path
    
    @weave.op()
    async def add_voice_to_clips(self, clip_paths: List[str], clips_config: List[Dict]) -> List[str]:
        """Add voice-over to video clips"""
        
        print(f"\n🎤 ADDING VOICE-OVER TO CLIPS...")
        final_clips = []
        
        for i, (video_path, clip_config) in enumerate(zip(clip_paths, clips_config)):
            print(f"\n🎬 Processing clip {i+1}/{len(clip_paths)}...")
            
            voice_text = clip_config.get('voice_over', '')
            if not voice_text:
                print(f"⚠️ No voice text for clip {i+1}, using video as-is")
                final_clips.append(video_path)
                continue
            
            try:
                # Generate audio
                audio_path = f"simple_clips/audio_{self.session_id}_{i}.wav"
                print(f"🎤 Generating voice for clip {i+1}...")
                
                voice_result = await generate_voice(voice_text, audio_path)
                
                if voice_result and os.path.exists(audio_path):
                    # Combine with video
                    final_path = f"simple_clips/final_{self.session_id}_{i}.mp4"
                    combined_path = self.combine_video_with_audio_sync(
                        video_path, audio_path, final_path
                    )
                    final_clips.append(combined_path)
                    print(f"✅ Clip {i+1} with voice completed: {combined_path}")
                else:
                    print(f"⚠️ Voice generation failed for clip {i+1}, using video as-is")
                    final_clips.append(video_path)
                    
            except Exception as e:
                print(f"❌ Voice processing failed for clip {i+1}: {e}")
                final_clips.append(video_path)
        
        return final_clips
    
    @weave.op()
    def stitch_videos_simple(self, clip_paths: List[str], output_path: str = None) -> str:
        """Stitch videos using simple concatenation"""
        
        print(f"\n🎬 STITCHING {len(clip_paths)} CLIPS...")
        
        # Set default output path with session ID if not provided
        if output_path is None:
            output_path = f"simple_summary_video_{self.session_id}.mp4"
        
        try:
            valid_clips = []
            
            # Load and validate clips
            for i, clip_path in enumerate(clip_paths):
                if os.path.exists(clip_path):
                    try:
                        clip = VideoFileClip(clip_path)
                        print(f"📹 Clip {i+1}: {clip.duration:.2f}s, {clip.size}")
                        valid_clips.append(clip)
                    except Exception as e:
                        print(f"⚠️ Failed to load clip {i+1}: {e}")
                else:
                    print(f"⚠️ Clip {i+1} not found: {clip_path}")
            
            if not valid_clips:
                print("❌ No valid clips to stitch")
                return ""
            
            # Add thank you clip
            try:
                print(f"🎬 Adding thank you clip...")
                thank_you_path = generate_veo_thank_you_clip()
                if thank_you_path and os.path.exists(thank_you_path):
                    thank_you_clip = VideoFileClip(thank_you_path)
                    valid_clips.append(thank_you_clip)
                    print(f"✅ Thank you clip added: {thank_you_clip.duration:.2f}s")
            except Exception as e:
                print(f"⚠️ Thank you clip failed: {e}")
            
            # Concatenate clips
            print(f"🔗 Concatenating {len(valid_clips)} clips...")
            final_video = concatenate_videoclips(valid_clips, method="chain")
            
            print(f"💾 Writing final video to: {output_path}")
            final_video.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp_audio.m4a',
                remove_temp=True
            )
            
            # Clean up
            for clip in valid_clips:
                clip.close()
            final_video.close()
            
            if os.path.exists(output_path):
                print(f"✅ Video stitching completed: {os.path.getsize(output_path)} bytes")
                return output_path
            else:
                print("❌ Final video not created")
                return ""
                
        except Exception as e:
            print(f"❌ Video stitching error: {e}")
            return ""

# Main generation functions
@weave.op()
async def generate_simple_summary_video(pdf_url: str, user_prompt: str = "") -> Dict[str, Any]:
    """Generate summary video using simple approach"""
    
    print(f"🚀 SIMPLE VIDEO GENERATION STARTED")
    print(f"📄 Processing PDF: {pdf_url}")
    print(f"📝 User prompt: {user_prompt}")
    
    try:
        # Import simple configuration generator
        from simple_config_gen import simple_generate_video_config_with_smart_docs
        
        # Generate clips configuration
        print(f"🎬 Generating clips configuration with simple approach...")
        clips_config = await simple_generate_video_config_with_smart_docs(pdf_url, user_prompt)
        
        if not clips_config:
            return {"error": "Failed to generate clips configuration"}
        
        print(f"🎯 Generated {len(clips_config)} clips configuration")
        
        # Initialize generator
        generator = SimpleVideoGenerator()
        
        # Generate Manim clips
        clips_result = await generator.generate_simple_manim_clips(clips_config)
        
        if clips_result["successful_clips"] == 0:
            return {"error": "No clips were generated successfully"}
        
        # Add voice-over
        final_clips = await generator.add_voice_to_clips(
            clips_result["clip_paths"], 
            clips_config[:clips_result["successful_clips"]]
        )
        
        # Stitch videos
        final_video_path = generator.stitch_videos_simple(final_clips)
        
        if not final_video_path:
            return {"error": "Video stitching failed"}
        
        # Return results
        result = {
            "video_path": final_video_path,
            "total_clips": len(clips_config),
            "successful_clips": clips_result["successful_clips"],
            "failed_clips": clips_result["failed_clips"],
            "success_rate": clips_result["successful_clips"] / len(clips_config),
            "pdf_url": pdf_url,
            "generation_method": "simple_approach",
            "clips_config": clips_config,
            "generation_details": clips_result["generation_details"]
        }
        
        print(f"✅ SIMPLE VIDEO GENERATION COMPLETED!")
        print(f"📁 Final video: {final_video_path}")
        print(f"📊 Success rate: {result['success_rate']:.1%}")
        
        return result
        
    except Exception as e:
        print(f"❌ Simple video generation failed: {e}")
        return {"error": str(e)}

@weave.op()
async def generate_simple_summary_video_upload(pdf_path: str, user_prompt: str = "") -> Dict[str, Any]:
    """Generate summary video from uploaded PDF using simple approach"""
    
    print(f"🚀 SIMPLE VIDEO GENERATION (UPLOAD) STARTED")
    print(f"📁 Processing uploaded PDF: {pdf_path}")
    
    try:
        # Convert PDF to base64 for processing
        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()
        
        pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
        
        # Use the same generation process but with base64 content
        from simple_config_gen import simple_generate_video_config_with_smart_docs_upload
        
        print(f"🎬 Generating clips configuration from upload with simple approach...")
        clips_config = await simple_generate_video_config_with_smart_docs_upload(pdf_base64, user_prompt)
        
        if not clips_config:
            return {"error": "Failed to generate clips configuration from upload"}
        
        print(f"🎯 Generated {len(clips_config)} clips configuration")
        
        # Use the same generation pipeline
        generator = SimpleVideoGenerator()
        clips_result = await generator.generate_simple_manim_clips(clips_config)
        
        if clips_result["successful_clips"] == 0:
            return {"error": "No clips were generated successfully"}
        
        final_clips = await generator.add_voice_to_clips(
            clips_result["clip_paths"], 
            clips_config[:clips_result["successful_clips"]]
        )
        
        final_video_path = generator.stitch_videos_simple(final_clips)
        
        if not final_video_path:
            return {"error": "Video stitching failed"}
        
        result = {
            "video_path": final_video_path,
            "total_clips": len(clips_config),
            "successful_clips": clips_result["successful_clips"],
            "failed_clips": clips_result["failed_clips"],
            "success_rate": clips_result["successful_clips"] / len(clips_config),
            "pdf_source": pdf_path,
            "generation_method": "simple_approach_upload",
            "clips_config": clips_config,
            "generation_details": clips_result["generation_details"]
        }
        
        print(f"✅ SIMPLE VIDEO GENERATION (UPLOAD) COMPLETED!")
        print(f"📁 Final video: {final_video_path}")
        print(f"📊 Success rate: {result['success_rate']:.1%}")
        
        return result
        
    except Exception as e:
        print(f"❌ Simple video generation (upload) failed: {e}")
        return {"error": str(e)}

# Testing function
async def test_simple_generation():
    """Test the simple generation approach"""
    
    test_url = "https://arxiv.org/pdf/2310.06825.pdf"
    result = await generate_simple_summary_video(test_url, "Explain this research paper")
    
    if "error" not in result:
        print(f"🎉 Test successful! Video: {result['video_path']}")
    else:
        print(f"❌ Test failed: {result['error']}")

if __name__ == "__main__":
    asyncio.run(test_simple_generation())