#!/usr/bin/env python3
"""Fix indentation in evaluator.py and add missing methods"""
import re

with open('backend/extractor/evaluator.py', 'r') as f:
    content = f.read()

# Check current state around line 168-170
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'return generic' in line:
        print(f'Line {i+1}: |{line}|')
    if 'def _analyze_complexity' in line:
        print(f'Line {i+1}: |{line}|')
    if 'def _get_theme_rationale' in line:
        print(f'Line {i+1}: |{line}|')

# Let me create the proper replacement
new_methods = """
    def _get_theme_rationale(self, dna, theme):
        \"\"\"Explain WHY this theme was chosen\"\"\"
        url = dna.get('url', '').lower()
        title = dna.get('title', '').lower()
        desc = dna.get('meta', {}).get('description', '').lower()
        combined = f"{url} {title} {desc}"
        rationales = {
            'e-commerce': f"Site URL/title contains commerce keywords (e.g., 'shop', 'product', 'buy') → optimized for product-focused 3D showcase.",
            'ai-technology': f"Site contains AI/tech keywords (e.g., 'ai', 'artificial intelligence', 'machine learning') → futuristic 3D environment with clean geometry.",
            'design-creative': f"Site description suggests creative/design focus (e.g., 'creative', 'design', 'portfolio') → artistic 3D layout with organic shapes.",
            'saas-platform': f"Site uses SaaS/platform language (e.g., 'saas', 'software', 'platform') → professional 3D scene with clean UI elements.",
            'content-media': f"Site appears to be content/media focused (e.g., 'blog', 'news', 'article') → minimalist 3D with emphasis on text readability.",
            'generic': f"No strong theme signals detected — using generic 3D scene with broad appeal."
        }
        return rationales.get(theme, 'No specific rationale available.')

    def _get_theme_keywords(self, dna):
        \"\"\"Return the matching keywords that determined the theme\"\"\"
        url = dna.get('url', '').lower()
        title = dna.get('title', '').lower()
        desc = dna.get('meta', {}).get('description', '').lower()
        combined = f"{url} {title} {desc}"
        theme_keywords = {
            'e-commerce': ['shop', 'store', 'commerce', 'product', 'buy', 'sell'],
            'ai-technology': ['ai', 'artificial intelligence', 'machine learning', 'agent'],
            'design-creative': ['design', 'creative', 'portfolio', 'studio'],
            'saas-platform': ['saas', 'software', 'platform', 'cloud'],
            'content-media': ['blog', 'news', 'article', 'post'],
        }
        matched = []
        for theme_name, kws in theme_keywords.items():
            for kw in kws:
                if kw in combined:
                    matched.append({'theme': theme_name, 'keyword': kw})
        if not matched:
            matched.append({'theme': 'generic', 'keyword': 'none', 'note': 'No theme keywords matched'})
        return matched

    def _generate_objects_rationale(self, dna, objects, theme):
        \"\"\"Generate rationale for each 3D object decision\"\"\"
        rationale = []
        for obj in objects:
            obj_type = obj.get('type', 'unknown')
            priority = obj.get('priority', 'medium')
            content = obj.get('content') or obj.get('text') or obj.get('heading') or ''
            if obj_type == 'hero_text':
                rationale.append({
                    'object_type': obj_type,
                    'content_preview': str(content)[:80],
                    'priority': priority,
                    'reasoning': 'Hero heading is the website focal point — ALWAYS converted to 3D as the centerpiece of the scene (position 0,0,0). Gets highest scale/emphasis.',
                    '3d_representation': 'Floating 3D text geometry with glow effect, centered in scene',
                    'source_from': 'hero_section.heading'
                })
            elif obj_type == 'cta_button':
                rationale.append({
                    'object_type': obj_type,
                    'content_preview': str(content)[:80],
                    'priority': priority,
                    'reasoning': 'CTA buttons drive user action — converted to interactive 3D buttons positioned below the hero text.',
                    '3d_representation': '3D button panel with hover animation, positioned at y=-1',
                    'source_from': 'hero_section.cta_buttons'
                })
            elif obj_type == 'content_panel':
                rationale.append({
                    'object_type': obj_type,
                    'content_preview': str(content)[:80],
                    'priority': priority,
                    'reasoning': 'Content sections provide context — placed at depth (negative Z) to create layered parallax scene.',
                    '3d_representation': '3D floating card at distance, with soft shadow and fade-in animation',
                    'source_from': 'structure.sections'
                })
            elif obj_type == 'sketchfab_asset':
                rationale.append({
                    'object_type': obj_type,
                    'content_preview': str(content)[:80],
                    'priority': priority,
                    'reasoning': 'Fallback 3D asset from SketchFab when website doesn\\'t have enough content objects — low priority filler.',
                    '3d_representation': 'Imported 3D model from SketchFab, positioned at right side',
                    'source_from': 'external_sketchfab_search'
                })
            else:
                rationale.append({
                    'object_type': obj_type,
                    'content_preview': str(content)[:80],
                    'priority': priority,
                    'reasoning': 'Standard 3D conversion based on extraction analysis.',
                    '3d_representation': 'Generic 3D panel',
                    'source_from': 'extraction_profile'
                })
        total_objects = len(objects)
        max_allowed = objects[0].get('max_objects', 5) if objects else 5
        rationale.append({
            'summary': f'Converted {total_objects} of {max_allowed} allowed objects',
            'theme_limit': f'Theme "{theme}" limits to {max_allowed} objects for efficiency',
        })
        return rationale

    def _get_source_assets(self, dna):
        \"\"\"Extract actual website assets for visual preview in the viewer\"\"\"
        assets = dna.get('assets', {})
        images = assets.get('images', [])[:10]
        logo = assets.get('logo', '')
        visual = dna.get('visual_dna', {})
        hero_bg = visual.get('hero_background', {})
        source_assets = {
            'hero_image': '',
            'logo': logo,
            'content_images': [],
            'background_images': [],
            'screenshot': ''
        }
        bg_image = hero_bg.get('background_image') or hero_bg.get('clean_url') or ''
        if bg_image and bg_image != 'none':
            source_assets['hero_image'] = bg_image
        for img in images:
            src = img.get('src', '') if isinstance(img, dict) else img
            if src and not any(x in str(src).lower() for x in ['icon', 'logo', 'favicon']):
                source_assets['content_images'].append(src)
        bg_list = visual.get('background_images', [])
        for bg in bg_list[:5]:
            src = bg.get('clean_url') or bg.get('url') or (bg if isinstance(bg, str) else '')
            if src:
                source_assets['background_images'].append(src)
        screenshot = dna.get('screenshot_path') or dna.get('screenshot', '')
        if screenshot:
            source_assets['screenshot'] = screenshot
        return source_assets
"""

# Find the pattern and replace
# First, try the most common pattern
old = "            return 'generic'\n\n            def _get_theme_rationale"
new = "            return 'generic'\n" + new_methods + "\n    def _analyze_complexity"

# Actually, let's find the exact text to replace by looking at the content
idx = content.find("            return 'generic'\n\n            def _get_theme_rationale")
if idx < 0:
    idx = content.find("            return 'generic'\n\n            def _analyze_complexity")

if idx >= 0:
    # Find the end of the _get_source_assets method or the start of _analyze_complexity
    end_idx = content.find("\n    def _analyze_complexity(self, dna):", idx)
    if end_idx >= 0:
        # Replace everything from the broken insertion to _analyze_complexity
        content = content[:idx] + "            return 'generic'\n" + new_methods + "\n    def _analyze_complexity(self, dna):" + content[end_idx + len("\n    def _analyze_complexity(self, dna):"):]
        print("Replaced broken block")
    else:
        print("Could not find _analyze_complexity")
else:
    print("Could not find the broken pattern, checking file structure...")
    # Try finding the line numbers
    for i, line in enumerate(lines):
        if 'return generic' in line and i > 160:
            print(f"  Found 'return generic' at line {i+1}")
        if 'def _analyze_complexity' in line:
            print(f"  Found '_analyze_complexity' at line {i+1}")
    for i, line in enumerate(lines):
        if 'def _get_theme' in line:
            print(f"  Found method at line {i+1}: {line.strip()}")

with open('backend/extractor/evaluator.py', 'w') as f:
    f.write(content)

print("Done")