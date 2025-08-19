#!/usr/bin/env python3
"""
Manim Dataset Builder - Creates a dataset of prompt-code pairs for better LLM training
Based on the generative-manim approach but customized for our research paper use case
"""
import json
import asyncio
import anthropic
import os
from typing import List, Dict, Any
from dataclasses import dataclass
from pathlib import Path

@dataclass
class ManimExample:
    prompt: str
    code: str
    type: str  # "video" or "image"
    category: str  # "math", "physics", "research", "general"
    complexity: str  # "basic", "intermediate", "advanced"
    duration: float  # estimated duration in seconds

class ManimDatasetBuilder:
    """Builds a comprehensive dataset of Manim prompt-code pairs"""
    
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.examples = []
        
    def add_research_focused_examples(self):
        """Add examples specifically focused on research paper concepts"""
        
        research_examples = [
            {
                "prompt": "Create an animation showing a neural network with input layer, hidden layers, and output layer with data flowing through",
                "code": '''from manim import *

class NeuralNetworkFlow(Scene):
    def construct(self):
        title = Text("Neural Network", font_size=36)
        title.to_edge(UP)
        
        # Input layer
        input_nodes = VGroup(*[Circle(radius=0.2, color=BLUE) for _ in range(3)])
        input_nodes.arrange(DOWN, buff=0.5)
        input_nodes.shift(LEFT * 3)
        
        # Hidden layer
        hidden_nodes = VGroup(*[Circle(radius=0.2, color=GREEN) for _ in range(4)])
        hidden_nodes.arrange(DOWN, buff=0.3)
        
        # Output layer
        output_nodes = VGroup(*[Circle(radius=0.2, color=RED) for _ in range(2)])
        output_nodes.arrange(DOWN, buff=0.7)
        output_nodes.shift(RIGHT * 3)
        
        # Connections
        connections = VGroup()
        for inp in input_nodes:
            for hid in hidden_nodes:
                connections.add(Line(inp.get_right(), hid.get_left(), stroke_width=1))
        
        for hid in hidden_nodes:
            for out in output_nodes:
                connections.add(Line(hid.get_right(), out.get_left(), stroke_width=1))
        
        self.play(Write(title))
        self.wait(1)
        self.play(Create(input_nodes), Create(hidden_nodes), Create(output_nodes))
        self.wait(1)
        self.play(Create(connections))
        self.wait(2)
        
        # Show data flow
        for i in range(3):
            self.play(
                *[node.animate.set_color(YELLOW) for node in input_nodes],
                run_time=0.5
            )
            self.play(
                *[node.animate.set_color(YELLOW) for node in hidden_nodes],
                run_time=0.5
            )
            self.play(
                *[node.animate.set_color(YELLOW) for node in output_nodes],
                run_time=0.5
            )
            self.wait(0.5)
            
        self.wait(2)''',
                "type": "video",
                "category": "research",
                "complexity": "intermediate",
                "duration": 12.0
            },
            
            {
                "prompt": "Visualize a research methodology flowchart with hypothesis, experimentation, data collection, and analysis phases",
                "code": '''from manim import *

class ResearchMethodology(Scene):
    def construct(self):
        title = Text("Research Methodology", font_size=32)
        title.to_edge(UP)
        
        # Create boxes for each phase
        hypothesis = Rectangle(width=2.5, height=1, color=BLUE)
        hypothesis_text = Text("Hypothesis", font_size=20)
        hypothesis_group = VGroup(hypothesis, hypothesis_text)
        hypothesis_group.shift(UP * 2 + LEFT * 3)
        
        experiment = Rectangle(width=2.5, height=1, color=GREEN)
        experiment_text = Text("Experiment", font_size=20)
        experiment_group = VGroup(experiment, experiment_text)
        experiment_group.shift(UP * 2 + RIGHT * 3)
        
        data = Rectangle(width=2.5, height=1, color=ORANGE)
        data_text = Text("Data Collection", font_size=18)
        data_group = VGroup(data, data_text)
        data_group.shift(DOWN * 1 + LEFT * 3)
        
        analysis = Rectangle(width=2.5, height=1, color=RED)
        analysis_text = Text("Analysis", font_size=20)
        analysis_group = VGroup(analysis, analysis_text)
        analysis_group.shift(DOWN * 1 + RIGHT * 3)
        
        # Create arrows
        arrow1 = Arrow(hypothesis.get_right(), experiment.get_left())
        arrow2 = Arrow(experiment.get_bottom(), data.get_top())
        arrow3 = Arrow(data.get_right(), analysis.get_left())
        
        self.play(Write(title))
        self.wait(1)
        
        self.play(Create(hypothesis_group))
        self.wait(1)
        self.play(Create(arrow1))
        self.play(Create(experiment_group))
        self.wait(1)
        self.play(Create(arrow2))
        self.play(Create(data_group))
        self.wait(1)
        self.play(Create(arrow3))
        self.play(Create(analysis_group))
        self.wait(2)''',
                "type": "video",
                "category": "research",
                "complexity": "basic",
                "duration": 10.0
            }
        ]
        
        for example in research_examples:
            self.examples.append(ManimExample(**example))
    
    def add_math_physics_examples(self):
        """Add mathematical and physics visualization examples"""
        
        math_examples = [
            {
                "prompt": "Animate the transformation of a sine wave showing frequency and amplitude changes",
                "code": '''from manim import *

class SineWaveTransformation(Scene):
    def construct(self):
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[-2, 2, 1],
            x_length=10,
            y_length=6
        )
        
        # Original sine wave
        sine_wave = axes.plot(lambda x: np.sin(x), color=BLUE)
        sine_label = Text("sin(x)", font_size=24).next_to(axes, UP)
        
        self.play(Create(axes))
        self.play(Write(sine_label))
        self.play(Create(sine_wave))
        self.wait(2)
        
        # Transform to higher frequency
        high_freq = axes.plot(lambda x: np.sin(2*x), color=RED)
        new_label = Text("sin(2x)", font_size=24).next_to(axes, UP)
        
        self.play(
            Transform(sine_wave, high_freq),
            Transform(sine_label, new_label)
        )
        self.wait(2)
        
        # Transform to higher amplitude
        high_amp = axes.plot(lambda x: 2*np.sin(2*x), color=GREEN)
        final_label = Text("2sin(2x)", font_size=24).next_to(axes, UP)
        
        self.play(
            Transform(sine_wave, high_amp),
            Transform(sine_label, final_label)
        )
        self.wait(2)''',
                "type": "video",
                "category": "math",
                "complexity": "intermediate",
                "duration": 11.0
            }
        ]
        
        for example in math_examples:
            self.examples.append(ManimExample(**example))
    
    async def generate_prompt_from_code(self, code: str) -> str:
        """Use Claude to generate high-quality prompts from existing Manim code"""
        
        system_prompt = """You are an expert at analyzing Manim animation code and creating clear, descriptive prompts. 
        
        Given Manim code, generate a concise but descriptive prompt that:
        1. Clearly describes what the animation shows
        2. Mentions key visual elements
        3. Describes the animation flow/sequence
        4. Uses research/educational terminology when appropriate
        5. Is 1-2 sentences maximum
        
        Focus on the educational or research value of the animation."""
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=200,
                temperature=0.3,
                system=system_prompt,
                messages=[{
                    "role": "user", 
                    "content": f"Generate a prompt for this Manim code:\n\n{code}"
                }]
            )
            return response.content[0].text.strip()
        except Exception as e:
            print(f"Error generating prompt: {e}")
            return "Mathematical animation"
    
    async def enhance_existing_code(self, prompt: str, basic_code: str) -> str:
        """Use Claude to enhance basic Manim code with better animations and timing"""
        
        system_prompt = """You are a Manim expert. Given a prompt and basic Manim code, enhance it to:
        
        1. Add smooth transitions and better timing
        2. Improve visual appeal with colors and positioning
        3. Add appropriate waits and run_times for 10-15 second duration
        4. Use modern Manim syntax (avoid deprecated methods)
        5. Add more engaging visual elements
        6. Ensure the code compiles and runs correctly
        
        Return ONLY the enhanced Python code, no explanations."""
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,
                temperature=0.2,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"Enhance this Manim code for: {prompt}\n\nBasic code:\n{basic_code}"
                }]
            )
            return response.content[0].text.strip()
        except Exception as e:
            print(f"Error enhancing code: {e}")
            return basic_code
    
    def save_dataset(self, filename: str = "manim_research_dataset.jsonl"):
        """Save the dataset in JSONL format"""
        
        dataset_path = Path("datasets") / filename
        dataset_path.parent.mkdir(exist_ok=True)
        
        with open(dataset_path, 'w') as f:
            for example in self.examples:
                entry = {
                    "prompt": example.prompt,
                    "code": example.code,
                    "type": example.type,
                    "category": example.category,
                    "complexity": example.complexity,
                    "duration": example.duration
                }
                f.write(json.dumps(entry) + "\n")
        
        print(f"📁 Dataset saved to {dataset_path}")
        print(f"📊 Total examples: {len(self.examples)}")
        
        # Print summary statistics
        categories = {}
        types = {}
        complexities = {}
        
        for example in self.examples:
            categories[example.category] = categories.get(example.category, 0) + 1
            types[example.type] = types.get(example.type, 0) + 1
            complexities[example.complexity] = complexities.get(example.complexity, 0) + 1
        
        print(f"\n📈 Dataset Summary:")
        print(f"Categories: {categories}")
        print(f"Types: {types}")
        print(f"Complexity: {complexities}")

async def main():
    """Build the Manim dataset"""
    builder = ManimDatasetBuilder()
    
    print("🏗️ Building Manim dataset...")
    
    # Add curated examples
    builder.add_research_focused_examples()
    builder.add_math_physics_examples()
    
    # Save the dataset
    builder.save_dataset()
    
    print("✅ Dataset building complete!")

if __name__ == "__main__":
    asyncio.run(main())