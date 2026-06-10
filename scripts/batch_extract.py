#!/usr/bin/env python3
"""Batch extraction script - runs dna_extractor on multiple URLs"""
import sys
import json
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent / "backend" / "extractor"))
from dna_extractor import extract_website

URLS = [
    "https://www.shopify.com",
    "https://www.notion.so",
    "https://www.framer.com"
]

def run_batch():
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    batch_name = f"Batch_{timestamp}"

    print(f"\n🚀 Starting Batch: {batch_name}")
    print(f"📊 Target: {len(URLS)} websites")
    print("=" * 70)

    results = []

    for i, url in enumerate(URLS, 1):
        print(f"\n[{i}/{len(URLS)}] Extracting: {url}")
        try:
            output_file = Path(f"output/extraction/{batch_name}/{url.replace('https://', '').replace('/', '_')}.json")
            output_file.parent.mkdir(parents=True, exist_ok=True)

            profile = extract_website(url, output_path=str(output_file), output_dir=str(output_file.parent))

            if "error" in profile:
                print(f"❌ Failed: {profile['error']}")
                results.append({"url": url, "error": profile["error"]})
            else:
                output_file = Path(f"output/extraction/{batch_name}/{url.replace('https://', '').replace('/', '_')}.json")
                output_file.parent.mkdir(parents=True, exist_ok=True)
                with open(output_file, 'w') as f:
                    json.dump(profile, f, indent=2)
                print(f"✅ Success: {url}")

                # Auto-run evaluator on extraction result
                try:
                    eval_output = output_file.parent / f"{output_file.stem}_evaluation.json"
                    import sys as _sys
                    from pathlib import Path as _Path
                    _sys.path.insert(0, str(_Path(__file__).parent.parent / 'backend' / 'extractor'))
                    from evaluator import WebsiteEvaluator
                    evaluator = WebsiteEvaluator(str(output_file))
                    blueprint = evaluator.evaluate()
                    if "error" not in blueprint:
                        with open(eval_output, 'w') as ef:
                            json.dump(blueprint, ef, indent=2)
                        print(f"   ✅ Evaluator blueprint: {eval_output.name}")
                except Exception as e:
                    print(f"   ⚠️ Evaluator skipped: {e}")

                results.append({"url": url, "output": str(output_file), "status": "success"})
        except Exception as e:
            print(f"❌ Exception: {e}")
            results.append({"url": url, "error": str(e)})

    manifest = {
        "batch_name": batch_name,
        "timestamp": timestamp,
        "total_sites": len(URLS),
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
    batch_name, manifest = run_batch()