#!/usr/bin/env python3
"""
Test the production integration to verify dataset-enhanced generator is working
"""
import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_production_integration():
    """Test that the production pipeline is using the enhanced generator"""
    
    print("🧪 Testing Production Integration with Enhanced Generator")
    print("=" * 60)
    
    try:
        # Import the production video generator
        from simple_video_generator import SimpleVideoGenerator
        
        # Create generator instance
        generator = SimpleVideoGenerator()
        
        # Check that it's using the enhanced generator
        generator_type = type(generator.manim_generator).__name__
        print(f"🔍 Generator type: {generator_type}")
        
        if generator_type == "DatasetEnhancedManimGenerator":
            print("✅ SUCCESS: Production pipeline is using DatasetEnhancedManimGenerator")
            
            # Test that dataset is loaded
            if hasattr(generator.manim_generator, 'dataset'):
                dataset_size = len(generator.manim_generator.dataset)
                print(f"📊 Dataset loaded with {dataset_size} examples")
                
                if dataset_size > 0:
                    print("✅ SUCCESS: Dataset examples are available for enhanced generation")
                    
                    # Show some example categories
                    categories = set(example.category for example in generator.manim_generator.dataset)
                    print(f"🏷️ Available categories: {', '.join(categories)}")
                    
                    return True
                else:
                    print("⚠️ WARNING: Dataset is empty - will fall back to basic generation")
                    return False
            else:
                print("⚠️ WARNING: Dataset attribute not found")
                return False
        else:
            print(f"❌ FAILED: Expected DatasetEnhancedManimGenerator, got {generator_type}")
            return False
        
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_single_clip_generation():
    """Test generating a single clip to verify enhanced quality"""
    
    print("\n🎬 Testing Single Clip Generation")
    print("-" * 40)
    
    try:
        from simple_video_generator import SimpleVideoGenerator
        
        generator = SimpleVideoGenerator()
        
        # Test config for neural network (should use dataset examples)
        test_config = [{
            "title": "Neural Network Test",
            "voice_over": "Create a neural network visualization with multiple layers and connections.",
            "description": "Test neural network animation with enhanced generator"
        }]
        
        print("🎯 Testing neural network generation...")
        result = await generator.generate_simple_manim_clips(test_config)
        
        if result["successful_clips"] > 0:
            print(f"✅ Clip generated successfully!")
            print(f"📁 Clip path: {result['clip_paths'][0]}")
            
            # Check generation details for enhanced features
            details = result["generation_details"][0]
            if "method" in details:
                print(f"🔧 Generation method: {details['method']}")
                
                if "dataset_enhanced" in details["method"]:
                    print("✅ SUCCESS: Used dataset-enhanced generation method")
                    return True
                else:
                    print("⚠️ WARNING: Did not use dataset-enhanced method")
                    return False
            else:
                print("⚠️ No generation method info available")
                return False
        else:
            print("❌ Clip generation failed")
            return False
            
    except Exception as e:
        print(f"❌ Clip generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all production integration tests"""
    
    tests = [
        ("Production Integration", test_production_integration),
        ("Single Clip Generation", test_single_clip_generation)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ Test {test_name} crashed: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("🏁 PRODUCTION INTEGRATION TEST RESULTS")
    print("=" * 60)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    total_tests = len(results)
    passed_tests = sum(1 for _, success in results if success)
    
    print(f"\n📊 Summary: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! Enhanced generator is integrated and working.")
        print("💡 Your frontend will now use dataset-enhanced Manim generation!")
    else:
        print("⚠️ Some tests failed. Check the logs above for details.")

if __name__ == "__main__":
    asyncio.run(main())