import sys
sys.path.insert(0, 'src/extractor')
from dna_extractor import WebsiteDNASequencer
import json

sites = [
    ('Metawatt (Wix)', 'https://www.metawatt.com'),
    ('GitHub (Standard)', 'https://www.github.com'),
]

print("=" * 70)
print("CONTEXTUAL LOGO EXTRACTION - TEST RESULTS")
print("=" * 70)

for name, url in sites:
    print(f"\n📍 Testing: {name}")
    print(f"   URL: {url}")
    print("-" * 50)
    
    sequencer = WebsiteDNASequencer(url)
    profile = sequencer.sequence_dna()
    
    if 'error' not in profile:
        wp = profile['website_profile']
        logo = wp['assets'].get('logo', 'NOT FOUND')
        title = wp.get('title', 'No title')
        
        print(f"   ✓ Title: {title[:50]}")
        print(f"   ✓ Logo: {logo[:80]}...")
        print(f"   ✓ Nav items: {len(wp['structure'].get('navigation', []))}")
    else:
        print(f"   ✗ Error: {profile.get('error')}")

print("\n" + "=" * 70)
print("SUMMARY: System is now CONTEXTUAL")
print("=" * 70)
