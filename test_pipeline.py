#!/usr/bin/env python3
"""
Test Pipeline - Runs full Extractor → Evaluator pipeline
Tests adaptability across different websites
"""
import sys
import json
from pathlib import Path
import subprocess

def run_pipeline(url, test_name):
    """Run full pipeline on a URL"""
    print(f"\n{'='*70}")
    print(f"TEST: {test_name}")
    print(f"URL: {url}")
    print(f"{'='*70}")
    
    # Step 1: Run Extractor (DNA Sequencer)
    print(f"\n[Step 1/2] Running DNA Extractor...")
    result = subprocess.run(
        [sys.executable, "src/extractor/dna_extractor.py", url],
        capture_output=True,
        text=True,
        timeout=120,
        cwd=Path.cwd()
    )
    
    if result.returncode != 0:
        print(f"❌ Extractor failed: {result.stderr}")
        return None
    
    print(f"✓ DNA Profile extracted")
    
    # Step 2: Run Evaluator
    print(f"\n[Step 2/2] Running Evaluator (Creative Director)...")
    result = subprocess.run(
        [sys.executable, "src/extractor/evaluator.py", "extracted_profile.json"],
        capture_output=True,
        text=True,
        timeout=60,
        cwd=Path.cwd()
    )
    
    if result.returncode != 0:
        print(f"❌ Evaluator failed: {result.stderr}")
        return None
    
    # Parse output for key metrics
    output = result.stdout
    print(output)
    
    # Load and return blueprint
    blueprint_path = Path("3d_scene_blueprint.json")
    if blueprint_path.exists():
        with open(blueprint_path, 'r') as f:
            return json.load(f)
    
    return None

def analyze_results(blueprint, test_name):
    """Analyze and display results"""
    if not blueprint:
        return
    
    print(f"\n{'='*70}")
    print(f"ANALYSIS: {test_name}")
    print(f"{'='*70}")
    
    meta = blueprint.get('scene_metadata', {})
    env = blueprint.get('environment', {})
    objects = blueprint.get('3d_objects', [])
    
    # Basic metrics
    print(f"\n📊 METRICS:")
    print(f"  Website: {meta.get('source_url', 'N/A')}")
    print(f"  Style: {meta.get('style', 'N/A')}")
    print(f"  3D Objects: {len(objects)}")
    print(f"  Estimated Tokens: {meta.get('token_cost_estimate', 0)}")
    
    # Token usage
    token_usage = meta.get('token_usage', {})
    print(f"\n💰 TOKEN USAGE:")
    print(f"  Base: {token_usage.get('base_cost', 0)}")
    print(f"  Multiplier: {token_usage.get('complexity_multiplier', 1.0)}x")
    print(f"  Total: {token_usage.get('total_tokens', 0)}")
    
    # Environment
    print(f"\n🎨 ENVIRONMENT:")
    bg = env.get('background', {})
    print(f"  Background: {bg.get('type', 'N/A')} - {bg.get('note', '')}")
    print(f"  Lighting: {env.get('lighting', {}).get('type', 'N/A')}")
    
    # 3D Objects breakdown
    print(f"\n🧊 3D OBJECTS BREAKDOWN:")
    obj_types = {}
    for obj in objects:
        obj_type = obj.get('type', 'unknown')
        obj_types[obj_type] = obj_types.get(obj_type, 0) + 1
    
    for obj_type, count in obj_types.items():
        print(f"  {obj_type}: {count}")
    
    # Save summary
    summary = {
        "test_name": test_name,
        "url": meta.get('source_url'),
        "style": meta.get('style'),
        "object_count": len(objects),
        "token_cost": meta.get('token_cost_estimate'),
        "object_types": obj_types
    }
    
    summaries_path = Path("test_summaries.json")
    summaries = []
    if summaries_path.exists():
        with open(summaries_path, 'r') as f:
            summaries = json.load(f)
    summaries.append(summary)
    with open(summaries_path, 'w') as f:
        json.dump(summaries, f, indent=2)
    
    print(f"\n✓ Summary saved to test_summaries.json")

def main():
    """Run tests on multiple websites"""
    # Check for URLs from command line
    if len(sys.argv) > 1:
        # Use provided URLs
        test_cases = []
        for i, url in enumerate(sys.argv[1:]):
            test_cases.append({
                "name": f"Custom URL {i+1}",
                "url": url,
                "expected": "User-specified test"
            })
    else:
        # Default test cases
        test_cases = [
            {
                "name": "Metawatt (Wix Site)",
                "url": "https://www.metawatt.com/",
                "expected": "Should detect Wix structure, hero section"
            },
            {
                "name": "Example.com (Simple Site)",
                "url": "https://example.com/",
                "expected": "Should be simple, minimal objects"
            },
            {
                "name": "Apple.com (Complex Corporate)",
                "url": "https://www.apple.com/",
                "expected": "Should detect high complexity, premium style"
            }
        ]
    
    print(f"\n🧪 WEBSITE DNA PIPELINE TEST")
    print(f"Running {len(test_cases)} test(s)...")
    
    results = []
    for test in test_cases:
        blueprint = run_pipeline(test['url'], test['name'])
        if blueprint:
            analyze_results(blueprint, test['name'])
            results.append({
                "test": test['name'],
                "success": True,
                "objects": len(blueprint.get('3d_objects', [])),
                "tokens": blueprint.get('scene_metadata', {}).get('token_cost_estimate', 0)
            })
        else:
            results.append({
                "test": test['name'],
                "success": False,
                "objects": 0,
                "tokens": 0
            })
    
    # Final summary
    print(f"\n{'='*70}")
    print("FINAL SUMMARY")
    print(f"{'='*70}")
    print(f"{'Test':<30} {'Status':<10} {'Objects':<10} {'Tokens':<10}")
    print("-" * 70)
    
    for r in results:
        status = "✓ PASS" if r['success'] else "❌ FAIL"
        print(f"{r['test']:<30} {status:<10} {r['objects']:<10} {r['tokens']:<10}")
    
    print(f"\n✓ All tests complete!")
    print(f"📁 Check these files:")
    print(f"  - extracted_profile.json (DNA profiles)")
    print(f"  - 3d_scene_blueprint.json (3D blueprints)")
    print(f"  - test_summaries.json (test results)")

if __name__ == "__main__":
    main()
