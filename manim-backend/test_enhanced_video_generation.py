#!/usr/bin/env python3
"""
Test Enhanced Video Generation
Generate a video using the scalable dataset-enhanced generator for user verification
"""

import asyncio
from simple_video_generator import SimpleVideoGenerator

async def generate_test_video():
    """Generate a test video using the enhanced scalable generator"""
    
    print("🎬 ENHANCED VIDEO GENERATION TEST")
    print("=" * 60)
    print("Generating video with scalable dataset-enhanced approach...")
    
    # Initialize the enhanced video generator
    generator = SimpleVideoGenerator()
    
    # Verify we're using the scalable approach
    generator_type = type(generator.manim_generator).__name__
    print(f"🔍 Using generator: {generator_type}")
    
    if generator_type == "ScalableDatasetEnhancedManimGenerator":
        print("✅ Scalable dataset-enhanced generator confirmed")
        dataset_size = len(generator.manim_generator.dataset)
        print(f"📊 Dataset size: {dataset_size} examples")
    
    # Create a test clip that should trigger good similarity matching
    test_clips = [{
        "description": "Create an animation showing a neural network with multiple layers, nodes, and connections. Show data flowing through the network with color changes and smooth transitions.",
        "duration": 12
    }]
    
    print(f"\n🎯 Generating video with prompt:")
    print(f"   '{test_clips[0]['description']}'")
    print(f"⏱️  Target duration: {test_clips[0]['duration']} seconds")
    
    try:
        # Generate the video clips
        result = await generator.generate_simple_manim_clips(test_clips)
        
        print(f"\n📊 GENERATION RESULTS:")
        print(f"✅ Successful clips: {result['successful_clips']}")
        print(f"❌ Failed clips: {result['failed_clips']}")
        
        if result['successful_clips'] > 0:
            print(f"📁 Generated video paths:")
            for i, path in enumerate(result['clip_paths']):
                print(f"   {i+1}. {path}")
            
            # Show detailed generation information
            if result['generation_details']:
                details = result['generation_details'][0]
                print(f"\n🔍 ENHANCED GENERATION DETAILS:")
                print(f"📁 Video path: {details.get('path', 'Unknown')}")
                print(f"🔧 Generation method: {details.get('method', 'Unknown')}")
                
                if 'primary_domain' in details:
                    print(f"🎯 Detected domain: {details['primary_domain']}")
                
                if 'examples_used' in details:
                    print(f"📚 Examples used: {details['examples_used']}")
                
                if 'similarity_scores' in details and details['similarity_scores']:
                    scores = details['similarity_scores'][:3]
                    print(f"📊 Top similarity scores: {[f'{s:.1f}' for s in scores]}")
                
                # Show the actual video file location
                video_path = details.get('path')
                if video_path:
                    print(f"\n🎥 VIDEO READY FOR VIEWING:")
                    print(f"   File: {video_path}")
                    print(f"   📂 You can open this file to view the enhanced animation!")
                    
                    # Try to get file info
                    try:
                        import os
                        if os.path.exists(video_path):
                            file_size = os.path.getsize(video_path)
                            print(f"   📏 File size: {file_size:,} bytes")
                            print(f"   ✅ Video file confirmed to exist")
                        else:
                            print(f"   ⚠️ Video file not found at expected location")
                    except Exception as e:
                        print(f"   ℹ️ Could not check file details: {e}")
            
            print(f"\n🎉 SUCCESS! Enhanced video generated successfully!")
            print(f"🔍 This video was created using:")
            print(f"   • Scalable dataset-enhanced generator")
            print(f"   • Intelligent similarity scoring")
            print(f"   • Domain-specific guidance")
            print(f"   • Multi-factor example selection")
            
        else:
            print(f"❌ Video generation failed")
            print(f"ℹ️ Check the logs above for error details")
            
    except Exception as e:
        print(f"❌ Error during video generation: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(generate_test_video())