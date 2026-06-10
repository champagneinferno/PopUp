#!/usr/bin/env python3
"""
DNA Extractor - Layer-based website extraction engine
Uses Playwright Python directly for unified extraction
"""
import json
import sys
import os
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from layer_extractor import extract_layers


def extract_website(url, output_path=None, output_dir=None):
    """Extract website DNA using layer-based approach"""
    result = extract_layers(url, output_dir=output_dir)

    if "error" in result:
        return result

    # Build the unified profile from layers
    profile = {
        "url": result["url"],
        "framework": result.get("framework", {}),
        "screenshot_path": result.get("screenshot_path", ""),
        "layers": result.get("layers", {}),
        "assets": result.get("assets", []),
        "meta": result.get("meta", {}),
        "extraction_timestamp": __import__("datetime").datetime.now().isoformat(),
        "_version": "2.0-layer-based"
    }

    if output_path:
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(profile, f, indent=2, ensure_ascii=False)
        print(f"\n✓ Profile saved to: {output_file.absolute()}")

    return profile


def main():
    parser = argparse.ArgumentParser(description="Website DNA Sequencer v2 - Layer Based")
    parser.add_argument("--url", required=True, help="Website URL to extract")
    parser.add_argument("--output", default="", help="Output JSON file path")
    args = parser.parse_args()

    output_dir = None
    output_path = args.output
    if output_path:
        output_dir = str(Path(output_path).parent.resolve())

    print(f"\n🧬 Starting Layer-Based DNA Sequencer for: {args.url}")
    print("=" * 70)

    profile = extract_website(args.url, output_path=output_path, output_dir=output_dir)

    if "error" in profile:
        print(f"❌ Extraction failed: {profile['error']}")
        return

    print("\n✅ DNA Profile Complete!")
    print("=" * 70)
    print(json.dumps(profile, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()