#!/usr/bin/env python3

import asyncio
import sys
import os

# Test if our improved pipeline can be imported and works
def test_import():
    """Test importing our improved modules"""
    print("🔍 Testing module imports...")
    
    try:
        from manim_generator import generate_manim_clips
        print("   ✅ manim_generator imported successfully")
        
        from video_generator import generate_summary_video_upload
        print("   ✅ video_generator imported successfully")
        
        return True
    except Exception as e:
        print(f"   ❌ Import failed: {e}")
        return False

async def test_direct_pipeline():
    """Test the direct pipeline that we know works"""
    print("\n🧪 Testing direct pipeline...")
    
    try:
        from manim_generator import generate_manim_clips
        
        # Simple test clip
        test_clips = [{
            "code": """
class SimpleTest(Scene):
    def construct(self):
        text = Text("Test", font_size=48)
        self.play(Write(text))
        self.wait(1)
""",
            "voice_over": "Test clip"
        }]
        
        output_dir = "debug_test"
        os.makedirs(output_dir, exist_ok=True)
        
        print("   🚀 Running generate_manim_clips...")
        result = await generate_manim_clips(
            test_clips, 
            output_dir, 
            "medium_quality",
            target_clips=1,
            max_retries=1
        )
        
        print(f"   📊 Result: {len(result) if result else 0} clips generated")
        
        if result and len(result) > 0:
            print("   ✅ Direct pipeline works!")
            return True
        else:
            print("   ❌ Direct pipeline failed")
            return False
            
    except Exception as e:
        print(f"   💥 Pipeline error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_server_import():
    """Test what the server is actually importing"""
    print("\n🖥️  Testing server imports...")
    
    try:
        # This mimics what server.py does
        from video_generator import generate_summary_video_upload
        
        # Check if the function has our improvements
        import inspect
        source = inspect.getsource(generate_summary_video_upload)
        
        if "target_clips=4" in source and "max_retries=2" in source:
            print("   ✅ Server imports include our improvements")
            return True
        else:
            print("   ❌ Server imports are using old code")
            print("   🔍 Checking function signature...")
            sig = inspect.signature(generate_summary_video_upload)
            print(f"   📝 Function signature: {sig}")
            return False
            
    except Exception as e:
        print(f"   💥 Server import test failed: {e}")
        return False

if __name__ == "__main__":
    print("🐛 Debugging Server Integration Issue")
    print("=" * 50)
    
    # Test 1: Imports
    import_ok = test_import()
    
    # Test 2: Direct pipeline
    if import_ok:
        pipeline_ok = asyncio.run(test_direct_pipeline())
    else:
        pipeline_ok = False
    
    # Test 3: Server imports
    server_ok = test_server_import()
    
    print(f"\n📊 RESULTS:")
    print(f"   Imports: {'✅' if import_ok else '❌'}")
    print(f"   Pipeline: {'✅' if pipeline_ok else '❌'}")
    print(f"   Server: {'✅' if server_ok else '❌'}")
    
    if import_ok and pipeline_ok and server_ok:
        print("\n🎯 All tests passed - server should work!")
    else:
        print("\n💀 Issues detected - server integration will fail")
        
    sys.exit(0 if (import_ok and pipeline_ok and server_ok) else 1)