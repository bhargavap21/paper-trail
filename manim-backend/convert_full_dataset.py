#!/usr/bin/env python3
"""
Convert Full Generative-Manim Dataset
Convert the 599-example dataset to our format for scalable generation
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Set

def categorize_prompt_advanced(prompt: str, code: str) -> str:
    """Advanced categorization based on prompt and code content"""
    prompt_lower = prompt.lower()
    code_lower = code.lower()
    
    # Neural network / AI keywords
    neural_keywords = ['neural', 'network', 'neuron', 'ai', 'layer', 'node', 'connection', 'deep', 'learning']
    if any(word in prompt_lower for word in neural_keywords) or any(word in code_lower for word in neural_keywords):
        return 'neural_ai'
    
    # Research keywords
    research_keywords = ['research', 'study', 'methodology', 'hypothesis', 'experiment', 'analysis', 'flowchart']
    if any(word in prompt_lower for word in research_keywords):
        return 'research'
    
    # Mathematics keywords
    math_keywords = ['equation', 'formula', 'function', 'math', 'sine', 'cosine', 'derivative', 'integral', 'axes', 'graph', 'plot']
    if any(word in prompt_lower for word in math_keywords) or 'axes' in code_lower or 'plot' in code_lower:
        return 'mathematics'
    
    # Physics keywords
    physics_keywords = ['wave', 'particle', 'force', 'energy', 'motion', 'physics', 'quantum', 'vector']
    if any(word in prompt_lower for word in physics_keywords):
        return 'physics'
    
    # Geometry keywords
    geometry_keywords = ['circle', 'square', 'triangle', 'rectangle', 'polygon', 'line', 'curve', 'angle', 'shape']
    if any(word in prompt_lower for word in geometry_keywords) or any(word in code_lower for word in geometry_keywords):
        return 'geometry'
    
    # Visualization keywords (catch-all for visual elements)
    return 'visualization'

def estimate_complexity(prompt: str, code: str) -> str:
    """Estimate complexity based on prompt and code features"""
    
    # Count complex features in code
    complex_features = [
        'vgroup', 'transform', 'animate', 'succession', 'laggedstart',
        'updater', 'valueeracker', 'always_redraw', 'rate_functions'
    ]
    
    intermediate_features = [
        'play(', 'wait(', 'shift(', 'rotate(', 'scale(', 'move_to(',
        'next_to(', 'arrange(', 'set_color(', 'fade'
    ]
    
    basic_features = [
        'add(', 'circle', 'square', 'text', 'line'
    ]
    
    code_lower = code.lower()
    
    # Count features
    complex_count = sum(1 for feature in complex_features if feature in code_lower)
    intermediate_count = sum(1 for feature in intermediate_features if feature in code_lower)
    basic_count = sum(1 for feature in basic_features if feature in code_lower)
    
    # Determine complexity
    if complex_count >= 2:
        return 'advanced'
    elif intermediate_count >= 3 or complex_count >= 1:
        return 'intermediate'
    else:
        return 'basic'

def estimate_duration(code: str) -> float:
    """Estimate animation duration from code"""
    
    # Count animations and waits
    play_count = len(re.findall(r'self\.play\(', code, re.IGNORECASE))
    wait_matches = re.findall(r'self\.wait\(([^)]*)\)', code, re.IGNORECASE)
    
    # Base duration for each play (default is 1 second)
    base_duration = play_count * 1.0
    
    # Add explicit waits
    wait_duration = 0
    for wait_match in wait_matches:
        try:
            # Extract number from wait(number)
            wait_time = float(wait_match.strip() or 1)
            wait_duration += wait_time
        except:
            wait_duration += 1  # Default wait time
    
    total_duration = base_duration + wait_duration
    
    # Ensure minimum and maximum bounds
    return max(2.0, min(total_duration, 20.0))

def convert_dataset():
    """Convert the full generative-manim dataset to our format"""
    
    print("🔄 Converting full generative-manim dataset...")
    
    input_path = Path("datasets/edoh-dataset.jsonl")
    output_path = Path("datasets/full_manim_dataset.jsonl")
    
    if not input_path.exists():
        print(f"❌ Input file not found: {input_path}")
        return
    
    converted_examples = []
    category_counts = {}
    complexity_counts = {}
    
    with open(input_path, 'r') as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
                
            try:
                data = json.loads(line)
                messages = data.get('messages', [])
                
                # Extract user prompt and assistant code
                user_prompt = None
                assistant_code = None
                
                for msg in messages:
                    if msg.get('role') == 'user':
                        user_prompt = msg.get('content', '').strip()
                    elif msg.get('role') == 'assistant':
                        assistant_code = msg.get('content', '').strip()
                
                if not user_prompt or not assistant_code:
                    continue
                
                # Skip system prompts and very short examples
                if len(user_prompt) < 10 or len(assistant_code) < 20:
                    continue
                
                # Categorize and analyze
                category = categorize_prompt_advanced(user_prompt, assistant_code)
                complexity = estimate_complexity(user_prompt, assistant_code)
                duration = estimate_duration(assistant_code)
                
                # Count categories and complexity
                category_counts[category] = category_counts.get(category, 0) + 1
                complexity_counts[complexity] = complexity_counts.get(complexity, 0) + 1
                
                # Create our format
                converted_example = {
                    "prompt": user_prompt,
                    "code": assistant_code,
                    "type": "video",  # All are video examples
                    "category": category,
                    "complexity": complexity,
                    "duration": duration
                }
                
                converted_examples.append(converted_example)
                
                if line_num % 100 == 0:
                    print(f"✅ Processed {line_num} examples...")
                    
            except Exception as e:
                print(f"⚠️ Error processing line {line_num}: {e}")
                continue
    
    # Write converted dataset
    with open(output_path, 'w') as f:
        for example in converted_examples:
            f.write(json.dumps(example) + '\n')
    
    print(f"\n🎉 DATASET CONVERSION COMPLETE!")
    print(f"📊 Converted {len(converted_examples)} examples")
    print(f"📁 Output: {output_path}")
    
    print(f"\n📈 CATEGORY DISTRIBUTION:")
    for category, count in sorted(category_counts.items()):
        print(f"  {category}: {count} examples")
    
    print(f"\n🎯 COMPLEXITY DISTRIBUTION:")
    for complexity, count in sorted(complexity_counts.items()):
        print(f"  {complexity}: {count} examples")
    
    # Show some examples
    print(f"\n🔍 SAMPLE CONVERTED EXAMPLES:")
    for i, example in enumerate(converted_examples[:3]):
        print(f"\nExample {i+1}:")
        print(f"  Category: {example['category']}")
        print(f"  Complexity: {example['complexity']}")
        print(f"  Duration: {example['duration']}s")
        print(f"  Prompt: {example['prompt'][:60]}...")
        print(f"  Code: {example['code'][:80]}...")

if __name__ == "__main__":
    convert_dataset()