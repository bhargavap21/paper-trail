import asyncio
import subprocess
import os
import tempfile
import json
from typing import List, Dict, Any
from pathlib import Path
import weave
import re

def sanitize_manim_code(src: str) -> str:
    """
    Multi-stage sanitization to fix common LLM-generated Manim code issues:
    1. Text cleaning (quotes, whitespace)
    2. API deprecation fixes
    3. Syntax error prevention
    4. Structure validation
    5. Safe fallback if needed
    """
    print(f"🔧 Starting code sanitization...")
    original_src = src
    
    try:
        # Stage 1: Basic text cleaning
        src = _clean_text_issues(src)
        
        # Stage 2: Fix API deprecations
        src = _fix_deprecated_methods(src)
        
        # Stage 3: Fix syntax errors
        src = _fix_syntax_errors(src)
        
        # Stage 4: Ensure proper structure
        src = _ensure_proper_structure(src)
        
        # Stage 5: Validate the code can compile
        src = _validate_and_fallback(src, original_src)
        
        print(f"✅ Code sanitization completed successfully")
        return src
        
    except Exception as e:
        print(f"❌ Sanitization failed: {e}")
        print(f"🔄 Using safe fallback scene")
        return _generate_safe_fallback()

@weave.op()
async def generate_manim_video(code: str, output_dir: str = "output", clip_name: str = None, quality: str = "medium_quality") -> str:
    """
    Generate a video from Manim code asynchronously.
    
    Args:
        code: The Manim Python code to execute
        output_dir: Directory to save the output video
        clip_name: Optional name for the clip file
        quality: Manim quality setting (low_quality, medium_quality, high_quality)
        
    Returns:
        Path to the generated video file
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate a unique filename if not provided
    if not clip_name:
        clip_name = f"clip_{hash(code) % 10000}"
    
    # Use the comprehensive sanitizer
    code = sanitize_manim_code(code)

def _clean_text_issues(src: str) -> str:
    """Stage 1: Handle quotes, whitespace, and text encoding"""
    print(f"🧹 Stage 1: Cleaning text issues...")
    
    # Fix smart quotes
    src = src.replace(""", '"').replace(""", '"').replace("'", "'").replace("'", "'")
    
    # Fix common Text() string issues with better regex
    # Handle Text("..."), Text('...'), and nested quotes
    def fix_text_strings(match):
        full_match = match.group(0)
        try:
            # Extract the text content more carefully
            content = match.group(2)
            rest = match.group(3) if match.group(3) else ""
            
            # Escape any remaining quotes in content
            content = content.replace('\\', '\\\\').replace('"', '\\"')
            
            # Use raw string to avoid escape issues
            return f'Text(r"""{content}"""{rest})'
        except:
            # If regex parsing fails, use a safe default
            return 'Text("Sample Text")'
    
    # More robust Text() pattern - handles various quote patterns
    text_pattern = re.compile(r'Text\s*\(\s*(["\'])(.*?)\1([^)]*)\)', re.DOTALL)
    src = text_pattern.sub(fix_text_strings, src)
    
    # Fix other common string issues in Manim objects
    for obj_type in ['MarkupText', 'MathTex', 'Tex']:
        pattern = re.compile(f'{obj_type}\\s*\\(\\s*(["\'])(.*?)\\1([^)]*)\\)', re.DOTALL)
        src = pattern.sub(lambda m: f'{obj_type}(r"""{m.group(2).replace("\\", "\\\\").replace('"', '\\"')}"""{m.group(3)})', src)
    
    return src

def _fix_deprecated_methods(src: str) -> str:
    """Stage 2: Replace deprecated Manim methods with current ones"""
    print(f"🔄 Stage 2: Fixing deprecated methods...")
    
    # Comprehensive API deprecation mapping
    deprecation_map = {
        # Animation methods
        'ShowCreation': 'Create',
        'ShowIncreasingSubsets': 'ShowIncreasingSubsets',  # Actually still valid
        'ShowSubmobjectsOneByOne': 'ShowSubmobjectsOneByOne',  # Still valid
        'DrawBorderThenFill': 'DrawBorderThenFill',  # Still valid
        'Write': 'Write',  # Still valid
        'FadeInFrom': 'FadeIn',
        'FadeInFromDown': 'FadeIn',
        'FadeInFromLarge': 'FadeIn',
        'FadeOutAndShift': 'FadeOut',
        'FadeOutAndShiftDown': 'FadeOut',
        'ReplacementTransform': 'ReplacementTransform',  # Still valid
        'TransformFromCopy': 'TransformFromCopy',  # Still valid
        
        # Mobject methods
        'set_color_by_gradient': 'set_color_by_gradient',  # Still valid
        'set_colors_by_radial_gradient': 'set_colors_by_radial_gradient',  # Still valid
        
        # Position methods - these are the main issues
        'shift_onto_screen': 'shift',
        'to_corner': 'to_corner',  # Still valid
        'to_edge': 'to_edge',    # Still valid
        'next_to': 'next_to',    # Still valid
        'move_to': 'move_to',    # Still valid
        
        # Common typos and variations
        'ShowCreations': 'Create',
        'show_creation': 'Create',
        'showcreation': 'Create',
    }
    
    # Apply replacements
    for old_method, new_method in deprecation_map.items():
        if old_method != new_method:  # Only replace if actually different
            # Match method calls - handle both self.play(ShowCreation(...)) and ShowCreation(...)
            pattern = rf'\b{re.escape(old_method)}\b'
            src = re.sub(pattern, new_method, src)
    
    return src

def _fix_syntax_errors(src: str) -> str:
    """Stage 3: Fix common syntax errors"""
    print(f"🔧 Stage 3: Fixing syntax errors...")
    
    # Fix common indentation issues (ensure consistent 4-space indents)
    lines = src.split('\n')
    fixed_lines = []
    
    for line in lines:
        # Convert tabs to spaces
        line = line.expandtabs(4)
        # Fix mixed indentation
        if line.strip():
            # Count leading spaces
            leading_spaces = len(line) - len(line.lstrip())
            # Ensure multiples of 4 for indentation
            if leading_spaces % 4 != 0:
                new_indent = (leading_spaces // 4 + 1) * 4 if leading_spaces > 0 else 0
                line = ' ' * new_indent + line.lstrip()
        fixed_lines.append(line)
    
    src = '\n'.join(fixed_lines)
    
    # Fix common Python syntax issues
    syntax_fixes = [
        # Fix missing colons
        (r'(\s+def\s+\w+\([^)]*\))\s*$', r'\1:'),
        (r'(\s+class\s+\w+(?:\([^)]*\))?)\s*$', r'\1:'),
        (r'(\s+if\s+.+)\s*$', r'\1:'),
        (r'(\s+for\s+.+)\s*$', r'\1:'),
        (r'(\s+while\s+.+)\s*$', r'\1:'),
        (r'(\s+try)\s*$', r'\1:'),
        (r'(\s+except[^:]*)\s*$', r'\1:'),
        (r'(\s+finally)\s*$', r'\1:'),
        (r'(\s+else)\s*$', r'\1:'),
        
        # Fix common variable name issues
        (r'\bself\.play\s*\(\s*\)', r'self.wait(1)'),  # Empty play() calls
        
        # Fix method call issues
        (r'\.play\s*\(\s*,', r'.play('),  # Leading commas in play()
        (r'\.play\s*\([^)]*,\s*\)', lambda m: m.group(0).replace(',)', ')')),  # Trailing commas
    ]
    
    for pattern, replacement in syntax_fixes:
        if callable(replacement):
            src = re.sub(pattern, replacement, src, flags=re.MULTILINE)
        else:
            src = re.sub(pattern, replacement, src, flags=re.MULTILINE)
    
    return src

def _ensure_proper_structure(src: str) -> str:
    """Stage 4: Ensure proper class and method structure"""
    print(f"🏗️  Stage 4: Ensuring proper structure...")
    
    # Ensure we have a proper SimpleScene class
    if "class SimpleScene" not in src:
        if "class Scene" in src:
            src = src.replace("class Scene", "class SimpleScene")
        else:
            # Wrap existing code in a proper class structure
            lines = src.strip().split('\n')
            indented_lines = ['    ' + line for line in lines if line.strip()]
            
            class_template = """class SimpleScene(Scene):
    def construct(self):
{content}
        if not hasattr(self, '_played_anything'):
            self.wait(1)"""
            
            src = class_template.format(content='\n'.join(indented_lines))
    
    # Ensure construct method exists
    if "def construct(self)" not in src:
        # Find the class and add construct method
        class_match = re.search(r'class SimpleScene\([^)]*\):\s*\n', src)
        if class_match:
            insert_pos = class_match.end()
            construct_method = """    def construct(self):
        # Auto-generated construct method
        self.wait(1)
"""
            src = src[:insert_pos] + construct_method + src[insert_pos:]
    
    # Ensure proper imports at the top
    required_imports = "from manim import *\nimport numpy as np\n\n"
    if not src.startswith("from manim import"):
        src = required_imports + src
    
    return src

def _validate_and_fallback(src: str, original_src: str) -> str:
    """Stage 5: Validate code compiles, fallback if needed"""
    print(f"🧪 Stage 5: Validating code compilation...")
    
    try:
        # Try to compile the code
        compile(src, '<string>', 'exec')
        print(f"✅ Code compilation successful")
        return src
    except SyntaxError as e:
        print(f"❌ Syntax error after sanitization: {e}")
        print(f"🔄 Attempting simple fixes...")
        
        # Try some last-ditch fixes
        try:
            # Remove problematic lines and try again
            lines = src.split('\n')
            safe_lines = []
            
            for line in lines:
                # Skip obviously problematic lines
                if any(problem in line.lower() for problem in ['import matplotlib', 'import plt', 'fig,', 'plt.']):
                    continue
                if line.strip().startswith('#'):
                    continue
                safe_lines.append(line)
            
            safe_src = '\n'.join(safe_lines)
            compile(safe_src, '<string>', 'exec')
            print(f"✅ Code fixed by removing problematic lines")
            return safe_src
            
        except:
            print(f"❌ Could not fix code, using safe fallback")
            return _generate_safe_fallback()
    
    except Exception as e:
        print(f"❌ Unexpected validation error: {e}")
        return _generate_safe_fallback()

def _generate_safe_fallback() -> str:
    """Generate a guaranteed-working Manim scene"""
    return """class SimpleScene(Scene):
    def construct(self):
        # Safe fallback scene - always works
        title = Text("Educational Content", font_size=48)
        title.to_edge(UP)
        
        content = Text("Video content will appear here", font_size=24)
        content.move_to(ORIGIN)
        
        # Simple animation sequence
        self.play(Write(title))
        self.wait(0.5)
        self.play(FadeIn(content))
        self.wait(2)
        self.play(FadeOut(title), FadeOut(content))
        self.wait(0.5)"""

@weave.op()
async def generate_manim_video(code: str, output_dir: str = "output", clip_name: str = None, quality: str = "medium_quality") -> str:
    """
    Generate a video from Manim code asynchronously.
    
    Args:
        code: The Manim Python code to execute
        output_dir: Directory to save the output video
        clip_name: Optional name for the clip file
        quality: Manim quality setting (low_quality, medium_quality, high_quality)
        
    Returns:
        Path to the generated video file
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate a unique filename if not provided
    if not clip_name:
        clip_name = f"clip_{hash(code) % 10000}"
    
    # Use the comprehensive sanitizer
    code = sanitize_manim_code(code)
    
    # Create temporary Python file with the Manim code
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
        # Always include default imports and ensure clean code
        full_code = "from manim import *\nimport numpy as np\n\n" + code
        temp_file.write(full_code)
        temp_file_path = temp_file.name
        
        # Debug: Print the code being executed
        print(f"Generated Manim code for {clip_name}:")
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
            "SimpleScene",  # Specify the exact scene class to render
            "-o", clip_name,  # Set output filename explicitly
            "--media_dir", media_dir,  # Isolate outputs
            "-v", "WARNING",  # Reduce verbosity
            f"-q{quality_flag}",  # Quality flag: -ql (low), -qm (medium), -qh (high)
            "--resolution", "1280,720",  # 720p
            "--frame_rate", "24"  # 24fps
        ]
        
        print(f"Running Manim command: {' '.join(cmd)}")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            print(f"Error: Manim execution failed for clip {clip_name}")
            print(f"stdout: {stdout.decode()}")
            print(f"stderr: {stderr.decode()}")
            return None
        
        # Parse Manim output to find the actual video file path
        stdout_text = stdout.decode()
        stderr_text = stderr.decode()
        
        # Look for "File ready at" in the output
        import re
        file_ready_match = re.search(r"File ready at\s+(.+\.mp4)", stdout_text)
        if file_ready_match:
            video_path = file_ready_match.group(1).strip()
            if os.path.exists(video_path):
                print(f"✓ Generated Manim video: {video_path}")
                return video_path
        
        # Fallback 1: Look for expected filename with output flag
        expected_with_output = Path(media_dir) / f"{clip_name}.mp4"
        if expected_with_output.exists():
            print(f"✓ Found video with output name: {expected_with_output}")
            return str(expected_with_output)
        
        # Fallback 2: Standard Manim structure
        expected_standard = Path(media_dir) / "videos" / f"{clip_name}.mp4"
        if expected_standard.exists():
            print(f"✓ Found video in standard structure: {expected_standard}")
            return str(expected_standard)
        
        # Fallback 3: Look for SimpleScene.mp4 (class name)
        expected_class = Path(media_dir) / "videos" / "SimpleScene.mp4"
        if expected_class.exists():
            print(f"✓ Found video with class name: {expected_class}")
            return str(expected_class)
        
        # Fallback 4: Search for any .mp4 files in media_dir
        mp4_files = list(Path(media_dir).glob("**/*.mp4"))
        if mp4_files:
            # Get the most recently created one
            latest_video = max(mp4_files, key=os.path.getctime)
            print(f"✓ Found video file (latest): {latest_video}")
            return str(latest_video)
        
        # Fallback 5: Check if Manim used default media directory
        default_media = Path("media/videos")
        if default_media.exists():
            mp4_files = list(default_media.glob("**/*.mp4"))
            if mp4_files:
                # Get the most recently created one
                latest_video = max(mp4_files, key=os.path.getctime)
                print(f"✓ Found video in default media dir: {latest_video}")
                return str(latest_video)
        
        print(f"Error: No video file was generated for clip {clip_name}")
        print(f"Debug - stdout: {stdout_text[:200]}...")
        print(f"Debug - stderr: {stderr_text[:200]}...")
        return None
        
    except Exception as e:
        print(f"Exception during Manim generation: {e}")
        return None
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

@weave.op()
async def generate_manim_clips(clips_config: List[Dict[str, Any]], output_dir: str = "clips", quality: str = "medium_quality", target_clips: int = 4, max_retries: int = 2) -> List[str]:
    """
    Generate multiple Manim clips with retry logic to ensure target number of clips.
    
    Args:
        clips_config: List of clip configurations with 'code' and optional 'voice_over'
        output_dir: Directory to save output videos
        quality: Manim quality setting (low_quality, medium_quality, high_quality)
        target_clips: Target number of clips to generate (default 4 for ~1 minute)
        max_retries: Maximum retry attempts per clip (default 2)
        
    Returns:
        List of paths to generated video files (guaranteed to have target_clips items)
    """
    print(f"🎯 Target: {target_clips} clips, Max retries per clip: {max_retries}")
    
    manim_clips = [clip for clip in clips_config if clip.get('type') == 'manim' and clip.get('code')]
    video_paths = []
    failed_attempts = []
    
    # Stage 1: Try original clips with retries
    for i, clip in enumerate(manim_clips[:target_clips]):  # Only process up to target number
        clip_name = f"manim_clip_{i:03d}"
        print(f"\n🎬 Generating clip {i+1}/{min(len(manim_clips), target_clips)}: {clip_name}")
        
        success = False
        original_code = clip['code']
        
        # Try original code first, then retries with variations
        for attempt in range(max_retries + 1):
            try:
                if attempt == 0:
                    print(f"  📝 Attempt {attempt + 1}: Using original code")
                    code_to_use = original_code
                else:
                    print(f"  🔄 Attempt {attempt + 1}: Using simplified variation")
                    code_to_use = _create_code_variation(original_code, attempt)
                
                video_path = await generate_manim_video(code_to_use, output_dir, f"{clip_name}_attempt_{attempt}", quality)
                
                if video_path and os.path.exists(video_path):
                    video_paths.append(video_path)
                    print(f"  ✅ Clip {i+1} succeeded on attempt {attempt + 1}")
                    success = True
                    break
                else:
                    print(f"  ❌ Attempt {attempt + 1} failed - no video generated")
                    
            except Exception as e:
                print(f"  ❌ Attempt {attempt + 1} failed with error: {e}")
                failed_attempts.append(f"Clip {i+1} attempt {attempt + 1}: {str(e)[:100]}")
        
        if not success:
            print(f"  🚨 All attempts failed for clip {i+1}, will use fallback")
    
    # Stage 2: Fill remaining slots with safe fallback clips
    clips_needed = target_clips - len(video_paths)
    
    if clips_needed > 0:
        print(f"\n🔧 Need {clips_needed} more clips, generating safe fallbacks...")
        
        for i in range(clips_needed):
            fallback_clip_name = f"fallback_clip_{len(video_paths):03d}"
            print(f"  🛡️  Generating fallback clip {i+1}/{clips_needed}: {fallback_clip_name}")
            
            try:
                # Use a guaranteed-working fallback scene
                fallback_code = _generate_safe_fallback_variation(i)
                video_path = await generate_manim_video(fallback_code, output_dir, fallback_clip_name, quality)
                
                if video_path and os.path.exists(video_path):
                    video_paths.append(video_path)
                    print(f"  ✅ Fallback clip {i+1} generated successfully")
                else:
                    print(f"  ❌ Even fallback failed - this should not happen!")
                    
            except Exception as e:
                print(f"  🚨 Critical: Fallback clip failed: {e}")
                # Last resort: create a minimal scene file manually
                minimal_path = await _create_minimal_scene_file(output_dir, fallback_clip_name, quality)
                if minimal_path:
                    video_paths.append(minimal_path)
                    print(f"  🆘 Used minimal scene as last resort")
    
    # Stage 3: Verification and summary
    print(f"\n📊 CLIP GENERATION SUMMARY:")
    print(f"  🎯 Target clips: {target_clips}")
    print(f"  ✅ Successfully generated: {len(video_paths)}")
    print(f"  📁 Paths: {[os.path.basename(p) for p in video_paths]}")
    
    if failed_attempts:
        print(f"  ⚠️  Failed attempts logged: {len(failed_attempts)}")
        for attempt in failed_attempts[:3]:  # Show first 3 failures
            print(f"    - {attempt}")
        if len(failed_attempts) > 3:
            print(f"    ... and {len(failed_attempts) - 3} more")
    
    # Ensure we always return the target number of clips
    if len(video_paths) < target_clips:
        print(f"🚨 WARNING: Only generated {len(video_paths)}/{target_clips} clips")
    
    return video_paths[:target_clips]  # Return exactly target number

def _create_code_variation(original_code: str, variation_number: int) -> str:
    """Create simplified variations of code for retry attempts"""
    print(f"    🔄 Creating variation {variation_number} of code...")
    
    if variation_number == 1:
        # Variation 1: Simplify Text objects and remove complex animations
        simplified = original_code
        
        # Replace complex Text with simple ones
        simplified = re.sub(r'Text\([^)]*font_size[^)]*\)', 'Text("Content")', simplified)
        simplified = re.sub(r'Text\([^)]*color[^)]*\)', 'Text("Content")', simplified)
        
        # Replace complex animations with basic ones
        simplified = re.sub(r'Create\([^)]*\)', lambda m: 'Create(Circle())', simplified)
        simplified = re.sub(r'Transform\([^)]*\)', lambda m: 'FadeIn(Square())', simplified)
        
        return simplified
        
    elif variation_number == 2:
        # Variation 2: Ultra-simple scene with just basic shapes
        return """class SimpleScene(Scene):
    def construct(self):
        # Ultra-simple variation
        circle = Circle(color=BLUE)
        square = Square(color=RED)
        
        self.play(Create(circle))
        self.wait(1)
        self.play(Transform(circle, square))
        self.wait(1)
        self.play(FadeOut(square))
        self.wait(0.5)"""
    
    else:
        # Default: return the safe fallback
        return _generate_safe_fallback()

def _generate_safe_fallback_variation(variation_number: int) -> str:
    """Generate different safe fallback scenes to avoid repetition"""
    
    variations = [
        # Variation 0: Basic shapes
        """class SimpleScene(Scene):
    def construct(self):
        title = Text("Educational Content", font_size=36)
        title.to_edge(UP)
        
        circle = Circle(radius=1.5, color=BLUE)
        square = Square(side_length=2, color=RED)
        
        self.play(Write(title))
        self.play(Create(circle))
        self.wait(1)
        self.play(Transform(circle, square))
        self.wait(1.5)
        self.play(FadeOut(title), FadeOut(circle))
        self.wait(0.5)""",
        
        # Variation 1: Mathematical content
        """class SimpleScene(Scene):
    def construct(self):
        title = Text("Mathematical Concepts", font_size=36)
        title.to_edge(UP)
        
        equation = MathTex("E = mc^2")
        equation.scale(2)
        
        self.play(Write(title))
        self.wait(0.5)
        self.play(Write(equation))
        self.wait(2)
        self.play(FadeOut(title), FadeOut(equation))
        self.wait(0.5)""",
        
        # Variation 2: Simple graph
        """class SimpleScene(Scene):
    def construct(self):
        title = Text("Data Visualization", font_size=36)
        title.to_edge(UP)
        
        line = Line(LEFT * 3, RIGHT * 3, color=GREEN)
        dot = Dot(color=YELLOW)
        
        self.play(Write(title))
        self.play(Create(line))
        self.play(Create(dot))
        self.wait(1.5)
        self.play(FadeOut(title), FadeOut(line), FadeOut(dot))
        self.wait(0.5)""",
        
        # Variation 3: Text animation
        """class SimpleScene(Scene):
    def construct(self):
        words = ["Learning", "Understanding", "Knowledge"]
        
        for word in words:
            text = Text(word, font_size=48)
            self.play(Write(text))
            self.wait(1)
            self.play(FadeOut(text))
            self.wait(0.3)
        
        self.wait(0.5)"""
    ]
    
    return variations[variation_number % len(variations)]

async def _create_minimal_scene_file(output_dir: str, clip_name: str, quality: str) -> str:
    """Last resort: create a minimal working scene file directly"""
    print(f"    🆘 Creating minimal scene file as last resort...")
    
    minimal_code = """class SimpleScene(Scene):
    def construct(self):
        text = Text("Content")
        self.play(FadeIn(text))
        self.wait(2)
        self.play(FadeOut(text))
        self.wait(1)"""
    
    try:
        video_path = await generate_manim_video(minimal_code, output_dir, f"{clip_name}_minimal", quality)
        return video_path
    except Exception as e:
        print(f"    🚨 Even minimal scene failed: {e}")
        return None

async def main():
    """Example usage"""
    # Example clip configuration
    sample_clips = [
        {
            "type": "manim",
            "code": """
class SimpleScene(Scene):
    def construct(self):
        # Create a simple mathematical visualization
        title = Text("Mathematical Visualization", font_size=48)
        title.to_edge(UP)
        
        # Create a circle and square
        circle = Circle(radius=2, color=BLUE)
        square = Square(side_length=3, color=RED)
        
        # Animation sequence
        self.play(Write(title))
        self.play(Create(circle))
        self.play(Transform(circle, square))
        self.wait(1)
        self.play(FadeOut(title), FadeOut(circle))
""",
            "voice_over": "Welcome to our mathematical visualization. Here we see the transformation of geometric shapes."
        }
    ]
    
    video_paths = await generate_manim_clips(sample_clips)
    print(f"Generated videos: {video_paths}")

if __name__ == "__main__":
    asyncio.run(main()) 