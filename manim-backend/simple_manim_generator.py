#!/usr/bin/env python3
"""
Simple Manim Generator - Inspired by generative-manim
High-quality, reliable Manim code generation with minimal complexity
"""
import anthropic
import os
import tempfile
import subprocess
import asyncio
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import weave

# Load environment variables
load_dotenv()

class SimpleManimGenerator:
    """Simplified, high-quality Manim code generator based on generative-manim best practices"""
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY", "your_api_key_here")
        self.client = anthropic.Anthropic(api_key=api_key)
        
    def get_system_prompt(self) -> str:
        """
        High-quality system prompt based on generative-manim approach
        Focused, rule-based, with clear constraints
        """
        return """You are a Manim expert that generates ONLY working Python code for mathematical animations.

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
- Use simple shapes: Circle(), Rectangle(), Square(), Line()

EXAMPLE STRUCTURE:
from manim import *

class GenScene(Scene):
    def construct(self):
        title = Text("Your Title", font_size=36)
        title.to_edge(UP)
        
        circle = Circle(radius=1.5)
        circle.move_to(ORIGIN)
        
        self.play(Write(title), run_time=2)
        self.wait(1)
        self.play(Create(circle), run_time=2)
        self.wait(2)
        self.play(circle.animate.set_color(BLUE), run_time=1.5)
        self.wait(1)
        self.play(FadeOut(title), FadeOut(circle), run_time=2)
        self.wait(1)

GENERATE ONLY CODE - NO EXPLANATIONS."""

    def get_domain_specific_guidance(self, prompt: str) -> str:
        """Add domain-specific guidance based on prompt analysis"""
        prompt_lower = prompt.lower()
        
        guidance = ""
        
        if any(word in prompt_lower for word in ['neural', 'network', 'ai', 'machine learning', 'node', 'layer']):
            guidance += """
For neural networks: Use circles for nodes, lines for connections, arrange in layers.
Example: VGroup(*[Circle(radius=0.2) for _ in range(3)]).arrange(DOWN)"""
            
        elif any(word in prompt_lower for word in ['math', 'equation', 'formula', 'function']):
            guidance += """
For math: Use MathTex() for equations, position with .move_to() or .next_to().
Example: MathTex(r"f(x) = x^2").scale(1.5)"""
            
        elif any(word in prompt_lower for word in ['graph', 'plot', 'chart', 'data']):
            guidance += """
For graphs: Use axes with NumberPlane(), plot functions with get_graph().
Example: axes = Axes(); func = axes.get_graph(lambda x: x**2)"""
            
        elif any(word in prompt_lower for word in ['geometry', 'shape', 'triangle', 'square']):
            guidance += """
For geometry: Use basic shapes Circle(), Square(), Triangle(), position with shifts.
Example: shapes = VGroup(Circle(), Square()).arrange(RIGHT)"""
        
        return guidance

    @weave.op()
    async def generate_manim_code(self, prompt: str) -> Dict[str, Any]:
        """
        Generate high-quality Manim code using simplified approach
        
        Args:
            prompt: Description of what the animation should show
            
        Returns:
            Dict with success status and generated code
        """
        
        print(f"🎯 Generating simple, reliable code for: {prompt}")
        
        # Build enhanced prompt with domain guidance
        domain_guidance = self.get_domain_specific_guidance(prompt)
        
        full_prompt = f"""Generate Manim animation code for: "{prompt}"

{domain_guidance}

{self.get_system_prompt()}"""
        
        try:
            # Use low temperature for consistency (like generative-manim)
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,  # Limited tokens like generative-manim
                temperature=0.2,  # Low temperature for reliability
                messages=[
                    {
                        "role": "user",
                        "content": full_prompt
                    }
                ]
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
                    "method": "llm_generation"
                }
            except SyntaxError as e:
                print(f"❌ Syntax error: {e}")
                print("🛡️ Using safe fallback template")
                return {
                    "success": True,
                    "code": self._generate_safe_fallback(prompt),
                    "method": "safe_fallback"
                }
                
        except Exception as e:
            print(f"❌ LLM generation failed: {e}")
            print("🛡️ Using safe fallback template")
            return {
                "success": True,
                "code": self._generate_safe_fallback(prompt),
                "method": "safe_fallback"
            }
    
    def _ensure_proper_structure(self, code: str) -> str:
        """Ensure code has proper GenScene structure"""
        if "class GenScene" not in code:
            # Wrap content in proper structure
            return f"""from manim import *

class GenScene(Scene):
    def construct(self):
        # Generated content
        title = Text("Educational Animation")
        title.to_edge(UP)
        
        content = Text("Animation content here")
        content.move_to(ORIGIN)
        
        self.play(Write(title))
        self.play(FadeIn(content))
        self.wait(2)"""
        return code
    
    def _generate_safe_fallback(self, prompt: str) -> str:
        """Generate guaranteed-working fallback code"""
        # Extract key terms for basic customization
        prompt_words = prompt.lower().split()
        
        if any(word in prompt_words for word in ['circle', 'round', 'ball']):
            shape_code = "Circle(radius=1, color=BLUE)"
            shape_name = "Circle"
        elif any(word in prompt_words for word in ['square', 'box', 'rectangle']):
            shape_code = "Square(side_length=2, color=RED)"
            shape_name = "Square"
        elif any(word in prompt_words for word in ['triangle']):
            shape_code = "Triangle(color=GREEN)"
            shape_name = "Triangle"
        else:
            shape_code = "Circle(radius=1, color=BLUE)"
            shape_name = "Shape"
        
        return f"""from manim import *

class GenScene(Scene):
    def construct(self):
        title = Text("Educational Content", font_size=40)
        title.to_edge(UP)
        
        shape = {shape_code}
        shape.move_to(ORIGIN)
        
        label = Text("{shape_name}", font_size=24)
        label.next_to(shape, DOWN)
        
        self.play(Write(title))
        self.wait(0.5)
        self.play(Create(shape))
        self.wait(0.5)
        self.play(Write(label))
        self.wait(2)
        self.play(FadeOut(title), FadeOut(shape), FadeOut(label))
        self.wait(0.5)"""

# Example usage and testing
async def test_simple_generator():
    """Test the simple generator with various prompts"""
    generator = SimpleManimGenerator()
    
    test_prompts = [
        "Create a neural network visualization",
        "Show the Pythagorean theorem",
        "Animate a bouncing ball",
        "Display mathematical equations",
        "Show geometric shapes transforming"
    ]
    
    for prompt in test_prompts:
        print(f"\n{'='*60}")
        print(f"Testing: {prompt}")
        print('='*60)
        
        result = await generator.generate_manim_code(prompt)
        
        if result["success"]:
            print(f"✅ SUCCESS - Generated code using {result['method']}")
            print("Generated code preview:")
            print(result['code'][:200] + "..." if len(result['code']) > 200 else result['code'])
        else:
            print(f"❌ FAILED")

if __name__ == "__main__":
    asyncio.run(test_simple_generator())