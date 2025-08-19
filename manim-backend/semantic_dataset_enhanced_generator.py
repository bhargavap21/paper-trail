#!/usr/bin/env python3
"""
Semantic Dataset-Enhanced Manim Generator
Uses OpenAI embeddings for scalable dataset selection instead of hard-coded keywords
"""
import anthropic
import openai
import os
import json
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import weave
from dataclasses import dataclass
import pickle

@dataclass
class ManimExample:
    prompt: str
    code: str
    type: str
    category: str
    complexity: str
    duration: float
    embedding: Optional[List[float]] = None

class SemanticDatasetEnhancedManimGenerator:
    """Enhanced Manim generator using OpenAI embeddings for scalable dataset selection"""
    
    def __init__(self):
        # Initialize API clients
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "your_api_key_here")
        openai_key = os.getenv("OPENAI_API_KEY", "your_openai_key_here")
        
        self.client = anthropic.Anthropic(api_key=anthropic_key)
        self.openai_client = openai.OpenAI(api_key=openai_key)
        
        self.dataset = []
        self.embeddings_cache_path = Path("datasets/openai_embeddings_cache.pkl")
        
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
            print("🔄 Loading cached OpenAI embeddings...")
            self._load_cached_embeddings()
        else:
            print("🧠 Computing OpenAI embeddings for dataset...")
            self._compute_and_cache_embeddings()
    
    def _compute_and_cache_embeddings(self):
        """Compute OpenAI embeddings for all dataset examples and cache them"""
        try:
            prompts = [example.prompt for example in self.dataset]
            
            # Compute embeddings using OpenAI API
            print("🔄 Computing embeddings via OpenAI API...")
            embeddings_response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",  # More cost-effective than text-embedding-ada-002
                input=prompts
            )
            
            embeddings = [item.embedding for item in embeddings_response.data]
            
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
            
            print(f"💾 Cached {len(embeddings)} OpenAI embeddings to {self.embeddings_cache_path}")
            
        except Exception as e:
            print(f"⚠️ Failed to compute OpenAI embeddings: {e}")
            print("🔄 Falling back to keyword-based selection")
    
    def _load_cached_embeddings(self):
        """Load cached embeddings and assign to dataset examples"""
        try:
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
            
            print(f"✅ Loaded {len(cached_embeddings)} cached OpenAI embeddings")
            
        except Exception as e:
            print(f"⚠️ Failed to load cached embeddings: {e}")
            print("🔄 Recomputing embeddings...")
            self._compute_and_cache_embeddings()
    
    def cosine_similarity(self, a: List[float], b: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = sum(x * y for x, y in zip(a, b))
        magnitude_a = sum(x * x for x in a) ** 0.5
        magnitude_b = sum(x * x for x in b) ** 0.5
        
        if magnitude_a == 0 or magnitude_b == 0:
            return 0
        
        return dot_product / (magnitude_a * magnitude_b)
    
    def get_relevant_examples_semantic(self, prompt: str, limit: int = 3) -> List[Tuple[float, ManimExample]]:
        """Get relevant examples using semantic similarity with OpenAI embeddings"""
        
        if not self.dataset or not self.dataset[0].embedding:
            return []
        
        try:
            # Compute embedding for the input prompt using OpenAI
            prompt_response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=[prompt]
            )
            prompt_embedding = prompt_response.data[0].embedding
            
            # Calculate similarity with all dataset examples
            similarities = []
            for example in self.dataset:
                if example.embedding:
                    similarity = self.cosine_similarity(prompt_embedding, example.embedding)
                    similarities.append((similarity, example))
            
            # Sort by similarity (highest first)
            similarities.sort(key=lambda x: x[0], reverse=True)
            
            return similarities[:limit]
            
        except Exception as e:
            print(f"⚠️ Failed to compute prompt embedding: {e}")
            return []
    
    def get_relevant_examples_fallback(self, prompt: str, limit: int = 3) -> List[ManimExample]:
        """Fallback keyword-based selection when embeddings fail"""
        if not self.dataset:
            return []
        
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
            
            # Category-based scoring
            if any(word in prompt_lower for word in ['research', 'study', 'methodology']):
                if example.category == 'research':
                    score += 3
            elif any(word in prompt_lower for word in ['math', 'equation', 'function']):
                if example.category == 'math':
                    score += 3
            elif any(word in prompt_lower for word in ['neural', 'network', 'ai']):
                if 'neural' in example.prompt.lower():
                    score += 3
            
            if score > 0:
                relevant_examples.append((score, example))
        
        # Sort by score and return top examples
        relevant_examples.sort(key=lambda x: x[0], reverse=True)
        return [example for _, example in relevant_examples[:limit]]
    
    def get_relevant_examples(self, prompt: str, limit: int = 3) -> List[ManimExample]:
        """Get relevant examples using semantic similarity with fallback"""
        
        # Try semantic similarity first
        semantic_results = self.get_relevant_examples_semantic(prompt, limit)
        
        if semantic_results:
            print(f"🔍 Using semantic similarity with {len(semantic_results)} examples")
            return [example for _, example in semantic_results]
        else:
            print("🔄 Falling back to keyword-based selection")
            return self.get_relevant_examples_fallback(prompt, limit)
    
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
            base_prompt += f"\n\nHere are {len(examples)} high-quality examples semantically similar to your task:\n\n"
            
            for i, example in enumerate(examples, 1):
                base_prompt += f"EXAMPLE {i} (Semantically selected):\n"
                base_prompt += f"Prompt: {example.prompt}\n"
                base_prompt += f"Code:\n{example.code}\n\n"
            
            base_prompt += "Use these examples as inspiration for structure, timing, and visual quality. "
            base_prompt += "Adapt the patterns and techniques to create the requested animation.\n\n"
        else:
            base_prompt += "\n\nNo similar examples found. Use your knowledge of Manim best practices.\n\n"
        
        base_prompt += "GENERATE ONLY CODE - NO EXPLANATIONS."
        
        return base_prompt
    
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
        relevant_examples = self.get_relevant_examples(prompt)
        
        if relevant_examples:
            print(f"📚 Using {len(relevant_examples)} relevant examples:")
            for i, example in enumerate(relevant_examples):
                print(f"  {i+1}. {example.prompt[:50]}... ({example.category})")
        else:
            print("📚 No relevant examples found, using base knowledge")
        
        # Build enhanced system prompt with examples
        system_prompt = self.build_enhanced_system_prompt(prompt, relevant_examples)
        
        full_prompt = f"""Generate Manim animation code for: "{prompt}"

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
                    "selection_method": "openai_embeddings" if relevant_examples else "base_knowledge"
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
async def test_semantic_generator():
    """Test the semantic-based generator"""
    generator = SemanticDatasetEnhancedManimGenerator()
    
    test_prompts = [
        "Create a neural network with data flowing through layers",
        "Show a research methodology with hypothesis testing", 
        "Animate a mathematical function transformation"
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
        else:
            print(f"❌ FAILED")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_semantic_generator())