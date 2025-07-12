# BrowserBase PDF Extraction Setup

This guide explains how to set up and use the BrowserBase integration for advanced PDF extraction from academic sites.

## 🎯 What's New

The Eureka application now includes **BrowserBase integration** for extracting PDFs from complex academic sites like PubMed, Nature, Science, and IEEE. This replaces the basic web scraping with sophisticated browser automation.

### 🚀 Enhanced Capabilities

- **PubMed Integration**: Navigates PubMed → DOI → Publisher → PDF
- **Multi-site Support**: Handles arXiv, Nature, Science, IEEE, and generic sites
- **Intelligent Fallback**: Uses Puppeteer if BrowserBase is unavailable
- **Metadata Extraction**: Captures title, authors, abstract, and DOI
- **Real PDF Files**: Downloads actual PDFs instead of creating placeholders

## 📋 Prerequisites

1. **BrowserBase Account**: Sign up at [browserbase.com](https://browserbase.com)
2. **API Credentials**: Get your API key and project ID
3. **Environment Setup**: Configure environment variables

## 🔧 Installation

The necessary packages are already installed:
- `@browserbasehq/stagehand` - BrowserBase SDK
- `puppeteer` - Fallback browser automation

## ⚙️ Configuration

### 1. Environment Variables

Add these to your `.env.local` file:

```env
# BrowserBase Configuration
BROWSERBASE_API_KEY=your_browserbase_api_key_here
BROWSERBASE_PROJECT_ID=your_browserbase_project_id_here

# Other existing variables...
MONGODB_URI=mongodb://localhost:27017/eureka
EXA_API_KEY=your_exa_api_key_here
```

### 2. Get BrowserBase Credentials

1. Sign up at [browserbase.com](https://browserbase.com)
2. Create a new project
3. Copy your API key and project ID
4. Add them to your environment variables

## 🧪 Testing the Integration

### Run the Test Script

```bash
# Start the development server
npm run dev

# In another terminal, run the test
node test-browserbase-extraction.js
```

## 🔄 Extraction Methods

The system tries multiple methods in order:

### 1. Direct PDF Access
- **arXiv papers**: Converts `/abs/` URLs to `/pdf/` URLs
- **Direct PDF links**: Downloads immediately
- **Status**: `method: 'direct'`

### 2. BrowserBase Navigation
- **PubMed**: Finds DOI → Publisher → PDF
- **Complex sites**: Handles JavaScript, forms, redirects
- **Status**: `method: 'browserbase'`

### 3. Puppeteer Fallback
- **Local automation**: Uses local browser instance
- **Backup method**: When BrowserBase is unavailable
- **Status**: `method: 'puppeteer'`

### 4. Placeholder Creation
- **Last resort**: Creates text file with metadata
- **Status**: `method: 'placeholder'`

## 🎉 Success!

You now have a fully functional BrowserBase PDF extraction system that can:

- ✅ Extract PDFs from complex academic sites
- ✅ Handle PubMed → Publisher navigation
- ✅ Provide intelligent fallbacks
- ✅ Store real PDF files for viewing
- ✅ Integrate seamlessly with the search page

The "Read" button on search results will now properly extract and display PDFs from academic sources! 