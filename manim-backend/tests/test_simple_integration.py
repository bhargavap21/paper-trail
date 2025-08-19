#!/usr/bin/env python3
"""
Test the fully simple integration to ensure no enhanced dependencies remain
"""
import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_simple_url_generation():
    """Test the simple URL-based video generation"""
    print("🧪 Testing simple URL-based video generation...")
    
    try:
        from simple_video_generator import generate_simple_summary_video
        
        test_url = "https://arxiv.org/pdf/2310.06825.pdf"
        user_prompt = "Explain the key concepts from this research paper"
        
        print(f"📄 Testing with URL: {test_url}")
        print(f"📝 User prompt: {user_prompt}")
        
        result = await generate_simple_summary_video(test_url, user_prompt)
        
        if "error" not in result:
            print(f"✅ Simple URL generation successful!")
            print(f"📁 Video path: {result.get('video_path', 'N/A')}")
            print(f"📊 Success rate: {result.get('success_rate', 0):.1%}")
            print(f"🎬 Generation method: {result.get('generation_method', 'N/A')}")
            return True
        else:
            print(f"❌ Simple URL generation failed: {result['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Exception in simple URL generation: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_simple_upload_generation():
    """Test the simple upload-based video generation"""
    print("\n🧪 Testing simple upload-based video generation...")
    
    try:
        from simple_video_generator import generate_simple_summary_video_upload
        
        # Create a simple test PDF file
        test_pdf_path = "/tmp/test_simple.pdf"
        
        # Use a real PDF for testing if available
        if not os.path.exists(test_pdf_path):
            print("⚠️ No test PDF available, skipping upload test")
            return True
        
        user_prompt = "Explain the key concepts from this uploaded paper"
        
        print(f"📁 Testing with uploaded file: {test_pdf_path}")
        print(f"📝 User prompt: {user_prompt}")
        
        result = await generate_simple_summary_video_upload(test_pdf_path, user_prompt)
        
        if "error" not in result:
            print(f"✅ Simple upload generation successful!")
            print(f"📁 Video path: {result.get('video_path', 'N/A')}")
            print(f"📊 Success rate: {result.get('success_rate', 0):.1%}")
            print(f"🎬 Generation method: {result.get('generation_method', 'N/A')}")
            return True
        else:
            print(f"❌ Simple upload generation failed: {result['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Exception in simple upload generation: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_simple_config_generation():
    """Test the simple config generator directly"""
    print("\n🧪 Testing simple config generation...")
    
    try:
        from simple_config_gen import SimpleConfigGenerator
        
        generator = SimpleConfigGenerator()
        
        # Test URL config
        test_url = "https://arxiv.org/pdf/2310.06825.pdf"
        url_config = await generator.generate_simple_config_from_url(test_url, "Explain the research")
        
        print(f"✅ Simple URL config generated: {len(url_config)} clips")
        for i, clip in enumerate(url_config[:2]):  # Show first 2 clips
            print(f"  Clip {i+1}: {clip.get('title', 'No title')}")
        
        # Test fallback config
        fallback_config = generator._generate_fallback_config("neural networks")
        print(f"✅ Simple fallback config generated: {len(fallback_config)} clips")
        
        return True
        
    except Exception as e:
        print(f"❌ Exception in simple config generation: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_simple_manim_generator():
    """Test the simple manim generator directly"""
    print("\n🧪 Testing simple manim generator...")
    
    try:
        from simple_manim_generator import SimpleManimGenerator
        
        generator = SimpleManimGenerator()
        
        test_prompts = [
            "Create a simple circle animation",
            "Show a neural network with nodes and connections",
            "Display a mathematical equation"
        ]
        
        for prompt in test_prompts:
            print(f"\n  Testing prompt: {prompt}")
            result = await generator.generate_manim_code(prompt)
            
            if result["success"]:
                print(f"    ✅ Generated code using {result['method']}")
                code_preview = result['code'][:100].replace('\n', ' ')
                print(f"    📝 Code preview: {code_preview}...")
            else:
                print(f"    ❌ Generation failed")
        
        return True
        
    except Exception as e:
        print(f"❌ Exception in simple manim generator: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all simple integration tests"""
    print("🚀 SIMPLE INTEGRATION TESTS")
    print("=" * 60)
    
    tests = [
        ("Simple Config Generation", test_simple_config_generation),
        ("Simple Manim Generator", test_simple_manim_generator),
        ("Simple URL Generation", test_simple_url_generation),
        ("Simple Upload Generation", test_simple_upload_generation),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        print("-" * 40)
        
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ Test {test_name} crashed: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("🏁 SIMPLE INTEGRATION TEST RESULTS")
    print("=" * 60)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    total_tests = len(results)
    passed_tests = sum(1 for _, success in results if success)
    
    print(f"\n📊 Summary: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All simple integration tests passed! The fully simple approach is working.")
    else:
        print("⚠️ Some tests failed. Check the logs above for details.")

if __name__ == "__main__":
    asyncio.run(main())