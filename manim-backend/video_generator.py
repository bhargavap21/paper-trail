import asyncio
import os
import json
from pathlib import Path
import warnings
import weave

# Set FFmpeg path for MoviePy before importing
os.environ['IMAGEIO_FFMPEG_EXE'] = '/opt/homebrew/bin/ffmpeg'

# MoviePy imports
from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips, ImageClip

# Local imports
from config_gen import generate_video_config
from manim_generator import generate_manim_clips
from voice_gen_fallback import generate_voice_with_fallback as generate_voice
from veo_gen import generate_veo_thank_you_clip


@weave.op()
def combine_video_with_audio_sync(video_path: str, audio_path: str, output_path: str) -> str:
    """Combine video with audio using MoviePy with extensive logging."""
    print(f"\n🔗 AUDIO-VIDEO COMBINATION DEBUG:")
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
        print("🎬 Loading video clip...")
        video = VideoFileClip(video_path)
        print(f"✅ Video loaded: {video.duration:.2f}s, {video.size}, {video.fps}fps")
        print(f"🔊 Video has audio: {video.audio is not None}")
        
        print("🎵 Loading audio clip...")
        audio = AudioFileClip(audio_path)
        print(f"✅ Audio loaded: {audio.duration:.2f}s")
        print(f"📊 Audio properties: {audio.fps}Hz, {audio.nchannels} channels")
        
        # Check duration mismatch
        duration_diff = abs(audio.duration - video.duration)
        print(f"⏱️  Duration difference: {duration_diff:.2f}s")
        
        # If audio is longer than video, extend video
        if audio.duration > video.duration:
            extra_duration = audio.duration - video.duration
            print(f"🔄 Extending video by {extra_duration:.2f}s to match audio")
            last_frame = video.get_frame(video.duration - 0.01)
            still_clip = ImageClip(last_frame, duration=(extra_duration + 0.1))
            extended_video = concatenate_videoclips([video, still_clip])
            print(f"✅ Video extended to {extended_video.duration:.2f}s")
            final_video = extended_video.with_audio(audio)
        else:
            print("🔗 Attaching audio to video...")
            final_video = video.with_audio(audio)
        
        print(f"✅ Final video created: {final_video.duration:.2f}s")
        print(f"🔊 Final video has audio: {final_video.audio is not None}")
        
        print(f"💾 Writing video file to: {output_path}")
        final_video.write_videofile(
            output_path, 
            logger=None, 
            audio=True,  # Explicitly enable audio
            audio_codec='aac',  # Specify audio codec
            codec='libx264',  # Specify video codec
            temp_audiofile='temp-audio.m4a',  # Specify temp audio file
            remove_temp=True
        )
        
        # Verify output file
        if os.path.exists(output_path):
            output_size = os.path.getsize(output_path)
            print(f"✅ Output file created: {output_size} bytes")
            
            # Test if output has audio
            test_clip = VideoFileClip(output_path)
            print(f"🔊 Output file has audio: {test_clip.audio is not None}")
            if test_clip.audio:
                print(f"📊 Output audio duration: {test_clip.audio.duration:.2f}s")
            test_clip.close()
        else:
            print(f"❌ ERROR: Output file was not created")
        
        # Clean up
        print("🧹 Cleaning up resources...")
        video.close()
        audio.close()
        final_video.close()
        if 'extended_video' in locals():
            extended_video.close()
        
        print(f"✅ Audio-video combination completed successfully\n")
        return output_path
    except Exception as e:
        print(f"❌ ERROR in audio-video combination: {e}")
        import traceback
        print(f"📋 Traceback: {traceback.format_exc()}")
        return video_path


@weave.op()
def normalize_video_clip(clip, target_fps: int = 24, target_resolution: tuple = (1280, 720)) -> VideoFileClip:
    """
    Normalize video clip to consistent format for stitching.
    
    Args:
        clip: VideoFileClip to normalize
        target_fps: Target frame rate (Veo uses 24fps)
        target_resolution: Target resolution (width, height) - Veo uses 720p
    
    Returns:
        Normalized VideoFileClip
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
        if abs(clip.fps - target_fps) > 0.1:  # Small tolerance for floating point
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
def stitch_videos(video_paths: list, output_path: str = "summary_video.mp4", add_thank_you: bool = True) -> str:
    """Stitch multiple video files together with optional Veo 'Thank You' ending."""
    print(f"\n🎬 VIDEO STITCHING DEBUG:")
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
        
        # Final clips summary
        print(f"\n📊 FINAL CLIPS SUMMARY (including thank you):")
        final_total_duration = 0
        final_clips_with_audio = 0
        for i, clip in enumerate(clips):
            has_audio = clip.audio is not None
            duration = clip.duration
            final_total_duration += duration
            if has_audio:
                final_clips_with_audio += 1
            print(f"  Final clip {i+1}: {duration:.2f}s, audio={has_audio}")
        print(f"  Final total duration: {final_total_duration:.2f}s")
        print(f"  Final clips with audio: {final_clips_with_audio}/{len(clips)}")
        
        # Concatenate all clips (main content + thank you)
        print(f"\n🔗 CONCATENATING CLIPS...")
        print(f"📏 Concatenating {len(clips)} clips using 'chain' method")
        final_clip = concatenate_videoclips(clips, method="chain")
        print(f"✅ Concatenation complete:")
        print(f"  ⏱️  Final duration: {final_clip.duration:.2f}s")
        print(f"  🔊 Final clip has audio: {final_clip.audio is not None}")
        if final_clip.audio:
            print(f"  🎵 Final audio duration: {final_clip.audio.duration:.2f}s")
            print(f"  🔈 Final audio channels: {final_clip.audio.nchannels}")
        
        # Write final video with explicit audio settings
        print(f"\n💾 WRITING FINAL VIDEO...")
        print(f"📁 Output path: {output_path}")
        final_clip.write_videofile(
            output_path, 
            logger=None, 
            audio=True,  # Explicitly enable audio
            audio_codec='aac',  # Specify audio codec
            codec='libx264',  # Specify video codec
            temp_audiofile='temp-final-audio.m4a',  # Specify temp audio file
            remove_temp=True,
            audio_fps=44100  # Ensure consistent audio sample rate
        )
        
        # Verify final output
        if os.path.exists(output_path):
            output_size = os.path.getsize(output_path)
            print(f"✅ Final video written: {output_size} bytes")
            
            # Test final output audio
            print(f"🧪 Testing final output audio...")
            test_final = VideoFileClip(output_path)
            print(f"  🔊 Final output has audio: {test_final.audio is not None}")
            if test_final.audio:
                print(f"  🎵 Final output audio duration: {test_final.audio.duration:.2f}s")
                print(f"  🔈 Final output audio channels: {test_final.audio.nchannels}")
            test_final.close()
        else:
            print(f"❌ ERROR: Final video file was not created")
        
        # Clean up
        print(f"\n🧹 Cleaning up resources...")
        final_clip.close()
        for i, clip in enumerate(clips):
            print(f"  🗑️  Closing clip {i+1}")
            clip.close()
        
        print(f"✅ VIDEO STITCHING COMPLETED SUCCESSFULLY\n")
        return output_path
    except Exception as e:
        print(f"❌ ERROR in video stitching: {e}")
        import traceback
        print(f"📋 Full traceback: {traceback.format_exc()}")
        raise


@weave.op()
async def generate_summary_video_upload(pdf_path: str) -> dict:
    """Generate a 1-minute summary video from an uploaded PDF file."""
    print(f"📄 Processing uploaded PDF: {pdf_path}")
    
    # Generate video config from PDF using base64 encoding
    response = generate_video_config(pdf_path, use_base64=True)
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
    max_clips = min(len(clips), 4)  # Roughly 4 clips for 1 minute
    clips = clips[:max_clips]
    
    print(f"🎬 Generating {len(clips)} video clips...")
    
    # Generate Manim videos
    output_dir = "clips"
    os.makedirs(output_dir, exist_ok=True)
    
    video_paths = await generate_manim_clips(clips, output_dir, "medium_quality")
    
    # Track video generation metrics
    successful_clips = 0
    failed_clips = 0
    
    # Add voice-over to each clip (with fallback to silent video)
    print(f"\n🎤 ADDING VOICE-OVER TO CLIPS...")
    final_clips = []
    for i, (clip_config, video_path) in enumerate(zip(clips, video_paths)):
        print(f"\n🎬 Processing clip {i+1}/{len(clips)}...")
        print(f"📁 Video path: {video_path}")
        
        if video_path:
            # Verify video file exists and is valid
            if not os.path.exists(video_path):
                print(f"❌ Clip {i+1} video file not found: {video_path}")
                failed_clips += 1
                continue
                
            video_size = os.path.getsize(video_path)
            print(f"📏 Video file size: {video_size} bytes")
            
            # Try to generate voice-over, but continue if it fails
            try:
                voice_text = clip_config.get('voice_over')
                if voice_text:
                    print(f"🎤 Generating voice for clip {i+1}...")
                    print(f"📝 Voice text: {voice_text[:100]}...")
                    
                    audio_path = f"{output_dir}/audio_{i}.wav"
                    print(f"📁 Audio output path: {audio_path}")
                    
                    audio_result = await generate_voice(voice_text, audio_path)
                    print(f"📝 Voice generation result: {audio_result}")
                    
                    if audio_result and os.path.exists(audio_result):
                        audio_size = os.path.getsize(audio_result)
                        print(f"✅ Audio generated: {audio_size} bytes")
                        
                        final_path = f"{output_dir}/final_{i}.mp4"
                        print(f"🔗 Combining video + audio -> {final_path}")
                        
                        combined_path = combine_video_with_audio_sync(video_path, audio_path, final_path)
                        
                        if combined_path and os.path.exists(combined_path):
                            combined_size = os.path.getsize(combined_path)
                            print(f"✅ Combined video created: {combined_size} bytes")
                            
                            # Verify combined video has audio
                            try:
                                test_combined = VideoFileClip(combined_path)
                                has_audio = test_combined.audio is not None
                                print(f"🔊 Combined video has audio: {has_audio}")
                                test_combined.close()
                            except Exception as test_e:
                                print(f"⚠️  Could not test combined video: {test_e}")
                            
                            final_clips.append(combined_path)
                            successful_clips += 1
                            print(f"✓ Clip {i+1} with voice-over completed")
                        else:
                            print(f"⚠️  Audio combination failed, using silent video")
                            final_clips.append(video_path)
                            successful_clips += 1
                            print(f"✓ Clip {i+1} (silent - combination failed)")
                    else:
                        print(f"⚠️  Voice generation failed, using silent video")
                        final_clips.append(video_path)
                        successful_clips += 1
                        print(f"✓ Clip {i+1} (silent - voice failed)")
                else:
                    print(f"🔇 No voice text provided for clip {i+1}")
                    final_clips.append(video_path)
                    successful_clips += 1
                    print(f"✓ Clip {i+1} (silent - no voice text)")
            except Exception as e:
                print(f"❌ Voice generation failed for clip {i+1}: {e}")
                import traceback
                print(f"📋 Traceback: {traceback.format_exc()}")
                final_clips.append(video_path)
                successful_clips += 1
                print(f"✓ Clip {i+1} (silent - voice failed with exception)")
        else:
            failed_clips += 1
            print(f"✗ Clip {i+1} failed to generate (no video path)")
    
    print(f"\n📊 VOICE-OVER PROCESSING SUMMARY:")
    print(f"  ✅ Successful clips: {successful_clips}")
    print(f"  ❌ Failed clips: {failed_clips}")
    print(f"  📁 Final clips ready: {len(final_clips)}")
    
    # Critical audio verification 
    clips_with_audio = 0
    clips_without_audio = 0
    for i, clip_path in enumerate(final_clips):
        try:
            test_clip = VideoFileClip(clip_path)
            has_audio = test_clip.audio is not None
            if has_audio:
                clips_with_audio += 1
                print(f"  🔊 Clip {i+1}: HAS AUDIO ({clip_path})")
            else:
                clips_without_audio += 1
                print(f"  🔇 Clip {i+1}: NO AUDIO ({clip_path})")
            test_clip.close()
        except Exception as e:
            print(f"  ❌ Clip {i+1}: ERROR checking audio ({e})")
            clips_without_audio += 1
    
    print(f"\n🎵 AUDIO VERIFICATION:")
    print(f"  📊 Clips with audio: {clips_with_audio}/{len(final_clips)}")
    print(f"  📊 Clips without audio: {clips_without_audio}/{len(final_clips)}")
    
    if clips_without_audio > 0:
        print(f"\n⚠️ WARNING: {clips_without_audio} clips have no audio!")
        print(f"🔧 This will result in a video with missing audio segments.")
        if clips_with_audio == 0:
            print(f"🚨 CRITICAL: ALL CLIPS ARE SILENT!")
    
    if not final_clips:
        print("❌ CRITICAL ERROR: No clips were successfully generated")
        raise ValueError("No clips were successfully generated")
    
    # Stitch all clips together
    final_video = stitch_videos(final_clips, "summary_video.mp4", add_thank_you=True)
    
    print(f"✅ Summary video created: {final_video}")
    
    # Return comprehensive results for Weave tracking
    return {
        "video_path": final_video,
        "total_clips": len(clips),
        "successful_clips": successful_clips,
        "failed_clips": failed_clips,
        "success_rate": successful_clips / len(clips) if clips else 0,
        "pdf_path": pdf_path,
        "clips_config": clips
    }


@weave.op()
async def generate_summary_video(pdf_url: str) -> dict:
    """Generate a 1-minute summary video from a PDF URL."""
    print(f"📄 Processing PDF: {pdf_url}")
    
    # Generate video config from PDF
    response = generate_video_config(pdf_url, use_base64=False)
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
    max_clips = min(len(clips), 4)  # Roughly 4 clips for 1 minute
    clips = clips[:max_clips]
    
    print(f"🎬 Generating {len(clips)} video clips...")
    
    # Generate Manim videos
    output_dir = "clips"
    os.makedirs(output_dir, exist_ok=True)
    
    video_paths = await generate_manim_clips(clips, output_dir, "medium_quality")
    
    # Track video generation metrics
    successful_clips = 0
    failed_clips = 0
    
    # Add voice-over to each clip (with fallback to silent video)
    print(f"\n🎤 ADDING VOICE-OVER TO CLIPS...")
    final_clips = []
    for i, (clip_config, video_path) in enumerate(zip(clips, video_paths)):
        print(f"\n🎬 Processing clip {i+1}/{len(clips)}...")
        print(f"📁 Video path: {video_path}")
        
        if video_path:
            # Verify video file exists and is valid
            if not os.path.exists(video_path):
                print(f"❌ Clip {i+1} video file not found: {video_path}")
                failed_clips += 1
                continue
                
            video_size = os.path.getsize(video_path)
            print(f"📏 Video file size: {video_size} bytes")
            
            # Try to generate voice-over, but continue if it fails
            try:
                voice_text = clip_config.get('voice_over')
                if voice_text:
                    print(f"🎤 Generating voice for clip {i+1}...")
                    print(f"📝 Voice text: {voice_text[:100]}...")
                    
                    audio_path = f"{output_dir}/audio_{i}.wav"
                    print(f"📁 Audio output path: {audio_path}")
                    
                    audio_result = await generate_voice(voice_text, audio_path)
                    print(f"📝 Voice generation result: {audio_result}")
                    
                    if audio_result and os.path.exists(audio_result):
                        audio_size = os.path.getsize(audio_result)
                        print(f"✅ Audio generated: {audio_size} bytes")
                        
                        final_path = f"{output_dir}/final_{i}.mp4"
                        print(f"🔗 Combining video + audio -> {final_path}")
                        
                        combined_path = combine_video_with_audio_sync(video_path, audio_path, final_path)
                        
                        if combined_path and os.path.exists(combined_path):
                            combined_size = os.path.getsize(combined_path)
                            print(f"✅ Combined video created: {combined_size} bytes")
                            
                            # Verify combined video has audio
                            try:
                                test_combined = VideoFileClip(combined_path)
                                has_audio = test_combined.audio is not None
                                print(f"🔊 Combined video has audio: {has_audio}")
                                test_combined.close()
                            except Exception as test_e:
                                print(f"⚠️  Could not test combined video: {test_e}")
                            
                            final_clips.append(combined_path)
                            successful_clips += 1
                            print(f"✓ Clip {i+1} with voice-over completed")
                        else:
                            print(f"⚠️  Audio combination failed, using silent video")
                            final_clips.append(video_path)
                            successful_clips += 1
                            print(f"✓ Clip {i+1} (silent - combination failed)")
                    else:
                        print(f"⚠️  Voice generation failed, using silent video")
                        final_clips.append(video_path)
                        successful_clips += 1
                        print(f"✓ Clip {i+1} (silent - voice failed)")
                else:
                    print(f"🔇 No voice text provided for clip {i+1}")
                    final_clips.append(video_path)
                    successful_clips += 1
                    print(f"✓ Clip {i+1} (silent - no voice text)")
            except Exception as e:
                print(f"❌ Voice generation failed for clip {i+1}: {e}")
                import traceback
                print(f"📋 Traceback: {traceback.format_exc()}")
                final_clips.append(video_path)
                successful_clips += 1
                print(f"✓ Clip {i+1} (silent - voice failed with exception)")
        else:
            failed_clips += 1
            print(f"✗ Clip {i+1} failed to generate (no video path)")
    
    print(f"\n📊 VOICE-OVER PROCESSING SUMMARY:")
    print(f"  ✅ Successful clips: {successful_clips}")
    print(f"  ❌ Failed clips: {failed_clips}")
    print(f"  📁 Final clips ready: {len(final_clips)}")
    
    # Critical audio verification 
    clips_with_audio = 0
    clips_without_audio = 0
    for i, clip_path in enumerate(final_clips):
        try:
            test_clip = VideoFileClip(clip_path)
            has_audio = test_clip.audio is not None
            if has_audio:
                clips_with_audio += 1
                print(f"  🔊 Clip {i+1}: HAS AUDIO ({clip_path})")
            else:
                clips_without_audio += 1
                print(f"  🔇 Clip {i+1}: NO AUDIO ({clip_path})")
            test_clip.close()
        except Exception as e:
            print(f"  ❌ Clip {i+1}: ERROR checking audio ({e})")
            clips_without_audio += 1
    
    print(f"\n🎵 AUDIO VERIFICATION:")
    print(f"  📊 Clips with audio: {clips_with_audio}/{len(final_clips)}")
    print(f"  📊 Clips without audio: {clips_without_audio}/{len(final_clips)}")
    
    if clips_without_audio > 0:
        print(f"\n⚠️ WARNING: {clips_without_audio} clips have no audio!")
        print(f"🔧 This will result in a video with missing audio segments.")
        if clips_with_audio == 0:
            print(f"🚨 CRITICAL: ALL CLIPS ARE SILENT!")
    
    if not final_clips:
        print("❌ CRITICAL ERROR: No clips were successfully generated")
        raise ValueError("No clips were successfully generated")
    
    # Stitch all clips together
    final_video = stitch_videos(final_clips, "summary_video.mp4", add_thank_you=True)
    
    print(f"✅ Summary video created: {final_video}")
    
    # Return comprehensive results for Weave tracking
    return {
        "video_path": final_video,
        "total_clips": len(clips),
        "successful_clips": successful_clips,
        "failed_clips": failed_clips,
        "success_rate": successful_clips / len(clips) if clips else 0,
        "pdf_url": pdf_url,
        "clips_config": clips
    }


def main():
    """Simple main function - just ask for URL and generate video."""
    # Initialize Weave tracking (with fallback)
    try:
        weave.init("manim_video_generator")
        print("✅ W&B Weave tracking initialized")
    except Exception as e:
        print(f"⚠️  W&B Weave not available: {e}")
        print("📊 Running without tracking")
    
    print("🎬 PDF to Video Summary Generator")
    print("=" * 40)
    
    # Get PDF URL
    pdf_url = input("Enter PDF URL: ").strip()
    
    if not pdf_url:
        print("❌ No URL provided")
        return
    
    if not pdf_url.startswith(('http://', 'https://')):
        print("❌ Please provide a valid URL")
        return
    
    print(f"🚀 Generating 1-minute summary video from: {pdf_url}")
    
    try:
        # Generate the video with full tracking
        result = asyncio.run(generate_summary_video(pdf_url))
        
        print(f"🎉 Done! Video saved as: {result['video_path']}")
        print(f"📁 Full path: {os.path.abspath(result['video_path'])}")
        print(f"📊 Success rate: {result['success_rate']:.1%} ({result['successful_clips']}/{result['total_clips']} clips)")
        
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    main() 