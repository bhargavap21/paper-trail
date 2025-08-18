#!/usr/bin/env python3
"""
Improved Video Generator that integrates the enhanced Manim code generation
with the existing video processing pipeline.
"""
import asyncio
import os
import json
from pathlib import Path
import weave
from typing import List, Dict, Any

# Import existing components
import sys
sys.path.append('..')
sys.path.append('../manim-backend')
try:
    from video_generator import combine_video_with_audio_sync, stitch_videos, normalize_video_clip
    from enhanced_manim_generator import EnhancedManimGenerator
    from manim_generator import generate_manim_video
    from voice_gen_fallback import generate_voice_with_fallback as generate_voice
except ImportError as e:
    print(f"⚠️  Import warning: {e}")
    print("Running in standalone mode without existing pipeline integration")
    
    # Provide minimal implementations for testing
    async def generate_voice(text, path):
        print(f"🎤 Mock voice generation for: {text[:50]}...")
        return None
    
    def combine_video_with_audio_sync(video_path, audio_path, output_path):
        print(f"🔗 Mock audio-video sync: {video_path} + {audio_path} -> {output_path}")
        return video_path
    
    def stitch_videos(video_paths, output_path, add_thank_you=True):
        print(f"🎬 Mock video stitching: {len(video_paths)} videos -> {output_path}")
        return output_path
    
    async def generate_manim_video(code, output_dir, clip_name, quality):
        print(f"🎥 Mock Manim video generation: {clip_name}")
        # Create a mock video path
        mock_path = f"{output_dir}/{clip_name}.mp4"
        os.makedirs(output_dir, exist_ok=True)
        # Create an empty file as placeholder
        with open(mock_path, 'w') as f:
            f.write("mock video file")
        return mock_path

class ImprovedVideoGenerator:
    """Enhanced video generator using improved Manim code generation"""
    
    def __init__(self):
        self.enhanced_generator = EnhancedManimGenerator()
    
    @weave.op()
    async def generate_improved_manim_clips(
        self, 
        clips_config: List[Dict[str, Any]], 
        output_dir: str = "clips", 
        quality: str = "medium_quality",
        target_clips: int = 4
    ) -> List[str]:
        """
        Generate Manim clips using the enhanced code generation system
        """
        print(f"🚀 Starting improved clip generation for {len(clips_config)} clips")
        print(f"🎯 Target: {target_clips} clips with enhanced quality")
        
        os.makedirs(output_dir, exist_ok=True)
        video_paths = []
        generation_stats = {
            "total_attempts": 0,
            "successful_clips": 0,
            "failed_clips": 0,
            "average_attempts": 0
        }
        
        # Process each clip with enhanced generation
        for i, clip in enumerate(clips_config[:target_clips]):
            clip_name = f"enhanced_clip_{i:03d}"
            print(f"\n🎬 Generating enhanced clip {i+1}/{min(len(clips_config), target_clips)}: {clip_name}")
            
            # Extract the prompt or description for enhanced generation
            prompt = self._extract_clip_prompt(clip)
            print(f"📝 Extracted prompt: {prompt}")
            
            try:
                # Use enhanced code generation
                generation_result = await self.enhanced_generator.generate_enhanced_manim_code(prompt)
                generation_stats["total_attempts"] += generation_result["attempts"]
                
                if generation_result["success"]:
                    print(f"✅ Enhanced code generation successful!")
                    
                    # Generate video using the enhanced code
                    video_path = await generate_manim_video(
                        generation_result["code"], 
                        output_dir, 
                        clip_name, 
                        quality
                    )
                    
                    if video_path and os.path.exists(video_path):
                        video_paths.append(video_path)
                        generation_stats["successful_clips"] += 1
                        print(f"✅ Enhanced clip {i+1} generated successfully: {os.path.basename(video_path)}")
                    else:
                        print(f"❌ Video generation failed despite successful code generation")
                        generation_stats["failed_clips"] += 1
                else:
                    print(f"❌ Enhanced code generation failed after {generation_result['attempts']} attempts")
                    print(f"📋 Errors: {generation_result.get('validation_errors', [])} {generation_result.get('execution_errors', [])}")
                    generation_stats["failed_clips"] += 1
                    
            except Exception as e:
                print(f"❌ Exception during enhanced generation for clip {i+1}: {e}")
                generation_stats["failed_clips"] += 1
        
        # Calculate statistics
        if generation_stats["successful_clips"] > 0:
            generation_stats["average_attempts"] = generation_stats["total_attempts"] / generation_stats["successful_clips"]
        
        # Fill remaining slots with fallback if needed
        clips_needed = target_clips - len(video_paths)
        if clips_needed > 0:
            print(f"\n🔧 Need {clips_needed} more clips, generating fallback content...")
            fallback_paths = await self._generate_fallback_clips(clips_needed, output_dir, quality)
            video_paths.extend(fallback_paths)
        
        # Print final statistics
        print(f"\n📊 ENHANCED GENERATION STATISTICS:")
        print(f"  🎯 Target clips: {target_clips}")
        print(f"  ✅ Successful clips: {generation_stats['successful_clips']}")
        print(f"  ❌ Failed clips: {generation_stats['failed_clips']}")
        print(f"  📊 Average attempts per success: {generation_stats['average_attempts']:.1f}")
        print(f"  📁 Final video paths: {len(video_paths)}")
        
        return video_paths[:target_clips]
    
    def _extract_clip_prompt(self, clip: Dict[str, Any]) -> str:
        """Extract meaningful prompt from clip configuration"""
        
        # Check for existing voice-over text (good description)
        if clip.get('voice_over'):
            return clip['voice_over']
        
        # Check for description or title
        if clip.get('description'):
            return clip['description']
        
        if clip.get('title'):
            return f"Create animation about: {clip['title']}"
        
        # Try to extract intent from existing Manim code if present
        if clip.get('code'):
            code = clip['code']
            
            # Look for Text objects to understand content
            import re
            text_matches = re.findall(r'Text\s*\(\s*["\']([^"\']+)["\']', code)
            if text_matches:
                return f"Create educational animation about: {', '.join(text_matches[:3])}"
            
            # Look for mathematical content
            math_matches = re.findall(r'MathTex\s*\(\s*["\']([^"\']+)["\']', code)
            if math_matches:
                return f"Create mathematical visualization of: {math_matches[0]}"
            
            # Look for geometric shapes
            shape_patterns = ['Circle', 'Square', 'Triangle', 'Line', 'Rectangle']
            shapes_found = [shape for shape in shape_patterns if shape in code]
            if shapes_found:
                return f"Create geometric animation with: {', '.join(shapes_found)}"
        
        # Default fallback
        return "Create educational animation with visual elements"
    
    async def _generate_fallback_clips(
        self, 
        count: int, 
        output_dir: str, 
        quality: str
    ) -> List[str]:
        """Generate fallback clips using enhanced generator's safe templates"""
        
        fallback_paths = []
        fallback_prompts = [
            "Create simple educational content with text",
            "Show basic geometric shapes",
            "Display mathematical concept",
            "Create visual learning material"
        ]
        
        for i in range(count):
            clip_name = f"enhanced_fallback_{i:03d}"
            prompt = fallback_prompts[i % len(fallback_prompts)]
            
            print(f"  🛡️  Generating enhanced fallback {i+1}/{count}: {clip_name}")
            
            try:
                # Use safe template directly
                safe_code = self.enhanced_generator._generate_safe_template(prompt)
                
                video_path = await generate_manim_video(safe_code, output_dir, clip_name, quality)
                
                if video_path and os.path.exists(video_path):
                    fallback_paths.append(video_path)
                    print(f"  ✅ Enhanced fallback {i+1} generated successfully")
                else:
                    print(f"  ❌ Enhanced fallback {i+1} failed")
                    
            except Exception as e:
                print(f"  ❌ Enhanced fallback {i+1} exception: {e}")
        
        return fallback_paths
    
    @weave.op()
    async def generate_improved_summary_video(
        self, 
        clips_config: List[Dict[str, Any]], 
        output_path: str = "improved_summary_video.mp4"
    ) -> Dict[str, Any]:
        """
        Generate complete summary video using enhanced Manim generation
        """
        print(f"🚀 Starting improved video generation pipeline")
        print(f"📝 Processing {len(clips_config)} clip configurations")
        
        # Generate enhanced Manim clips
        output_dir = "enhanced_clips"
        os.makedirs(output_dir, exist_ok=True)
        
        video_paths = await self.generate_improved_manim_clips(
            clips_config, 
            output_dir, 
            "medium_quality", 
            target_clips=4
        )
        
        if not video_paths:
            raise ValueError("No video clips were generated")
        
        # Add voice-over to clips
        print(f"\n🎤 ADDING VOICE-OVER TO ENHANCED CLIPS...")
        final_clips = []
        clips_with_audio = 0
        
        for i, (clip_config, video_path) in enumerate(zip(clips_config, video_paths)):
            print(f"\n🎬 Processing enhanced clip {i+1}/{len(video_paths)}...")
            
            if not os.path.exists(video_path):
                print(f"❌ Video file not found: {video_path}")
                continue
            
            try:
                voice_text = clip_config.get('voice_over')
                if voice_text:
                    print(f"🎤 Generating voice for enhanced clip {i+1}...")
                    
                    audio_path = f"{output_dir}/enhanced_audio_{i}.wav"
                    audio_result = await generate_voice(voice_text, audio_path)
                    
                    if audio_result and os.path.exists(audio_result):
                        final_path = f"{output_dir}/enhanced_final_{i}.mp4"
                        combined_path = combine_video_with_audio_sync(video_path, audio_result, final_path)
                        
                        if combined_path and os.path.exists(combined_path):
                            final_clips.append(combined_path)
                            clips_with_audio += 1
                            print(f"✅ Enhanced clip {i+1} with voice completed")
                        else:
                            final_clips.append(video_path)
                            print(f"⚠️  Using silent enhanced clip {i+1}")
                    else:
                        final_clips.append(video_path)
                        print(f"⚠️  Voice generation failed, using silent enhanced clip {i+1}")
                else:
                    final_clips.append(video_path)
                    print(f"🔇 No voice text for enhanced clip {i+1}")
                    
            except Exception as e:
                print(f"❌ Voice processing failed for enhanced clip {i+1}: {e}")
                final_clips.append(video_path)
        
        print(f"\n🎵 ENHANCED AUDIO SUMMARY:")
        print(f"  📊 Clips with audio: {clips_with_audio}/{len(final_clips)}")
        print(f"  📊 Silent clips: {len(final_clips) - clips_with_audio}/{len(final_clips)}")
        
        # Stitch enhanced clips together
        print(f"\n🔗 STITCHING ENHANCED CLIPS...")
        final_video = stitch_videos(final_clips, output_path, add_thank_you=True)
        
        print(f"✅ Improved summary video created: {final_video}")
        
        return {
            "video_path": final_video,
            "total_clips": len(clips_config),
            "successful_clips": len(final_clips),
            "clips_with_audio": clips_with_audio,
            "enhancement_used": True,
            "output_path": output_path
        }

# Example usage and comparison
async def test_improved_generator():
    """Test the improved generator with sample clips"""
    
    # Sample clip configurations (similar to your existing format)
    test_clips = [
        {
            "type": "manim",
            "voice_over": "Welcome to this lesson on basic geometry. We'll explore circles and their properties.",
            "description": "Introduction to circles"
        },
        {
            "type": "manim", 
            "voice_over": "The Pythagorean theorem states that in a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides.",
            "description": "Pythagorean theorem visualization"
        },
        {
            "type": "manim",
            "voice_over": "Mathematical functions can be visualized as graphs, helping us understand their behavior.",
            "description": "Function graphing"
        },
        {
            "type": "manim",
            "voice_over": "Data visualization helps us understand complex information through visual representations.",
            "description": "Data visualization concepts"
        }
    ]
    
    generator = ImprovedVideoGenerator()
    
    print("🧪 Testing Improved Video Generator")
    print("=" * 60)
    
    try:
        result = await generator.generate_improved_summary_video(
            test_clips,
            "test_improved_video.mp4"
        )
        
        print(f"\n🎉 IMPROVED GENERATION COMPLETE!")
        print(f"📁 Video: {result['video_path']}")
        print(f"📊 Success rate: {result['successful_clips']}/{result['total_clips']}")
        print(f"🔊 Audio coverage: {result['clips_with_audio']}/{result['successful_clips']}")
        
    except Exception as e:
        print(f"❌ Improved generation failed: {e}")
        import traceback
        print(f"📋 Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    asyncio.run(test_improved_generator())