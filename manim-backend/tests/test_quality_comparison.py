#!/usr/bin/env python3
"""
Quality Comparison Test: Simple vs Dataset-Enhanced Manim Generation
Tests the same prompt with both approaches to demonstrate quality improvements
"""
import asyncio
import sys
import os
import tempfile
import subprocess
import json
from pathlib import Path

# Add current directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_quality_comparison():
    """Compare simple vs dataset-enhanced generation for the same prompt"""
    
    print("🎯 QUALITY COMPARISON TEST")
    print("=" * 60)
    
    # Test prompt - something that should benefit from dataset examples
    test_prompt = "Create a neural network visualization showing data flowing from input to output layers"
    
    print(f"📝 Test Prompt: {test_prompt}")
    print("=" * 60)
    
    try:
        # Import both generators
        from simple_manim_generator import SimpleManimGenerator
        from dataset_enhanced_manim_generator import DatasetEnhancedManimGenerator
        
        simple_generator = SimpleManimGenerator()
        enhanced_generator = DatasetEnhancedManimGenerator()
        
        # Generate with simple approach
        print("\n🔵 SIMPLE APPROACH")
        print("-" * 30)
        simple_result = await simple_generator.generate_manim_code(test_prompt)
        
        if simple_result["success"]:
            print(f"✅ Simple generation successful using {simple_result['method']}")
            simple_code = simple_result["code"]
            print("📄 Generated code preview:")
            print(simple_code[:300] + "..." if len(simple_code) > 300 else simple_code)
        else:
            print("❌ Simple generation failed")
            return False
        
        # Generate with dataset-enhanced approach  
        print("\n🟢 DATASET-ENHANCED APPROACH")
        print("-" * 40)
        enhanced_result = await enhanced_generator.generate_manim_code(test_prompt)
        
        if enhanced_result["success"]:
            print(f"✅ Enhanced generation successful using {enhanced_result['method']}")
            print(f"📊 Examples used: {enhanced_result.get('examples_used', 0)}")
            print(f"🏷️ Category: {enhanced_result.get('category', 'unknown')}")
            enhanced_code = enhanced_result["code"]
            print("📄 Generated code preview:")
            print(enhanced_code[:300] + "..." if len(enhanced_code) > 300 else enhanced_code)
        else:
            print("❌ Enhanced generation failed")
            return False
        
        # Create videos from both approaches
        simple_video = await create_manim_video(simple_code, "simple_neural_network")
        enhanced_video = await create_manim_video(enhanced_code, "enhanced_neural_network")
        
        # Analyze differences
        await analyze_code_differences(simple_code, enhanced_code)
        await analyze_video_differences(simple_video, enhanced_video)
        
        # Save code comparison
        save_code_comparison(simple_code, enhanced_code, test_prompt)
        
        print("\n🎉 COMPARISON COMPLETE!")
        print("=" * 60)
        print("📁 Check the following files:")
        print(f"  📄 Code comparison: comparison_results/code_comparison.md")
        if simple_video:
            print(f"  🎬 Simple video: {simple_video}")
        if enhanced_video:
            print(f"  🎬 Enhanced video: {enhanced_video}")
        
        return True
        
    except Exception as e:
        print(f"❌ Comparison failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def create_manim_video(code: str, clip_name: str) -> str:
    """Create a Manim video from the generated code"""
    
    try:
        # Create temporary file for the code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
            temp_file.write(code)
            temp_file_path = temp_file.name
        
        # Create output directory
        output_dir = f"comparison_results/{clip_name}"
        os.makedirs(output_dir, exist_ok=True)
        
        # Run Manim command
        cmd = [
            "manim", temp_file_path, "GenScene",
            "-o", clip_name,
            "--media_dir", output_dir,
            "-v", "WARNING",
            "-qm",
            "--resolution", "1280,720",
            "--frame_rate", "24"
        ]
        
        print(f"🎬 Generating {clip_name} video...")
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            # Find the generated video file
            video_files = list(Path(output_dir).rglob("*.mp4"))
            if video_files:
                # Filter out partial files and get main file
                main_files = [f for f in video_files if "partial_movie_files" not in str(f)]
                if main_files:
                    video_path = str(main_files[0])
                    print(f"✅ {clip_name} video generated: {video_path}")
                    
                    # Get video duration
                    duration = get_video_duration(video_path)
                    print(f"⏱️ Duration: {duration:.2f} seconds")
                    
                    return video_path
        
        print(f"❌ {clip_name} video generation failed: {stderr.decode()}")
        return None
        
    except Exception as e:
        print(f"❌ Error creating {clip_name} video: {e}")
        return None
    finally:
        # Clean up temporary file
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

def get_video_duration(video_path: str) -> float:
    """Get video duration using ffprobe"""
    try:
        cmd = ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', video_path]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return float(data['format']['duration'])
    except Exception as e:
        print(f"⚠️ Could not get duration: {e}")
    return 0.0

async def analyze_code_differences(simple_code: str, enhanced_code: str):
    """Analyze the differences between simple and enhanced code"""
    
    print("\n📊 CODE ANALYSIS")
    print("-" * 20)
    
    # Count lines
    simple_lines = len(simple_code.split('\n'))
    enhanced_lines = len(enhanced_code.split('\n'))
    
    print(f"📏 Code length:")
    print(f"  Simple: {simple_lines} lines")
    print(f"  Enhanced: {enhanced_lines} lines")
    
    # Analyze complexity indicators
    simple_complexity = analyze_code_complexity(simple_code)
    enhanced_complexity = analyze_code_complexity(enhanced_code)
    
    print(f"🔍 Complexity analysis:")
    print(f"  Simple approach:")
    for key, value in simple_complexity.items():
        print(f"    {key}: {value}")
    
    print(f"  Enhanced approach:")
    for key, value in enhanced_complexity.items():
        print(f"    {key}: {value}")

def analyze_code_complexity(code: str) -> dict:
    """Analyze code complexity metrics"""
    
    metrics = {
        "self.play() calls": code.count("self.play("),
        "self.wait() calls": code.count("self.wait("),
        "VGroup usage": code.count("VGroup("),
        "Circle objects": code.count("Circle("),
        "Line objects": code.count("Line("),
        "Text objects": code.count("Text("),
        "Color usage": code.count("color="),
        "Animation methods": code.count(".animate."),
        "Transform calls": code.count("Transform("),
        "Create calls": code.count("Create("),
        "Write calls": code.count("Write("),
        "FadeIn calls": code.count("FadeIn("),
        "FadeOut calls": code.count("FadeOut(")
    }
    
    return metrics

async def analyze_video_differences(simple_video: str, enhanced_video: str):
    """Analyze differences between generated videos"""
    
    print("\n🎬 VIDEO ANALYSIS")
    print("-" * 20)
    
    if simple_video and enhanced_video:
        simple_duration = get_video_duration(simple_video)
        enhanced_duration = get_video_duration(enhanced_video)
        
        print(f"⏱️ Duration comparison:")
        print(f"  Simple: {simple_duration:.2f}s")
        print(f"  Enhanced: {enhanced_duration:.2f}s")
        print(f"  Difference: {enhanced_duration - simple_duration:+.2f}s")
        
        # Extract frames for visual comparison
        await extract_comparison_frames(simple_video, enhanced_video)
    else:
        print("⚠️ Cannot compare videos - one or both failed to generate")

async def extract_comparison_frames(simple_video: str, enhanced_video: str):
    """Extract frames from both videos for visual comparison"""
    
    try:
        os.makedirs("comparison_results/frames", exist_ok=True)
        
        # Extract frame from simple video
        simple_frame = "comparison_results/frames/simple_frame.png"
        cmd1 = ["ffmpeg", "-y", "-i", simple_video, "-ss", "3", "-vframes", "1", simple_frame]
        await asyncio.create_subprocess_exec(*cmd1, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        
        # Extract frame from enhanced video  
        enhanced_frame = "comparison_results/frames/enhanced_frame.png"
        cmd2 = ["ffmpeg", "-y", "-i", enhanced_video, "-ss", "3", "-vframes", "1", enhanced_frame]
        await asyncio.create_subprocess_exec(*cmd2, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        
        if os.path.exists(simple_frame) and os.path.exists(enhanced_frame):
            print(f"📸 Comparison frames extracted:")
            print(f"  Simple: {simple_frame}")
            print(f"  Enhanced: {enhanced_frame}")
    
    except Exception as e:
        print(f"⚠️ Frame extraction failed: {e}")

def save_code_comparison(simple_code: str, enhanced_code: str, prompt: str):
    """Save detailed code comparison to file"""
    
    os.makedirs("comparison_results", exist_ok=True)
    
    comparison_content = f"""# Manim Generation Quality Comparison

## Test Prompt
```
{prompt}
```

## Simple Approach Code
```python
{simple_code}
```

## Dataset-Enhanced Approach Code  
```python
{enhanced_code}
```

## Analysis Summary

### Code Complexity
- **Simple Lines:** {len(simple_code.split('\n'))}
- **Enhanced Lines:** {len(enhanced_code.split('\n'))}

### Key Differences
{analyze_key_differences(simple_code, enhanced_code)}

### Quality Improvements
{identify_quality_improvements(simple_code, enhanced_code)}
"""

    with open("comparison_results/code_comparison.md", "w") as f:
        f.write(comparison_content)
    
    print("📄 Code comparison saved to comparison_results/code_comparison.md")

def analyze_key_differences(simple_code: str, enhanced_code: str) -> str:
    """Analyze key differences between the two approaches"""
    
    differences = []
    
    if "VGroup" in enhanced_code and "VGroup" not in simple_code:
        differences.append("- Enhanced version uses VGroup for better object organization")
    
    if enhanced_code.count("Circle(") > simple_code.count("Circle("):
        differences.append("- Enhanced version creates more complex multi-element structures")
    
    if enhanced_code.count("Line(") > simple_code.count("Line("):
        differences.append("- Enhanced version includes connection lines between elements")
    
    if enhanced_code.count("self.play(") > simple_code.count("self.play("):
        differences.append("- Enhanced version has more animation steps for smoother flow")
    
    if "color=" in enhanced_code and enhanced_code.count("color=") > simple_code.count("color="):
        differences.append("- Enhanced version uses more sophisticated color schemes")
    
    return "\n".join(differences) if differences else "- Similar structure and complexity"

def identify_quality_improvements(simple_code: str, enhanced_code: str) -> str:
    """Identify quality improvements in enhanced version"""
    
    improvements = []
    
    if "neural" in enhanced_code.lower() or "network" in enhanced_code.lower():
        improvements.append("- Uses domain-specific neural network terminology and structure")
    
    if enhanced_code.count("for") > simple_code.count("for"):
        improvements.append("- Employs programmatic generation of elements for scalability")
    
    if "layer" in enhanced_code.lower():
        improvements.append("- Implements proper layered architecture visualization")
    
    if enhanced_code.count("animate") > simple_code.count("animate"):
        improvements.append("- Includes more sophisticated animation transitions")
    
    return "\n".join(improvements) if improvements else "- Code structure improvements"

if __name__ == "__main__":
    success = asyncio.run(test_quality_comparison())
    if success:
        print("\n🎉 Comparison test completed successfully!")
    else:
        print("\n❌ Comparison test failed!")