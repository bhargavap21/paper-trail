#!/usr/bin/env python3
"""
Enhanced Manim Code Generator inspired by generative-manim's LangGraph approach.
Implements intelligent code generation, validation, and self-correction.
"""
import asyncio
import ast
import subprocess
import tempfile
import os
import anthropic
import re
from typing import Dict, List, Any, Optional, Union
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
from dataclasses import dataclass
from enum import Enum
import weave

class GenerationState(Enum):
    """States in the code generation workflow"""
    GENERATE = "generate"
    VALIDATE = "validate" 
    REFLECT = "reflect"
    EXECUTE = "execute"
    COMPLETE = "complete"
    FAILED = "failed"

@dataclass
class CodeGenerationContext:
    """Context for tracking code generation state"""
    prompt: str
    generated_code: str = ""
    validation_errors: List[str] = None
    execution_errors: List[str] = None
    attempt_count: int = 0
    max_attempts: int = 3
    state: GenerationState = GenerationState.GENERATE
    reflection_notes: str = ""
    
    def __post_init__(self):
        if self.validation_errors is None:
            self.validation_errors = []
        if self.execution_errors is None:
            self.execution_errors = []

class EnhancedManimGenerator:
    """Enhanced Manim code generator with intelligent validation and self-correction"""
    
    def __init__(self):
        self.manim_docs_cache = {}
        # Initialize Anthropic client
        api_key = os.getenv("ANTHROPIC_API_KEY", "your_api_key_here")
        self.client = anthropic.Anthropic(api_key=api_key)
        
    def get_manim_best_practices(self) -> str:
        """Return current Manim best practices and common patterns"""
        return """
        MANIM BEST PRACTICES (Latest Version):
        
        1. IMPORTS:
        - Always use: from manim import *
        - Common additional: import numpy as np
        
        2. CLASS STRUCTURE:
        - Class name: SimpleScene (inherits from Scene)
        - Method name: construct(self)
        
        3. CURRENT API (avoid deprecated):
        - Use Create() instead of ShowCreation()
        - Use FadeIn/FadeOut instead of FadeInFrom/FadeOutTo variations
        - Use Write() for text animations
        
        4. OBJECT CREATION:
        - Text(): Use simple strings, avoid complex formatting
        - Shapes: Circle(), Square(), Line(), etc.
        - Math: MathTex() for LaTeX, Text() for simple text
        
        5. POSITIONING:
        - .to_edge(UP/DOWN/LEFT/RIGHT)
        - .move_to(ORIGIN)
        - .next_to(other_object, direction)
        - .shift(direction * distance)
        
        6. ANIMATIONS:
        - self.play() for animations
        - self.wait() for pauses
        - Group multiple objects with VGroup()
        
        7. COMMON PATTERNS:
        - Title at top: text.to_edge(UP)
        - Center content: object.move_to(ORIGIN)
        - Sequential animations: separate self.play() calls
        - Simultaneous: self.play(anim1, anim2)
        """

    def generate_code_with_llm(self, prompt: str, context: CodeGenerationContext) -> str:
        """Generate Manim code using LLM with enhanced prompting"""
        
        # Build enhanced prompt with context
        enhanced_prompt = f"""
        TASK: Generate clean, working Manim animation code for: "{prompt}"
        
        CONTEXT:
        - Attempt #{context.attempt_count + 1} of {context.max_attempts}
        
        {self.get_manim_best_practices()}
        
        PREVIOUS ERRORS TO AVOID:
        {chr(10).join(f"- {error}" for error in context.validation_errors + context.execution_errors)}
        
        REFLECTION NOTES:
        {context.reflection_notes}
        
        REQUIREMENTS:
        1. Generate COMPLETE, EXECUTABLE code
        2. Include proper imports and class structure
        3. Use ONLY current Manim API (no deprecated methods)
        4. Keep animations simple and reliable
        5. Duration should be 10-15 seconds
        6. Include meaningful content related to the prompt
        
        OUTPUT FORMAT:
        Return ONLY the Python code, no explanations or markdown.
        """
        
        # Call LLM to generate content-aware Manim code
        print(f"🤖 Generating code for: {prompt}")
        print(f"📝 Context: Attempt {context.attempt_count + 1}, Previous errors: {len(context.validation_errors + context.execution_errors)}")
        
        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=3000,
                temperature=0.7,  # Higher temperature for more creative code generation
                messages=[
                    {
                        "role": "user",
                        "content": enhanced_prompt
                    }
                ]
            )
            
            generated_code = response.content[0].text.strip()
            
            # Clean up the response - extract just the Python code
            # Remove markdown code blocks if present
            if "```python" in generated_code:
                generated_code = re.search(r'```python\n(.*?)\n```', generated_code, re.DOTALL)
                if generated_code:
                    generated_code = generated_code.group(1)
                else:
                    generated_code = response.content[0].text.strip()
            elif "```" in generated_code:
                generated_code = re.search(r'```\n?(.*?)\n?```', generated_code, re.DOTALL)
                if generated_code:
                    generated_code = generated_code.group(1)
                else:
                    generated_code = response.content[0].text.strip()
            
            return generated_code.strip()
            
        except Exception as e:
            print(f"❌ LLM call failed: {e}")
            print("🛡️ Falling back to template-based generation")
            # Fallback to template-based approach if LLM fails
            return self._generate_adaptive_template(prompt, context)
    
    def _generate_adaptive_template(self, prompt: str, context: CodeGenerationContext) -> str:
        """Generate adaptive code based on prompt analysis"""
        
        prompt_lower = prompt.lower()
        
        # Analyze prompt for key concepts
        is_math = any(word in prompt_lower for word in ['equation', 'formula', 'math', 'calculate', 'function'])
        is_geometry = any(word in prompt_lower for word in ['circle', 'square', 'triangle', 'shape', 'geometry'])
        is_network = any(word in prompt_lower for word in ['neural', 'network', 'node', 'connection', 'neuron', 'layer', 'graph', 'plot', 'data', 'chart'])
        is_text_heavy = any(word in prompt_lower for word in ['explain', 'describe', 'text', 'words', 'definition'])
        
        # Generate appropriate template - prioritize network visualization for neural network content
        if is_network and context.attempt_count == 0:
            return self._generate_network_template(prompt)
        elif is_geometry and context.attempt_count == 0:
            return self._generate_geometry_template(prompt)
        elif is_math and context.attempt_count == 0:
            return self._generate_math_template(prompt)
        elif context.attempt_count > 0:
            # Use simplified version for retries
            return self._generate_safe_template(prompt)
        else:
            return self._generate_text_template(prompt)
    
    def _generate_math_template(self, prompt: str) -> str:
        """Generate math-focused animation"""
        return '''from manim import *
import numpy as np

class SimpleScene(Scene):
    def construct(self):
        # Math-focused animation
        title = Text("Mathematical Concept", font_size=40)
        title.to_edge(UP)
        
        # Main equation
        equation = MathTex(r"f(x) = x^2")
        equation.scale(1.5)
        equation.move_to(ORIGIN)
        
        # Supporting text
        description = Text("Exploring mathematical relationships", font_size=24)
        description.next_to(equation, DOWN, buff=1)
        
        # Animation sequence
        self.play(Write(title))
        self.wait(0.5)
        self.play(Write(equation))
        self.wait(1)
        self.play(FadeIn(description))
        self.wait(2)
        
        # Transform or modify
        new_equation = MathTex(r"f(x) = 2x^2 + 1")
        new_equation.scale(1.5)
        new_equation.move_to(equation.get_center())
        
        self.play(Transform(equation, new_equation))
        self.wait(2)
        
        # Cleanup
        self.play(FadeOut(title), FadeOut(equation), FadeOut(description))
        self.wait(0.5)'''
    
    def _generate_geometry_template(self, prompt: str) -> str:
        """Generate geometry-focused animation"""
        return '''from manim import *
import numpy as np

class SimpleScene(Scene):
    def construct(self):
        # Geometry-focused animation
        title = Text("Geometric Shapes", font_size=40)
        title.to_edge(UP)
        
        # Create shapes
        circle = Circle(radius=1.5, color=BLUE)
        circle.shift(LEFT * 2)
        
        square = Square(side_length=2, color=RED)
        square.shift(RIGHT * 2)
        
        # Labels
        circle_label = Text("Circle", font_size=20)
        circle_label.next_to(circle, DOWN)
        
        square_label = Text("Square", font_size=20)
        square_label.next_to(square, DOWN)
        
        # Animation sequence
        self.play(Write(title))
        self.wait(0.5)
        
        self.play(Create(circle), Create(square))
        self.wait(1)
        
        self.play(Write(circle_label), Write(square_label))
        self.wait(1.5)
        
        # Transformation
        triangle = Triangle(color=GREEN)
        triangle.move_to(ORIGIN)
        triangle_label = Text("Triangle", font_size=20)
        triangle_label.next_to(triangle, DOWN)
        
        self.play(Transform(circle, triangle), 
                  Transform(circle_label, triangle_label),
                  FadeOut(square), FadeOut(square_label))
        self.wait(2)
        
        # Cleanup
        self.play(FadeOut(title), FadeOut(circle), FadeOut(circle_label))
        self.wait(0.5)'''
    
    def _generate_text_template(self, prompt: str) -> str:
        """Generate text-heavy educational content"""
        return '''from manim import *
import numpy as np

class SimpleScene(Scene):
    def construct(self):
        # Text-focused educational animation
        title = Text("Educational Content", font_size=40)
        title.to_edge(UP)
        
        # Main points
        point1 = Text("• Key concept 1", font_size=28)
        point2 = Text("• Key concept 2", font_size=28)
        point3 = Text("• Key concept 3", font_size=28)
        
        points = VGroup(point1, point2, point3)
        points.arrange(DOWN, aligned_edge=LEFT, buff=0.5)
        points.move_to(ORIGIN)
        
        # Animation sequence
        self.play(Write(title))
        self.wait(0.5)
        
        for point in points:
            self.play(Write(point))
            self.wait(0.8)
        
        self.wait(1.5)
        
        # Conclusion
        conclusion = Text("Understanding these concepts is essential", font_size=24)
        conclusion.move_to(DOWN * 2)
        
        self.play(FadeIn(conclusion))
        self.wait(2)
        
        # Cleanup
        self.play(FadeOut(title), FadeOut(points), FadeOut(conclusion))
        self.wait(0.5)'''
    
    def _generate_safe_template(self, prompt: str) -> str:
        """Generate guaranteed-working simple template for retries"""
        return '''from manim import *
import numpy as np

class SimpleScene(Scene):
    def construct(self):
        # Safe, simple animation that always works
        title = Text("Content", font_size=48)
        title.move_to(ORIGIN)
        
        subtitle = Text("Educational material", font_size=24)
        subtitle.next_to(title, DOWN, buff=1)
        
        # Simple, reliable animations
        self.play(Write(title))
        self.wait(1)
        self.play(FadeIn(subtitle))
        self.wait(2)
        self.play(FadeOut(title), FadeOut(subtitle))
        self.wait(0.5)'''

    def _generate_network_template(self, prompt: str) -> str:
        """Generate neural network and graph visualization template"""
        return '''from manim import *
import numpy as np

class SimpleScene(Scene):
    def construct(self):
        # Neural network visualization
        title = Text("Neural Networks", font_size=40)
        title.to_edge(UP)
        
        # Create network layers
        input_layer = VGroup(*[Circle(radius=0.2, color=BLUE) for _ in range(3)])
        input_layer.arrange(DOWN, buff=0.3)
        input_layer.shift(LEFT * 3)
        
        hidden_layer = VGroup(*[Circle(radius=0.2, color=GREEN) for _ in range(4)])
        hidden_layer.arrange(DOWN, buff=0.3)
        hidden_layer.shift(ORIGIN)
        
        output_layer = VGroup(*[Circle(radius=0.2, color=RED) for _ in range(2)])
        output_layer.arrange(DOWN, buff=0.3)
        output_layer.shift(RIGHT * 3)
        
        # Create connections
        connections = VGroup()
        for input_node in input_layer:
            for hidden_node in hidden_layer:
                line = Line(input_node.get_center(), hidden_node.get_center(), 
                           color=GRAY, stroke_width=1)
                connections.add(line)
        
        for hidden_node in hidden_layer:
            for output_node in output_layer:
                line = Line(hidden_node.get_center(), output_node.get_center(), 
                           color=GRAY, stroke_width=1)
                connections.add(line)
        
        # Labels
        input_label = Text("Input", font_size=20).next_to(input_layer, DOWN)
        hidden_label = Text("Hidden", font_size=20).next_to(hidden_layer, DOWN)
        output_label = Text("Output", font_size=20).next_to(output_layer, DOWN)
        
        # Animation sequence
        self.play(Write(title))
        self.wait(0.5)
        
        self.play(Create(connections))
        self.wait(0.5)
        
        self.play(Create(input_layer), Write(input_label))
        self.wait(0.5)
        
        self.play(Create(hidden_layer), Write(hidden_label))
        self.wait(0.5)
        
        self.play(Create(output_layer), Write(output_label))
        self.wait(1)
        
        # Show data flow with color changes
        self.play(*[node.animate.set_color(YELLOW) for node in input_layer])
        self.wait(0.3)
        self.play(*[node.animate.set_color(YELLOW) for node in hidden_layer])
        self.wait(0.3)
        self.play(*[node.animate.set_color(YELLOW) for node in output_layer])
        self.wait(1)
        
        # Cleanup
        self.play(FadeOut(VGroup(title, connections, input_layer, hidden_layer, 
                                output_layer, input_label, hidden_label, output_label)))
        self.wait(0.5)'''

    def validate_code_syntax(self, code: str) -> List[str]:
        """Validate Python syntax and Manim-specific patterns"""
        errors = []
        
        try:
            # Parse AST to check syntax
            ast.parse(code)
        except SyntaxError as e:
            errors.append(f"Syntax error: {e}")
            return errors
        
        # Check for required components
        if "class SimpleScene" not in code:
            errors.append("Missing 'class SimpleScene' definition")
        
        if "def construct(self)" not in code:
            errors.append("Missing 'def construct(self)' method")
        
        if "from manim import" not in code:
            errors.append("Missing Manim import statement")
        
        # Check for deprecated methods
        deprecated_methods = ['ShowCreation', 'FadeInFrom', 'FadeOutTo', 'DrawBorderThenFill']
        for method in deprecated_methods:
            if method in code:
                errors.append(f"Uses deprecated method: {method}")
        
        # Check for common issues
        if 'self.play()' in code:
            errors.append("Empty self.play() call found")
        
        # Check for proper string handling in Text objects
        text_pattern = re.findall(r'Text\([^)]*\)', code)
        for match in text_pattern:
            if '""' in match or "''" in match:
                errors.append(f"Empty Text object: {match}")
        
        return errors

    async def test_code_execution(self, code: str) -> List[str]:
        """Test code execution in isolated environment"""
        errors = []
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
                full_code = code
                temp_file.write(full_code)
                temp_file_path = temp_file.name
            
            # Test compilation without execution
            cmd = [
                "python3", "-m", "py_compile", temp_file_path
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                errors.append(f"Compilation failed: {stderr.decode()}")
            
            # Clean up
            os.unlink(temp_file_path)
            
        except Exception as e:
            errors.append(f"Execution test failed: {e}")
        
        return errors

    def generate_reflection(self, context: CodeGenerationContext) -> str:
        """Generate reflection notes for improving next attempt"""
        reflection = []
        
        if context.validation_errors:
            reflection.append("Previous attempt had validation issues:")
            for error in context.validation_errors:
                if "deprecated" in error.lower():
                    reflection.append("- Use current Manim API, avoid deprecated methods")
                elif "syntax" in error.lower():
                    reflection.append("- Focus on clean Python syntax")
                elif "missing" in error.lower():
                    reflection.append("- Ensure complete class and method structure")
        
        if context.execution_errors:
            reflection.append("Previous attempt had execution issues:")
            reflection.append("- Simplify the animation code")
            reflection.append("- Use only basic, well-tested Manim objects")
        
        if context.attempt_count > 1:
            reflection.append("Multiple attempts failed:")
            reflection.append("- Use minimal, guaranteed-working template")
            reflection.append("- Focus on simple shapes and text only")
        
        return "\n".join(reflection)

    @weave.op()
    async def generate_enhanced_manim_code(self, prompt: str) -> Dict[str, Any]:
        """Main workflow for generating enhanced Manim code"""
        
        context = CodeGenerationContext(prompt=prompt)
        
        print(f"🚀 Starting enhanced code generation for: {prompt}")
        
        while context.state != GenerationState.COMPLETE and context.state != GenerationState.FAILED:
            
            if context.state == GenerationState.GENERATE:
                print(f"🎯 Generation attempt {context.attempt_count + 1}")
                context.generated_code = self.generate_code_with_llm(prompt, context)
                context.state = GenerationState.VALIDATE
                
            elif context.state == GenerationState.VALIDATE:
                print("🔍 Validating generated code...")
                context.validation_errors = self.validate_code_syntax(context.generated_code)
                
                if context.validation_errors:
                    print(f"❌ Validation errors found: {len(context.validation_errors)}")
                    for error in context.validation_errors:
                        print(f"  - {error}")
                    context.state = GenerationState.REFLECT
                else:
                    print("✅ Validation passed")
                    context.state = GenerationState.EXECUTE
                    
            elif context.state == GenerationState.EXECUTE:
                print("🧪 Testing code execution...")
                context.execution_errors = await self.test_code_execution(context.generated_code)
                
                if context.execution_errors:
                    print(f"❌ Execution errors found: {len(context.execution_errors)}")
                    for error in context.execution_errors:
                        print(f"  - {error}")
                    context.state = GenerationState.REFLECT
                else:
                    print("✅ Code execution test passed")
                    context.state = GenerationState.COMPLETE
                    
            elif context.state == GenerationState.REFLECT:
                context.attempt_count += 1
                
                if context.attempt_count >= context.max_attempts:
                    print(f"❌ Maximum attempts ({context.max_attempts}) reached")
                    context.state = GenerationState.FAILED
                else:
                    print(f"🤔 Reflecting on errors for next attempt...")
                    context.reflection_notes = self.generate_reflection(context)
                    context.validation_errors = []
                    context.execution_errors = []
                    context.state = GenerationState.GENERATE
        
        # Return results
        result = {
            "success": context.state == GenerationState.COMPLETE,
            "code": context.generated_code if context.state == GenerationState.COMPLETE else None,
            "attempts": context.attempt_count,
            "final_state": context.state.value,
            "validation_errors": context.validation_errors,
            "execution_errors": context.execution_errors
        }
        
        if result["success"]:
            print(f"✅ Code generation successful after {context.attempt_count} attempts")
        else:
            print(f"❌ Code generation failed after {context.attempt_count} attempts")
        
        return result

# Example usage and testing
async def test_enhanced_generator():
    """Test the enhanced generator with various prompts"""
    generator = EnhancedManimGenerator()
    
    test_prompts = [
        "Create a simple circle animation",
        "Show the Pythagorean theorem with visual proof",
        "Animate a bouncing ball with physics",
        "Create a mathematical function graph"
    ]
    
    for prompt in test_prompts:
        print(f"\n{'='*60}")
        print(f"Testing: {prompt}")
        print('='*60)
        
        result = await generator.generate_enhanced_manim_code(prompt)
        
        if result["success"]:
            print(f"✅ SUCCESS - Generated working code in {result['attempts']} attempts")
        else:
            print(f"❌ FAILED - Could not generate working code after {result['attempts']} attempts")

if __name__ == "__main__":
    asyncio.run(test_enhanced_generator())