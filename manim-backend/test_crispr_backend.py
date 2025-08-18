#!/usr/bin/env python3

import asyncio
import sys
import os
from datetime import datetime

# Import our video generation functions
from manim_generator import generate_manim_clips

async def test_crispr_generation():
    """Test CRISPR video generation with the improved pipeline"""
    
    print(f"🧬 Testing CRISPR video generation at {datetime.now()}")
    print("=" * 60)
    
    # Test prompt about CRISPR-Cas9
    prompt = "How does CRISPR-Cas9 specifically target faulty genes without affecting healthy DNA sequences"
    
    # Create output directory
    output_dir = "test_outputs/crispr_test"
    os.makedirs(output_dir, exist_ok=True)
    
    # Create sample clips configuration for CRISPR testing
    clips_config = [
        {
            "code": """
class CRISPRTargeting(Scene):
    def construct(self):
        # Title
        title = Text("CRISPR-Cas9 Gene Targeting", font_size=48, color=BLUE)
        title.to_edge(UP)
        self.play(Write(title))
        
        # DNA double helix representation
        dna = VGroup()
        for i in range(10):
            top_base = Circle(radius=0.1, color=RED).shift(RIGHT * i * 0.3 + UP * 0.3)
            bottom_base = Circle(radius=0.1, color=BLUE).shift(RIGHT * i * 0.3 + DOWN * 0.3)
            connection = Line(top_base.get_center(), bottom_base.get_center(), color=WHITE)
            dna.add(top_base, bottom_base, connection)
        
        dna.move_to(ORIGIN)
        self.play(Create(dna))
        
        # Guide RNA
        guide_rna = Text("Guide RNA", font_size=24, color=GREEN)
        guide_rna.next_to(dna, UP, buff=0.5)
        self.play(Write(guide_rna))
        
        # Target sequence highlight
        target = Rectangle(width=1.2, height=0.8, color=YELLOW, fill_opacity=0.3)
        target.move_to(dna[15:18])
        self.play(Create(target))
        
        # Cas9 protein
        cas9 = Text("Cas9", font_size=32, color=PURPLE)
        cas9.next_to(dna, DOWN, buff=0.5)
        self.play(Write(cas9))
        
        self.wait(2)
""",
            "voice_over": "CRISPR-Cas9 uses a guide RNA to precisely locate target DNA sequences, ensuring specificity in gene editing."
        },
        {
            "code": """
class SpecificBinding(Scene):
    def construct(self):
        # Title
        title = Text("Specific Target Recognition", font_size=40, color=GREEN)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Create DNA sequence visualization
        dna_sequence = VGroup()
        bases = ["A", "T", "G", "C", "T", "A", "G", "C", "A", "T"]
        
        for i, base in enumerate(bases):
            base_text = Text(base, font_size=32, color=WHITE)
            base_text.shift(RIGHT * i * 0.4 + UP * 0.5)
            dna_sequence.add(base_text)
        
        # Complementary bases
        comp_bases = ["T", "A", "C", "G", "A", "T", "C", "G", "T", "A"]
        for i, base in enumerate(comp_bases):
            base_text = Text(base, font_size=32, color=WHITE)
            base_text.shift(RIGHT * i * 0.4 + DOWN * 0.5)
            dna_sequence.add(base_text)
        
        dna_sequence.move_to(ORIGIN)
        self.play(Write(dna_sequence))
        
        # Guide RNA matching
        guide_text = Text("Guide RNA: CGATCGTA", font_size=24, color=YELLOW)
        guide_text.to_edge(DOWN)
        self.play(Write(guide_text))
        
        # Highlight matching region
        match_box = Rectangle(width=3.2, height=1.2, color=GREEN, fill_opacity=0.2)
        match_box.move_to(dna_sequence[2:6])
        self.play(Create(match_box))
        
        # PAM sequence
        pam = Text("PAM", font_size=24, color=RED)
        pam.next_to(match_box, RIGHT, buff=0.3)
        self.play(Write(pam))
        
        self.wait(2)
""",
            "voice_over": "The guide RNA only binds to DNA sequences that are perfectly complementary, and requires a PAM sequence nearby for Cas9 activation."
        },
        {
            "code": """
class SafetyMechanisms(Scene):
    def construct(self):
        # Title
        title = Text("CRISPR Safety Mechanisms", font_size=40, color=BLUE)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Create multiple DNA targets
        healthy_dna = Rectangle(width=3, height=0.8, color=GREEN, fill_opacity=0.3)
        healthy_dna.shift(UP * 1.5)
        healthy_label = Text("Healthy Gene", font_size=24, color=GREEN)
        healthy_label.next_to(healthy_dna, LEFT)
        
        faulty_dna = Rectangle(width=3, height=0.8, color=RED, fill_opacity=0.3)
        faulty_dna.shift(DOWN * 0.5)
        faulty_label = Text("Faulty Gene", font_size=24, color=RED)
        faulty_label.next_to(faulty_dna, LEFT)
        
        self.play(Create(healthy_dna), Write(healthy_label))
        self.play(Create(faulty_dna), Write(faulty_label))
        
        # Guide RNA specificity
        guide_arrow = Arrow(start=LEFT * 2, end=RIGHT * 0.5, color=YELLOW)
        guide_arrow.next_to(faulty_dna, LEFT, buff=0.5)
        guide_text = Text("Specific Guide RNA", font_size=20, color=YELLOW)
        guide_text.next_to(guide_arrow, LEFT)
        
        self.play(Create(guide_arrow), Write(guide_text))
        
        # Show no binding to healthy gene
        x_mark = Text("✗", font_size=48, color=RED)
        x_mark.move_to(healthy_dna)
        self.play(Write(x_mark))
        
        # Show binding to faulty gene
        check_mark = Text("✓", font_size=48, color=GREEN)
        check_mark.move_to(faulty_dna)
        self.play(Write(check_mark))
        
        # Precision message
        precision_text = Text("20-nucleotide specificity ensures precision", font_size=24, color=WHITE)
        precision_text.to_edge(DOWN)
        self.play(Write(precision_text))
        
        self.wait(2)
""",
            "voice_over": "CRISPR's 20-nucleotide guide RNA provides exceptional specificity, ensuring healthy genes remain untouched while targeting only faulty sequences."
        },
        {
            "code": """
class CRISPRSummary(Scene):
    def construct(self):
        # Title
        title = Text("CRISPR-Cas9 Precision Summary", font_size=36, color=GOLD)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Key points
        points = [
            "1. Guide RNA provides 20-base specificity",
            "2. PAM sequence required for activation", 
            "3. Off-target effects minimized",
            "4. Programmable targeting system"
        ]
        
        point_objects = VGroup()
        for i, point in enumerate(points):
            point_text = Text(point, font_size=28, color=WHITE)
            point_text.shift(UP * (1.5 - i * 0.8))
            point_objects.add(point_text)
        
        for point in point_objects:
            self.play(Write(point))
            self.wait(0.5)
        
        # Final emphasis
        conclusion = Text("Precision gene editing with minimal off-target effects", 
                         font_size=32, color=GREEN)
        conclusion.to_edge(DOWN)
        self.play(Write(conclusion))
        
        self.wait(2)
""",
            "voice_over": "In summary, CRISPR-Cas9 achieves precise gene targeting through guide RNA specificity, PAM sequence requirements, and programmable design, ensuring safe and accurate gene editing."
        }
    ]
    
    try:
        print(f"📝 Prompt: {prompt}")
        print(f"📁 Output directory: {output_dir}")
        print(f"🎬 Generating {len(clips_config)} clips...")
        
        # Generate video clips using the improved pipeline with retry logic
        video_paths = await generate_manim_clips(
            clips_config, 
            output_dir, 
            "medium_quality",
            target_clips=4,
            max_retries=2
        )
        
        if video_paths and len(video_paths) > 0:
            print(f"\n✅ SUCCESS! {len(video_paths)} clips generated:")
            total_duration = 0
            
            for i, path in enumerate(video_paths):
                if os.path.exists(path):
                    file_size = os.path.getsize(path) / (1024 * 1024)  # MB
                    print(f"  📹 Clip {i+1}: {path} ({file_size:.2f} MB)")
                    
                    # Try to get video duration
                    try:
                        import subprocess
                        cmd = ['ffprobe', '-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]
                        duration = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode().strip()
                        duration_sec = float(duration)
                        total_duration += duration_sec
                        print(f"    ⏱️  Duration: {duration_sec:.1f}s")
                    except:
                        print("    ⏱️  Duration: Could not determine")
                else:
                    print(f"  ❌ Clip {i+1}: File not found: {path}")
            
            if total_duration > 0:
                print(f"\n📊 Total video duration: {total_duration:.1f} seconds")
                
            return video_paths
        else:
            print(f"\n❌ FAILED: No clips were generated")
            return None
            
    except Exception as e:
        print(f"\n💥 ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = asyncio.run(test_crispr_generation())
    
    if result:
        print(f"\n🎯 Test completed successfully!")
        print(f"🎬 Video file: {result}")
        sys.exit(0)
    else:
        print(f"\n💀 Test failed!")
        sys.exit(1)