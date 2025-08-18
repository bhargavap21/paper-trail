#!/usr/bin/env python3
"""
Test script to verify the improved Manim code sanitization and retry logic.
"""
import asyncio
import os
import tempfile
from manim_generator import generate_manim_clips, generate_manim_video

def test_code_sanitizer():
    """Test various problematic LLM-generated code examples"""
    print("🧪 Testing code sanitizer with problematic examples...")
    
    test_cases = [
        # Test case 1: Smart quotes issue
        {
            "name": "Smart quotes",
            "code": '''
class SimpleScene(Scene):
    def construct(self):
        text = Text("Hello "world" with smart quotes")
        self.play(ShowCreation(text))
        self.wait(1)
'''
        },
        
        # Test case 2: Deprecated methods
        {
            "name": "Deprecated ShowCreation",
            "code": '''
class SimpleScene(Scene):
    def construct(self):
        circle = Circle()
        self.play(ShowCreation(circle))
        self.wait(1)
'''
        },
        
        # Test case 3: Missing class structure
        {
            "name": "Missing class structure",
            "code": '''
title = Text("Test")
self.play(Write(title))
self.wait(1)
'''
        },
        
        # Test case 4: Syntax errors
        {
            "name": "Syntax errors",
            "code": '''
class SimpleScene(Scene)
    def construct(self)
        text = Text("Missing colons"
        self.play(Write(text)
        self.wait(1
'''
        }
    ]
    
    # Import the sanitizer function
    from manim_generator import sanitize_manim_code
    
    for i, test_case in enumerate(test_cases):
        print(f"\n📝 Test {i+1}: {test_case['name']}")
        print("Original code:")
        print(test_case['code'])
        print("\nSanitized code:")
        
        try:
            sanitized = sanitize_manim_code(test_case['code'])
            print(sanitized)
            
            # Try to compile the sanitized code
            try:
                compile(sanitized, f'<test_{i}>', 'exec')
                print("✅ Sanitized code compiles successfully!")
            except SyntaxError as e:
                print(f"❌ Sanitized code still has syntax errors: {e}")
                
        except Exception as e:
            print(f"❌ Sanitizer failed: {e}")
        
        print("-" * 60)

async def test_retry_logic():
    """Test the retry logic with intentionally failing clips"""
    print("\n🔄 Testing retry logic with mixed success/failure clips...")
    
    # Create test clips with varying degrees of brokenness
    test_clips = [
        {
            "type": "manim", 
            "code": '''
class SimpleScene(Scene):
    def construct(self):
        text = Text("Good clip")
        self.play(Write(text))
        self.wait(1)
''',
            "voice_over": "This is a working clip"
        },
        {
            "type": "manim",
            "code": '''
class SimpleScene(Scene):
    def construct(self):
        # Intentionally broken - undefined variable
        text = Text("Broken clip")
        self.play(ShowCreation(undefined_variable))  # This will fail
        self.wait(1)
''',
            "voice_over": "This clip should fail and retry"
        },
        {
            "type": "manim",
            "code": '''
class SimpleScene(Scene):
    def construct(self):
        text = Text("Another good clip")
        self.play(Write(text))
        self.wait(1)
''',
            "voice_over": "Another working clip"
        },
        {
            "type": "manim",
            "code": '''
# Completely broken syntax
this is not even python code
class SimpleScene(Scene)
    def construct(self
        broken syntax everywhere
''',
            "voice_over": "This should trigger fallback"
        }
    ]
    
    # Create temporary output directory
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"📁 Using temporary directory: {temp_dir}")
        
        try:
            # Test with target of 4 clips and max 1 retry to speed up testing
            video_paths = await generate_manim_clips(
                test_clips, 
                output_dir=temp_dir, 
                quality="low_quality",  # Faster for testing
                target_clips=4,
                max_retries=1
            )
            
            print(f"\n📊 RETRY TEST RESULTS:")
            print(f"  🎯 Target clips: 4")
            print(f"  ✅ Generated clips: {len(video_paths)}")
            print(f"  📁 Generated files:")
            
            for i, path in enumerate(video_paths):
                if os.path.exists(path):
                    size = os.path.getsize(path)
                    print(f"    {i+1}. {os.path.basename(path)} ({size} bytes)")
                else:
                    print(f"    {i+1}. {os.path.basename(path)} (FILE NOT FOUND)")
            
            if len(video_paths) == 4:
                print("🎉 SUCCESS: Generated exactly 4 clips as expected!")
            else:
                print(f"⚠️  Generated {len(video_paths)} clips instead of 4")
                
        except Exception as e:
            print(f"❌ Retry test failed: {e}")
            import traceback
            traceback.print_exc()

async def test_single_clip_generation():
    """Test generating a single clip with the improved sanitizer"""
    print("\n🎬 Testing single clip generation with problematic code...")
    
    problematic_code = '''
class Scene(Scene):  # Wrong class name
    def construct(self):
        # Smart quotes and deprecated method
        title = Text("Hello "world" with smart quotes")
        circle = Circle()
        self.play(ShowCreation(circle))  # Deprecated
        self.play(Write(title))
        self.wait(1)
'''
    
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            video_path = await generate_manim_video(
                problematic_code,
                output_dir=temp_dir,
                clip_name="test_single",
                quality="low_quality"
            )
            
            if video_path and os.path.exists(video_path):
                size = os.path.getsize(video_path)
                print(f"✅ Single clip test successful!")
                print(f"   📁 Generated: {os.path.basename(video_path)} ({size} bytes)")
            else:
                print(f"❌ Single clip test failed - no file generated")
                
        except Exception as e:
            print(f"❌ Single clip test failed: {e}")

async def main():
    """Run all tests"""
    print("🚀 Testing Improved Manim Generation Pipeline")
    print("=" * 60)
    
    # Test 1: Code sanitizer
    test_code_sanitizer()
    
    # Test 2: Retry logic
    await test_retry_logic()
    
    # Test 3: Single clip generation
    await test_single_clip_generation()
    
    print("\n" + "=" * 60)
    print("🏁 All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())