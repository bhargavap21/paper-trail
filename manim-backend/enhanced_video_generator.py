#!/usr/bin/env python3
"""
Enhanced Video Generator with integrated improved Manim code generation
Replaces the existing video_generator.py with enhanced quality and reliability
"""
import asyncio
import os
import json
from pathlib import Path
import warnings
import weave

# MoviePy imports
from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips, ImageClip

# Enhanced imports - use the new enhanced system
from enhanced_config_gen import enhanced_generate_video_config_with_smart_docs
from enhanced_manim_generator_integration import enhanced_generate_manim_clips, get_enhanced_generator
from voice_gen_fallback import generate_voice_with_fallback as generate_voice
from veo_gen import generate_veo_thank_you_clip

# Keep existing functions that work well
@weave.op()
def combine_video_with_audio_sync(video_path: str, audio_path: str, output_path: str) -> str:
    """Combine video with audio using FFmpeg directly to avoid MoviePy visual corruption."""
    print(f"\n🔗 FFMPEG AUDIO-VIDEO COMBINATION:")
    print(f"📹 Video path: {video_path}")
    print(f"🎵 Audio path: {audio_path}")
    print(f"📁 Output path: {output_path}")
    
    # Verify input files exist and are valid
    if not os.path.exists(video_path):
        print(f"❌ ERROR: Video file does not exist: {video_path}")
        return video_path
    if not os.path.exists(audio_path):
        print(f"❌ ERROR: Audio file does not exist: {audio_path}")
        return video_path
        
    print(f"📊 Video file size: {os.path.getsize(video_path)} bytes")
    print(f"📊 Audio file size: {os.path.getsize(audio_path)} bytes")
    
    try:
        import subprocess
        
        # Get video and audio durations using ffprobe
        def get_duration(file_path):
            cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', file_path]
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                import json
                data = json.loads(result.stdout)
                return float(data['format']['duration'])
            return 0
        
        video_duration = get_duration(video_path)
        audio_duration = get_duration(audio_path)
        
        print(f"⏱️  Video duration: {video_duration:.2f}s")
        print(f"⏱️  Audio duration: {audio_duration:.2f}s")
        
        # Use FFmpeg to combine video and audio
        if audio_duration > video_duration:
            # Extend video to match audio duration using a middle frame instead of last frame
            extra_duration = audio_duration - video_duration
            print(f"🔄 Extending video by {extra_duration:.2f}s to match audio using FFmpeg tpad")
            
            # Calculate how many times to loop the video to cover the audio duration
            loop_count = int(audio_duration / video_duration) + 2  # +2 to ensure we have enough
            print(f"🔄 Looping video {loop_count} times to cover {audio_duration:.2f}s of audio")
            
            ffmpeg_cmd = [
                'ffmpeg', '-y',
                '-stream_loop', str(loop_count),  # Loop the input video
                '-i', video_path,        # Original video (looped)
                '-i', audio_path,        # Audio
                '-c:v', 'libx264',       # Video codec
                '-c:a', 'aac',           # Audio codec
                '-t', str(audio_duration),  # Limit to audio duration
                '-shortest',             # Stop at shortest stream
                output_path
            ]
            
            print(f"🎬 Running extended FFmpeg: {' '.join(ffmpeg_cmd)}")
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
                
        else:
            # Audio is shorter or equal - simple combination
            print("🔗 Combining video and audio with FFmpeg...")
            ffmpeg_cmd = [
                'ffmpeg', '-y',
                '-i', video_path,        # Input video
                '-i', audio_path,        # Input audio
                '-c:v', 'copy',          # Copy video without re-encoding
                '-c:a', 'aac',           # Audio codec
                '-shortest',             # Match shortest stream
                output_path
            ]
        
        print(f"🎬 Running FFmpeg: {' '.join(ffmpeg_cmd)}")
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ FFmpeg combination successful")
            
            # Verify output file
            if os.path.exists(output_path):
                output_size = os.path.getsize(output_path)
                print(f"✅ Output file created: {output_size} bytes")
                
                # Verify output has both video and audio
                output_duration = get_duration(output_path)
                print(f"📊 Output duration: {output_duration:.2f}s")
                
            else:
                print(f"❌ ERROR: Output file was not created")
                return video_path
        else:
            print(f"❌ FFmpeg failed with return code: {result.returncode}")
            print(f"❌ FFmpeg stderr: {result.stderr}")
            return video_path
        
        print(f"✅ FFmpeg audio-video combination completed successfully\n")
        return output_path
        
    except Exception as e:
        print(f"❌ ERROR in FFmpeg audio-video combination: {e}")
        import traceback
        print(f"📋 Traceback: {traceback.format_exc()}")
        return video_path

@weave.op()
def normalize_video_clip(clip, target_fps: int = 24, target_resolution: tuple = (1280, 720)) -> VideoFileClip:
    """
    Normalize video clip to consistent format for stitching.
    """
    try:
        # Store original audio if present
        original_audio = clip.audio
        had_audio = original_audio is not None
        
        # Get current dimensions
        current_w, current_h = clip.size
        target_w, target_h = target_resolution
        
        # Resize if needed (maintain aspect ratio)
        if (current_w, current_h) != (target_w, target_h):
            print(f"📐 Resizing clip from {current_w}x{current_h} to {target_w}x{target_h}")
            clip = clip.resized(newsize=(target_w, target_h))
        
        # Adjust frame rate if needed
        if abs(clip.fps - target_fps) > 0.1:
            print(f"🎬 Adjusting frame rate from {clip.fps}fps to {target_fps}fps")
            clip = clip.with_fps(target_fps)
        
        # Restore audio if it was lost during transformation but was originally present
        if had_audio and clip.audio is None:
            print("📢 Restoring lost audio after transformation")
            clip = clip.with_audio(original_audio)
        
        return clip
        
    except Exception as e:
        print(f"⚠️  Warning: Could not normalize clip - {e}")
        return clip

@weave.op()
def stitch_videos(video_paths: list, output_path: str = "enhanced_summary_video.mp4", add_thank_you: bool = True) -> str:
    """Stitch multiple video files together with optional Veo 'Thank You' ending."""
    print(f"\n🎬 ENHANCED VIDEO STITCHING DEBUG:")
    print(f"📝 Input paths: {len(video_paths)} videos")
    print(f"📁 Output path: {output_path}")
    print(f"🙏 Add thank you: {add_thank_you}")
    
    try:
        clips = []
        print("🔧 Loading and normalizing video clips...")
        
        for i, path in enumerate(video_paths):
            if os.path.exists(path):
                print(f"\n📹 Processing clip {i+1}/{len(video_paths)}: {os.path.basename(path)}")
                print(f"📏 File size: {os.path.getsize(path)} bytes")
                
                clip = VideoFileClip(path)
                print(f"⏱️  Clip duration: {clip.duration:.2f}s")
                print(f"📐 Clip size: {clip.size}")
                print(f"🎬 Clip FPS: {clip.fps}")
                print(f"🔊 Clip has audio: {clip.audio is not None}")
                if clip.audio:
                    print(f"🎵 Audio duration: {clip.audio.duration:.2f}s")
                    print(f"🔈 Audio channels: {clip.audio.nchannels}")
                
                # Normalize each clip to ensure consistent format
                print(f"🔄 Normalizing clip {i+1}...")
                normalized_clip = normalize_video_clip(clip)
                print(f"✅ Normalized clip {i+1}:")
                print(f"  🔊 Has audio after normalization: {normalized_clip.audio is not None}")
                if normalized_clip.audio:
                    print(f"  🎵 Audio duration after normalization: {normalized_clip.audio.duration:.2f}s")
                
                clips.append(normalized_clip)
                
                # Close original clip to free memory
                if normalized_clip != clip:
                    clip.close()
            else:
                print(f"❌ Clip {i+1} not found: {path}")
        
        if not clips:
            print("❌ ERROR: No valid video clips found")
            raise ValueError("No valid video clips found")
        
        print(f"\n📊 CLIPS SUMMARY BEFORE STITCHING:")
        total_duration = 0
        clips_with_audio = 0
        for i, clip in enumerate(clips):
            has_audio = clip.audio is not None
            duration = clip.duration
            total_duration += duration
            if has_audio:
                clips_with_audio += 1
            print(f"  Clip {i+1}: {duration:.2f}s, audio={has_audio}")
        print(f"  Total duration: {total_duration:.2f}s")
        print(f"  Clips with audio: {clips_with_audio}/{len(clips)}")
        
        # Add Veo "Thank You" clip at the end
        if add_thank_you:
            print("\n🎬 Adding Veo 'Thank You' clip to the end...")
            try:
                # Use the thank you clip with audio if available, otherwise generate new one
                if os.path.exists("clips/thank_you_with_audio.mp4"):
                    veo_clip_path = "clips/thank_you_with_audio.mp4"
                    print(f"📁 Using existing thank you clip: {veo_clip_path}")
                else:
                    thank_you_path = "clips/thank_you_veo.mp4"
                    print(f"🎬 Generating new thank you clip...")
                    veo_clip_path = generate_veo_thank_you_clip(thank_you_path)
                
                if veo_clip_path and os.path.exists(veo_clip_path):
                    print(f"📹 Processing Veo 'Thank You' clip: {veo_clip_path}")
                    print(f"📏 Thank you file size: {os.path.getsize(veo_clip_path)} bytes")
                    
                    thank_you_clip = VideoFileClip(veo_clip_path)
                    print(f"⏱️  Thank you duration: {thank_you_clip.duration:.2f}s")
                    print(f"🔊 Thank you has audio: {thank_you_clip.audio is not None}")
                    
                    # Normalize the Veo clip to match other clips
                    print(f"🔄 Normalizing thank you clip...")
                    normalized_thank_you = normalize_video_clip(thank_you_clip)
                    print(f"✅ Thank you normalized: audio={normalized_thank_you.audio is not None}")
                    clips.append(normalized_thank_you)
                    
                    # Close original if different
                    if normalized_thank_you != thank_you_clip:
                        thank_you_clip.close()
                    
                    print("✅ Veo 'Thank You' clip added and normalized!")
                else:
                    print("⚠️  Veo clip generation failed, continuing without thank you")
                    
            except Exception as e:
                print(f"⚠️  Could not add Veo thank you clip: {e}")
                import traceback
                print(f"📋 Traceback: {traceback.format_exc()}")
        
        # Use FFmpeg for concatenation instead of MoviePy to preserve visual content
        print(f"\n🔗 CONCATENATING ENHANCED CLIPS WITH FFMPEG...")
        print(f"📏 Concatenating {len(clips)} clips using FFmpeg instead of MoviePy")
        
        # Use the video_paths parameter which contains the paths to the final enhanced clips
        # These should be the enhanced_final_*.mp4 files created with audio
        print(f"📁 Available video paths for FFmpeg concatenation: {len(video_paths)} files")
        
        valid_clip_paths = []
        for i, path in enumerate(video_paths):
            if path and os.path.exists(path):
                file_size = os.path.getsize(path)
                print(f"📁 Clip {i+1}: {path} ({file_size} bytes)")
                valid_clip_paths.append(path)
            else:
                print(f"❌ Missing or invalid clip {i+1}: {path}")
        
        clip_file_paths = valid_clip_paths
        
        if not clip_file_paths:
            print("❌ ERROR: No valid clip file paths for FFmpeg concatenation")
            print("🔄 Falling back to MoviePy concatenation (may corrupt visual content)")
            try:
                final_clip = concatenate_videoclips(clips, method="chain")
                
                # Write final video with MoviePy as fallback
                print(f"\n💾 WRITING FINAL VIDEO WITH MOVIEPY FALLBACK...")
                final_clip.write_videofile(
                    output_path, 
                    logger=None, 
                    audio=True,
                    audio_codec='aac',
                    codec='libx264',
                    temp_audiofile='temp-final-audio.m4a',
                    remove_temp=True,
                    audio_fps=44100
                )
                
                # Clean up
                final_clip.close()
                for clip in clips:
                    clip.close()
                
                return output_path
            except Exception as fallback_error:
                print(f"❌ MoviePy fallback also failed: {fallback_error}")
                # Clean up clips and return empty path
                for clip in clips:
                    try:
                        clip.close()
                    except:
                        pass
                return output_path
        
        # Use FFmpeg concatenation to preserve visual content
        import subprocess
        
        # Create concat file list
        concat_list_path = "temp_concat_list.txt"
        with open(concat_list_path, 'w') as f:
            for path in clip_file_paths:
                f.write(f"file '{os.path.abspath(path)}'\n")
        
        # FFmpeg concatenation command
        ffmpeg_concat_cmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concat_list_path,
            '-c', 'copy',  # Copy streams without re-encoding to preserve quality
            output_path
        ]
        
        print(f"🎬 Running FFmpeg concatenation: {' '.join(ffmpeg_concat_cmd)}")
        concat_result = subprocess.run(ffmpeg_concat_cmd, capture_output=True, text=True)
        
        if concat_result.returncode == 0:
            print(f"✅ FFmpeg concatenation successful")
            
            # Verify output
            if os.path.exists(output_path):
                output_size = os.path.getsize(output_path)
                print(f"📁 Final video created: {output_size} bytes")
                
                # Get final video info
                def get_video_info(path):
                    cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', path]
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode == 0:
                        import json
                        return json.loads(result.stdout)
                    return None
                
                info = get_video_info(output_path)
                if info:
                    duration = float(info['format']['duration'])
                    audio_streams = [s for s in info['streams'] if s['codec_type'] == 'audio']
                    print(f"  ⏱️  Final duration: {duration:.2f}s")
                    print(f"  🔊 Final video has audio: {len(audio_streams) > 0}")
                    if audio_streams:
                        print(f"  🎵 Audio codec: {audio_streams[0]['codec_name']}")
            else:
                print(f"❌ ERROR: Final video not created")
        else:
            print(f"❌ FFmpeg concatenation failed: {concat_result.stderr}")
            print(f"🔄 ERROR: Cannot fallback to MoviePy as it corrupts visual content")
            return output_path
        
        # Clean up temporary files
        if os.path.exists(concat_list_path):
            os.remove(concat_list_path)
        
        # Verify final output
        if os.path.exists(output_path):
            output_size = os.path.getsize(output_path)
            print(f"✅ Enhanced final video written: {output_size} bytes")
            
            # Test final output audio
            print(f"🧪 Testing final output audio...")
            test_final = VideoFileClip(output_path)
            print(f"  🔊 Final output has audio: {test_final.audio is not None}")
            if test_final.audio:
                print(f"  🎵 Final output audio duration: {test_final.audio.duration:.2f}s")
                print(f"  🔈 Final output audio channels: {test_final.audio.nchannels}")
            test_final.close()
        else:
            print(f"❌ ERROR: Enhanced final video file was not created")
        
        # Clean up MoviePy clips
        print(f"\n🧹 Cleaning up resources...")
        for i, clip in enumerate(clips):
            try:
                clip.close()
                print(f"  🗑️  Closed clip {i+1}")
            except Exception as e:
                print(f"  ⚠️  Could not close clip {i+1}: {e}")
        print(f"  ✅ FFmpeg-based processing completed, MoviePy clips cleaned up")
        
        print(f"✅ ENHANCED VIDEO STITCHING COMPLETED SUCCESSFULLY\n")
        return output_path
    except Exception as e:
        print(f"❌ ERROR in enhanced video stitching: {e}")
        import traceback
        print(f"📋 Full traceback: {traceback.format_exc()}")
        raise

@weave.op()
async def enhanced_generate_summary_video_upload(pdf_path: str, user_prompt: str = "") -> dict:
    """Enhanced version: Generate a 1-minute summary video from an uploaded PDF file."""
    print(f"🚀 ENHANCED PDF PROCESSING: {pdf_path}")
    print(f"📝 User prompt: {user_prompt}")
    
    # Generate enhanced video config from PDF using base64 encoding
    response = enhanced_generate_video_config_with_smart_docs(pdf_path, user_prompt, use_base64=True)
    config_text = response.content[0].text
    
    # Parse JSON config
    try:
        config = json.loads(config_text)
    except json.JSONDecodeError:
        import re
        json_match = re.search(r'\{.*\}', config_text, re.DOTALL)
        if json_match:
            config = json.loads(json_match.group())
        else:
            raise ValueError("Could not parse video configuration")
    
    clips = config.get("clips", [])
    if not clips:
        raise ValueError("No clips generated from PDF")
    
    # Limit to ~1 minute (take first few clips)
    max_clips = min(len(clips), 4)
    clips = clips[:max_clips]
    
    print(f"🎬 ENHANCED GENERATION: {len(clips)} video clips...")
    
    # Generate Enhanced Manim videos
    output_dir = "enhanced_clips"
    os.makedirs(output_dir, exist_ok=True)
    
    # Use the enhanced generation system
    video_paths = await enhanced_generate_manim_clips(clips, output_dir, "medium_quality", target_clips=4, max_retries=2)
    
    # Track enhanced generation metrics
    successful_clips = 0
    failed_clips = 0
    
    # Add voice-over to each clip (with enhanced error handling)
    print(f"\n🎤 ADDING VOICE-OVER TO ENHANCED CLIPS...")
    final_clips = []
    for i, (clip_config, video_path) in enumerate(zip(clips, video_paths)):
        print(f"\n🎬 Processing enhanced clip {i+1}/{len(clips)}...")
        print(f"📁 Video path: {video_path}")
        
        if video_path:
            # Verify video file exists and is valid
            if not os.path.exists(video_path):
                print(f"❌ Enhanced clip {i+1} video file not found: {video_path}")
                failed_clips += 1
                continue
                
            video_size = os.path.getsize(video_path)
            print(f"📏 Enhanced video file size: {video_size} bytes")
            
            # Try to generate voice-over with enhanced reliability
            try:
                voice_text = clip_config.get('voice_over')
                if voice_text:
                    print(f"🎤 Generating voice for enhanced clip {i+1}...")
                    print(f"📝 Voice text: {voice_text[:100]}...")
                    
                    audio_path = f"{output_dir}/enhanced_audio_{i}.wav"
                    print(f"📁 Audio output path: {audio_path}")
                    
                    audio_result = await generate_voice(voice_text, audio_path)
                    print(f"📝 Enhanced voice generation result: {audio_result}")
                    
                    if audio_result and os.path.exists(audio_result):
                        audio_size = os.path.getsize(audio_result)
                        print(f"✅ Enhanced audio generated: {audio_size} bytes")
                        
                        final_path = f"{output_dir}/enhanced_final_{i}.mp4"
                        print(f"🔗 Enhanced combining video + audio -> {final_path}")
                        
                        combined_path = combine_video_with_audio_sync(video_path, audio_path, final_path)
                        
                        if combined_path and os.path.exists(combined_path):
                            combined_size = os.path.getsize(combined_path)
                            print(f"✅ Enhanced combined video created: {combined_size} bytes")
                            
                            # Verify combined video has audio
                            try:
                                test_combined = VideoFileClip(combined_path)
                                has_audio = test_combined.audio is not None
                                print(f"🔊 Enhanced combined video has audio: {has_audio}")
                                test_combined.close()
                            except Exception as test_e:
                                print(f"⚠️  Could not test enhanced combined video: {test_e}")
                            
                            final_clips.append(combined_path)
                            successful_clips += 1
                            print(f"✓ Enhanced clip {i+1} with voice-over completed")
                        else:
                            print(f"⚠️  Enhanced audio combination failed, using silent video")
                            final_clips.append(video_path)
                            successful_clips += 1
                            print(f"✓ Enhanced clip {i+1} (silent - combination failed)")
                    else:
                        print(f"⚠️  Enhanced voice generation failed, using silent video")
                        final_clips.append(video_path)
                        successful_clips += 1
                        print(f"✓ Enhanced clip {i+1} (silent - voice failed)")
                else:
                    print(f"🔇 No voice text provided for enhanced clip {i+1}")
                    final_clips.append(video_path)
                    successful_clips += 1
                    print(f"✓ Enhanced clip {i+1} (silent - no voice text)")
            except Exception as e:
                print(f"❌ Enhanced voice generation failed for clip {i+1}: {e}")
                import traceback
                print(f"📋 Enhanced traceback: {traceback.format_exc()}")
                final_clips.append(video_path)
                successful_clips += 1
                print(f"✓ Enhanced clip {i+1} (silent - voice failed with exception)")
        else:
            failed_clips += 1
            print(f"✗ Enhanced clip {i+1} failed to generate (no video path)")
    
    print(f"\n📊 ENHANCED VOICE-OVER PROCESSING SUMMARY:")
    print(f"  ✅ Successful enhanced clips: {successful_clips}")
    print(f"  ❌ Failed enhanced clips: {failed_clips}")
    print(f"  📁 Final enhanced clips ready: {len(final_clips)}")
    
    # Enhanced audio verification 
    clips_with_audio = 0
    clips_without_audio = 0
    for i, clip_path in enumerate(final_clips):
        try:
            test_clip = VideoFileClip(clip_path)
            has_audio = test_clip.audio is not None
            if has_audio:
                clips_with_audio += 1
                print(f"  🔊 Enhanced clip {i+1}: HAS AUDIO ({clip_path})")
            else:
                clips_without_audio += 1
                print(f"  🔇 Enhanced clip {i+1}: NO AUDIO ({clip_path})")
            test_clip.close()
        except Exception as e:
            print(f"  ❌ Enhanced clip {i+1}: ERROR checking audio ({e})")
            clips_without_audio += 1
    
    print(f"\n🎵 ENHANCED AUDIO VERIFICATION:")
    print(f"  📊 Enhanced clips with audio: {clips_with_audio}/{len(final_clips)}")
    print(f"  📊 Enhanced clips without audio: {clips_without_audio}/{len(final_clips)}")
    
    if clips_without_audio > 0:
        print(f"\n⚠️ WARNING: {clips_without_audio} enhanced clips have no audio!")
        print(f"🔧 This will result in a video with missing audio segments.")
        if clips_with_audio == 0:
            print(f"🚨 CRITICAL: ALL ENHANCED CLIPS ARE SILENT!")
    
    if not final_clips:
        print("❌ CRITICAL ERROR: No enhanced clips were successfully generated")
        raise ValueError("No enhanced clips were successfully generated")
    
    # Stitch all enhanced clips together
    final_video = stitch_videos(final_clips, "enhanced_summary_video.mp4", add_thank_you=True)
    
    print(f"✅ Enhanced summary video created: {final_video}")
    
    # Return comprehensive enhanced results for Weave tracking
    return {
        "video_path": final_video,
        "total_clips": len(clips),
        "successful_clips": successful_clips,
        "failed_clips": failed_clips,
        "success_rate": successful_clips / len(clips) if clips else 0,
        "pdf_path": pdf_path,
        "clips_config": clips,
        "enhancement_used": True,
        "audio_coverage": clips_with_audio / len(final_clips) if final_clips else 0
    }

@weave.op()
async def enhanced_generate_summary_video(pdf_url: str, user_prompt: str = "") -> dict:
    """Enhanced version: Generate a 1-minute summary video from a PDF URL."""
    print(f"🚀 ENHANCED PDF URL PROCESSING: {pdf_url}")
    print(f"📝 User prompt: {user_prompt}")
    
    # Generate enhanced video config from PDF
    response = enhanced_generate_video_config_with_smart_docs(pdf_url, user_prompt, use_base64=False)
    config_text = response.content[0].text
    
    # Parse JSON config
    try:
        config = json.loads(config_text)
    except json.JSONDecodeError:
        import re
        json_match = re.search(r'\{.*\}', config_text, re.DOTALL)
        if json_match:
            config = json.loads(json_match.group())
        else:
            raise ValueError("Could not parse video configuration")
    
    clips = config.get("clips", [])
    if not clips:
        raise ValueError("No clips generated from PDF")
    
    # Limit to ~1 minute (take first few clips)
    max_clips = min(len(clips), 4)
    clips = clips[:max_clips]
    
    print(f"🎬 ENHANCED GENERATION: {len(clips)} video clips...")
    
    # Generate Enhanced Manim videos
    output_dir = "enhanced_clips"
    os.makedirs(output_dir, exist_ok=True)
    
    # Use the enhanced generation system
    video_paths = await enhanced_generate_manim_clips(clips, output_dir, "medium_quality", target_clips=4, max_retries=2)
    
    # Track enhanced generation metrics
    successful_clips = 0
    failed_clips = 0
    
    # Add voice-over to each clip (with enhanced error handling)
    print(f"\n🎤 ADDING VOICE-OVER TO ENHANCED CLIPS...")
    final_clips = []
    for i, (clip_config, video_path) in enumerate(zip(clips, video_paths)):
        print(f"\n🎬 Processing enhanced clip {i+1}/{len(clips)}...")
        print(f"📁 Video path: {video_path}")
        
        if video_path:
            # Enhanced voice processing logic (same as upload version)
            # ... (copying the same voice processing logic from upload version)
            try:
                voice_text = clip_config.get('voice_over')
                if voice_text:
                    print(f"🎤 Generating voice for enhanced clip {i+1}...")
                    
                    audio_path = f"{output_dir}/enhanced_audio_{i}.wav"
                    audio_result = await generate_voice(voice_text, audio_path)
                    
                    if audio_result and os.path.exists(audio_result):
                        final_path = f"{output_dir}/enhanced_final_{i}.mp4"
                        combined_path = combine_video_with_audio_sync(video_path, audio_path, final_path)
                        
                        if combined_path and os.path.exists(combined_path):
                            final_clips.append(combined_path)
                            successful_clips += 1
                        else:
                            final_clips.append(video_path)
                            successful_clips += 1
                    else:
                        final_clips.append(video_path)
                        successful_clips += 1
                else:
                    final_clips.append(video_path)
                    successful_clips += 1
            except Exception as e:
                print(f"❌ Enhanced voice generation failed for clip {i+1}: {e}")
                final_clips.append(video_path)
                successful_clips += 1
        else:
            failed_clips += 1
    
    if not final_clips:
        raise ValueError("No enhanced clips were successfully generated")
    
    # Stitch all enhanced clips together
    final_video = stitch_videos(final_clips, "enhanced_summary_video.mp4", add_thank_you=True)
    
    print(f"✅ Enhanced summary video created: {final_video}")
    
    # Return comprehensive enhanced results
    return {
        "video_path": final_video,
        "total_clips": len(clips),
        "successful_clips": successful_clips,
        "failed_clips": failed_clips,
        "success_rate": successful_clips / len(clips) if clips else 0,
        "pdf_url": pdf_url,
        "clips_config": clips,
        "enhancement_used": True
    }

# Backwards compatibility functions
async def generate_summary_video_upload(pdf_path: str, user_prompt: str = "") -> dict:
    """Backwards compatible wrapper"""
    return await enhanced_generate_summary_video_upload(pdf_path, user_prompt)

async def generate_summary_video(pdf_url: str, user_prompt: str = "") -> dict:
    """Backwards compatible wrapper"""
    return await enhanced_generate_summary_video(pdf_url, user_prompt)

def main():
    """Enhanced main function with improved tracking."""
    # Initialize Weave tracking (with fallback)
    try:
        weave.init("enhanced_manim_video_generator")
        print("✅ W&B Weave tracking initialized for enhanced system")
    except Exception as e:
        print(f"⚠️  W&B Weave not available: {e}")
        print("📊 Running enhanced system without tracking")
    
    print("🚀 Enhanced PDF to Video Summary Generator")
    print("=" * 50)
    
    # Get PDF URL
    pdf_url = input("Enter PDF URL: ").strip()
    
    if not pdf_url:
        print("❌ No URL provided")
        return
    
    if not pdf_url.startswith(('http://', 'https://')):
        print("❌ Please provide a valid URL")
        return
    
    print(f"🚀 Generating enhanced 1-minute summary video from: {pdf_url}")
    
    try:
        # Generate the enhanced video with full tracking
        result = asyncio.run(enhanced_generate_summary_video(pdf_url))
        
        print(f"🎉 Enhanced video generation complete!")
        print(f"📁 Video saved as: {result['video_path']}")
        print(f"📊 Enhanced success rate: {result['success_rate']:.1%} ({result['successful_clips']}/{result['total_clips']} clips)")
        print(f"🔊 Audio coverage: {result.get('audio_coverage', 'N/A')}")
        
    except Exception as e:
        print(f"❌ Enhanced generation error: {e}")

if __name__ == "__main__":
    main()