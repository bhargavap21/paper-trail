#!/usr/bin/env python3

import sys
import os

# Clear all module caches to ensure fresh imports
if 'manim_generator' in sys.modules:
    del sys.modules['manim_generator']
if 'video_generator' in sys.modules:
    del sys.modules['video_generator']

print("🔄 Starting server with fresh module imports...")

# Remove any cached .pyc files
import subprocess
subprocess.run(['find', '.', '-name', '*.pyc', '-delete'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
subprocess.run(['find', '.', '-name', '__pycache__', '-type', 'd', '-exec', 'rm', '-rf', '{}', '+'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Import server after clearing cache
exec(open('server.py').read())