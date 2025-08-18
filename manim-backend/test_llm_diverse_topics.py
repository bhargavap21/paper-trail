#!/usr/bin/env python3
"""
Test script for LLM-based Manim code generation across diverse research topics
"""
import sys
import tempfile
import subprocess
from pathlib import Path

# Add current directory to Python path
sys.path.append('.')

from enhanced_manim_generator import EnhancedManimGenerator, CodeGenerationContext

def test_diverse_topics():
    """Test LLM code generation across math, physics, biology, chemistry topics"""
    print("🧪 TESTING LLM-BASED CODE GENERATION FOR DIVERSE RESEARCH TOPICS")
    print("=" * 70)
    
    # Test prompts from different research fields
    test_prompts = [
        {
            "field": "Mathematics",
            "prompt": "Explain the mathematical concept of derivatives and show how the derivative of x^2 equals 2x using visual animation"
        },
        {
            "field": "Physics", 
            "prompt": "Demonstrate wave interference patterns showing constructive and destructive interference with oscillating waves"
        },
        {
            "field": "Biology",
            "prompt": "Show DNA replication process with the double helix unwinding and new strands being synthesized"
        },
        {
            "field": "Chemistry",
            "prompt": "Visualize molecular bonding in water molecules showing electron sharing between hydrogen and oxygen atoms"
        },
        {
            "field": "Computer Science",
            "prompt": "Illustrate how a binary search algorithm works by showing the tree traversal and comparison steps"
        }
    ]
    
    generator = EnhancedManimGenerator()
    results = []
    
    for i, test_case in enumerate(test_prompts):
        field = test_case["field"]
        prompt = test_case["prompt"]
        
        print(f"\n🎯 Test {i+1}/5: {field}")
        print(f"📝 Prompt: {prompt}")
        print("-" * 50)
        
        # Create context
        context = CodeGenerationContext(prompt=prompt)
        
        try:
            # Generate code using LLM
            print("🤖 Calling LLM for code generation...")
            code = generator.generate_code_with_llm(prompt, context)
            
            # Check if we got actual code (not template fallback)
            is_llm_generated = not ("Educational Content" in code and "Key concept" in code)
            
            print(f"✅ Code generated ({'LLM' if is_llm_generated else 'TEMPLATE'})")
            print(f"📏 Code length: {len(code)} characters")
            
            # Show a preview of the generated code
            preview = code[:300] + "..." if len(code) > 300 else code
            print(f"📄 Code preview:\n{preview}")
            
            results.append({
                "field": field,
                "success": True,
                "is_llm": is_llm_generated,
                "code_length": len(code)
            })
            
        except Exception as e:
            print(f"❌ Failed to generate code: {e}")
            results.append({
                "field": field, 
                "success": False,
                "is_llm": False,
                "code_length": 0
            })
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY OF DIVERSE TOPIC TESTING")
    print("=" * 70)
    
    total_tests = len(results)
    successful_tests = sum(1 for r in results if r["success"])
    llm_generated = sum(1 for r in results if r["is_llm"])
    
    print(f"Total tests: {total_tests}")
    print(f"Successful generations: {successful_tests}/{total_tests}")
    print(f"LLM-generated (not template fallback): {llm_generated}/{total_tests}")
    
    print("\nDetailed results:")
    for result in results:
        status = "✅" if result["success"] else "❌"
        source = "LLM" if result["is_llm"] else "TEMPLATE" 
        print(f"  {status} {result['field']}: {source} ({result['code_length']} chars)")
    
    # Test passes if we get diverse, LLM-generated content
    success_rate = llm_generated / total_tests
    if success_rate >= 0.8:  # 80% should be LLM-generated
        print(f"\n🎉 TEST PASSED: {success_rate:.1%} LLM generation rate")
        return True
    else:
        print(f"\n❌ TEST FAILED: Only {success_rate:.1%} LLM generation rate (need ≥80%)")
        return False

if __name__ == "__main__":
    success = test_diverse_topics()
    sys.exit(0 if success else 1)