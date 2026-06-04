#!/usr/bin/env python3
"""
Compatibility Matrix - Tests website types and builds compatibility report
"""
import sys
import json
from pathlib import Path
import subprocess
import time

# Website test matrix - different types
WEBSITE_MATRIX = {
    "static_simple": [
        {"name": "Example.com", "url": "https://example.com/", "expect": "simple, minimal"},
        {"name": "HTTPbin.org", "url": "https://httpbin.org/", "expect": "API docs style"},
    ],
    "static_complex": [
        {"name": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Main_Page", "expect": "content-heavy"},
        {"name": "Python.org", "url": "https://www.python.org/", "expect": "structured content"},
    ],
    "wix_sites": [
        {"name": "Metawatt", "url": "https://www.metawatt.com/", "expect": "Wix structure"},
        {"name": "Wix Demo", "url": "https://www.wix.com/demo/", "expect": "Wix demo layout"},
    ],
    "corporate": [
        {"name": "Apple", "url": "https://www.apple.com/", "expect": "premium design"},
        {"name": "Microsoft", "url": "https://www.microsoft.com/", "expect": "corporate structure"},
        {"name": "Stripe", "url": "https://stripe.com/", "expect": "modern gradients"},
    ],
    "tech_dev": [
        {"name": "GitHub", "url": "https://github.com/", "expect": "dev-focused"},
        {"name": "Stack Overflow", "url": "https://stackoverflow.com/", "expect": "Q&A structure"},
    ],
    "js_heavy": [
        {"name": "Facebook", "url": "https://facebook.com/", "expect": "JS-rendered, may fail"},
        {"name": "Twitter", "url": "https://twitter.com/", "expect": "JS-heavy, likely fails"},
        {"name": "React Docs", "url": "https://react.dev/", "expect": "modern JS framework"},
    ],
    "creative": [
        {"name": "Dribbble", "url": "https://dribbble.com/", "expect": "image-heavy"},
        {"name": "Behance", "url": "https://www.behance.net/", "expect": "portfolio style"},
    ]
}

def run_single_test(test_case, test_id):
    """Run pipeline on a single URL"""
    print(f"\n[{test_id}] Testing: {test_case['name']}")
    print(f"    URL: {test_case['url']}")
    
    # Run DNA Extractor
    result1 = subprocess.run(
        [sys.executable, "src/extractor/dna_extractor.py", test_case['url']],
        capture_output=True, text=True, timeout=120, cwd=Path.cwd()
    )
    
    if result1.returncode != 0:
        return {
            "name": test_case['name'],
            "url": test_case['url'],
            "category": test_id.split('_')[0] if '_' in test_id else test_id,
            "status": "FAIL",
            "reason": "Extractor failed",
            "objects": 0,
            "tokens": 0,
            "style": "N/A"
        }
    
    # Run Evaluator
    result2 = subprocess.run(
        [sys.executable, "src/extractor/evaluator.py", "extracted_profile.json"],
        capture_output=True, text=True, timeout=60, cwd=Path.cwd()
    )
    
    if result2.returncode != 0:
        return {
            "name": test_case['name'],
            "url": test_case['url'],
            "category": test_id.split('_')[0] if '_' in test_id else test_id,
            "status": "FAIL",
            "reason": "Evaluator failed",
            "objects": 0,
            "tokens": 0,
            "style": "N/A"
        }
    
    # Load blueprint
    try:
        with open("3d_scene_blueprint.json", 'r') as f:
            blueprint = json.load(f)
        
        meta = blueprint.get('scene_metadata', {})
        objects = blueprint.get('3d_objects', [])
        
        return {
            "name": test_case['name'],
            "url": test_case['url'],
            "category": test_id,
            "status": "PASS" if len(objects) > 0 else "WARN",
            "reason": "" if len(objects) > 0 else "No 3D objects created",
            "objects": len(objects),
            "tokens": meta.get('token_cost_estimate', 0),
            "style": meta.get('style', 'N/A')
        }
    except:
        return {
            "name": test_case['name'],
            "url": test_case['url'],
            "category": test_id,
            "status": "FAIL",
            "reason": "Could not read blueprint",
            "objects": 0,
            "tokens": 0,
            "style": "N/A"
        }

def main():
    print("\n" + "="*70)
    print("WEBSITE COMPATIBILITY MATRIX TEST")
    print("="*70)
    print("Testing different website types to build compatibility report...")
    
    results = []
    total = sum(len(tests) for tests in WEBSITE_MATRIX.values())
    current = 0
    
    for category, test_cases in WEBSITE_MATRIX.items():
        print(f"\n{'─'*70}")
        print(f"CATEGORY: {category.upper()}")
        print(f"{'─'*70}")
        
        for test in test_cases:
            current += 1
            print(f"\nProgress: {current}/{total}")
            
            result = run_single_test(test, category)
            results.append(result)
            
            # Brief pause between tests
            time.sleep(2)
    
    # Generate compatibility report
    print("\n" + "="*70)
    print("COMPATIBILITY MATRIX RESULTS")
    print("="*70)
    
    # Sort by category
    results.sort(key=lambda x: x['category'])
    
    # Print by category
    current_cat = ""
    for r in results:
        if r['category'] != current_cat:
            current_cat = r['category']
            print(f"\n{current_cat.upper()} ".ljust(72, '─'))
        
        status_icon = "✓" if r['status'] == "PASS" else "⚠️" if r['status'] == "WARN" else "❌"
        print(f"  {status_icon} {r['name']:<25} Obj:{r['objects']:<4} Tokens:{r['tokens']:<6} Style:{r['style']}")
        if r['reason']:
            print(f"    └─ {r['reason']}")
    
    # Summary statistics
    print("\n" + "="*70)
    print("SUMMARY STATISTICS")
    print("="*70)
    
    total_tests = len(results)
    passed = sum(1 for r in results if r['status'] == "PASS")
    warned = sum(1 for r in results if r['status'] == "WARN")
    failed = sum(1 for r in results if r['status'] == "FAIL")
    
    print(f"Total Tests: {total_tests}")
    print(f"✓ Passed: {passed} ({passed*100//total_tests}%)")
    print(f"⚠️  Warnings: {warned} ({warned*100//total_tests}%)")
    print(f"❌ Failed: {failed} ({failed*100//total_tests}%)")
    
    avg_objects = sum(r['objects'] for r in results) / total_tests
    avg_tokens = sum(r['tokens'] for r in results) / total_tests
    
    print(f"\nAverage 3D Objects: {avg_objects:.1f}")
    print(f"Average Tokens: {avg_tokens:.0f}")
    
    # Save detailed results
    with open("compatibility_report.json", 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✓ Detailed report saved to: compatibility_report.json")
    print(f"\nRECOMMENDATION:")
    
    if passed / total_tests > 0.7:
        print("✓ System is ready for 3D integration!")
        print("  Most website types are compatible.")
    elif passed / total_tests > 0.4:
        print("⚠️  System works but has limitations.")
        print("  Consider fixing JS-heavy site handling before 3D integration.")
    else:
        print("❌ System needs more work before 3D integration.")
        print("  Too many site types are failing extraction.")

if __name__ == "__main__":
    main()
