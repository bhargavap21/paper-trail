#!/usr/bin/env python3
"""
Test script to verify that Manim code generation aligns with voice-over content
"""
import asyncio
from scalable_dataset_enhanced_generator import ScalableDatasetEnhancedManimGenerator

async def test_manim_alignment():
    """Test that Manim generation includes the user request"""
    
    generator = ScalableDatasetEnhancedManimGenerator()
    
    # Test with a specific voice-over content about CRISPR
    test_prompt = "CRISPR-Cas9 is a revolutionary gene editing technology that acts like molecular scissors, allowing scientists to precisely cut and modify DNA sequences in living cells."
    
    print("🧪 TESTING MANIM ALIGNMENT")
    print("=" * 60)
    print(f"📝 Test prompt: {test_prompt}")
    print("\n🎯 Generating Manim code...")
    
    # Generate code
    result = await generator.generate_manim_code(test_prompt)
    
    if result["success"]:
        print("✅ Code generation successful!")
        print("\n📜 Generated code preview:")
        print("-" * 40)
        print(result["code"][:500] + "..." if len(result["code"]) > 500 else result["code"])
        print("-" * 40)
        
        # Check if the code seems relevant to CRISPR
        code_lower = result["code"].lower()
        crispr_keywords = ['crispr', 'gene', 'dna', 'edit', 'molecular', 'scissors', 'cut']
        
        found_keywords = [kw for kw in crispr_keywords if kw in code_lower]
        
        if found_keywords:
            print(f"✅ ALIGNMENT CHECK: Found relevant keywords: {found_keywords}")
            print("🎉 SUCCESS: Manim code appears to align with voice-over content!")
        else:
            print("❌ ALIGNMENT CHECK: No CRISPR-related content found in generated code")
            print("⚠️  Code may not be aligned with voice-over")
            
    else:
        print("❌ Code generation failed!")
        print(f"Error: {result.get('error', 'Unknown error')}")

if __name__ == "__main__":
    asyncio.run(test_manim_alignment())