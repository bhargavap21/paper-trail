import os
import asyncio
import edge_tts
import traceback
from voice_gen import generate_voice as generate_lmnt_voice

async def generate_voice_with_fallback(text: str, output_path: str, voice_id: str = "juniper") -> str:
    """
    Generate voice audio with LMNT as primary, Edge TTS as fallback.
    
    Args:
        text: Text to convert to speech
        output_path: Path where the audio file will be saved
        voice_id: Voice ID (brandon for LMNT, or Edge voice name)
        
    Returns:
        Path to the generated audio file or None if failed
    """
    print(f"\n🎤 VOICE GENERATION DEBUG:")
    print(f"📝 Text length: {len(text)} characters")
    print(f"📝 Text preview: {text[:100]}...")
    print(f"🎭 Voice ID: {voice_id}")
    print(f"📁 Output path: {output_path}")
    
    # Verify output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        print(f"📁 Creating output directory: {output_dir}")
        os.makedirs(output_dir, exist_ok=True)
    
    print(f"🎤 Attempting voice generation for: {text[:50]}...")
    
    # Try LMNT first
    print(f"\n🎵 ATTEMPTING LMNT VOICE GENERATION...")
    try:
        print(f"📞 Calling LMNT API...")
        result = await generate_lmnt_voice(text, output_path, voice_id)
        print(f"📝 LMNT result: {result}")
        
        if result and os.path.exists(result):
            file_size = os.path.getsize(result)
            print(f"✅ LMNT voice generation successful!")
            print(f"📏 Audio file created: {file_size} bytes")
            
            # Validate audio file
            try:
                from moviepy import AudioFileClip
                test_audio = AudioFileClip(result)
                print(f"🎵 Audio validation: {test_audio.duration:.2f}s, {test_audio.fps}Hz, {test_audio.nchannels} channels")
                test_audio.close()
                print(f"✅ LMNT audio file validated successfully")
                return result
            except Exception as validate_error:
                print(f"❌ LMNT audio validation failed: {validate_error}")
                if os.path.exists(result):
                    os.remove(result)
                    print(f"🗑️  Removed invalid LMNT audio file")
        else:
            print(f"❌ LMNT did not create valid file")
            if result:
                print(f"📁 LMNT returned path: {result}")
                print(f"📄 File exists: {os.path.exists(result) if result else 'N/A'}")
    except Exception as e:
        print(f"❌ LMNT failed with exception: {e}")
        import traceback
        print(f"📋 LMNT traceback: {traceback.format_exc()}")
    
    # Fallback to Edge TTS (free)
    print(f"\n🔄 FALLING BACK TO EDGE TTS...")
    try:
        # Map voice IDs to Edge TTS voices
        edge_voice_map = {
            "brandon": "en-US-AriaNeural",  # Professional female voice
            "amy": "en-US-JennyNeural",     # Friendly female voice
            "ansel": "en-US-GuyNeural",     # Professional male voice
            "juniper": "en-US-JennyNeural", # Juniper maps to friendly female voice
        }
        
        edge_voice = edge_voice_map.get(voice_id, "en-US-AriaNeural")
        print(f"🎭 Mapped voice '{voice_id}' to Edge TTS voice: {edge_voice}")
        
        # Create directory
        output_dir = os.path.dirname(output_path) if os.path.dirname(output_path) else "."
        print(f"📁 Ensuring output directory exists: {output_dir}")
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate using Edge TTS
        print(f"📞 Calling Edge TTS API...")
        communicate = edge_tts.Communicate(text, edge_voice)
        await communicate.save(output_path)
        print(f"💾 Edge TTS save completed")
        
        if os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            print(f"✅ Edge TTS file created: {file_size} bytes")
            
            # Validate Edge TTS audio file
            try:
                from moviepy import AudioFileClip
                test_audio = AudioFileClip(output_path)
                print(f"🎵 Edge TTS audio validation: {test_audio.duration:.2f}s, {test_audio.fps}Hz, {test_audio.nchannels} channels")
                test_audio.close()
                print(f"✅ Edge TTS voice generation successful: {output_path}")
                return output_path
            except Exception as validate_error:
                print(f"❌ Edge TTS audio validation failed: {validate_error}")
                if os.path.exists(output_path):
                    os.remove(output_path)
                    print(f"🗑️  Removed invalid Edge TTS audio file")
                return None
        else:
            print("❌ Edge TTS failed to create file")
            return None
            
    except Exception as e:
        print(f"❌ Edge TTS fallback failed: {e}")
        import traceback
        print(f"📋 Edge TTS traceback: {traceback.format_exc()}")
        return None
    
    print(f"\n❌ VOICE GENERATION COMPLETELY FAILED - NO AUDIO WILL BE AVAILABLE\n")

async def test_fallback():
    """Test the fallback voice generation with extensive logging"""
    print(f"\n🧪 TESTING VOICE GENERATION FALLBACK SYSTEM")
    text = "This is a test of the fallback voice generation system using Edge TTS."
    output_path = "test_fallback_voice.wav"
    
    print(f"📝 Test text: {text}")
    print(f"📁 Test output path: {output_path}")
    
    # Clean up any existing test file
    if os.path.exists(output_path):
        os.remove(output_path)
        print(f"🗑️  Removed existing test file")
    
    result = await generate_voice_with_fallback(text, output_path)
    
    print(f"\n📈 TEST RESULTS:")
    if result:
        file_size = os.path.getsize(result)
        print(f"✅ Test successful: {result}")
        print(f"📏 File size: {file_size} bytes")
        
        # Additional validation
        try:
            from moviepy import AudioFileClip
            test_audio = AudioFileClip(result)
            print(f"🎵 Test audio properties: {test_audio.duration:.2f}s, {test_audio.fps}Hz, {test_audio.nchannels} channels")
            test_audio.close()
            print(f"✅ Test audio validation successful")
        except Exception as e:
            print(f"❌ Test audio validation failed: {e}")
    else:
        print("💥 Test failed - no audio file generated")
    
    print(f"🌍 FALLBACK TEST COMPLETED\n")

if __name__ == "__main__":
    asyncio.run(test_fallback())