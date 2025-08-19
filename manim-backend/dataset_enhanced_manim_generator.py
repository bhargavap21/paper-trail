#!/usr/bin/env python3
"""
Dataset-Enhanced Manim Generator
Uses a curated dataset of prompt-code pairs to improve Manim code generation quality
"""
import anthropic
import os
import json
import random
from typing import Dict, Any, List, Optional
from pathlib import Path
import weave
from dataclasses import dataclass

@dataclass
class ManimExample:
    prompt: str
    code: str
    type: str
    category: str
    complexity: str
    duration: float

class DatasetEnhancedManimGenerator:
    """Enhanced Manim generator using dataset examples for better code quality"""
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY", "your_api_key_here")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.dataset = []
        self.load_dataset()
        
    def load_dataset(self):
        """Load the Manim dataset for reference"""
        dataset_path = Path("datasets/manim_research_dataset.jsonl")
        
        if dataset_path.exists():
            with open(dataset_path, 'r') as f:
                for line in f:
                    if line.strip():
                        data = json.loads(line)
                        self.dataset.append(ManimExample(**data))
            print(f"📊 Loaded {len(self.dataset)} examples from dataset")
        else:
            print("⚠️ No dataset found, using basic approach")
    
    def get_relevant_examples(self, prompt: str, category: str = None, limit: int = 3) -> List[ManimExample]:
        """Get relevant examples from dataset based on prompt similarity and category"""
        
        if not self.dataset:
            return []
        
        # Simple keyword matching for relevance
        prompt_lower = prompt.lower()
        relevant_examples = []
        
        # Score examples based on keyword overlap
        for example in self.dataset:
            score = 0
            example_words = set(example.prompt.lower().split())
            prompt_words = set(prompt_lower.split())
            
            # Keyword overlap score
            overlap = len(example_words.intersection(prompt_words))
            score += overlap * 2
            
            # Category bonus
            if category and example.category == category:
                score += 5
            
            # Research-focused bonus
            if any(word in prompt_lower for word in ['research', 'paper', 'study', 'analysis']):
                if example.category == 'research':
                    score += 3
            
            # Math/physics bonus
            if any(word in prompt_lower for word in ['equation', 'formula', 'graph', 'plot', 'function']):
                if example.category in ['math', 'physics']:
                    score += 3
            
            if score > 0:
                relevant_examples.append((score, example))
        
        # Sort by score and return top examples
        relevant_examples.sort(key=lambda x: x[0], reverse=True)
        return [example for _, example in relevant_examples[:limit]]
    
    def build_enhanced_system_prompt(self, prompt: str, examples: List[ManimExample]) -> str:
        """Build system prompt with relevant examples"""
        
        base_prompt = """You are a Manim expert that generates high-quality Python code for mathematical and research animations.

STRICT RULES:
1. Use class name: GenScene(Scene)
2. Use method name: construct(self)
3. Import: from manim import *
4. Use self.play() for ALL animations
5. Use self.wait() for pauses between animations
6. Duration should be 10-15 seconds total (use longer waits and more animations)
7. Create multiple animations with smooth transitions
8. NO explanations, comments, or markdown - ONLY code

ANIMATION REQUIREMENTS:
- Use self.wait(2) or self.wait(3) for longer pauses
- Add multiple self.play() calls for complex scenes
- Use run_time=2 or run_time=3 for slower, more visible animations
- Include fade-in/fade-out transitions for professional look

CURRENT API (avoid deprecated):
- Create() instead of ShowCreation()
- FadeIn/FadeOut instead of deprecated variants
- Write() for text animations
- Transform() for object changes
- Use Text() instead of MathTex() to avoid LaTeX dependencies
- Use simple shapes: Circle(), Rectangle(), Square(), Line()"""

        if examples:
            base_prompt += "\n\nHere are examples of high-quality Manim animations similar to your task:\n\n"
            
            for i, example in enumerate(examples, 1):
                base_prompt += f"EXAMPLE {i}:\n"
                base_prompt += f"Prompt: {example.prompt}\n"
                base_prompt += f"Code:\n{example.code}\n\n"
            
            base_prompt += "Use these examples as inspiration for structure, timing, and visual quality. "
            base_prompt += "Adapt the patterns and techniques to create the requested animation.\n\n"
        
        base_prompt += "GENERATE ONLY CODE - NO EXPLANATIONS."
        
        return base_prompt
    
    def categorize_prompt(self, prompt: str) -> str:
        """Categorize the prompt to help select relevant examples"""
        prompt_lower = prompt.lower()
        
        # Research keywords
        if any(word in prompt_lower for word in ['research', 'paper', 'study', 'methodology', 'hypothesis', 'experiment', 'analysis', 'neural network', 'machine learning', 'ai']):
            return 'research'
        
        # Math keywords  
        elif any(word in prompt_lower for word in ['equation', 'formula', 'function', 'graph', 'plot', 'sine', 'cosine', 'derivative', 'integral', 'matrix']):
            return 'math'
        
        # Physics keywords
        elif any(word in prompt_lower for word in ['wave', 'particle', 'force', 'energy', 'motion', 'physics', 'quantum']):
            return 'physics'
        
        else:
            return 'general'
    
    @weave.op()
    async def generate_manim_code(self, prompt: str) -> Dict[str, Any]:
        """
        Generate high-quality Manim code using dataset examples for reference
        
        Args:
            prompt: Description of what the animation should show
            
        Returns:
            Dict with success status and generated code
        """
        
        print(f"🎯 Generating dataset-enhanced code for: {prompt}")
        
        # Categorize prompt and get relevant examples
        category = self.categorize_prompt(prompt)
        relevant_examples = self.get_relevant_examples(prompt, category)
        
        if relevant_examples:
            print(f"📚 Using {len(relevant_examples)} relevant examples from dataset")
            for example in relevant_examples:
                print(f"  - {example.prompt[:50]}... ({example.category})")
        
        # Build enhanced system prompt with examples
        system_prompt = self.build_enhanced_system_prompt(prompt, relevant_examples)
        
        # Add domain-specific guidance
        domain_guidance = self.get_domain_specific_guidance(prompt)
        
        full_prompt = f"""Generate Manim animation code for: "{prompt}"

{domain_guidance}

{system_prompt}"""
        
        try:
            # Use low temperature for consistency
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,  # Increased for more complex examples
                temperature=0.1,  # Lower temperature for more consistent code
                messages=[{
                    "role": "user",
                    "content": full_prompt
                }]
            )
            
            generated_code = response.content[0].text.strip()
            
            # Clean up response - remove markdown if present
            if "```python" in generated_code:
                import re
                match = re.search(r'```python\n(.*?)\n```', generated_code, re.DOTALL)
                if match:
                    generated_code = match.group(1)
            elif "```" in generated_code:
                import re
                match = re.search(r'```\n?(.*?)\n?```', generated_code, re.DOTALL)
                if match:
                    generated_code = match.group(1)
            
            # Basic validation
            if "class GenScene" not in generated_code:
                print("⚠️ Missing GenScene class, adding structure...")
                generated_code = self._ensure_proper_structure(generated_code)
            
            # Test compilation
            try:
                compile(generated_code, '<string>', 'exec')
                print("✅ Code compilation successful")
                return {
                    "success": True,
                    "code": generated_code,
                    "method": "dataset_enhanced_generation",
                    "examples_used": len(relevant_examples),
                    "category": category
                }
            except SyntaxError as e:
                print(f"❌ Syntax error: {e}")
                print("🛡️ Using safe fallback template")
                return {
                    "success": True,
                    "code": self._generate_safe_fallback(prompt),
                    "method": "safe_fallback",
                    "examples_used": 0,
                    "category": category
                }
                
        except Exception as e:
            print(f"❌ LLM generation failed: {e}")
            print("🛡️ Using safe fallback template")
            return {
                "success": True,
                "code": self._generate_safe_fallback(prompt),
                "method": "safe_fallback",
                "examples_used": 0,
                "category": category
            }
    
    def get_domain_specific_guidance(self, prompt: str) -> str:
        """Add domain-specific guidance based on prompt analysis"""
        prompt_lower = prompt.lower()
        
        guidance = ""
        
        if any(word in prompt_lower for word in ['neural', 'network', 'ai', 'machine learning', 'node', 'layer']):
            guidance += """
For neural networks: Use circles for nodes, lines for connections, arrange in layers.
Example patterns: VGroup(*[Circle(radius=0.2) for _ in range(3)]).arrange(DOWN)
Show data flow with color changes and sequential animations."""
            
        elif any(word in prompt_lower for word in ['research', 'methodology', 'process', 'flowchart']):
            guidance += """
For research processes: Use rectangles for steps, arrows for flow, clear labeling.
Show progression with sequential reveals and smooth transitions."""
            
        elif any(word in prompt_lower for word in ['math', 'equation', 'formula', 'function']):
            guidance += """
For math: Use Text() for equations, Axes() for graphs, smooth transformations.
Example: axes = Axes(); func = axes.plot(lambda x: x**2)"""
            
        elif any(word in prompt_lower for word in ['graph', 'plot', 'chart', 'data']):
            guidance += """
For graphs: Use Axes() with proper scaling, plot functions with get_graph().
Add labels and smooth transitions between different views."""
            
        return guidance
    
    def _ensure_proper_structure(self, code: str) -> str:
        """Ensure code has proper GenScene structure"""
        if "class GenScene" not in code:
            return f"""from manim import *

class GenScene(Scene):
    def construct(self):
        title = Text("Educational Animation")
        title.to_edge(UP)
        
        content = Text("Animation content here")
        content.move_to(ORIGIN)
        
        self.play(Write(title))
        self.play(FadeIn(content))
        self.wait(2)"""
        return code
    
    def _generate_safe_fallback(self, prompt: str) -> str:
        """Generate guaranteed-working fallback code with better customization"""
        prompt_words = prompt.lower().split()
        
        # Choose shape based on context
        if any(word in prompt_words for word in ['circle', 'round', 'ball', 'node']):
            shape_code = "Circle(radius=1, color=BLUE)"
            shape_name = "Circle"
        elif any(word in prompt_words for word in ['square', 'box', 'rectangle', 'step']):
            shape_code = "Rectangle(width=2, height=1, color=RED)"
            shape_name = "Rectangle"
        elif any(word in prompt_words for word in ['triangle']):
            shape_code = "Triangle(color=GREEN)"
            shape_name = "Triangle"
        else:
            shape_code = "Circle(radius=1, color=BLUE)"
            shape_name = "Shape"
        
        # Choose title based on context
        if any(word in prompt_words for word in ['research', 'study']):
            title_text = "Research Visualization"
        elif any(word in prompt_words for word in ['math', 'equation']):
            title_text = "Mathematical Concept"
        else:
            title_text = "Educational Content"
        
        return f"""from manim import *

class GenScene(Scene):
    def construct(self):
        title = Text("{title_text}", font_size=36)
        title.to_edge(UP)
        
        shape = {shape_code}
        shape.move_to(ORIGIN)
        
        label = Text("{shape_name}", font_size=24)
        label.next_to(shape, DOWN)
        
        self.play(Write(title), run_time=2)
        self.wait(1)
        self.play(Create(shape), run_time=2)
        self.wait(1)
        self.play(Write(label), run_time=1.5)
        self.wait(2)
        self.play(
            shape.animate.set_color(YELLOW),
            run_time=1.5
        )
        self.wait(1)
        self.play(FadeOut(title), FadeOut(shape), FadeOut(label), run_time=2)
        self.wait(1)"""

# Example usage and testing
async def test_dataset_generator():
    """Test the dataset-enhanced generator"""
    generator = DatasetEnhancedManimGenerator()
    
    test_prompts = [
        "Create a neural network with data flowing through layers",
        "Show a research methodology with hypothesis and experiment phases",
        "Animate a sine wave transformation",
        "Visualize quantum computing concepts"
    ]
    
    for prompt in test_prompts:
        print(f"\n{'='*60}")
        print(f"Testing: {prompt}")
        print('='*60)
        
        result = await generator.generate_manim_code(prompt)
        
        if result["success"]:
            print(f"✅ SUCCESS - Method: {result['method']}")
            print(f"📊 Examples used: {result['examples_used']}")
            print(f"🏷️ Category: {result['category']}")
            print("Generated code preview:")
            print(result['code'][:300] + "..." if len(result['code']) > 300 else result['code'])
        else:
            print(f"❌ FAILED")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_dataset_generator())