#!/usr/bin/env python3
"""
Batch extract from BUSINESS WEBSITES (homepages with hero sections)
Target: Business sites, not random sites
"""
import sys
import json
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend" / "extractor"))

from dna_extractor import WebsiteDNASequencer

# BUSINESS WEBSITES WITH HERO SECTIONS (not random sites)
BUSINESS_WEBSITES = [
    "https://www.metawatt.com",      # AI business (Wix)
    "https://www.notion.so",          # SaaS (React)
    "https://www.shopify.com",        # E-commerce platform
    "https://www.stripe.com",         # Fintech
    "https://www.wix.com",            # Website builder (their own platform)
]

def run_batch_extraction():
    """Extract DNA from business websites"""
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    batch_name = f"BusinessBatch_{timestamp}"
    
    print(f"\n🏢 Starting Business Batch: {batch_name}")
    print(f"📊 Target: {len(BUSINESS_WEBSITES)} business websites")
    print("=" * 70)
    
    results = []
    
    for i, url in enumerate(BUSINESS_WEBSITES, 1):
        print(f"\n[{i}/{len(BUSINESS_WEBSITES)}] Extracting: {url}")
        
        try:
            sequencer = WebsiteDNASequencer(url)
            profile = sequencer.sequence_dna()
            
            if "error" in profile:
                print(f"❌ Failed: {profile['error']}")
                results.append({"url": url, "error": profile["error"]})
            else:
                # Save individual result
                output_file = Path(f"../output/{batch_name}/{url.replace('https://', '').replace('/', '_')}.json")
                output_file.parent.mkdir(parents=True, exist_ok=True)
                with open(output_file, 'w') as f:
                    json.dump(profile, f, indent=2)
                
                print(f"✅ Success: {url}")
                results.append({"url": url, "output": str(output_file), "status": "success"})
        
        except Exception as e:
            print(f"❌ Exception: {e}")
            results.append({"url": url, "error": str(e)})
    
    # Save batch manifest
    manifest = {
        "batch_name": batch_name,
        "timestamp": timestamp,
        "target_type": "business_websites",
        "total_sites": len(BUSINESS_WEBSITES),
        "results": results
    }
    
    manifest_file = Path(f"../output/{batch_name}/batch_manifest.json")
    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_file, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print("\n" + "=" * 70)
    print(f"✅ Batch Complete: {batch_name}")
    print(f"📁 Results: output/{batch_name}/")
    print(f"📋 Manifest: {manifest_file}")
    print("=" * 70)
    
    return batch_name, manifest_file

if __name__ == "__main__":
    batch_name, manifest = run_batch_extraction()
    print(f"\n🔗 SHARE THIS WITH USER: output/{batch_name}/")
