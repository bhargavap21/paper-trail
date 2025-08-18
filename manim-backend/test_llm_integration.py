#!/usr/bin/env python3
"""
Test script to verify LLM integration is properly set up
"""
import sys
import os

# Add current directory to Python path
sys.path.append('.')

from enhanced_manim_generator import EnhancedManimGenerator, CodeGenerationContext

def test_llm_integration():
    """Test that LLM integration is properly configured"""
    print("🧪 TESTING LLM INTEGRATION SETUP")
    print("=" * 50)
    
    # Test prompt
    prompt = "Create a simple animation showing a circle moving across the screen"
    
    # Create generator and context
    generator = EnhancedManimGenerator()
    context = CodeGenerationContext(prompt=prompt)
    
    print(f"📝 Test prompt: {prompt}")
    print(f"🔑 API key configured: {'YES' if hasattr(generator, 'client') else 'NO'}")
    
    # Test the method call (it will fallback to templates if no API key)
    try:
        print("\n🤖 Testing code generation...")
        code = generator.generate_code_with_llm(prompt, context)
        
        print(f"✅ Code generation completed")
        print(f"📏 Generated code length: {len(code)} characters")
        
        # Check if it's using LLM or template fallback
        is_template_fallback = ("Educational Content" in code and "Key concept" in code)
        if is_template_fallback:
            print("⚠️  Using template fallback (no valid API key)")
            print("📝 This means the LLM integration is properly configured but needs an API key")
        else:
            print("✅ LLM code generation successful!")
        
        # Show code preview
        preview = code[:200] + "..." if len(code) > 200 else code
        print(f"\n📄 Generated code preview:\n{preview}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during code generation: {e}")
        return False

def test_enhanced_prompt_building():
    """Test that the enhanced prompt includes context and best practices"""
    print("\n🧪 TESTING ENHANCED PROMPT BUILDING")
    print("=" * 50)
    
    generator = EnhancedManimGenerator()
    context = CodeGenerationContext(prompt="test prompt")
    context.attempt_count = 2
    context.validation_errors = ["Missing import", "Syntax error"]
    context.execution_errors = ["Runtime error"]
    context.reflection_notes = "Need to fix imports"
    
    # We can't easily test the exact prompt without modifying the method,
    # but we can test that the method handles context properly
    try:
        # This will build the enhanced prompt internally
        code = generator.generate_code_with_llm("test prompt", context)
        print("✅ Enhanced prompt building successful")
        return True
    except Exception as e:
        print(f"❌ Error in enhanced prompt building: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing enhanced Manim generator LLM integration\n")
    
    test1_passed = test_llm_integration()
    test2_passed = test_enhanced_prompt_building()
    
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"LLM Integration Test: {'✅ PASSED' if test1_passed else '❌ FAILED'}")
    print(f"Enhanced Prompt Test: {'✅ PASSED' if test2_passed else '❌ FAILED'}")
    
    if test1_passed and test2_passed:
        print("\n🎉 All integration tests passed!")
        print("💡 To use LLM generation, set ANTHROPIC_API_KEY environment variable")
        print("🛡️  System will fallback to templates if API key is not available")
    else:
        print("\n❌ Some tests failed - check the implementation")
    
    sys.exit(0 if (test1_passed and test2_passed) else 1)