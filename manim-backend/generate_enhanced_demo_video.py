#!/usr/bin/env python3
"""
Generate Enhanced Demo Video
Create a working demo video using the enhanced generator's fallback system
"""

import asyncio
import tempfile
import subprocess
from pathlib import Path
from scalable_dataset_enhanced_generator import ScalableDatasetEnhancedManimGenerator

async def generate_demo_video():
    """Generate a demo video showcasing the enhanced approach"""
    
    print("🎬 GENERATING ENHANCED DEMO VIDEO")
    print("=" * 60)
    
    # Initialize the enhanced generator
    generator = ScalableDatasetEnhancedManimGenerator()
    
    print(f"🔍 Using: {type(generator).__name__}")
    print(f"📊 Dataset size: {len(generator.dataset)} examples")
    print(f"🎯 Available domains: {', '.join(generator.domain_taxonomy.keys())}")
    
    # Test prompt that should get good similarity matching
    test_prompt = "Create a neural network visualization with multiple layers and data flow"
    
    print(f"\n🎯 Test prompt: '{test_prompt}'")
    
    # Generate code using the enhanced approach
    result = await generator.generate_manim_code(test_prompt)
    
    print(f"\n📊 GENERATION RESULTS:")
    print(f"✅ Success: {result['success']}")
    print(f"🔧 Method: {result['method']}")
    print(f"📚 Examples used: {result['examples_used']}")
    
    if 'selection_method' in result:
        print(f"🔍 Selection method: {result['selection_method']}")
    
    if 'primary_domain' in result:
        print(f"🎯 Primary domain: {result['primary_domain']}")
    
    if 'similarity_scores' in result and result['similarity_scores']:
        scores = result['similarity_scores'][:3]
        print(f"📈 Top similarity scores: {[f'{s:.1f}' for s in scores]}")
    
    # Save and render the generated code
    if result['success'] and result['code']:
        print(f"\n🎬 RENDERING VIDEO...")
        
        # Create a temporary file for the code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(result['code'])
            temp_code_path = f.name
        
        try:
            # Create output directory
            output_dir = Path("enhanced_demo_video")
            output_dir.mkdir(exist_ok=True)
            
            # Run Manim to generate the video
            cmd = [
                "manim", temp_code_path, "GenScene",
                "-o", "enhanced_demo",
                "--media_dir", str(output_dir),
                "-v", "WARNING",
                "-qm",  # Medium quality
                "--resolution", "1280,720",
                "--frame_rate", "24"
            ]
            
            print(f"🔧 Running: {' '.join(cmd)}")
            
            # Run the command
            process = subprocess.run(
                cmd, 
                capture_output=True, 
                text=True, 
                timeout=120  # 2 minute timeout
            )
            
            if process.returncode == 0:
                print("✅ Video rendered successfully!")
                
                # Find the generated video file
                video_files = list(output_dir.rglob("*.mp4"))
                if video_files:
                    video_path = video_files[0]
                    print(f"🎥 VIDEO READY: {video_path}")
                    print(f"📏 File size: {video_path.stat().st_size:,} bytes")
                    
                    print(f"\n🎉 SUCCESS! Enhanced demo video generated!")
                    print(f"📁 Location: {video_path.absolute()}")
                    print(f"\n🔍 This video demonstrates:")
                    print(f"   ✅ Scalable dataset-enhanced generation")
                    print(f"   ✅ Domain detection: {result.get('primary_domain', 'N/A')}")
                    print(f"   ✅ Similarity scoring: {result.get('examples_used', 0)} examples used")
                    print(f"   ✅ Intelligent example selection")
                    
                    # Show the actual generated code preview
                    print(f"\n💻 GENERATED CODE PREVIEW:")
                    lines = result['code'].split('\n')
                    for i, line in enumerate(lines[:15], 1):
                        print(f"   {i:2d}: {line}")
                    if len(lines) > 15:
                        print(f"   ... ({len(lines) - 15} more lines)")
                    
                else:
                    print("⚠️ Video file not found in expected location")
                    
            else:
                print(f"❌ Manim rendering failed:")
                print(f"stdout: {process.stdout}")
                print(f"stderr: {process.stderr}")
                
        except subprocess.TimeoutExpired:
            print("❌ Manim rendering timed out")
        except Exception as e:
            print(f"❌ Error during rendering: {e}")
        finally:
            # Clean up temporary file
            Path(temp_code_path).unlink(missing_ok=True)
    
    else:
        print(f"❌ Code generation failed")

if __name__ == "__main__":
    asyncio.run(generate_demo_video())