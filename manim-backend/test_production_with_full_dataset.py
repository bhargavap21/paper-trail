#!/usr/bin/env python3
"""
Test Production Integration with Full Dataset
Verify that the production server is now using the full 599-example dataset
"""

import asyncio
from simple_video_generator import SimpleVideoGenerator

async def test_production_full_dataset():
    """Test that production pipeline uses the full dataset"""
    
    print("🧪 TESTING PRODUCTION WITH FULL DATASET")
    print("=" * 60)
    
    # Initialize the production video generator
    print("🔧 Initializing production SimpleVideoGenerator...")
    generator = SimpleVideoGenerator()
    
    # Check the underlying generator
    manim_generator = generator.manim_generator
    generator_type = type(manim_generator).__name__
    dataset_size = len(manim_generator.dataset)
    
    print(f"🔍 Generator type: {generator_type}")
    print(f"📊 Dataset size: {dataset_size} examples")
    
    # Verify we're using the scalable generator with full dataset
    if generator_type != "ScalableDatasetEnhancedManimGenerator":
        print(f"❌ ERROR: Expected ScalableDatasetEnhancedManimGenerator, got {generator_type}")
        return
    
    if dataset_size < 500:
        print(f"⚠️ WARNING: Expected ~599 examples, got {dataset_size}")
        print("🔄 This might be using the small research dataset instead of full dataset")
    else:
        print("✅ SUCCESS: Production is using the full dataset!")
    
    # Show dataset statistics
    if hasattr(manim_generator, 'dataset') and len(manim_generator.dataset) > 10:
        categories = {}
        complexities = {}
        for example in manim_generator.dataset:
            categories[example.category] = categories.get(example.category, 0) + 1
            complexities[example.complexity] = complexities.get(example.complexity, 0) + 1
        
        print(f"📈 Categories available: {dict(sorted(categories.items()))}")
        print(f"🎯 Complexity levels: {dict(sorted(complexities.items()))}")
    
    # Test domain detection on production generator
    print(f"\n🎯 TESTING DOMAIN DETECTION IN PRODUCTION")
    print("-" * 40)
    
    test_prompts = [
        "Create a circle animation",
        "Make a neural network visualization", 
        "Show a mathematical function",
        "Draw geometric shapes"
    ]
    
    for prompt in test_prompts:
        # Analyze prompt using production generator
        if hasattr(manim_generator, 'analyze_prompt_intent'):
            analysis = manim_generator.analyze_prompt_intent(prompt)
            scored_examples = manim_generator.get_relevant_examples(prompt, limit=3)
            
            print(f"   '{prompt}'")
            print(f"     → Domain: {analysis['primary_domain']}")
            print(f"     → Examples: {len(scored_examples)} relevant matches")
            if scored_examples:
                top_score = scored_examples[0][0] if scored_examples[0] else 0
                print(f"     → Best match score: {top_score:.1f}")
        else:
            print(f"   '{prompt}' → Basic generator (no advanced analysis)")
    
    # Performance check
    print(f"\n⚡ PRODUCTION PERFORMANCE CHECK")
    print("-" * 40)
    
    import time
    start_time = time.time()
    
    # Test similarity scoring performance
    test_prompt = "Create an animated circle with color changes"
    if hasattr(manim_generator, 'get_relevant_examples'):
        scored_examples = manim_generator.get_relevant_examples(test_prompt, limit=5)
        
        elapsed = time.time() - start_time
        print(f"   Query time: {elapsed:.3f}s")
        print(f"   Examples found: {len(scored_examples)}")
        print(f"   Performance: {'✅ Excellent' if elapsed < 0.1 else '⚠️ Good' if elapsed < 0.5 else '❌ Slow'}")
    
    print(f"\n🎉 PRODUCTION FULL DATASET TEST COMPLETE!")
    print("=" * 60)
    
    if dataset_size >= 500:
        print("✅ SUCCESS: Your production server is now powered by 599+ examples!")
        print("🚀 Frontend users will get much better Manim animations!")
        print("💡 The system can now handle complex requests with intelligent example selection!")
    else:
        print("⚠️ ISSUE: Production may not be using the full dataset")
        print("💡 Check that datasets/full_manim_dataset.jsonl exists and is accessible")

if __name__ == "__main__":
    asyncio.run(test_production_full_dataset())