#!/usr/bin/env python3
"""
Test the full video generation pipeline with a real example.
"""
import asyncio
import os
import json
from video_generator import generate_summary_video_upload

async def test_full_pipeline():
    """Test the complete pipeline with a mock PDF"""
    print("🚀 Testing Full Video Generation Pipeline")
    print("=" * 60)
    
    # Create a test PDF file (we'll simulate this)
    test_pdf_path = "test_paper.pdf"
    
    # For testing, we'll create a simple text file to simulate PDF processing
    # In reality, this would be handled by the PDF processing in config_gen.py
    print("📄 Creating test content...")
    
    # We'll directly test the video generation with mock clips
    test_clips = [
        {
            "type": "manim",
            "code": """
class SimpleScene(Scene):
    def construct(self):
        title = Text("Introduction", font_size=48)
        title.to_edge(UP)
        
        bullet1 = Text("• Key concept 1", font_size=24)
        bullet2 = Text("• Key concept 2", font_size=24)
        bullet3 = Text("• Key concept 3", font_size=24)
        
        bullets = VGroup(bullet1, bullet2, bullet3)
        bullets.arrange(DOWN, aligned_edge=LEFT)
        bullets.next_to(title, DOWN, buff=1)
        
        self.play(Write(title))
        self.wait(0.5)
        for bullet in bullets:
            self.play(Write(bullet))
            self.wait(0.3)
        self.wait(1)
        self.play(FadeOut(VGroup(title, bullets)))
        self.wait(0.5)
""",
            "voice_over": "Welcome to this educational video. We'll cover three key concepts in this introduction."
        },
        {
            "type": "manim", 
            "code": """
class SimpleScene(Scene):
    def construct(self):
        title = Text("Mathematical Foundation", font_size=36)
        title.to_edge(UP)
        
        equation = MathTex("f(x) = x^2 + 2x + 1")
        equation.scale(1.5)
        
        factored = MathTex("f(x) = (x + 1)^2")
        factored.scale(1.5)
        factored.next_to(equation, DOWN, buff=1)
        
        self.play(Write(title))
        self.wait(0.5)
        self.play(Write(equation))
        self.wait(1)
        self.play(Write(factored))
        self.wait(1.5)
        self.play(FadeOut(VGroup(title, equation, factored)))
        self.wait(0.5)
""",
            "voice_over": "Let's examine the mathematical foundation. Here we see a quadratic equation and its factored form."
        },
        {
            "type": "manim",
            "code": """
class SimpleScene(Scene):
    def construct(self):
        title = Text("Visual Representation", font_size=36)
        title.to_edge(UP)
        
        # Create a simple graph
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[0, 8, 2],
            x_length=6,
            y_length=4,
        )
        
        parabola = axes.plot(lambda x: (x + 1)**2, color=BLUE)
        
        self.play(Write(title))
        self.wait(0.5)
        self.play(Create(axes))
        self.wait(0.5)
        self.play(Create(parabola))
        self.wait(1.5)
        self.play(FadeOut(VGroup(title, axes, parabola)))
        self.wait(0.5)
""",
            "voice_over": "This visual representation shows the parabolic curve of our function."
        },
        {
            "type": "manim",
            "code": """
class SimpleScene(Scene):
    def construct(self):
        title = Text("Conclusion", font_size=48)
        title.to_edge(UP)
        
        summary = Text("Key Takeaways:", font_size=32)
        summary.next_to(title, DOWN, buff=1)
        
        point1 = Text("1. Mathematical relationships", font_size=24)
        point2 = Text("2. Visual understanding", font_size=24) 
        point3 = Text("3. Practical applications", font_size=24)
        
        points = VGroup(point1, point2, point3)
        points.arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        points.next_to(summary, DOWN, buff=0.5)
        
        self.play(Write(title))
        self.wait(0.5)
        self.play(Write(summary))
        self.wait(0.5)
        for point in points:
            self.play(Write(point))
            self.wait(0.3)
        self.wait(1.5)
        self.play(FadeOut(VGroup(title, summary, points)))
        self.wait(0.5)
""",
            "voice_over": "In conclusion, we've explored mathematical relationships, visual understanding, and practical applications."
        }
    ]
    
    print(f"🎬 Testing with {len(test_clips)} clips...")
    
    try:
        # Import the manim clips generation directly 
        from manim_generator import generate_manim_clips
        
        # Test clip generation with improved retry logic
        output_dir = "test_output"
        os.makedirs(output_dir, exist_ok=True)
        
        video_paths = await generate_manim_clips(
            test_clips, 
            output_dir=output_dir,
            quality="low_quality",  # Faster for testing
            target_clips=4,
            max_retries=2
        )
        
        print(f"\n📊 CLIP GENERATION RESULTS:")
        print(f"  🎯 Target: 4 clips")
        print(f"  ✅ Generated: {len(video_paths)} clips")
        
        if len(video_paths) == 4:
            print(f"🎉 SUCCESS: Generated target number of clips!")
            
            # Test video stitching
            print(f"\n🔗 Testing video stitching...")
            
            from video_generator import stitch_videos
            final_video = stitch_videos(video_paths, "test_final_video.mp4", add_thank_you=True)
            
            if os.path.exists(final_video):
                file_size = os.path.getsize(final_video)
                print(f"✅ Final video created: {final_video}")
                print(f"📁 Size: {file_size} bytes ({file_size/1024/1024:.1f} MB)")
                
                # Test video duration (basic check)
                try:
                    from moviepy import VideoFileClip
                    with VideoFileClip(final_video) as clip:
                        duration = clip.duration
                        print(f"⏱️  Duration: {duration:.1f} seconds")
                        
                        if duration >= 45:  # Target ~60 seconds, allow some variance
                            print(f"🎉 SUCCESS: Video duration meets target!")
                            print(f"🎬 Final video ready at: {os.path.abspath(final_video)}")
                        else:
                            print(f"⚠️  Duration below target (expected ~60s)")
                            
                except Exception as e:
                    print(f"⚠️  Could not check duration: {e}")
            else:
                print(f"❌ Final video stitching failed")
        else:
            print(f"⚠️  Only generated {len(video_paths)}/4 clips")
        
        # Show individual clip info
        print(f"\n📁 INDIVIDUAL CLIPS:")
        for i, path in enumerate(video_paths):
            if os.path.exists(path):
                size = os.path.getsize(path)
                print(f"  {i+1}. {os.path.basename(path)} ({size} bytes)")
            else:
                print(f"  {i+1}. {path} (NOT FOUND)")
                
    except Exception as e:
        print(f"❌ Pipeline test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_simple_clip():
    """Test generating just one simple clip to verify Manim setup"""
    print(f"\n🧪 Testing simple clip generation...")
    
    try:
        from manim_generator import generate_manim_video
        
        simple_code = """
class SimpleScene(Scene):
    def construct(self):
        text = Text("Hello Manim!", font_size=48)
        circle = Circle(radius=2, color=BLUE)
        
        self.play(Write(text))
        self.wait(1)
        self.play(FadeOut(text))
        self.play(Create(circle))
        self.wait(1)
        self.play(FadeOut(circle))
        self.wait(0.5)
"""
        
        video_path = await generate_manim_video(
            simple_code,
            output_dir="test_simple",
            clip_name="simple_test",
            quality="low_quality"
        )
        
        if video_path and os.path.exists(video_path):
            size = os.path.getsize(video_path)
            print(f"✅ Simple clip test successful!")
            print(f"   📁 Generated: {os.path.basename(video_path)} ({size} bytes)")
            return True
        else:
            print(f"❌ Simple clip test failed - no video generated")
            return False
            
    except Exception as e:
        print(f"❌ Simple clip test failed: {e}")
        return False

async def main():
    """Run the full test suite"""
    print("🔬 Manim Pipeline Test Suite")
    print("=" * 50)
    
    # Test 1: Simple clip to verify Manim works
    simple_success = await test_simple_clip()
    
    if simple_success:
        print(f"\n" + "=" * 50)
        # Test 2: Full pipeline
        await test_full_pipeline()
    else:
        print(f"\n❌ Skipping full pipeline test due to simple test failure")
        print(f"💡 This suggests a Manim environment setup issue")
    
    print(f"\n" + "=" * 50)
    print(f"🏁 Test suite completed!")

if __name__ == "__main__":
    asyncio.run(main())