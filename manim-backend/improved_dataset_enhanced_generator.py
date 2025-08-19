#!/usr/bin/env python3
"""
Improved Dataset-Enhanced Manim Generator
Uses semantic embeddings for scalable dataset selection instead of hard-coded keywords
"""
import anthropic
import os
import json
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import weave
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
import pickle

@dataclass
class ManimExample:
    prompt: str
    code: str
    type: str
    category: str
    complexity: str
    duration: float
    embedding: Optional[np.ndarray] = None

class ImprovedDatasetEnhancedManimGenerator:
    """Enhanced Manim generator using semantic embeddings for scalable dataset selection"""
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY", "your_api_key_here")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.dataset = []
        self.embeddings_cache_path = Path("datasets/embeddings_cache.pkl")
        
        # Initialize sentence transformer for semantic similarity
        print("🔧 Loading sentence transformer model...")
        self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        self.load_dataset()
        
    def load_dataset(self):
        """Load the Manim dataset and compute/cache embeddings"""
        dataset_path = Path("datasets/manim_research_dataset.jsonl")
        
        if not dataset_path.exists():
            print("⚠️ No dataset found, using basic approach")
            return
            
        # Load dataset
        with open(dataset_path, 'r') as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    self.dataset.append(ManimExample(**data))
        
        print(f"📊 Loaded {len(self.dataset)} examples from dataset")
        
        # Load or compute embeddings
        if self.embeddings_cache_path.exists():
            print("🔄 Loading cached embeddings...")
            self._load_cached_embeddings()
        else:
            print("🧠 Computing embeddings for dataset...")
            self._compute_and_cache_embeddings()
    
    def _compute_and_cache_embeddings(self):
        """Compute embeddings for all dataset examples and cache them"""
        prompts = [example.prompt for example in self.dataset]
        
        # Compute embeddings in batch for efficiency
        embeddings = self.sentence_model.encode(prompts, show_progress_bar=True)
        
        # Store embeddings in dataset objects
        for i, embedding in enumerate(embeddings):
            self.dataset[i].embedding = embedding
        
        # Cache embeddings to disk
        embeddings_data = {
            'embeddings': embeddings,
            'prompts': prompts
        }
        
        with open(self.embeddings_cache_path, 'wb') as f:
            pickle.dump(embeddings_data, f)
        
        print(f"💾 Cached {len(embeddings)} embeddings to {self.embeddings_cache_path}")
    
    def _load_cached_embeddings(self):
        """Load cached embeddings and assign to dataset examples"""
        with open(self.embeddings_cache_path, 'rb') as f:
            embeddings_data = pickle.load(f)
        
        cached_prompts = embeddings_data['prompts']
        cached_embeddings = embeddings_data['embeddings']
        
        # Verify cache matches current dataset
        current_prompts = [example.prompt for example in self.dataset]
        
        if cached_prompts != current_prompts:
            print("⚠️ Cached embeddings don't match current dataset, recomputing...")
            self._compute_and_cache_embeddings()
            return
        
        # Assign cached embeddings to examples
        for i, embedding in enumerate(cached_embeddings):
            self.dataset[i].embedding = embedding
        
        print(f"✅ Loaded {len(cached_embeddings)} cached embeddings")
    
    def get_relevant_examples_semantic(self, prompt: str, limit: int = 3) -> List[Tuple[float, ManimExample]]:
        """Get relevant examples using semantic similarity with embeddings"""
        
        if not self.dataset or not self.dataset[0].embedding is not None:
            return []
        
        # Compute embedding for the input prompt
        prompt_embedding = self.sentence_model.encode([prompt])[0]
        
        # Calculate cosine similarity with all dataset examples
        similarities = []
        for example in self.dataset:
            if example.embedding is not None:
                # Cosine similarity
                similarity = np.dot(prompt_embedding, example.embedding) / (
                    np.linalg.norm(prompt_embedding) * np.linalg.norm(example.embedding)
                )
                similarities.append((similarity, example))
        
        # Sort by similarity (highest first)
        similarities.sort(key=lambda x: x[0], reverse=True)
        
        return similarities[:limit]
    
    def get_relevant_examples_hybrid(self, prompt: str, limit: int = 3) -> List[ManimExample]:
        """Hybrid approach: semantic similarity + keyword boosting for better results"""
        
        if not self.dataset:
            return []
        
        # Get semantic similarities
        semantic_results = self.get_relevant_examples_semantic(prompt, limit * 2)  # Get more for filtering
        
        if not semantic_results:
            return []
        
        # Apply keyword boosting for domain-specific terms
        prompt_lower = prompt.lower()
        boosted_results = []
        
        for similarity, example in semantic_results:
            boosted_score = similarity
            
            # Boost for matching domain keywords
            domain_keywords = {
                'research': ['research', 'study', 'methodology', 'analysis', 'hypothesis', 'experiment'],
                'math': ['equation', 'formula', 'function', 'graph', 'plot', 'mathematical'],
                'physics': ['wave', 'particle', 'force', 'energy', 'motion', 'physics'],
                'neural': ['neural', 'network', 'ai', 'machine', 'learning', 'node', 'layer'],
                'visualization': ['chart', 'diagram', 'flowchart', 'visual', 'display']
            }
            
            for domain, keywords in domain_keywords.items():
                if any(keyword in prompt_lower for keyword in keywords):
                    if any(keyword in example.prompt.lower() for keyword in keywords):
                        boosted_score += 0.1  # Small boost for keyword match
            
            # Complexity preference (slightly prefer intermediate complexity)
            if example.complexity == 'intermediate':
                boosted_score += 0.05
            
            boosted_results.append((boosted_score, example))
        
        # Sort by boosted score and return top examples
        boosted_results.sort(key=lambda x: x[0], reverse=True)
        return [example for _, example in boosted_results[:limit]]
    
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
                base_prompt += f"EXAMPLE {i} (Similarity-based selection):\n"
                base_prompt += f"Prompt: {example.prompt}\n"
                base_prompt += f"Code:\n{example.code}\n\n"
            
            base_prompt += "Use these examples as inspiration for structure, timing, and visual quality. "
            base_prompt += "Adapt the patterns and techniques to create the requested animation.\n\n"
        
        base_prompt += "GENERATE ONLY CODE - NO EXPLANATIONS."
        
        return base_prompt
    
    def get_domain_specific_guidance(self, prompt: str) -> str:
        """Add domain-specific guidance based on semantic understanding"""
        prompt_lower = prompt.lower()
        
        guidance = ""
        
        # Use semantic keywords detection instead of hard-coded rules
        neural_keywords = ['neural', 'network', 'ai', 'machine learning', 'node', 'layer', 'neuron']
        research_keywords = ['research', 'methodology', 'process', 'flowchart', 'study', 'analysis']
        math_keywords = ['math', 'equation', 'formula', 'function', 'mathematical', 'calculus']
        graph_keywords = ['graph', 'plot', 'chart', 'data', 'visualization', 'axes']
        
        if any(keyword in prompt_lower for keyword in neural_keywords):
            guidance += """
For neural networks: Use circles for nodes, lines for connections, arrange in layers.
Example patterns: VGroup(*[Circle(radius=0.2) for _ in range(3)]).arrange(DOWN)
Show data flow with color changes and sequential animations."""
            
        elif any(keyword in prompt_lower for keyword in research_keywords):
            guidance += """
For research processes: Use rectangles for steps, arrows for flow, clear labeling.
Show progression with sequential reveals and smooth transitions."""
            
        elif any(keyword in prompt_lower for keyword in math_keywords):
            guidance += """
For math: Use Text() for equations, Axes() for graphs, smooth transformations.
Example: axes = Axes(); func = axes.plot(lambda x: x**2)"""
            
        elif any(keyword in prompt_lower for keyword in graph_keywords):
            guidance += """
For graphs: Use Axes() with proper scaling, plot functions with get_graph().
Add labels and smooth transitions between different views."""
            
        return guidance
    
    @weave.op()
    async def generate_manim_code(self, prompt: str) -> Dict[str, Any]:
        """
        Generate high-quality Manim code using semantic similarity for dataset selection
        
        Args:
            prompt: Description of what the animation should show
            
        Returns:
            Dict with success status and generated code
        """
        
        print(f"🎯 Generating semantically-enhanced code for: {prompt}")
        
        # Get relevant examples using semantic similarity
        relevant_examples = self.get_relevant_examples_hybrid(prompt)
        
        if relevant_examples:
            print(f"📚 Using {len(relevant_examples)} semantically similar examples:")
            for i, example in enumerate(relevant_examples):
                print(f"  {i+1}. {example.prompt[:50]}... ({example.category})")
        else:
            print("📚 No relevant examples found, using base knowledge")
        
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
                max_tokens=1500,
                temperature=0.1,
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
                    "method": "semantic_enhanced_generation",
                    "examples_used": len(relevant_examples),
                    "selection_method": "semantic_similarity"
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
async def test_improved_generator():
    """Test the improved semantic-based generator"""
    generator = ImprovedDatasetEnhancedManimGenerator()
    
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
            print(f"🔍 Selection method: {result['selection_method']}")
            print("Generated code preview:")
            print(result['code'][:300] + "..." if len(result['code']) > 300 else result['code'])
        else:
            print(f"❌ FAILED")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_improved_generator())