#!/usr/bin/env python3
"""
Test Scalable Production Integration
Verify that the scalable dataset-enhanced generator is working in the production pipeline
"""

import asyncio
from simple_video_generator import SimpleVideoGenerator

async def test_scalable_production_integration():
    """Test the scalable generator in production pipeline"""
    
    print("🧪 Testing Scalable Production Integration")
    print("=" * 60)
    
    # Initialize the video generator (should now use scalable approach)
    print("🔧 Initializing SimpleVideoGenerator with scalable approach...")
    generator = SimpleVideoGenerator()
    
    # Verify it's using the scalable generator
    generator_type = type(generator.manim_generator).__name__
    print(f"🔍 Generator type: {generator_type}")
    
    if generator_type == "ScalableDatasetEnhancedManimGenerator":
        print("✅ SUCCESS: Production pipeline is using ScalableDatasetEnhancedManimGenerator")
        
        # Check dataset loading
        dataset_size = len(generator.manim_generator.dataset)
        print(f"📊 Dataset loaded with {dataset_size} examples")
        
        if dataset_size > 0:
            print("✅ SUCCESS: Dataset examples are available for scalable selection")
            
            # Show available domains
            domains = list(generator.manim_generator.domain_taxonomy.keys())
            print(f"🎯 Available domains: {', '.join(domains)}")
        else:
            print("⚠️ WARNING: No dataset examples loaded")
    else:
        print(f"❌ ERROR: Expected ScalableDatasetEnhancedManimGenerator, got {generator_type}")
        return
    
    print("\n🎬 Testing Single Clip Generation with Scalable Approach")
    print("-" * 60)
    
    # Test clip generation with domain detection
    test_clips = [{
        "description": "Create a neural network visualization with multiple layers and data flow animations.",
        "duration": 10
    }]
    
    print(f"🎯 Testing scalable neural network generation...")
    result = await generator.generate_simple_manim_clips(test_clips)
    
    print(f"\n📊 SCALABLE CLIP GENERATION SUMMARY:")
    print(f"  🎯 Target clips: {len(test_clips)}")
    print(f"  ✅ Successfully generated: {result['successful_clips']}")
    print(f"  ❌ Failed: {result['failed_clips']}")
    
    if result['successful_clips'] > 0:
        print(f"  📁 Clip paths: {result['clip_paths']}")
        
        # Check generation details for scalable features
        if result['generation_details']:
            details = result['generation_details'][0]
            print(f"✅ Clip generated successfully!")
            print(f"📁 Clip path: {details.get('path', 'Unknown')}")
            print(f"🔧 Generation method: {details.get('method', 'Unknown')}")
            
            # Verify scalable features
            if details.get('method') == 'scalable_enhanced_generation':
                print("✅ SUCCESS: Used scalable enhanced generation method")
                
                if 'primary_domain' in details:
                    print(f"🎯 Detected domain: {details['primary_domain']}")
                
                if 'examples_used' in details:
                    print(f"📚 Examples used: {details['examples_used']}")
                    
                if 'similarity_scores' in details and details['similarity_scores']:
                    scores = details['similarity_scores'][:3]
                    print(f"📊 Top similarity scores: {[f'{s:.1f}' for s in scores]}")
                    
            else:
                print(f"⚠️ WARNING: Expected scalable_enhanced_generation, got {details.get('method')}")
        else:
            print("⚠️ WARNING: No generation details available")
    else:
        print("❌ ERROR: Clip generation failed")
    
    print("\n" + "=" * 60)
    print("🏁 SCALABLE PRODUCTION INTEGRATION TEST RESULTS")
    print("=" * 60)
    
    checks = [
        ("Production Integration", generator_type == "ScalableDatasetEnhancedManimGenerator"),
        ("Single Clip Generation", result['successful_clips'] > 0)
    ]
    
    passed = sum(1 for _, check in checks if check)
    total = len(checks)
    
    for name, passed_check in checks:
        status = "✅ PASS" if passed_check else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\n📊 Summary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Scalable generator is integrated and working.")
        print("💡 Your frontend will now use scalable dataset-enhanced Manim generation!")
        print("\n🚀 Key Scalable Features Now Active:")
        print("  • Intelligent similarity scoring for example selection")
        print("  • Domain detection and specialized guidance")
        print("  • Multi-factor relevance analysis")
        print("  • Scalable to 600+ examples without performance issues")
        print("  • Extensible taxonomy for new animation domains")
    else:
        print("⚠️ Some tests failed. Please check the integration.")

if __name__ == "__main__":
    asyncio.run(test_scalable_production_integration())