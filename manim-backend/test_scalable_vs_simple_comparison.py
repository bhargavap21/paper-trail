#!/usr/bin/env python3
"""
Comparison Test: Simple vs Scalable Dataset-Enhanced Generators
Tests the difference in example selection and code quality
"""

import asyncio
import sys
from pathlib import Path

# Import both generators
from simple_manim_generator import SimpleManimGenerator
from scalable_dataset_enhanced_generator import ScalableDatasetEnhancedManimGenerator

class GeneratorComparison:
    """Compare simple vs scalable generators"""
    
    def __init__(self):
        print("🔧 Initializing generators...")
        self.simple_generator = SimpleManimGenerator()
        self.scalable_generator = ScalableDatasetEnhancedManimGenerator()
        
    async def compare_generators(self, test_prompts):
        """Run comparison tests on both generators"""
        
        print(f"\n{'='*80}")
        print("🎯 GENERATOR COMPARISON TEST")
        print(f"{'='*80}")
        print(f"📊 Dataset size: {len(self.scalable_generator.dataset)} examples")
        print(f"🧪 Test prompts: {len(test_prompts)}")
        
        for i, prompt in enumerate(test_prompts, 1):
            print(f"\n{'='*80}")
            print(f"TEST {i}/{len(test_prompts)}: {prompt}")
            print('='*80)
            
            # Test Simple Generator
            print(f"\n📝 SIMPLE GENERATOR RESULTS:")
            print("-" * 50)
            try:
                simple_result = await self.simple_generator.generate_manim_code(prompt)
                self._print_result_summary("Simple", simple_result)
            except Exception as e:
                print(f"❌ Simple generator failed: {e}")
                simple_result = {"success": False, "method": "failed"}
            
            # Test Scalable Generator  
            print(f"\n🧠 SCALABLE GENERATOR RESULTS:")
            print("-" * 50)
            try:
                scalable_result = await self.scalable_generator.generate_manim_code(prompt)
                self._print_result_summary("Scalable", scalable_result)
            except Exception as e:
                print(f"❌ Scalable generator failed: {e}")
                scalable_result = {"success": False, "method": "failed"}
            
            # Compare Results
            print(f"\n🔍 COMPARISON ANALYSIS:")
            print("-" * 50)
            self._compare_results(simple_result, scalable_result)
            
            print(f"\n⏳ Waiting before next test...")
            await asyncio.sleep(1)  # Brief pause between tests
    
    def _print_result_summary(self, generator_type, result):
        """Print a summary of generator results"""
        if not result.get("success", False):
            print(f"❌ {generator_type} generation failed")
            return
            
        print(f"✅ Method: {result.get('method', 'unknown')}")
        print(f"📚 Examples used: {result.get('examples_used', 0)}")
        
        if 'selection_method' in result:
            print(f"🔍 Selection method: {result['selection_method']}")
        
        if 'primary_domain' in result:
            print(f"🎯 Primary domain: {result['primary_domain']}")
            
        if 'similarity_scores' in result and result['similarity_scores']:
            scores = result['similarity_scores'][:3]  # Top 3 scores
            print(f"📈 Top similarity scores: {[f'{s:.1f}' for s in scores]}")
            
        # Show code preview
        code = result.get('code', '')
        if code:
            lines = code.split('\n')
            preview_lines = lines[:8] if len(lines) > 8 else lines
            print(f"💻 Code preview ({len(lines)} total lines):")
            for line in preview_lines:
                print(f"    {line}")
            if len(lines) > 8:
                print(f"    ... ({len(lines) - 8} more lines)")
    
    def _compare_results(self, simple_result, scalable_result):
        """Compare the two results and highlight differences"""
        
        # Compare success rates
        simple_success = simple_result.get("success", False)
        scalable_success = scalable_result.get("success", False)
        
        if simple_success and scalable_success:
            print("✅ Both generators succeeded")
        elif scalable_success and not simple_success:
            print("🏆 Scalable generator succeeded, simple failed")
        elif simple_success and not scalable_success:
            print("⚠️ Simple generator succeeded, scalable failed")
        else:
            print("❌ Both generators failed")
            return
        
        # Compare methods used
        simple_method = simple_result.get("method", "unknown")
        scalable_method = scalable_result.get("method", "unknown")
        
        print(f"🔧 Methods: Simple='{simple_method}' vs Scalable='{scalable_method}'")
        
        # Compare examples used
        simple_examples = simple_result.get("examples_used", 0)
        scalable_examples = scalable_result.get("examples_used", 0)
        
        if scalable_examples > simple_examples:
            print(f"📚 Scalable used more examples: {scalable_examples} vs {simple_examples}")
        elif simple_examples > scalable_examples:
            print(f"📚 Simple used more examples: {simple_examples} vs {scalable_examples}")
        else:
            print(f"📚 Both used same number of examples: {simple_examples}")
        
        # Compare selection methods
        simple_selection = simple_result.get("selection_method", "basic")
        scalable_selection = scalable_result.get("selection_method", "basic")
        
        if scalable_selection != simple_selection:
            print(f"🔍 Selection methods differ: Simple='{simple_selection}' vs Scalable='{scalable_selection}'")
        
        # Compare code quality indicators
        simple_code = simple_result.get("code", "")
        scalable_code = scalable_result.get("code", "")
        
        simple_lines = len(simple_code.split('\n')) if simple_code else 0
        scalable_lines = len(scalable_code.split('\n')) if scalable_code else 0
        
        if abs(scalable_lines - simple_lines) > 5:
            print(f"📏 Code length differs significantly: Simple={simple_lines} vs Scalable={scalable_lines} lines")
        
        # Check for advanced features in scalable version
        advanced_features = ['VGroup', 'arrange', 'Transform', 'set_color', 'animate']
        scalable_features = sum(1 for feature in advanced_features if feature in scalable_code)
        simple_features = sum(1 for feature in advanced_features if feature in simple_code)
        
        if scalable_features > simple_features:
            print(f"🚀 Scalable uses more advanced features: {scalable_features} vs {simple_features}")
        
        # Highlight domain detection (scalable only)
        if 'primary_domain' in scalable_result:
            print(f"🎯 Scalable detected domain: {scalable_result['primary_domain']}")
        
        # Highlight similarity scoring (scalable only)  
        if 'similarity_scores' in scalable_result and scalable_result['similarity_scores']:
            top_score = max(scalable_result['similarity_scores'])
            print(f"📊 Scalable's best similarity score: {top_score:.1f}")

async def main():
    """Run the comparison test"""
    
    print("🧪 GENERATOR COMPARISON TEST")
    print("=" * 50)
    print("Comparing Simple vs Scalable Dataset-Enhanced Generators")
    
    # Test prompts covering different domains
    test_prompts = [
        "Create a neural network visualization with multiple layers and connections",
        "Show a research methodology flowchart with hypothesis testing phases", 
        "Animate a mathematical sine wave transformation showing frequency changes",
        "Visualize data flowing through a processing pipeline with different stages"
    ]
    
    comparison = GeneratorComparison()
    await comparison.compare_generators(test_prompts)
    
    print(f"\n{'='*80}")
    print("🏁 COMPARISON TEST COMPLETE")
    print(f"{'='*80}")
    print("Key Improvements Expected in Scalable Generator:")
    print("✅ Better example selection through similarity scoring")
    print("✅ Domain-specific guidance and implementation patterns")
    print("✅ More sophisticated prompt analysis")
    print("✅ Scalable to hundreds of examples without performance issues")
    print("✅ Extensible taxonomy for new domains")

if __name__ == "__main__":
    asyncio.run(main())