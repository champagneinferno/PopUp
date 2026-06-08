#!/usr/bin/env python3
"""Batch extraction script - runs dna_extractor on multiple URLs"""
import sys
import json
from pathlib import Path
import subprocess
from datetime import datetime

def run_extraction(url, output_dir):
    """Run dna_extractor on a single URL"""
    output_file = output_dir / f"{url.replace('https://', '').replace('http://', '').replace('/', '_')}.json"
    
    cmd = [sys.executable, 'src/extractor/dna_extractor.py', '--url', url, '--output', str(output_file)]
    
    print(f"\n{'='*70}")
    print(f"Extracting: {url}")
    print(f"{'='*70}")
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    
    if result.returncode == 0:
        print(f"✓ Success: {output_file.name}")
        return True
    else:
        print(f"✗ Failed: {result.stderr[:200]}")
        return False

def main():
    urls = [
        "https://www.shopify.com",
        "https://www.notion.so",
        "https://www.framer.com"
    ]
    
    # Create batch directory
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    batch_name = f"Batch3_Efficient_{timestamp}"
    batch_dir = Path("extraction_results") / batch_name
    batch_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n🚀 Starting Batch: {batch_name}")
    print(f"Output directory: {batch_dir.absolute()}")
    
    # Process each URL
    results = {"batch_name": batch_name, "timestamp": timestamp, "websites": []}
    
    for url in urls:
        success = run_extraction(url, batch_dir)
        results["websites"].append({
            "url": url,
            "success": success,
            "output_file": f"{url.replace('https://', '').replace('http://', '').replace('/', '_')}.json"
        })
    
    # Save batch manifest
    manifest_file = batch_dir / "batch_manifest.json"
    with open(manifest_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n{'='*70}")
    print(f"BATCH COMPLETE: {batch_name}")
    print(f"Manifest: {manifest_file.absolute()}")
    print(f"{'='*70}")

if __name__ == "__main__":
    main()
