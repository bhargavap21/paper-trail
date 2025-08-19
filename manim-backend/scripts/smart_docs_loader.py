import json
import re
from typing import List, Dict, Optional

class SmartManimDocsLoader:
    def __init__(self, docs_path: str = "manim_docs.json"):
        self.docs_path = docs_path
        self.docs_data = self._load_docs()
    
    def _load_docs(self) -> Dict:
        """Load the scraped documentation data"""
        try:
            with open(self.docs_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading docs: {e}")
            return {}
    
    def extract_relevant_sections(self, user_prompt: str) -> str:
        """Extract documentation sections most relevant to the user's request"""
        
        # Keywords to look for in user prompt
        keywords = self._extract_keywords(user_prompt.lower())
        
        # Score each documentation section based on relevance
        scored_sections = []
        
        for url, content in self.docs_data.items():
            score = self._calculate_relevance_score(content, keywords)
            if score > 0:
                scored_sections.append((score, content))
        
        # Sort by relevance score and take top sections
        scored_sections.sort(key=lambda x: x[0], reverse=True)
        top_sections = scored_sections[:5]  # Top 5 most relevant sections
        
        # Format the relevant documentation
        formatted_docs = []
        for score, section in top_sections:
            formatted_docs.append(f"=== {section['title']} ===")
            formatted_docs.append(f"Relevance Score: {score}")
            formatted_docs.append(section['content'][:1500])  # Limit content length
            
            if section['code_examples']:
                formatted_docs.append("\nRelevant Code Examples:")
                for i, code in enumerate(section['code_examples'][:3], 1):  # Max 3 examples
                    formatted_docs.append(f"Example {i}:\n```python\n{code}\n```")
            
            formatted_docs.append("\n" + "="*60 + "\n")
        
        return "\n".join(formatted_docs)
    
    def _extract_keywords(self, prompt: str) -> List[str]:
        """Extract relevant keywords from user prompt"""
        # Animation-related keywords
        animation_keywords = [
            'animation', 'animate', 'transform', 'move', 'rotate', 'scale', 'fade',
            'create', 'write', 'draw', 'morph', 'transition', 'sequence'
        ]
        
        # Object-related keywords
        object_keywords = [
            'circle', 'square', 'rectangle', 'polygon', 'line', 'arrow', 'curve',
            'text', 'math', 'equation', 'formula', 'graph', 'plot', 'chart',
            'network', 'tree', 'node', 'edge', 'axis', 'grid', 'surface'
        ]
        
        # Concept-related keywords
        concept_keywords = [
            'neural', 'network', 'layer', 'activation', 'function', 'data', 'flow',
            'algorithm', 'machine', 'learning', 'artificial', 'intelligence',
            'visualization', 'diagram', 'process', 'system', 'model'
        ]
        
        # Technical keywords
        technical_keywords = [
            'mobject', 'scene', 'construct', 'play', 'wait', 'group', 'vgroup',
            'color', 'position', 'coordinate', 'vector', 'matrix', 'geometry'
        ]
        
        all_keywords = animation_keywords + object_keywords + concept_keywords + technical_keywords
        
        found_keywords = []
        for keyword in all_keywords:
            if keyword in prompt:
                found_keywords.append(keyword)
        
        return found_keywords
    
    def _calculate_relevance_score(self, content: Dict, keywords: List[str]) -> float:
        """Calculate how relevant a documentation section is to the user's request"""
        score = 0.0
        
        # Check title relevance (higher weight)
        title_lower = content['title'].lower()
        for keyword in keywords:
            if keyword in title_lower:
                score += 3.0
        
        # Check content relevance
        content_lower = content['content'].lower()
        for keyword in keywords:
            occurrences = content_lower.count(keyword)
            score += occurrences * 1.0
        
        # Check code examples relevance (higher weight for code)
        for code_example in content['code_examples']:
            code_lower = code_example.lower()
            for keyword in keywords:
                if keyword in code_lower:
                    score += 2.0
        
        # Bonus for sections with code examples
        if content['code_examples']:
            score += 1.0
        
        return score
    
    def get_targeted_documentation(self, user_prompt: str) -> str:
        """Get documentation specifically targeted to the user's request"""
        if not self.docs_data:
            return "Documentation not available"
        
        relevant_docs = self.extract_relevant_sections(user_prompt)
        
        if not relevant_docs:
            # Fallback to general documentation
            return self._get_general_documentation()
        
        return f"""
TARGETED MANIM DOCUMENTATION FOR YOUR REQUEST:

{relevant_docs}

GENERAL GUIDELINES:
- Always use 'class SimpleScene(Scene)' as your class name
- Start with a title using Text().to_edge(UP)
- Use self.play() for animations and self.wait() for pauses
- Keep animations smooth and educational
- Total scene duration should be exactly 12 seconds
"""
    
    def _get_general_documentation(self) -> str:
        """Get general documentation when no specific match is found"""
        general_sections = []
        
        # Look for general sections
        for url, content in self.docs_data.items():
            if any(keyword in content['title'].lower() for keyword in 
                   ['quickstart', 'getting started', 'example', 'basic']):
                general_sections.append(content)
        
        if not general_sections:
            return "Basic Manim documentation not available"
        
        # Format general documentation
        formatted = []
        for section in general_sections[:3]:  # Top 3 general sections
            formatted.append(f"=== {section['title']} ===")
            formatted.append(section['content'][:1000])
            if section['code_examples']:
                formatted.append("\nCode Examples:")
                for i, code in enumerate(section['code_examples'][:2], 1):
                    formatted.append(f"Example {i}:\n```python\n{code}\n```")
            formatted.append("\n" + "="*60 + "\n")
        
        return "\n".join(formatted)

# Usage example
if __name__ == "__main__":
    loader = SmartManimDocsLoader()
    
    # Test with different prompts
    test_prompts = [
        "Create a neural network visualization with layers",
        "Animate a graph with nodes and edges",
        "Show mathematical equations and transformations",
        "Create a simple circle animation"
    ]
    
    for prompt in test_prompts:
        print(f"\n{'='*80}")
        print(f"PROMPT: {prompt}")
        print(f"{'='*80}")
        docs = loader.get_targeted_documentation(prompt)
        print(docs[:500] + "..." if len(docs) > 500 else docs) 