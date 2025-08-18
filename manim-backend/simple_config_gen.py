#!/usr/bin/env python3
"""
Simple Config Generator - Pure generative-manim approach
Generates video configuration using simple, reliable methods without complex sanitization
"""
import anthropic
import os
import json
import base64
from typing import List, Dict, Any
from dotenv import load_dotenv
import weave

# Load environment variables
load_dotenv()

class SimpleConfigGenerator:
    """Simple, reliable video configuration generator"""
    
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY", "your_api_key_here")
        self.client = anthropic.Anthropic(api_key=api_key)
    
    def get_system_prompt(self) -> str:
        """Simple, focused system prompt for configuration generation"""
        return """You are a video content planner that creates educational video configurations.

TASK: Create a JSON configuration for 3-4 educational video clips based on the research paper.

RULES:
1. Generate EXACTLY 3-4 clips maximum
2. Each clip should be 10-15 seconds long
3. Focus on the most important concepts from the paper
4. Use clear, educational voice-over text
5. Return ONLY valid JSON - no explanations

REQUIRED JSON FORMAT:
{
  "clips": [
    {
      "title": "Clear descriptive title",
      "voice_over": "Educational voice-over text explaining the concept clearly and simply",
      "description": "Brief description of what should be visualized"
    }
  ]
}

Keep it simple and educational. Focus on the main research contributions."""

    @weave.op()
    async def generate_simple_config_from_url(self, pdf_url: str, user_prompt: str = "") -> List[Dict[str, Any]]:
        """Generate simple video configuration from PDF URL"""
        
        print(f"🎯 Generating simple config from URL: {pdf_url}")
        
        # Build simple prompt
        prompt = f"""Create an educational video configuration for this research paper: {pdf_url}

User request: {user_prompt if user_prompt else "Explain the key concepts"}

Focus on the main research contributions and make it educational and accessible."""

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0.2,  # Low temperature for consistency
                system=self.get_system_prompt(),
                messages=[
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ]
            )
            
            response_text = response.content[0].text.strip()
            
            # Clean and parse JSON
            if "```json" in response_text:
                import re
                match = re.search(r'```json\n(.*?)\n```', response_text, re.DOTALL)
                if match:
                    response_text = match.group(1)
            elif "```" in response_text:
                import re
                match = re.search(r'```\n?(.*?)\n?```', response_text, re.DOTALL)
                if match:
                    response_text = match.group(1)
            
            # Parse JSON
            try:
                config = json.loads(response_text)
                clips = config.get("clips", [])
                
                if clips:
                    print(f"✅ Generated {len(clips)} clips configuration")
                    return clips
                else:
                    print("⚠️ No clips in configuration, using fallback")
                    return self._generate_fallback_config(user_prompt)
                    
            except json.JSONDecodeError as e:
                print(f"⚠️ JSON parse error: {e}, using fallback")
                return self._generate_fallback_config(user_prompt)
                
        except Exception as e:
            print(f"❌ Config generation failed: {e}, using fallback")
            return self._generate_fallback_config(user_prompt)

    @weave.op() 
    async def generate_simple_config_from_upload(self, pdf_base64: str, user_prompt: str = "") -> List[Dict[str, Any]]:
        """Generate simple video configuration from uploaded PDF (base64)"""
        
        print(f"🎯 Generating simple config from uploaded PDF")
        
        # Build simple prompt with base64 content
        prompt = f"""Create an educational video configuration based on this uploaded research paper.

User request: {user_prompt if user_prompt else "Explain the key concepts"}

The PDF content is provided in base64 format. Please analyze it and create an educational video configuration focusing on the main research contributions.

PDF content: {pdf_base64[:1000]}..."""  # Truncate for prompt length

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0.2,
                system=self.get_system_prompt(),
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = response.content[0].text.strip()
            
            # Clean and parse JSON (same logic as URL version)
            if "```json" in response_text:
                import re
                match = re.search(r'```json\n(.*?)\n```', response_text, re.DOTALL)
                if match:
                    response_text = match.group(1)
            elif "```" in response_text:
                import re
                match = re.search(r'```\n?(.*?)\n?```', response_text, re.DOTALL)
                if match:
                    response_text = match.group(1)
            
            try:
                config = json.loads(response_text)
                clips = config.get("clips", [])
                
                if clips:
                    print(f"✅ Generated {len(clips)} clips configuration from upload")
                    return clips
                else:
                    print("⚠️ No clips in upload configuration, using fallback")
                    return self._generate_fallback_config(user_prompt)
                    
            except json.JSONDecodeError as e:
                print(f"⚠️ Upload JSON parse error: {e}, using fallback") 
                return self._generate_fallback_config(user_prompt)
                
        except Exception as e:
            print(f"❌ Upload config generation failed: {e}, using fallback")
            return self._generate_fallback_config(user_prompt)

    def _generate_fallback_config(self, user_prompt: str = "") -> List[Dict[str, Any]]:
        """Generate reliable fallback configuration"""
        
        print("🛡️ Using simple fallback configuration")
        
        # Customize based on user prompt if available
        topic = "research concepts"
        if user_prompt:
            if any(word in user_prompt.lower() for word in ['neural', 'ai', 'machine learning']):
                topic = "AI and machine learning"
            elif any(word in user_prompt.lower() for word in ['math', 'equation', 'formula']):
                topic = "mathematical concepts"
            elif any(word in user_prompt.lower() for word in ['biology', 'medical', 'health']):
                topic = "biological concepts"
            elif any(word in user_prompt.lower() for word in ['physics', 'quantum']):
                topic = "physics concepts"
        
        return [
            {
                "title": f"Introduction to {topic.title()}",
                "voice_over": f"Welcome to this educational video about {topic}. We'll explore the key ideas and their significance in research.",
                "description": f"Introduction animation showing the main topic of {topic}"
            },
            {
                "title": "Key Research Findings",
                "voice_over": "This research presents important findings that advance our understanding in this field. Let's examine the main contributions.",
                "description": "Visualization of key research findings and contributions"
            },
            {
                "title": "Practical Applications",
                "voice_over": "These findings have practical applications that can benefit various fields. Here's how this research makes a difference.",
                "description": "Animation showing practical applications and real-world impact"
            },
            {
                "title": "Future Directions",
                "voice_over": "This research opens up new possibilities for future work. Thank you for learning about these important concepts.",
                "description": "Conclusion showing future research directions and possibilities"
            }
        ]

# Wrapper functions for backwards compatibility
@weave.op()
async def simple_generate_video_config_with_smart_docs(pdf_url: str, user_prompt: str = "") -> List[Dict[str, Any]]:
    """Simple wrapper for URL-based config generation"""
    generator = SimpleConfigGenerator()
    return await generator.generate_simple_config_from_url(pdf_url, user_prompt)

@weave.op()
async def simple_generate_video_config_with_smart_docs_upload(pdf_base64: str, user_prompt: str = "") -> List[Dict[str, Any]]:
    """Simple wrapper for upload-based config generation"""
    generator = SimpleConfigGenerator()
    return await generator.generate_simple_config_from_upload(pdf_base64, user_prompt)

# Testing function
async def test_simple_config():
    """Test the simple config generator"""
    generator = SimpleConfigGenerator()
    
    # Test URL
    test_url = "https://arxiv.org/pdf/2310.06825.pdf"
    print("Testing URL-based config generation...")
    url_config = await generator.generate_simple_config_from_url(test_url, "Explain the main concepts")
    print(f"Generated {len(url_config)} clips from URL")
    
    # Test fallback
    print("\nTesting fallback config...")
    fallback_config = generator._generate_fallback_config("neural networks")
    print(f"Generated {len(fallback_config)} fallback clips")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_simple_config())