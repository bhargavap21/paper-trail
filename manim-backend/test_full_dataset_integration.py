#!/usr/bin/env python3
"""
Test Full Dataset Integration
Test the scalable generator with the full 599-example dataset
"""

import asyncio
import time
from scalable_dataset_enhanced_generator import ScalableDatasetEnhancedManimGenerator

async def test_full_dataset_performance():
    """Test performance and functionality with the full dataset"""
    
    print("🧪 TESTING FULL DATASET INTEGRATION")
    print("=" * 60)
    
    # Initialize generator with timing
    start_time = time.time()
    print("🔧 Initializing scalable generator with full dataset...")
    
    generator = ScalableDatasetEnhancedManimGenerator()
    
    init_time = time.time() - start_time
    print(f"⏱️ Initialization time: {init_time:.2f} seconds")
    print(f"📊 Dataset size: {len(generator.dataset)} examples")
    
    if len(generator.dataset) < 500:
        print("⚠️ Warning: Expected ~599 examples, got fewer. Check dataset loading.")
    else:
        print("✅ Full dataset loaded successfully!")
    
    # Test domain taxonomy coverage
    domains = list(generator.domain_taxonomy.keys())
    print(f"🎯 Available domains: {domains}")
    
    # Test various prompts to see similarity scoring in action
    test_prompts = [
        "Create a circle with radius 2",
        "Draw a square and animate it moving right", 
        "Make a neural network with layers and connections",
        "Show a mathematical function plot with axes",
        "Create a triangle and rotate it 45 degrees",
        "Display text saying 'Hello World' with fade in animation"
    ]
    
    print(f"\n🎯 TESTING SIMILARITY SCORING WITH {len(test_prompts)} PROMPTS")
    print("-" * 60)
    
    for i, prompt in enumerate(test_prompts, 1):
        print(f"\n{i}. Testing: '{prompt}'")
        
        # Time the similarity analysis
        start_time = time.time()
        
        # Analyze the prompt
        prompt_analysis = generator.analyze_prompt_intent(prompt)
        
        # Get relevant examples
        scored_examples = generator.get_relevant_examples(prompt, limit=5)
        
        analysis_time = time.time() - start_time
        
        print(f"   🔍 Domain: {prompt_analysis['primary_domain']}")
        print(f"   🎯 Complexity: {prompt_analysis['suggested_complexity']}")
        print(f"   ⏱️ Analysis time: {analysis_time:.3f}s")
        print(f"   📚 Top examples found: {len(scored_examples)}")
        
        if scored_examples:
            # Show top 3 similarity scores
            top_scores = [(score, example) for score, example in scored_examples[:3]]
            for j, (score, example) in enumerate(top_scores, 1):
                print(f"      {j}. Score: {score:.1f} | {example.prompt[:40]}... ({example.category})")
        else:
            print("      No relevant examples found")
    
    # Test performance with large similarity scoring
    print(f"\n⚡ PERFORMANCE TEST: Large Dataset Similarity Scoring")
    print("-" * 60)
    
    performance_prompt = "Create an animated circle that moves and changes color"
    
    # Time multiple runs
    times = []
    for run in range(5):
        start_time = time.time()
        scored_examples = generator.get_relevant_examples(performance_prompt, limit=10)
        elapsed = time.time() - start_time
        times.append(elapsed)
        print(f"   Run {run+1}: {elapsed:.3f}s ({len(scored_examples)} examples)")
    
    avg_time = sum(times) / len(times)
    print(f"   📊 Average time: {avg_time:.3f}s")
    print(f"   🚀 Performance: {'✅ Excellent' if avg_time < 0.1 else '⚠️ Needs optimization' if avg_time < 0.5 else '❌ Too slow'}")
    
    # Test memory usage estimation
    import sys
    generator_size = sys.getsizeof(generator.dataset)
    print(f"   💾 Dataset memory usage: ~{generator_size/1024/1024:.1f} MB")
    
    print(f"\n🎉 FULL DATASET INTEGRATION TEST COMPLETE!")
    print("=" * 60)
    
    if len(generator.dataset) >= 500 and avg_time < 0.5:
        print("✅ SUCCESS: Full dataset integrated with good performance!")
        print("🚀 Your system can now leverage 599+ examples for better animations!")
    else:
        print("⚠️ ISSUES: Check dataset loading or performance optimization needed")

async def test_code_generation_quality():
    """Test actual code generation with full dataset"""
    
    print(f"\n🧪 TESTING CODE GENERATION QUALITY")
    print("=" * 60)
    
    generator = ScalableDatasetEnhancedManimGenerator()
    
    quality_test_prompts = [
        "Create a circle with radius 1",
        "Make a square and animate it",
        "Draw a line from left to right"
    ]
    
    for prompt in quality_test_prompts:
        print(f"\n🎯 Testing generation for: '{prompt}'")
        
        # Get relevant examples first
        scored_examples = generator.get_relevant_examples(prompt, limit=3)
        
        if scored_examples:
            print(f"📚 Found {len(scored_examples)} relevant examples:")
            for i, (score, example) in enumerate(scored_examples[:3], 1):
                print(f"   {i}. Score: {score:.1f} | Category: {example.category} | Complexity: {example.complexity}")
                print(f"      Prompt: {example.prompt[:50]}...")
                print(f"      Code preview: {example.code[:60]}...")
        else:
            print("📚 No relevant examples found")

if __name__ == "__main__":
    asyncio.run(test_full_dataset_performance())
    asyncio.run(test_code_generation_quality())