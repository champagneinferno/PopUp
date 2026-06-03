#!/usr/bin/env python3
"""Test script to check Playwright output for Facebook"""
import sys
import json
import subprocess

# Run the Playwright script
result = subprocess.run(
    ["node", "src/extractor/visual_extractor.cjs", "https://facebook.com"],
    capture_output=True,
    text=True,
    timeout=60,
    cwd="C:/Users/bum19/orca/workspaces/PopUp/PopUp.AI"
)

if result.returncode != 0:
    print(f"Error: {result.stderr}")
    sys.exit(1)

# Parse JSON from stdout
try:
    data = json.loads(result.stdout)
    
    print("=== PLAYWRIGHT OUTPUT ANALYSIS ===")
    print(f"Nav items: {len(data.get('rendered_nav', []))}")
    print(f"Buttons: {len(data.get('rendered_buttons', []))}")
    print(f"Sections: {len(data.get('rendered_sections', []))}")
    print(f"Images: {len(data.get('rendered_images', []))}")
    print(f"Computed colors: {len(data.get('computed_colors', []))}")
    print(f"Page text length: {data.get('page_text_length', 0)}")
    
    # Show first few items
    if data.get('rendered_nav'):
        print(f"\nFirst nav item: {data['rendered_nav'][0]}")
    if data.get('rendered_buttons'):
        print(f"First button: {data['rendered_buttons'][0]}")
    if data.get('rendered_sections'):
        print(f"First section: {data['rendered_sections'][0]}")
    if data.get('rendered_images'):
        print(f"First image: {data['rendered_images'][0]}")
        
except json.JSONDecodeError as e:
    print(f"JSON parse error: {e}")
    print(f"stdout (first 500 chars): {result.stdout[:500]}")
