import { NextRequest, NextResponse } from 'next/server'
import { MongoClient, ObjectId } from 'mongodb'
import { BrowserBaseExtractor } from '@/lib/browserbase-extractor'
import { connectToDatabase } from '@/lib/config'

// Use the same database configuration as the rest of the app
async function connectToDB() {
  const db = await connectToDatabase()
  return { db }
}

export async function POST(request: NextRequest) {
  try {
    const { url, title, authors, abstract } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      )
    }

    console.log('=== PDF EXTRACTION API CALLED ===')
    console.log('URL:', url)
    console.log('Title:', title)

    // Use the new BrowserBase PDF extractor
    const extractor = new BrowserBaseExtractor(
      process.env.BROWSERBASE_API_KEY || '',
      process.env.BROWSERBASE_PROJECT_ID || ''
    )
    const extractionResult = await extractor.extractPDF(url)
    
    if (extractionResult.pdfUrl && extractionResult.method !== 'placeholder') {
      console.log('✅ PDF extracted successfully with method:', extractionResult.method)
      
      // Download the PDF from the extracted URL
      const pdfBuffer = await downloadPdf(extractionResult.pdfUrl)
      
      if (pdfBuffer) {
        // Save the extracted PDF
        const savedPaper = await savePdfBuffer(
          pdfBuffer,
          extractionResult.title || title,
          authors,
          abstract,
          url,
          extractionResult.pdfUrl,
          extractionResult.method
        )
        
        return NextResponse.json({
          success: true,
          paperId: savedPaper._id,
          method: extractionResult.method,
          message: `PDF extracted successfully using ${extractionResult.method}`
        })
      }
    }

    // Fallback - create a placeholder PDF
    console.log('❌ PDF extraction failed, creating placeholder PDF...')
    console.log('Error:', extractionResult.error)
    const placeholderPaper = await createPlaceholderPdf(url, title, authors, abstract)
    
    return NextResponse.json({
      success: true,
      paperId: placeholderPaper._id,
      method: 'placeholder',
      message: 'Created placeholder PDF - original extraction failed'
    })

  } catch (error) {
    console.error('PDF extraction error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to extract PDF', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

async function downloadPdf(pdfUrl: string): Promise<Buffer | null> {
  const maxRetries = 3;
  const delays = [2000, 5000, 10000]; // Progressive delays
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`📥 Downloading PDF (attempt ${attempt + 1}/${maxRetries}):`, pdfUrl)
      
      // Add delay for retries
      if (attempt > 0) {
        console.log(`⏱️ Waiting ${delays[attempt - 1]}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
      }
      
      const response = await fetch(pdfUrl, {
        headers: {
          'Accept': 'application/pdf,*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://jmg.bmj.com/',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        if (response.status === 429 && attempt < maxRetries - 1) {
          console.log(`⚠️ Rate limited (429), will retry in ${delays[attempt]}ms`);
          continue; // Continue to next attempt
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const contentType = response.headers.get('content-type') || ''
      console.log('📄 Response content-type:', contentType);
      
      // Accept HTML responses as well (some PDFs might be served with wrong content-type)
      if (!contentType.includes('application/pdf') && !contentType.includes('text/html')) {
        console.warn('⚠️ Unexpected content type:', contentType)
        // Don't return null immediately, let's try to process it
      }
      
      const buffer = Buffer.from(await response.arrayBuffer())
      console.log('✅ PDF downloaded successfully, size:', buffer.length, 'bytes')
      
      // Basic PDF validation - check for PDF header
      const pdfHeader = buffer.toString('ascii', 0, 4);
      if (pdfHeader === '%PDF') {
        console.log('✅ Valid PDF header detected');
        return buffer;
      } else {
        console.warn('⚠️ Invalid PDF header, got:', pdfHeader);
        // Still return the buffer - sometimes PDFs have wrappers
        return buffer;
      }
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt + 1} failed:`, error.message);
      
      // If this is the last attempt, fail
      if (attempt === maxRetries - 1) {
        console.error('❌ All download attempts failed');
        return null;
      }
    }
  }
  
  return null;
}

async function savePdfBuffer(pdfBuffer: Buffer, title: string, authors: string[], abstract: string, originalUrl: string, pdfUrl: string, method: string) {
  try {
    console.log('💾 Saving PDF buffer to filesystem...')
    
    // Generate filename
    const timestamp = Date.now()
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)
    const filename = `${timestamp}-${safeTitle}.pdf`
    const filePath = `/uploads/${filename}`
    
    // Save to uploads directory
    const fs = require('fs')
    const path = require('path')
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }
    
    const fullPath = path.join(uploadsDir, filename)
    fs.writeFileSync(fullPath, pdfBuffer)
    
    console.log('✅ PDF saved to:', fullPath)
    console.log('📊 File size:', pdfBuffer.length, 'bytes')
    
    // Save to database
    const { db } = await connectToDB()
    const paper = {
      title: title || 'Extracted Research Paper',
      authors: Array.isArray(authors) ? authors : [authors || 'Unknown'],
      abstract: abstract || 'Abstract not available',
      filePath: filePath,
      originalName: filename,
      url: originalUrl,
      extractedFrom: pdfUrl,
      extractionMethod: method,
      uploadedAt: new Date(),
      type: 'extracted-pdf'
    }
    
    const result = await db.collection('papers').insertOne(paper)
    
    return {
      _id: result.insertedId,
      ...paper
    }
    
  } catch (error) {
    console.error('❌ Error saving PDF buffer:', error)
    throw error
  }
}

// Note: Web scraping is now handled by the BrowserBase extractor

async function createPlaceholderPdf(url: string, title: string, authors: string[], abstract: string) {
  try {
    console.log('Creating placeholder PDF...')
    
    const placeholderContent = `
Research Paper: ${title}

Authors: ${Array.isArray(authors) ? authors.join(', ') : authors || 'Unknown'}

Abstract:
${abstract || 'Abstract not available'}

Original Source: ${url}

Note: This is a placeholder PDF. The original paper could not be automatically extracted.
Please visit the original source URL to access the full paper content.
    `
    
    const pdfPath = await createPdfFromText(placeholderContent, title, authors, abstract, url)
    return pdfPath
    
  } catch (error) {
    console.error('Error creating placeholder PDF:', error)
    throw error
  }
}

function extractTextFromHtml(html: string): string {
  // Basic HTML text extraction (in production, use a proper HTML parser)
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  return text.substring(0, 10000) // Limit content length
}

async function createPdfFromText(content: string, title: string, authors: string[], abstract: string, url: string) {
  try {
    console.log('📝 Creating proper PDF from text content...');
    
    // Import jsPDF for proper PDF generation
    const { jsPDF } = require('jspdf');
    
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set up the document
    doc.setFontSize(16);
    doc.text(title || 'Research Paper', 20, 30);
    
    doc.setFontSize(12);
    const authorsText = Array.isArray(authors) ? authors.join(', ') : (authors || 'Unknown Author');
    doc.text(`Authors: ${authorsText}`, 20, 45);
    
    doc.text(`Source: ${url}`, 20, 55);
    
    // Add a line separator
    doc.line(20, 65, 190, 65);
    
    // Add content with proper text wrapping
    doc.setFontSize(10);
    const splitContent = doc.splitTextToSize(content, 170); // 170mm width
    doc.text(splitContent, 20, 75);
    
    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    const timestamp = Date.now();
    const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
    const filename = `${timestamp}-${safeTitle}.pdf`; // Changed to .pdf
    const filePath = `/uploads/${filename}`;
    
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fullPath = path.join(uploadsDir, filename);
    fs.writeFileSync(fullPath, pdfBuffer); // Write PDF buffer instead of text
    
    console.log('✅ PDF placeholder created successfully');
    console.log('📁 File path:', fullPath);
    console.log('📊 File size:', pdfBuffer.length, 'bytes');
    
    // Save to database
    const { db } = await connectToDB();
    const paper = {
      title: title || 'Extracted Research Paper',
      authors: Array.isArray(authors) ? authors : [authors || 'Unknown'],
      abstract: abstract || 'Abstract not available',
      filePath: filePath,
      originalName: filename,
      url: url,
      uploadedAt: new Date(),
      type: 'placeholder-pdf' // Changed to indicate it's a PDF placeholder
    }
    
    const result = await db.collection('papers').insertOne(paper)
    
    return {
      _id: result.insertedId,
      ...paper
    }
    
  } catch (error) {
    console.error('Error creating PDF from text:', error)
    throw error
  }
} 