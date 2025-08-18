#!/usr/bin/env python3

import requests
import json
import time
import tempfile
import os
from datetime import datetime

# Backend server URL
MANIM_SERVER_URL = "http://localhost:8001"

def create_dummy_pdf():
    """Create a minimal valid PDF for testing"""
    # Create a simple PDF using reportlab if available, otherwise use a placeholder
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        c = canvas.Canvas(temp_file.name, pagesize=letter)
        c.drawString(100, 750, "CRISPR-Cas9 Gene Editing Research")
        c.drawString(100, 700, "How does CRISPR-Cas9 specifically target faulty genes")
        c.drawString(100, 650, "without affecting healthy DNA sequences?")
        c.drawString(100, 600, "")
        c.drawString(100, 550, "CRISPR-Cas9 uses guide RNA to achieve precise targeting.")
        c.drawString(100, 500, "The system requires complementary base pairing for activation.")
        c.drawString(100, 450, "PAM sequences provide additional specificity controls.")
        c.showPage()
        c.save()
        
        return temp_file.name
    except ImportError:
        print("⚠️  reportlab not available, creating minimal PDF manually")
        # Create a minimal PDF manually
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        
        # Minimal PDF content
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
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(CRISPR Research) Tj
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
297
%%EOF"""
        
        temp_file.write(pdf_content)
        temp_file.close()
        return temp_file.name

def test_frontend_integration():
    """Test the complete frontend integration workflow"""
    
    print(f"🔬 Testing Frontend Integration at {datetime.now()}")
    print("=" * 60)
    
    try:
        # Step 1: Check if backend is running
        print("1️⃣  Checking backend availability...")
        response = requests.get(f"{MANIM_SERVER_URL}/api-info", timeout=5)
        if response.status_code == 200:
            print("   ✅ Backend is running and responding")
        else:
            print(f"   ❌ Backend returned status {response.status_code}")
            return False
        
        # Step 2: Create a test PDF
        print("\n2️⃣  Creating test PDF...")
        pdf_path = create_dummy_pdf()
        print(f"   📄 Created test PDF: {pdf_path}")
        
        # Step 3: Upload PDF and start video generation
        print("\n3️⃣  Starting video generation via API...")
        
        with open(pdf_path, 'rb') as pdf_file:
            files = {
                'file': ('crispr_research.pdf', pdf_file, 'application/pdf')
            }
            data = {
                'prompt': 'How does CRISPR-Cas9 specifically target faulty genes without affecting healthy DNA sequences'
            }
            
            print("   📤 Uploading PDF and starting generation...")
            response = requests.post(
                f"{MANIM_SERVER_URL}/generate-video-upload", 
                files=files, 
                data=data,
                timeout=30
            )
        
        if response.status_code == 200:
            result = response.json()
            job_id = result['job_id']
            print(f"   ✅ Job created successfully: {job_id}")
        else:
            print(f"   ❌ Upload failed: {response.status_code}")
            print(f"   📄 Response: {response.text}")
            return False
        
        # Step 4: Monitor job status
        print(f"\n4️⃣  Monitoring job status for: {job_id}")
        
        max_wait_time = 300  # 5 minutes
        check_interval = 10  # 10 seconds
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:
            try:
                status_response = requests.get(f"{MANIM_SERVER_URL}/jobs/{job_id}")
                if status_response.status_code == 200:
                    job_status = status_response.json()
                    status = job_status.get('status', 'unknown')
                    
                    print(f"   📊 Status: {status}")
                    
                    if status == 'completed':
                        print("   ✅ Video generation completed!")
                        video_path = job_status.get('video_path')
                        if video_path:
                            print(f"   🎬 Video file: {video_path}")
                            
                            # Test download endpoint
                            download_response = requests.get(f"{MANIM_SERVER_URL}/download/{job_id}")
                            if download_response.status_code == 200:
                                print("   ✅ Video download endpoint working")
                                print(f"   📊 Video size: {len(download_response.content)} bytes")
                            else:
                                print(f"   ⚠️  Download failed: {download_response.status_code}")
                        
                        # Cleanup
                        os.unlink(pdf_path)
                        print("\n🎯 INTEGRATION TEST PASSED!")
                        return True
                        
                    elif status == 'failed':
                        print("   ❌ Video generation failed!")
                        error = job_status.get('error', 'Unknown error')
                        print(f"   📄 Error: {error}")
                        break
                        
                    elif status in ['pending', 'processing']:
                        print(f"   ⏳ Still {status}... waiting {check_interval}s")
                        time.sleep(check_interval)
                    else:
                        print(f"   ❓ Unknown status: {status}")
                        break
                else:
                    print(f"   ❌ Status check failed: {status_response.status_code}")
                    break
                    
            except Exception as e:
                print(f"   ⚠️  Error checking status: {e}")
                time.sleep(check_interval)
        
        print(f"\n⏰ Timeout reached after {max_wait_time}s")
        
    except Exception as e:
        print(f"💥 Integration test failed: {e}")
        return False
    finally:
        # Cleanup
        if 'pdf_path' in locals() and os.path.exists(pdf_path):
            os.unlink(pdf_path)
    
    return False

if __name__ == "__main__":
    success = test_frontend_integration()
    if success:
        print("\n🎉 Frontend integration is working correctly!")
        exit(0)
    else:
        print("\n💀 Frontend integration test failed!")
        exit(1)