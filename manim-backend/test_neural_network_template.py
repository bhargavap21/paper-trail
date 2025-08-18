#!/usr/bin/env python3
"""
Test script specifically for neural network template generation
"""
import sys
import tempfile
import subprocess
from pathlib import Path

# Add current directory to Python path
sys.path.append('.')

from enhanced_manim_generator import EnhancedManimGenerator, CodeGenerationContext

def test_neural_network_template():
    """Test the neural network template generation and execution"""
    print("🧪 TESTING NEURAL NETWORK TEMPLATE")
    print("=" * 50)
    
    # Test neural network prompt
    prompt = "Neural networks are computational models with interconnected nodes and weighted connections"
    
    # Create generator
    generator = EnhancedManimGenerator()
    context = CodeGenerationContext(prompt=prompt)
    print(f"📝 Prompt: {prompt}")
    
    # Generate code
    print("\n🤖 Generating neural network template...")
    code = generator._generate_adaptive_template(prompt, context)
    
    # Check if it's actually a network template
    is_network_template = "Neural Networks" in code
    print(f"✅ Generated {'NETWORK' if is_network_template else 'OTHER'} template")
    
    # Preview the code
    print("\n📄 Generated code preview:")
    print("-" * 50)
    print(code[:500] + "..." if len(code) > 500 else code)
    print("-" * 50)
    
    # Test if the code compiles and runs
    print("\n🧪 Testing code execution...")
    
    # Write to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name
    
    try:
        # Create output directory
        output_dir = Path("test_outputs/neural_network_test")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Run manim command
        cmd = [
            "manim", temp_file, "SimpleScene",
            "-o", "neural_network_test",
            "--media_dir", str(output_dir),
            "-v", "WARNING",
            "-qm",
            "--resolution", "1280,720",
            "--frame_rate", "24"
        ]
        
        print(f"🎬 Running: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ Neural network template executed successfully!")
            
            # Look for generated video
            video_files = list(output_dir.glob("**/*.mp4"))
            if video_files:
                video_file = video_files[0]
                file_size = video_file.stat().st_size
                print(f"📹 Generated video: {video_file}")
                print(f"📏 File size: {file_size:,} bytes")
                
                # Check if it's a proper video (not just a tiny partial file)
                if file_size > 50000:  # 50KB threshold
                    print("✅ Video appears to have substantial content!")
                    return True
                else:
                    print("⚠️  Video file is very small, may be partial")
                    return False
            else:
                print("❌ No video file found")
                return False
        else:
            print("❌ Manim execution failed:")
            print(f"stdout: {result.stdout}")
            print(f"stderr: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Manim execution timed out")
        return False
    except Exception as e:
        print(f"❌ Error during execution: {e}")
        return False
    finally:
        # Clean up temp file
        Path(temp_file).unlink(missing_ok=True)

if __name__ == "__main__":
    success = test_neural_network_template()
    print(f"\n🎯 Test {'PASSED' if success else 'FAILED'}")
    sys.exit(0 if success else 1)