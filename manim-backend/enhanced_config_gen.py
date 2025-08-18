#!/usr/bin/env python3
"""
Enhanced Config Generation with improved prompting for the enhanced Manim generator
Focuses on reliable, content-appropriate video generation
"""
import anthropic
import os
import dotenv
import base64
import httpx
import weave
import json
from typing import Optional
from smart_docs_loader import SmartManimDocsLoader

# Load environment variables from .env file
dotenv.load_dotenv()

API_KEY = os.getenv("ANTHROPIC_API_KEY", "your_api_key_here")

client = anthropic.Anthropic(
    api_key=API_KEY
)

def get_enhanced_prompt():
    """Enhanced prompt that works well with our improved Manim generator"""
    return f"""You are an expert educational content creator designing video configurations for a Manim-based video generator.

Create a JSON configuration for a 45-60 second educational video with exactly 4 clips that are:
- RELIABLE and technically sound
- EDUCATIONAL and content-focused  
- APPROPRIATE for the source material
- FEASIBLE with current Manim capabilities

🎯 DESIGN PRINCIPLES:
- Content drives visualization (not flashiness for its own sake)
- Build understanding progressively across clips
- Use appropriate complexity for the subject matter
- Ensure technical feasibility and reliability
- Focus on clear educational value

📚 CLIP STRUCTURE (45-60 seconds total):
1. Introduction (10-15s): Introduce the main topic with clear, relevant visuals
2. Core Concept (10-15s): Explain the central idea with appropriate mathematical/visual elements
3. Key Mechanism (10-15s): Show how the concept works with animated explanations
4. Conclusion (10-15s): Summarize and connect to broader implications

🔧 TECHNICAL REQUIREMENTS:
- Use CURRENT Manim API (avoid deprecated methods like ShowCreation)
- Focus on Text, MathTex, and basic geometric shapes
- Ensure animations are smooth and purposeful
- Keep complexity appropriate to avoid generation failures
- Design for 1280x720 resolution at 24fps

✅ RECOMMENDED VISUAL ELEMENTS:
- Text animations with Write() and FadeIn/FadeOut
- Mathematical expressions with MathTex (simple LaTeX)
- Basic geometric shapes: Circle(), Square(), Triangle(), Line()
- Simple transformations and position changes
- Clear visual hierarchy with titles and content
- Appropriate color coding for clarity

❌ AVOID COMPLEXITY ISSUES:
- Complex 3D visualizations
- Advanced LaTeX that might fail compilation
- Too many simultaneous animations
- Overly complex mathematical plots
- Resource-intensive rendering operations

🎨 VISUAL DESIGN:
- Clean, professional appearance
- Appropriate font sizes (title: 40-48px, content: 24-32px)
- Consistent color scheme
- Smooth transitions between elements
- Clear spatial organization

📝 CONTENT GUIDELINES:
- Extract key concepts from the source material
- Create logical progression of ideas
- Write clear, concise voice-over text
- Ensure educational accuracy
- Match visual complexity to content complexity

IMPORTANT: The generated clips will be processed by an enhanced Manim code generator that:
- Analyzes voice-over text to determine appropriate templates
- Adapts visuals based on content type (math, geometry, text-heavy)
- Handles code generation intelligently with validation
- Provides reliable fallbacks when needed

Focus on creating CLEAR, EDUCATIONAL, and TECHNICALLY SOUND configurations rather than overly complex visualizations.

Generate the JSON in this exact format:
{{
  "clips": [
    {{
      "type": "manim",
      "voice_over": "Clear, concise narration that explains the concept (50-100 words)",
      "description": "Brief description of what this clip shows"
    }},
    // ... 3 more clips
  ]
}}

Ensure voice_over text is:
- Educational and informative
- Appropriate length for 10-15 second clips
- Written in natural, engaging language
- Factually accurate based on source material
- Progressive in building understanding

Make the video configuration appropriate for the source material while ensuring technical reliability."""

def get_content_aware_prompt(content_type: str = "general"):
    """Generate content-aware prompts based on document type"""
    
    base_prompt = get_enhanced_prompt()
    
    content_specific_additions = {
        "mathematical": """
MATHEMATICAL CONTENT FOCUS:
- Emphasize mathematical concepts and relationships
- Use MathTex for equations and formulas appropriately  
- Show mathematical progression and derivations
- Include geometric visualizations where relevant
- Focus on mathematical reasoning and proof concepts
""",
        "scientific": """
SCIENTIFIC CONTENT FOCUS:
- Explain scientific processes and mechanisms
- Use appropriate scientific terminology
- Show cause-and-effect relationships
- Include data visualization where appropriate
- Focus on scientific method and evidence
""",
        "technical": """
TECHNICAL CONTENT FOCUS:
- Break down complex technical concepts
- Show system architectures and processes
- Use flowcharts and diagrams conceptually
- Explain technical mechanisms step-by-step
- Focus on practical applications and implementations
""",
        "general": """
GENERAL EDUCATIONAL FOCUS:
- Adapt visualization style to content type
- Use appropriate mix of text, math, and graphics
- Ensure broad accessibility and understanding
- Build concepts progressively
- Focus on key insights and takeaways
"""
    }
    
    return base_prompt + "\n\n" + content_specific_additions.get(content_type, content_specific_additions["general"])

def analyze_content_type(content: str) -> str:
    """Analyze content to determine appropriate visualization strategy"""
    content_lower = content.lower()
    
    # Mathematical indicators
    math_keywords = ['equation', 'formula', 'theorem', 'proof', 'mathematical', 'calculus', 'algebra', 'geometry']
    if any(keyword in content_lower for keyword in math_keywords):
        return "mathematical"
    
    # Scientific indicators  
    science_keywords = ['experiment', 'hypothesis', 'research', 'study', 'scientific', 'biology', 'chemistry', 'physics']
    if any(keyword in content_lower for keyword in science_keywords):
        return "scientific"
    
    # Technical indicators
    tech_keywords = ['algorithm', 'system', 'software', 'programming', 'technical', 'engineering', 'computer']
    if any(keyword in content_lower for keyword in tech_keywords):
        return "technical"
    
    return "general"

@weave.op()
def enhanced_generate_video_config_with_smart_docs(
    pdf_source: str, 
    user_prompt: str = "", 
    use_base64: bool = False
) -> anthropic.types.Message:
    """
    Enhanced version of generate_video_config_with_smart_docs with improved prompting
    """
    print(f"🚀 Enhanced config generation for: {pdf_source}")
    print(f"📝 User prompt: {user_prompt}")
    print(f"🔗 Use base64: {use_base64}")
    
    # Load smart documentation for better Manim API guidance
    docs_loader = SmartManimDocsLoader()
    
    try:
        manim_docs = docs_loader.load_relevant_docs()
        print(f"📚 Loaded {len(manim_docs.get('examples', []))} Manim examples")
        print(f"📖 Loaded {len(manim_docs.get('api_docs', []))} API documentation entries")
    except Exception as e:
        print(f"⚠️ Could not load Manim docs: {e}")
        manim_docs = {"examples": [], "api_docs": []}
    
    # Prepare document content
    if use_base64 or not pdf_source.startswith(('http://', 'https://')):
        # Handle local file (including text files for testing)
        try:
            if pdf_source.endswith('.txt'):
                # Handle text file for testing
                with open(pdf_source, 'r') as f:
                    content = f.read()
                document_message = {
                    "type": "text",
                    "text": f"Document content: {content}"
                }
                content_preview = content[:500] + "..."
            else:
                # Handle PDF file
                with open(pdf_source, 'rb') as f:
                    pdf_content = base64.b64encode(f.read()).decode('utf-8')
                
                # Claude doesn't support PDF directly, convert to text approach
                # For now, we'll extract text content from the PDF
                import fitz  # PyMuPDF
                try:
                    doc = fitz.open(pdf_source)
                    text_content = ""
                    for page_num in range(min(5, len(doc))):  # First 5 pages
                        page = doc[page_num]
                        text_content += page.get_text()
                    doc.close()
                    
                    document_message = {
                        "type": "text", 
                        "text": f"Document content (extracted from PDF): {text_content[:3000]}..."
                    }
                    content_preview = text_content[:500] + "..."
                except Exception as e:
                    print(f"❌ Error extracting text from PDF: {e}")
                    # Fallback to generic message
                    document_message = {
                        "type": "text",
                        "text": "PDF document uploaded for video generation. Please create educational content based on the user prompt."
                    }
                    content_preview = "PDF document"
            
        except Exception as e:
            print(f"❌ Error reading file: {e}")
            return None
    else:
        # Handle URL
        try:
            response = httpx.get(pdf_source, timeout=30.0)
            response.raise_for_status()
            
            if response.headers.get('content-type', '').startswith('application/pdf'):
                # Extract text from PDF instead of trying to send as image
                import tempfile
                import fitz
                try:
                    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                        temp_file.write(response.content)
                        temp_file_path = temp_file.name
                    
                    doc = fitz.open(temp_file_path)
                    text_content = ""
                    for page_num in range(min(5, len(doc))):  # First 5 pages
                        page = doc[page_num]
                        text_content += page.get_text()
                    doc.close()
                    
                    # Clean up temp file
                    os.unlink(temp_file_path)
                    
                    document_message = {
                        "type": "text",
                        "text": f"Document content (extracted from PDF): {text_content[:3000]}..."
                    }
                    content_preview = text_content[:500] + "..."
                except Exception as e:
                    print(f"❌ Error extracting text from PDF URL: {e}")
                    # Fallback to generic message
                    document_message = {
                        "type": "text",
                        "text": "PDF document from URL uploaded for video generation. Please create educational content based on the user prompt."
                    }
                    content_preview = "PDF document (from URL)"
            else:
                # Handle as text content
                document_message = {
                    "type": "text",
                    "text": f"Document content: {response.text[:3000]}..."
                }
                content_preview = response.text[:500] + "..."
                
        except Exception as e:
            print(f"❌ Error fetching from URL: {e}")
            return None
    
    # Analyze content type for appropriate prompting
    content_type = analyze_content_type(content_preview)
    print(f"🔍 Detected content type: {content_type}")
    
    # Get content-aware prompt
    enhanced_prompt = get_content_aware_prompt(content_type)
    
    # Add Manim documentation context
    manim_context = ""
    if manim_docs.get("examples"):
        manim_context += "\n\nMANIM EXAMPLES FOR REFERENCE:\n"
        for example in manim_docs["examples"][:3]:  # Include top 3 examples
            manim_context += f"- {example}\n"
    
    if manim_docs.get("api_docs"):
        manim_context += "\n\nCURRENT MANIM API GUIDANCE:\n"
        for doc in manim_docs["api_docs"][:5]:  # Include top 5 API docs
            manim_context += f"- {doc}\n"
    
    # Construct enhanced message
    messages = [
        {
            "role": "user",
            "content": [
                document_message,
                {
                    "type": "text",
                    "text": f"""{enhanced_prompt}
                    
{manim_context}

USER REQUEST: {user_prompt if user_prompt else "Create an educational video based on this document"}

CONTENT TYPE DETECTED: {content_type}

Please generate a JSON configuration that:
1. Accurately represents the key concepts from the document
2. Uses appropriate visual complexity for the content type
3. Ensures technical reliability with current Manim capabilities
4. Creates engaging educational content that builds understanding progressively
5. Includes clear, informative voice-over text for each clip

Focus on educational value and technical reliability over visual complexity."""
                }
            ]
        }
    ]
    
    print(f"🤖 Sending enhanced request to Claude...")
    
    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            temperature=0.3,  # Lower temperature for more consistent output
            messages=messages
        )
        
        print(f"✅ Enhanced config generation completed")
        print(f"📊 Response length: {len(response.content[0].text)} characters")
        
        # Validate JSON structure
        try:
            config_text = response.content[0].text
            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', config_text, re.DOTALL)
            if json_match:
                config = json.loads(json_match.group())
                clips = config.get("clips", [])
                print(f"✅ Valid JSON with {len(clips)} clips generated")
                
                # Validate clip structure
                for i, clip in enumerate(clips):
                    if not clip.get("voice_over"):
                        print(f"⚠️ Clip {i+1} missing voice_over")
                    if not clip.get("type") == "manim":
                        print(f"⚠️ Clip {i+1} incorrect type")
                        
            else:
                print(f"⚠️ No valid JSON found in response")
                
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON validation failed: {e}")
        
        return response
        
    except Exception as e:
        print(f"❌ Enhanced config generation failed: {e}")
        return None

# Backwards compatibility
def generate_video_config_with_smart_docs(pdf_source: str, user_prompt: str = "", use_base64: bool = False):
    """Backwards compatible wrapper"""
    return enhanced_generate_video_config_with_smart_docs(pdf_source, user_prompt, use_base64)

# Example usage and testing
async def test_enhanced_config_generation():
    """Test the enhanced config generation"""
    
    print("🧪 Testing Enhanced Config Generation")
    print("=" * 50)
    
    # Test with different content types
    test_cases = [
        {
            "content": "This paper discusses the mathematical foundations of neural networks and backpropagation algorithms.",
            "expected_type": "mathematical"
        },
        {
            "content": "Our research study examines the effects of climate change on marine ecosystems through controlled experiments.",
            "expected_type": "scientific"
        },
        {
            "content": "The system architecture utilizes microservices and distributed computing for scalable software solutions.",
            "expected_type": "technical"
        },
        {
            "content": "This educational material covers general principles of effective communication and leadership.",
            "expected_type": "general"
        }
    ]
    
    for i, test_case in enumerate(test_cases):
        print(f"\n📝 Test {i+1}: Content Type Detection")
        print(f"Content: {test_case['content'][:100]}...")
        
        detected_type = analyze_content_type(test_case['content'])
        expected_type = test_case['expected_type']
        
        if detected_type == expected_type:
            print(f"✅ Correct detection: {detected_type}")
        else:
            print(f"❌ Incorrect detection: got {detected_type}, expected {expected_type}")
    
    print(f"\n🎯 Enhanced config generation testing completed!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_enhanced_config_generation())