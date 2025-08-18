#!/usr/bin/env python3
"""
Enhanced Manim Generator Integration
Replaces the current sanitize_manim_code approach with the advanced generation system
"""
import asyncio
import subprocess
import os
import tempfile
import json
from typing import List, Dict, Any
from pathlib import Path
import weave
import re

# Import the enhanced generator
import sys
sys.path.append('./manim-backend')
from enhanced_manim_generator import EnhancedManimGenerator

# Global instance of the enhanced generator
_enhanced_generator = None

def get_enhanced_generator():
    """Get or create the global enhanced generator instance"""
    global _enhanced_generator
    if _enhanced_generator is None:
        _enhanced_generator = EnhancedManimGenerator()
    return _enhanced_generator

@weave.op()
async def enhanced_sanitize_manim_code(src: str, context_prompt: str = None) -> str:
    """
    Enhanced replacement for sanitize_manim_code using intelligent generation
    
    Args:
        src: Original Manim code (may be broken)
        context_prompt: Optional context about what the code should do
        
    Returns:
        Clean, working Manim code
    """
    print(f"🚀 Starting enhanced code sanitization...")
    
    generator = get_enhanced_generator()
    
    # If we have a context prompt, use enhanced generation
    if context_prompt:
        print(f"📝 Using context prompt for enhanced generation: {context_prompt[:100]}...")
        try:
            result = await generator.generate_enhanced_manim_code(context_prompt)
            if result["success"]:
                print(f"✅ Enhanced generation successful!")
                return result["code"]
        except Exception as e:
            print(f"⚠️ Enhanced generation failed: {e}")
    
    # Fallback: try to extract intent from existing code and regenerate
    extracted_prompt = _extract_intent_from_code(src)
    if extracted_prompt:
        print(f"🔍 Extracted intent: {extracted_prompt}")
        try:
            result = await generator.generate_enhanced_manim_code(extracted_prompt)
            if result["success"]:
                print(f"✅ Enhanced generation from extracted intent successful!")
                return result["code"]
        except Exception as e:
            print(f"⚠️ Enhanced generation from intent failed: {e}")
    
    # Final fallback: use safe template
    print(f"🛡️ Using safe fallback template...")
    return generator._generate_safe_template("educational content")

def _extract_intent_from_code(src: str) -> str:
    """Extract intent from existing Manim code to guide regeneration"""
    if not src:
        return "Create educational animation"
    
    intent_clues = []
    
    # Look for Text objects to understand content
    text_matches = re.findall(r'Text\s*\(\s*["\']([^"\']+)["\']', src)
    if text_matches:
        intent_clues.append(f"Display text: {', '.join(text_matches[:3])}")
    
    # Look for mathematical content
    math_matches = re.findall(r'MathTex\s*\(\s*["\']([^"\']+)["\']', src)
    if math_matches:
        intent_clues.append(f"Show mathematical formula: {math_matches[0]}")
    
    # Look for geometric shapes
    shape_patterns = {
        'Circle': 'circles',
        'Square': 'squares', 
        'Triangle': 'triangles',
        'Line': 'lines',
        'Rectangle': 'rectangles'
    }
    
    shapes_found = []
    for shape, description in shape_patterns.items():
        if shape in src:
            shapes_found.append(description)
    
    if shapes_found:
        intent_clues.append(f"Create geometric animation with {', '.join(shapes_found)}")
    
    # Look for animations to understand the flow
    if 'Transform' in src:
        intent_clues.append("include shape transformations")
    if 'Create' in src or 'ShowCreation' in src:
        intent_clues.append("animate object creation")
    if 'Write' in src:
        intent_clues.append("animate text writing")
    
    # Combine clues into a meaningful prompt
    if intent_clues:
        return f"Create educational animation that should {', and '.join(intent_clues)}"
    
    return "Create educational animation with visual elements"

@weave.op()
async def enhanced_generate_manim_video(code: str, output_dir: str = "output", clip_name: str = None, quality: str = "medium_quality", context_prompt: str = None) -> str:
    """
    Enhanced version of generate_manim_video with intelligent code generation
    
    Args:
        code: The Manim Python code to execute (may be enhanced if problematic)
        output_dir: Directory to save the output video
        clip_name: Optional name for the clip file
        quality: Manim quality setting
        context_prompt: Optional context for code enhancement
        
    Returns:
        Path to the generated video file
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate a unique filename if not provided
    if not clip_name:
        clip_name = f"enhanced_clip_{hash(code) % 10000}"
    
    # Use enhanced sanitization
    enhanced_code = await enhanced_sanitize_manim_code(code, context_prompt)
    
    # Create temporary Python file with the enhanced code
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
        # Always include default imports and ensure clean code
        full_code = "from manim import *\nimport numpy as np\n\n" + enhanced_code
        temp_file.write(full_code)
        temp_file_path = temp_file.name
        
        # Debug: Print the enhanced code being executed
        print(f"Enhanced Manim code for {clip_name}:")
        print("=" * 50)
        print(full_code)
        print("=" * 50)
    
    try:
        # Run Manim command asynchronously
        quality_flag = {
            "low_quality": "l",
            "medium_quality": "m", 
            "high_quality": "h"
        }.get(quality, "m")
        
        # Use deterministic output filename and dedicated media dir
        media_dir = os.path.join(output_dir, clip_name)
        os.makedirs(media_dir, exist_ok=True)
        
        cmd = [
            "manim",
            temp_file_path,
            "SimpleScene",
            "-o", clip_name,
            "--media_dir", media_dir,
            "-v", "WARNING",
            f"-q{quality_flag}",
            "--resolution", "1280,720",
            "--frame_rate", "24"
        ]
        
        print(f"Running enhanced Manim command: {' '.join(cmd)}")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            print(f"Error: Enhanced Manim execution failed for clip {clip_name}")
            print(f"stdout: {stdout.decode()}")
            print(f"stderr: {stderr.decode()}")
            return None
        
        # Parse Manim output to find the actual video file path
        video_path = _find_generated_video_path(media_dir, clip_name, stdout.decode())
        
        if video_path:
            print(f"✅ Enhanced video generated: {video_path}")
            return video_path
        else:
            print(f"❌ No video file found after enhanced generation")
            return None
        
    except Exception as e:
        print(f"Exception during enhanced Manim generation: {e}")
        return None
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

def _find_generated_video_path(media_dir: str, clip_name: str, stdout_text: str) -> str:
    """Find the generated video file path using multiple fallback strategies"""
    
    # Strategy 1: Parse "File ready at" from stdout
    import re
    file_ready_match = re.search(r"File ready at\s+(.+\.mp4)", stdout_text)
    if file_ready_match:
        video_path = file_ready_match.group(1).strip()
        if os.path.exists(video_path):
            return video_path
    
    # Strategy 2: Look for expected filename with output flag
    expected_with_output = Path(media_dir) / f"{clip_name}.mp4"
    if expected_with_output.exists():
        return str(expected_with_output)
    
    # Strategy 3: Standard Manim structure
    expected_standard = Path(media_dir) / "videos" / f"{clip_name}.mp4"
    if expected_standard.exists():
        return str(expected_standard)
    
    # Strategy 4: Look for SimpleScene.mp4 (class name)
    expected_class = Path(media_dir) / "videos" / "SimpleScene.mp4"
    if expected_class.exists():
        return str(expected_class)
    
    # Strategy 5: Search for any .mp4 files in media_dir
    mp4_files = list(Path(media_dir).glob("**/*.mp4"))
    if mp4_files:
        # Prefer larger files (more likely to be main video) and longer duration
        print(f"📁 Found {len(mp4_files)} video files, analyzing to find best one...")
        
        best_video = None
        best_score = 0
        
        for video_file in mp4_files:
            try:
                file_size = video_file.stat().st_size
                
                # Quick duration check using moviepy
                from moviepy import VideoFileClip
                temp_clip = VideoFileClip(str(video_file))
                duration = temp_clip.duration
                temp_clip.close()
                
                # Score based on file size and duration (prefer longer, larger files)
                score = (file_size / 1000) + (duration * 10000)  # Weight duration more heavily
                
                print(f"  📹 {video_file.name}: {file_size} bytes, {duration:.2f}s, score={score:.0f}")
                
                if score > best_score:
                    best_score = score
                    best_video = video_file
                    
            except Exception as e:
                print(f"  ❌ Error analyzing {video_file.name}: {e}")
                continue
        
        if best_video:
            print(f"✅ Selected best video: {best_video.name}")
            return str(best_video)
        else:
            # Fallback to largest file by size
            largest_video = max(mp4_files, key=lambda f: f.stat().st_size)
            return str(largest_video)
    
    return None

@weave.op()
async def enhanced_generate_manim_clips(
    clips_config: List[Dict[str, Any]], 
    output_dir: str = "clips", 
    quality: str = "medium_quality",
    target_clips: int = 4, 
    max_retries: int = 2
) -> List[str]:
    """
    Enhanced version of generate_manim_clips with intelligent generation and validation
    
    Args:
        clips_config: List of clip configurations with 'code' and optional 'voice_over'
        output_dir: Directory to save output videos
        quality: Manim quality setting
        target_clips: Target number of clips to generate
        max_retries: Maximum retry attempts per clip (now less needed due to enhanced generation)
        
    Returns:
        List of paths to generated video files
    """
    print(f"🚀 Enhanced clip generation for {len(clips_config)} clips")
    print(f"🎯 Target: {target_clips} clips with enhanced quality and reliability")
    
    generator = get_enhanced_generator()
    manim_clips = [clip for clip in clips_config if clip.get('type') == 'manim']
    video_paths = []
    generation_stats = {
        "enhanced_successes": 0,
        "fallback_successes": 0,
        "total_failures": 0,
        "average_attempts": 0
    }
    
    # Process each clip with enhanced generation
    for i, clip in enumerate(manim_clips[:target_clips]):
        clip_name = f"enhanced_manim_clip_{i:03d}"
        print(f"\n🎬 Enhanced generation for clip {i+1}/{min(len(manim_clips), target_clips)}: {clip_name}")
        
        # Extract context for enhanced generation
        context_prompt = _extract_clip_context(clip)
        original_code = clip.get('code', '')
        
        success = False
        attempt = 0
        
        while not success and attempt <= max_retries:
            try:
                print(f"  📝 Enhanced attempt {attempt + 1}: {context_prompt[:100]}...")
                
                if attempt == 0:
                    # First attempt: Use enhanced generation with context
                    video_path = await enhanced_generate_manim_video(
                        original_code, 
                        output_dir, 
                        f"{clip_name}_attempt_{attempt}", 
                        quality,
                        context_prompt
                    )
                else:
                    # Retry attempts: Use simpler prompts
                    simple_prompt = f"Create simple educational animation (attempt {attempt + 1})"
                    video_path = await enhanced_generate_manim_video(
                        "", 
                        output_dir, 
                        f"{clip_name}_attempt_{attempt}", 
                        quality,
                        simple_prompt
                    )
                
                if video_path and os.path.exists(video_path):
                    video_paths.append(video_path)
                    if attempt == 0:
                        generation_stats["enhanced_successes"] += 1
                    else:
                        generation_stats["fallback_successes"] += 1
                    print(f"  ✅ Enhanced clip {i+1} succeeded on attempt {attempt + 1}")
                    success = True
                else:
                    print(f"  ❌ Enhanced attempt {attempt + 1} failed - no video generated")
                    
            except Exception as e:
                print(f"  ❌ Enhanced attempt {attempt + 1} failed with error: {e}")
            
            attempt += 1
        
        if not success:
            generation_stats["total_failures"] += 1
            print(f"  🚨 All enhanced attempts failed for clip {i+1}")
    
    # Fill remaining slots if needed
    clips_needed = target_clips - len(video_paths)
    if clips_needed > 0:
        print(f"\n🔧 Generating {clips_needed} additional enhanced clips...")
        additional_paths = await _generate_enhanced_fallback_clips(clips_needed, output_dir, quality)
        video_paths.extend(additional_paths)
        generation_stats["fallback_successes"] += len(additional_paths)
    
    # Print enhanced statistics
    print(f"\n📊 ENHANCED GENERATION STATISTICS:")
    print(f"  🎯 Target clips: {target_clips}")
    print(f"  ✨ Enhanced successes: {generation_stats['enhanced_successes']}")
    print(f"  🛡️ Fallback successes: {generation_stats['fallback_successes']}")
    print(f"  ❌ Total failures: {generation_stats['total_failures']}")
    print(f"  📁 Final enhanced clips: {len(video_paths)}")
    
    return video_paths[:target_clips]

def _extract_clip_context(clip: Dict[str, Any]) -> str:
    """Extract meaningful context from clip configuration for enhanced generation"""
    
    # Priority 1: Voice-over text (best description)
    if clip.get('voice_over'):
        return clip['voice_over']
    
    # Priority 2: Description field
    if clip.get('description'):
        return clip['description']
    
    # Priority 3: Title field
    if clip.get('title'):
        return f"Create educational animation about: {clip['title']}"
    
    # Priority 4: Extract from existing code
    if clip.get('code'):
        return _extract_intent_from_code(clip['code'])
    
    return "Create educational animation with visual content"

async def _generate_enhanced_fallback_clips(count: int, output_dir: str, quality: str) -> List[str]:
    """Generate enhanced fallback clips using the intelligent generator"""
    
    fallback_paths = []
    enhanced_fallback_prompts = [
        "Create educational content introducing key concepts",
        "Show basic mathematical or scientific principles",
        "Display informational content with clear visual hierarchy", 
        "Create learning material with engaging visual elements"
    ]
    
    generator = get_enhanced_generator()
    
    for i in range(count):
        clip_name = f"enhanced_fallback_{i:03d}"
        prompt = enhanced_fallback_prompts[i % len(enhanced_fallback_prompts)]
        
        print(f"  🛡️ Generating enhanced fallback {i+1}/{count}: {clip_name}")
        
        try:
            result = await generator.generate_enhanced_manim_code(prompt)
            
            if result["success"]:
                video_path = await enhanced_generate_manim_video(
                    result["code"], 
                    output_dir, 
                    clip_name, 
                    quality
                )
                
                if video_path and os.path.exists(video_path):
                    fallback_paths.append(video_path)
                    print(f"  ✅ Enhanced fallback {i+1} generated successfully")
                else:
                    print(f"  ❌ Enhanced fallback {i+1} video generation failed")
            else:
                print(f"  ❌ Enhanced fallback {i+1} code generation failed")
                
        except Exception as e:
            print(f"  ❌ Enhanced fallback {i+1} exception: {e}")
    
    return fallback_paths

# Backwards compatibility functions
async def generate_manim_video(code: str, output_dir: str = "output", clip_name: str = None, quality: str = "medium_quality") -> str:
    """Backwards compatible wrapper for the original function"""
    return await enhanced_generate_manim_video(code, output_dir, clip_name, quality)

async def generate_manim_clips(clips_config: List[Dict[str, Any]], output_dir: str = "clips", quality: str = "medium_quality", target_clips: int = 4, max_retries: int = 2) -> List[str]:
    """Backwards compatible wrapper for the original function"""
    return await enhanced_generate_manim_clips(clips_config, output_dir, quality, target_clips, max_retries)

def sanitize_manim_code(src: str) -> str:
    """Backwards compatible wrapper - now uses enhanced generation"""
    # For synchronous calls, we need to handle async
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, we can't use run()
            # Create a new task instead
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, enhanced_sanitize_manim_code(src))
                return future.result(timeout=30)
        else:
            return asyncio.run(enhanced_sanitize_manim_code(src))
    except Exception as e:
        print(f"⚠️ Enhanced sanitization failed, using fallback: {e}")
        generator = get_enhanced_generator()
        return generator._generate_safe_template("educational content")

# Example usage and testing
async def test_enhanced_integration():
    """Test the enhanced integration system"""
    
    print("🧪 Testing Enhanced Manim Generator Integration")
    print("=" * 60)
    
    # Test enhanced sanitization
    broken_code = '''
    class Scene:
        def construct(self):
            text = Text("Hello "world" with broken quotes")
            self.play(ShowCreation(text))  # deprecated method
            self.wait(1
    '''
    
    print("🔧 Testing enhanced sanitization...")
    fixed_code = await enhanced_sanitize_manim_code(broken_code, "Create a hello world animation")
    print("✅ Enhanced sanitization completed")
    
    # Test enhanced clip generation
    test_clips = [
        {
            "type": "manim",
            "voice_over": "Welcome to geometry. Let's explore circles and squares.",
            "code": broken_code
        },
        {
            "type": "manim", 
            "description": "Mathematical visualization of functions",
            "code": "# Some broken math code"
        }
    ]
    
    print("\n🎬 Testing enhanced clip generation...")
    video_paths = await enhanced_generate_manim_clips(test_clips, "test_enhanced_output", target_clips=2)
    
    print(f"\n🎉 Enhanced integration test completed!")
    print(f"📁 Generated videos: {len(video_paths)}")
    for i, path in enumerate(video_paths):
        print(f"  {i+1}. {path}")

if __name__ == "__main__":
    asyncio.run(test_enhanced_integration())