#!/usr/bin/env python3

import asyncio
import tempfile
import os
import sys

async def test_upload_function():
    """Test the exact function the server calls"""
    print("🔬 Testing generate_summary_video_upload function")
    print("=" * 50)
    
    # Create a test PDF like our integration test
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 120
>>
stream
BT
/F1 12 Tf
100 700 Td
(CRISPR-Cas9 specifically targets faulty genes using guide RNA.) Tj
0 -20 Td
(This ensures healthy DNA sequences remain unaffected.) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000205 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
363
%%EOF"""
    
    # Create temp PDF
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as f:
        f.write(pdf_content)
        pdf_path = f.name
    
    try:
        print(f"📄 Created test PDF: {pdf_path}")
        
        # Import and call the exact function the server uses
        from video_generator import generate_summary_video_upload
        
        print("🚀 Calling generate_summary_video_upload...")
        
        result = await generate_summary_video_upload(
            pdf_path=pdf_path,
            user_prompt="How does CRISPR-Cas9 specifically target faulty genes without affecting healthy DNA sequences"
        )
        
        print(f"📊 Result: {result}")
        
        if result and 'video_path' in result:
            print("✅ Upload function succeeded!")
            return True
        else:
            print("❌ Upload function failed")
            return False
            
    except Exception as e:
        print(f"💥 Error in upload function: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)

if __name__ == "__main__":
    success = asyncio.run(test_upload_function())
    sys.exit(0 if success else 1)