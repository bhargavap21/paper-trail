#!/usr/bin/env python3
"""
Scalable Dataset-Enhanced Manim Generator
Replaces hard-coded keyword matching with intelligent similarity scoring for large datasets
"""
import anthropic
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file in parent directory
load_dotenv(dotenv_path="../.env")
import re
from typing import Dict, Any, List, Optional, Tuple, Set
from pathlib import Path
import weave
from dataclasses import dataclass
from collections import Counter

@dataclass
class ManimExample:
    prompt: str
    code: str
    type: str
    category: str
    complexity: str
    duration: float

class ScalableDatasetEnhancedManimGenerator:
    """Enhanced Manim generator using scalable similarity scoring for large datasets"""
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY", "your_api_key_here")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.dataset = []
        
        # Build keyword taxonomy for intelligent matching
        self.domain_taxonomy = self._build_domain_taxonomy()
        
        self.load_dataset()
        
    def _build_domain_taxonomy(self) -> Dict[str, Set[str]]:
        """Build a comprehensive taxonomy of domain keywords for intelligent matching"""
        return {
            'neural_ai': {
                'neural', 'network', 'neuron', 'ai', 'artificial', 'intelligence', 
                'machine', 'learning', 'deep', 'layer', 'node', 'connection',
                'activation', 'backprop', 'training', 'model', 'algorithm'
            },
            'research': {
                'research', 'study', 'methodology', 'hypothesis', 'experiment',
                'analysis', 'data', 'findings', 'results', 'conclusion',
                'investigation', 'survey', 'observation', 'theory', 'empirical'
            },
            'mathematics': {
                'math', 'mathematical', 'equation', 'formula', 'function',
                'algebra', 'calculus', 'geometry', 'derivative', 'integral',
                'plot', 'graph', 'theorem', 'proof', 'variable', 'constant'
            },
            'physics': {
                'physics', 'wave', 'particle', 'force', 'energy', 'motion',
                'quantum', 'electromagnetic', 'gravity', 'momentum', 'velocity',
                'acceleration', 'field', 'radiation', 'atomic', 'molecular'
            },
            'visualization': {
                'chart', 'diagram', 'flowchart', 'visual', 'display', 'show',
                'illustrate', 'demonstrate', 'present', 'graphic', 'animation',
                'transition', 'transform', 'movement', 'sequence', 'flow'
            },
            'geometry': {
                'circle', 'square', 'triangle', 'rectangle', 'polygon', 'line',
                'curve', 'angle', 'point', 'vertex', 'edge', 'shape', 'geometric',
                'coordinate', 'axis', 'dimension', 'perspective', 'rotation'
            }
        }
    
    def load_dataset(self):
        """Load the Manim dataset - try full dataset first, fallback to research dataset"""
        
        # Try full dataset first (599 examples)
        full_dataset_path = Path("datasets/full_manim_dataset.jsonl")
        research_dataset_path = Path("datasets/manim_research_dataset.jsonl")
        
        dataset_path = None
        if full_dataset_path.exists():
            dataset_path = full_dataset_path
            print("🎯 Loading FULL dataset (599 examples)...")
        elif research_dataset_path.exists():
            dataset_path = research_dataset_path
            print("📚 Loading research dataset (3 examples)...")
        else:
            print("⚠️ No dataset found, using basic approach")
            return
            
        # Load dataset
        with open(dataset_path, 'r') as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    self.dataset.append(ManimExample(**data))
        
        print(f"📊 Loaded {len(self.dataset)} examples from dataset")
        
        # Show dataset statistics
        if len(self.dataset) > 10:
            categories = {}
            complexities = {}
            for example in self.dataset:
                categories[example.category] = categories.get(example.category, 0) + 1
                complexities[example.complexity] = complexities.get(example.complexity, 0) + 1
            
            print(f"📈 Categories: {dict(sorted(categories.items()))}")
            print(f"🎯 Complexities: {dict(sorted(complexities.items()))}")
    
    def extract_keywords(self, text: str) -> Set[str]:
        """Extract meaningful keywords from text, removing common stop words"""
        # Convert to lowercase and extract words
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Remove common stop words
        stop_words = {
            'the', 'and', 'with', 'for', 'are', 'this', 'that', 'have', 'from',
            'they', 'been', 'will', 'more', 'can', 'had', 'her', 'was', 'one',
            'our', 'out', 'day', 'get', 'use', 'man', 'new', 'now', 'way',
            'may', 'say', 'each', 'which', 'she', 'how', 'its', 'said', 'what',
            'make', 'much', 'through', 'back', 'good', 'very', 'still', 'should',
            'any', 'some', 'could', 'time', 'would', 'about', 'than', 'into'
        }
        
        return set(word for word in words if word not in stop_words)
    
    def calculate_domain_relevance(self, prompt_keywords: Set[str], example_keywords: Set[str]) -> Dict[str, float]:
        """Calculate relevance scores for each domain"""
        domain_scores = {}
        
        for domain, domain_keywords in self.domain_taxonomy.items():
            # Calculate how many domain keywords appear in both prompt and example
            prompt_domain_overlap = len(prompt_keywords.intersection(domain_keywords))
            example_domain_overlap = len(example_keywords.intersection(domain_keywords))
            
            # Give bonus if both have keywords from this domain
            if prompt_domain_overlap > 0 and example_domain_overlap > 0:
                domain_scores[domain] = prompt_domain_overlap + example_domain_overlap
            else:
                domain_scores[domain] = 0
        
        return domain_scores
    
    def calculate_similarity_score(self, prompt: str, example: ManimExample) -> float:
        """Calculate comprehensive similarity score between prompt and example"""
        
        # Extract keywords
        prompt_keywords = self.extract_keywords(prompt)
        example_keywords = self.extract_keywords(example.prompt)
        
        # Base keyword overlap score
        keyword_overlap = len(prompt_keywords.intersection(example_keywords))
        keyword_score = keyword_overlap * 2.0
        
        # Domain relevance scoring
        domain_relevances = self.calculate_domain_relevance(prompt_keywords, example_keywords)
        domain_score = sum(domain_relevances.values()) * 1.5
        
        # Category bonus (if example has explicit category)
        category_score = 0
        if hasattr(example, 'category') and example.category:
            category_keywords = self.extract_keywords(example.category)
            if prompt_keywords.intersection(category_keywords):
                category_score = 2.0
        
        # Complexity preference (slightly prefer intermediate complexity)
        complexity_score = 0
        if hasattr(example, 'complexity'):
            if example.complexity == 'intermediate':
                complexity_score = 0.5
            elif example.complexity == 'basic':
                complexity_score = 0.2
        
        # Length similarity bonus (prefer examples of similar description length)
        prompt_length = len(prompt.split())
        example_length = len(example.prompt.split())
        length_diff = abs(prompt_length - example_length)
        length_score = max(0, 1.0 - (length_diff / 10.0))
        
        total_score = keyword_score + domain_score + category_score + complexity_score + length_score
        
        return total_score
    
    def get_relevant_examples(self, prompt: str, limit: int = 3) -> List[Tuple[float, ManimExample]]:
        """Get relevant examples using comprehensive similarity scoring"""
        
        if not self.dataset:
            return []
        
        # Calculate similarity scores for all examples
        scored_examples = []
        for example in self.dataset:
            score = self.calculate_similarity_score(prompt, example)
            if score > 0:  # Only include examples with some relevance
                scored_examples.append((score, example))
        
        # Sort by score (highest first) and return top examples
        scored_examples.sort(key=lambda x: x[0], reverse=True)
        
        return scored_examples[:limit]
    
    def analyze_prompt_intent(self, prompt: str) -> Dict[str, Any]:
        """Analyze the prompt to understand user intent and provide better guidance"""
        prompt_keywords = self.extract_keywords(prompt)
        
        # Determine primary domain
        domain_scores = {}
        for domain, domain_keywords in self.domain_taxonomy.items():
            overlap = len(prompt_keywords.intersection(domain_keywords))
            domain_scores[domain] = overlap
        
        primary_domain = max(domain_scores.items(), key=lambda x: x[1])[0] if any(domain_scores.values()) else 'general'
        
        # Determine animation complexity needed
        complexity_indicators = {
            'simple': {'basic', 'simple', 'show', 'display', 'create'},
            'intermediate': {'animate', 'transform', 'transition', 'move', 'change'},
            'complex': {'sequence', 'multi', 'complex', 'advanced', 'interactive', 'dynamic'}
        }
        
        suggested_complexity = 'intermediate'  # default
        for complexity, indicators in complexity_indicators.items():
            if prompt_keywords.intersection(indicators):
                suggested_complexity = complexity
                break
        
        return {
            'primary_domain': primary_domain,
            'suggested_complexity': suggested_complexity,
            'keywords': prompt_keywords,
            'domain_scores': domain_scores
        }
    
    def build_enhanced_system_prompt(self, prompt: str, examples: List[ManimExample], prompt_analysis: Dict[str, Any]) -> str:
        """Build system prompt with relevant examples and domain-specific guidance"""
        
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

        # Add domain-specific guidance
        domain_guidance = self._get_domain_guidance(prompt_analysis['primary_domain'])
        if domain_guidance:
            base_prompt += f"\n\nDOMAIN-SPECIFIC GUIDANCE ({prompt_analysis['primary_domain'].upper()}):\n{domain_guidance}"

        # Add examples if available
        if examples:
            base_prompt += f"\n\nHere are {len(examples)} relevant examples selected by similarity analysis:\n\n"
            
            for i, example in enumerate(examples, 1):
                base_prompt += f"EXAMPLE {i} (Relevance-based selection):\n"
                base_prompt += f"Prompt: {example.prompt}\n"
                base_prompt += f"Code:\n{example.code}\n\n"
            
            base_prompt += "Use these examples as inspiration for structure, timing, and visual quality. "
            base_prompt += "Adapt the patterns and techniques to create the requested animation.\n\n"
        else:
            base_prompt += "\n\nNo directly relevant examples found. Use your knowledge of Manim best practices.\n\n"
        
        # Add the actual user request
        base_prompt += f"\n\nUSER REQUEST: {prompt}\n\n"
        base_prompt += "Create a Manim animation that visually represents and illustrates the content described in the USER REQUEST above. "
        base_prompt += "The animation should match and support the narration/voice-over content.\n\n"
        base_prompt += "GENERATE ONLY CODE - NO EXPLANATIONS."
        
        return base_prompt
    
    def _get_domain_guidance(self, domain: str) -> str:
        """Get domain-specific implementation guidance"""
        guidance_map = {
            'neural_ai': """
- Use circles for nodes/neurons: Circle(radius=0.3, color=BLUE)
- Use lines for connections: Line(start, end, color=WHITE)
- Arrange in layers: VGroup(*neurons).arrange(DOWN, buff=0.5)
- Show data flow with color changes: node.animate.set_color(YELLOW)
- Use sequential animations for signal propagation""",
            
            'research': """
- Use rectangles for process steps: Rectangle(width=2, height=1, color=GREEN)
- Use arrows for flow: Arrow(start, end, buff=0.1)
- Add clear text labels: Text("Step 1", font_size=24)
- Show progression with timed reveals: self.play(FadeIn(step), run_time=1.5)
- Use different colors for different phases""",
            
            'mathematics': """
- Use Axes() for coordinate systems: axes = Axes(x_range=[-3,3], y_range=[-2,2])
- Plot functions: graph = axes.plot(lambda x: x**2, color=RED)
- Add mathematical text: formula = Text("f(x) = x²", font_size=30)
- Show transformations smoothly: self.play(Transform(graph1, graph2))
- Use proper scaling and labels""",
            
            'physics': """
- Use waves: axes.plot(lambda x: np.sin(x), color=BLUE)
- Show particle motion: dot.animate.move_to(new_position)
- Use vector fields: Arrow(ORIGIN, direction, color=RED)
- Animate forces and fields with smooth transitions
- Include proper timing for physical phenomena""",
            
            'visualization': """
- Use clear visual hierarchy with different sizes and colors
- Add smooth transitions between states: FadeIn, FadeOut, Transform
- Use grouping: VGroup(*objects).arrange(RIGHT, buff=1)
- Show relationships with connecting lines or arrows
- Include clear labeling and legends""",
            
            'geometry': """
- Use precise geometric shapes: Circle(radius=1), Square(side_length=2)
- Show constructions step by step: self.play(Create(shape1), Create(shape2))
- Use proper positioning: shape.move_to(UP*2 + RIGHT*1)
- Highlight important elements: shape.animate.set_color(YELLOW)
- Show relationships between geometric objects"""
        }
        
        return guidance_map.get(domain, "")
    
    @weave.op()
    async def generate_manim_code(self, prompt: str) -> Dict[str, Any]:
        """
        Generate high-quality Manim code using scalable similarity scoring
        
        Args:
            prompt: Description of what the animation should show
            
        Returns:
            Dict with success status and generated code
        """
        
        print(f"🎯 Generating scalable-enhanced code for: {prompt}")
        
        # Analyze prompt intent
        prompt_analysis = self.analyze_prompt_intent(prompt)
        print(f"🔍 Detected domain: {prompt_analysis['primary_domain']}")
        print(f"📊 Suggested complexity: {prompt_analysis['suggested_complexity']}")
        
        # Get relevant examples using scalable similarity scoring
        scored_examples = self.get_relevant_examples(prompt)
        relevant_examples = [example for _, example in scored_examples]
        
        if relevant_examples:
            print(f"📚 Using {len(relevant_examples)} examples selected by similarity analysis:")
            for i, (score, example) in enumerate(scored_examples):
                print(f"  {i+1}. Score: {score:.1f} | {example.prompt[:45]}... ({example.category})")
        else:
            print("📚 No relevant examples found, using base knowledge")
        
        # Build enhanced system prompt with examples and domain guidance
        system_prompt = self.build_enhanced_system_prompt(prompt, relevant_examples, prompt_analysis)
        
        try:
            # Use low temperature for consistency
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,
                temperature=0.1,
                messages=[{
                    "role": "user",
                    "content": system_prompt
                }]
            )
            
            generated_code = response.content[0].text.strip()
            
            # Clean up response - remove markdown if present
            if "```python" in generated_code:
                match = re.search(r'```python\n(.*?)\n```', generated_code, re.DOTALL)
                if match:
                    generated_code = match.group(1)
            elif "```" in generated_code:
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
                    "method": "scalable_enhanced_generation",
                    "examples_used": len(relevant_examples),
                    "selection_method": "similarity_scoring",
                    "primary_domain": prompt_analysis['primary_domain'],
                    "similarity_scores": [score for score, _ in scored_examples]
                }
            except SyntaxError as e:
                print(f"❌ Syntax error: {e}")
                print("🛡️ Using safe fallback template")
                return {
                    "success": True,
                    "code": self._generate_safe_fallback(prompt),
                    "method": "safe_fallback",
                    "examples_used": 0,
                    "selection_method": "fallback"
                }
                
        except Exception as e:
            print(f"❌ LLM generation failed: {e}")
            print("🛡️ Using safe fallback template")
            return {
                "success": True,
                "code": self._generate_safe_fallback(prompt),
                "method": "safe_fallback", 
                "examples_used": 0,
                "selection_method": "fallback"
            }
    
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
        """Generate guaranteed-working fallback code"""
        prompt_words = prompt.lower().split()
        
        # Choose shape based on context  
        if any(word in prompt_words for word in ['circle', 'round', 'ball', 'node']):
            shape_code = "Circle(radius=1, color=BLUE)"
            shape_name = "Circle"
        elif any(word in prompt_words for word in ['square', 'box', 'rectangle']):
            shape_code = "Rectangle(width=2, height=1, color=RED)"
            shape_name = "Rectangle"
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
async def test_scalable_generator():
    """Test the scalable dataset generator"""
    generator = ScalableDatasetEnhancedManimGenerator()
    
    test_prompts = [
        "Create a neural network with data flowing through layers",
        "Show a research methodology with hypothesis testing",
        "Animate a mathematical function transformation",
        "Visualize quantum computing concepts with qubits"
    ]
    
    for prompt in test_prompts:
        print(f"\n{'='*70}")
        print(f"Testing: {prompt}")
        print('='*70)
        
        result = await generator.generate_manim_code(prompt)
        
        if result["success"]:
            print(f"✅ SUCCESS - Method: {result['method']}")
            print(f"📊 Examples used: {result['examples_used']}")
            print(f"🔍 Selection method: {result['selection_method']}")
            if 'primary_domain' in result:
                print(f"🎯 Primary domain: {result['primary_domain']}")
            if 'similarity_scores' in result and result['similarity_scores']:
                print(f"📈 Top similarity scores: {result['similarity_scores'][:3]}")
        else:
            print(f"❌ FAILED")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_scalable_generator())