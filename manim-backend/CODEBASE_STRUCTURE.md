# Manim Backend Codebase Structure

## 🏗️ Directory Organization

```
manim-backend/
├── 📁 Core Production Files
│   ├── server.py                    # FastAPI server (main entry point)
│   ├── simple_video_generator.py    # Main video generation pipeline  
│   ├── simple_manim_generator.py    # Manim code generation
│   ├── simple_config_gen.py         # Configuration generator
│   ├── voice_gen_fallback.py        # Voice generation with fallbacks
│   └── veo_gen.py                   # Thank you clip generation
│
├── 📁 Legacy/Alternative Approaches
│   ├── video_generator.py           # Original video generator
│   ├── manim_generator.py          # Original Manim generator
│   ├── config_gen.py               # Original config generator
│   └── voice_gen.py                # Original voice generator
│
├── 📁 tests/                       # Test files (recurring use)
│   ├── test_duration_fix.py        # Duration testing (IMPORTANT)
│   ├── test_simple_integration.py  # Full pipeline test (IMPORTANT)
│   └── test_*.py                   # Other test files
│
├── 📁 docs/                        # Documentation
│   ├── README.md
│   ├── DOCUMENTATION_INTEGRATION_SUMMARY.md
│   └── ENHANCED_MANIM_IMPLEMENTATION_SUMMARY.md
│
├── 📁 scripts/                     # Utility scripts
│   ├── manim_docs_scraper.py       # Documentation scraper
│   └── smart_docs_loader.py        # Smart document loader
│
├── 📁 Data Files
│   ├── jobs.json                   # Job tracking database
│   ├── manim_docs.json            # Manim documentation cache
│   ├── manim_docs_consolidated.txt # Consolidated docs
│   └── requirements.txt           # Python dependencies
│
├── 📁 outputs/                     # Final generated videos (KEEP)
├── 📁 uploads/                     # PDF uploads (ignored in git)
└── 📁 Configuration
    ├── .gitignore                  # Git ignore rules
    └── uploads/.gitkeep            # Keep uploads directory
```

## 🎯 Current Active System

**Simple Approach** (Production):
- ✅ `simple_video_generator.py` - Main pipeline
- ✅ `simple_manim_generator.py` - Code generation  
- ✅ `simple_config_gen.py` - Configuration
- ✅ 100% success rate, proper durations (10-15+ seconds)

## 🧪 Important Recurring Tests

**Keep these for regular system checks:**
- `tests/test_duration_fix.py` - Verifies video duration fix
- `tests/test_simple_integration.py` - Full pipeline integration test

## 📋 Cleanup Summary

**Removed:**
- ❌ All temporary debug files (`debug_*.py`, `*_frame.png`)
- ❌ Intermediate processing directories (`clips/`, `simple_clips/`)
- ❌ Test output directories (`test_output/`, `test_debug/`)
- ❌ Duplicate nested directories
- ❌ Enhanced approach files (not in current use)

**Organized:**
- ✅ Tests moved to `tests/` directory
- ✅ Documentation moved to `docs/` directory  
- ✅ Utility scripts moved to `scripts/` directory
- ✅ Created comprehensive `.gitignore`

## 🚀 Current Status

- **Production System**: Simple approach with 100% success rate
- **Video Duration**: Fixed to generate 10-15+ second clips
- **File Structure**: Clean and organized
- **Git Tracking**: Proper ignore rules for temporary files