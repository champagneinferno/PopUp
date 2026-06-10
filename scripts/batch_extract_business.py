#!/usr/bin/env python3
"""Batch extract from BUSINESS WEBSITES (homepages with hero sections)"""
import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / "backend" / "extractor"))
from dna_extractor import WebsiteDNASequencer

BUSINESS_WEBSITES = [
    "https://www.metawatt.com",      # AI business (Wix)
    "https://www.notion.so",          # SaaS (React)
    "https://www.shopify.com",        # E-commerce platform
    "https://www.stripe.com",         # Fintech
    "https://www.wix.com",            # Website builder (their own platform)
]

def run_batch_extraction():
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    batch_name = f"Batch_{timestamp}"

    print(f"\n🏢 Starting Batch: {batch_name}")
    print(f"📊 Target: {len(BUSINESS_WEBSITES)} business websites")
    print("=" * 70)

    results = []

    for i, url in enumerate(BUSINESS_WEBSITES, 1):
        print(f"\n[{i}/{len(BUSINESS_WEBSITES)}] Extracting: {url}")
        try:
            url_folder = url.replace('https://', '').replace('http://', '').replace('/', '_')
            output_dir = Path(f"output/extraction/{batch_name}/{url_folder}").resolve()
            output_dir.mkdir(parents=True, exist_ok=True)

            sequencer = WebsiteDNASequencer(url, output_dir=str(output_dir))
            profile = sequencer.sequence_dna()

            if "error" in profile:
                print(f"❌ Failed: {profile['error']}")
                results.append({"url": url, "error": profile["error"]})
            else:
                output_file = Path(f"output/extraction/{batch_name}/{url.replace('https://', '').replace('/', '_')}.json")
                output_file.parent.mkdir(parents=True, exist_ok=True)
                with open(output_file, 'w') as f:
                    json.dump(profile, f, indent=2)
                print(f"✅ Success: {url}")
                results.append({"url": url, "output": str(output_file), "status": "success"})
        except Exception as e:
            print(f"❌ Exception: {e}")
            results.append({"url": url, "error": str(e)})

    manifest = {
        "batch_name": batch_name,
        "timestamp": timestamp,
        "target_type": "business_websites",
        "total_sites": len(BUSINESS_WEBSITES),
        "results": results
    }
    manifest_file = Path(f"output/extraction/{batch_name}/batch_manifest.json")
    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_file, 'w') as f:
        json.dump(manifest, f, indent=2)

    print("\n" + "=" * 70)
    print(f"✅ Batch Complete: {batch_name}")
    print(f"📁 Results: output/extraction/{batch_name}/")
    print(f"📋 Manifest: {manifest_file}")
    print("=" * 70)
    return batch_name, manifest_file

if __name__ == "__main__":
    batch_name, manifest = run_batch_extraction()