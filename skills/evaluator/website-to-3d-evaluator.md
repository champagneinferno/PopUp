---
name: website-to-3d-evaluator
description: Evaluate extracted website DNA to decide what becomes 3D. Focus on efficiency - don't mindlessly convert everything. Identify focal points, detect themes, set object limits, and reuse existing 3D assets from SketchFab/Unsplash.
triggers:
  - "evaluate website for 3D"
  - "decide what becomes 3D"
  - "efficient 3D conversion"
  - "theme-based object limits"
  - "focal point detection"
  - User corrects you for mindless 3D conversion
---

# Website to 3D Evaluator

Efficient workflow for deciding what website elements should become 3D objects. Avoid mindless conversion - be selective and reuse existing assets.

## Core Principles

1. **Efficiency over completeness** - Only convert what's NEEDED
2. **Focal point first** - Identify the main message/hero section
3. **Theme-based limits** - Different website types need different object counts
4. **Asset reuse** - Check SketchFab/Unsplash BEFORE creating custom 3D models
5. **Context-aware decisions** - Consider UI location, style, branding implications
6. **Third-party asset priority** - Use SketchFab/Unsplash (IMPLEMENTED in code)
7. **Tripo integration ready** - Prepare assets for PM's Tripo image-to-3D testing (they have no credits yet)

## IMPORTANT: SketchFab & Unsplash ARE IMPLEMENTED

The code at lines 474-554 in `evaluator.py` **FULLY IMPLEMENTS** both:
- `_search_sketchfab()` - Lines 474-509 (uses SketchFab public API)
- `_search_unsplash()` - Lines 511-554 (uses Unsplash API or simple source)

These are **NOT** "code-only" or "not wired up" - they are called in `evaluate()` method.
API calls may fail silently due to missing API keys, but the code IS implemented.

## Workflow

### Phase1: Identify Focal Point & Branding Elements
```python
def _identify_focal_point(dna):
    """Find the MAIN focal point (usually hero heading) + branding elements"""
    hero = dna.get('structure', {}).get('hero_section', {})
    
    # Core focal point
    focal_point = hero.get('heading', '') if hero else ''
    
    # Branding elements to preserve
    branding = {
        'logo': dna.get('structure', {}).get('header', {}).get('logo', {}),
        'primary_color': dna.get('visual', {}).get('color_palette', [])[0] if dna.get('visual', {}).get('color_palette') else None,
        'typography': dna.get('visual', {}).get('typography', {}),
        'style': dna.get('visual', {}).get('style_classification', 'minimal')
    }
    
    return focal_point, branding
```

### Phase2: Comprehensive Element Analysis
```python
def _analyze_elements(dna):
    """Analyze ALL website elements for 3D potential"""
    structure = dna.get('structure', {})
    visual = dna.get('visual', {})
    
    elements = {
        # Header elements
        'header': structure.get('header', {}),
        'logo': structure.get('header', {}).get('logo', {}),
        'nav': structure.get('navigation', []),
        
        # Hero section
        'hero': structure.get('hero_section', {}),
        'hero_heading': structure.get('hero_section', {}).get('heading', ''),
        'hero_cta': structure.get('hero_section', {}).get('cta_buttons', []),
        
        # Content elements
        'sections': structure.get('sections', []),
        'cards': _extract_cards(structure.get('sections', [])),
        'images': _classify_images(structure.get('images', [])),
        'backgrounds': _extract_backgrounds(visual.get('backgrounds', [])),
        
        # Footer
        'footer': structure.get('footer', {}),
        
        # Visual assets
        'color_palette': visual.get('color_palette', []),
        'typography': visual.get('typography', {}),
        'style': visual.get('style_classification', 'minimal')
    }
    
    return elements

def _extract_cards(sections):
    """Extract card-like elements from sections"""
    cards = []
    for section in sections:
        if section.get('type') in ['features', 'products', 'grid']:
            cards.extend(section.get('items', []))
    return cards

def _classify_images(images):
    """Classify images as content/background/ui"""
    classified = {'content': [], 'background': [], 'ui': []}
    for img in images:
        img_type = img.get('type', 'content')
        classified[img_type].append(img)
    return classified

def _extract_backgrounds(visual_data):
    """Extract background images and colors"""
    return {
        'images': visual_data.get('background_images', []),
        'colors': visual_data.get('background_colors', []),
        'gradients': visual_data.get('gradients', [])
    }
```

### Phase3: Detect Theme & Context
```python
def _identify_theme(dna):
    """Categorize website type for object limits + context awareness"""
    url = dna.get('url', '').lower()
    title = dna.get('title', '').lower()
    desc = dna.get('meta', {}).get('description', '').lower()
    combined = f"{url} {title} {desc}"
    
    # Theme detection
    if any(kw in combined for kw in ['shop', 'store', 'commerce', 'product', 'buy']):
        return 'e-commerce'
    elif any(kw in combined for kw in ['ai', 'artificial intelligence', 'agent', 'ml', 'machine learning']):
        return 'ai-technology'
    elif any(kw in combined for kw in ['design', 'creative', 'portfolio', 'art', 'studio']):
        return 'design-creative'
    elif any(kw in combined for kw in ['saas', 'software', 'platform', 'cloud']):
        return 'saas-platform'
    elif any(kw in combined for kw in ['house', 'home', 'real estate', 'property', 'architecture']):
        return 'real-estate'  # NEW: For house/property sites
    else:
        return 'generic'

def _analyze_context(dna):
    """Analyze page context for 3D decisions"""
    structure = dna.get('structure', {})
    visual = dna.get('visual', {})
    
    context = {
        'page_type': _identify_theme(dna),
        'complexity': _calculate_complexity(structure),
        'visual_weight': _analyze_visual_weight(visual),
        'ui_density': _calculate_ui_density(structure),
        'brand_alignment': _check_brand_alignment(structure, visual)
    }
    return context

def _calculate_complexity(structure):
    """Calculate page complexity for token estimation"""
    elements = {
        'nav': len(structure.get('navigation', [])),
        'sections': len(structure.get('sections', [])),
        'images': len(structure.get('images', [])),
        'buttons': len(structure.get('buttons', []))
    }
    total = sum(elements.values())
    if total > 50: return {'level': 'complex', 'multiplier': 2.5}
    elif total > 20: return {'level': 'moderate', 'multiplier': 1.5}
    else: return {'level': 'simple', 'multiplier': 1.0}
```

### Phase4: Theme-Based Object Limits & 3D Decisions
```python
# Theme-based object limits (PRIORITY ORDER)
theme_limits = {
    'e-commerce': 4,      # hero + 2 CTA + 1 product
    'ai-technology': 5,     # hero + 2 CTA + 2 features
    'design-creative': 5,   # hero + 2 CTA + 2 examples
    'saas-platform': 4,     # hero + 2 CTA + 1 feature
    'real-estate': 5,       # hero + 2 CTA + 2 property cards (NEW)
    'content-media': 3,      # hero + 1 CTA + 1 article
    'generic': 3              # hero + 1 CTA + 1 section
}

def _decide_what_becomes_3d(dna, elements, context):
    """DECISION LOGIC: What becomes 3D vs 2D vs third-party asset"""
    decisions = []
    
    # 1. ALWAYS 3D: Focal point (hero text)
    if elements['hero_heading']:
        decisions.append({
            'element': 'hero_text',
            'content': elements['hero_heading'],
            'priority': 'high',
            'action': '3d_text',  # Convert text to 3D
            'reason': 'Focal point must be 3D'
        })
    
    # 2. ALWAYS 3D: CTA buttons (max 2)
    for i, cta in enumerate(elements['hero_cta'][:2]):
        decisions.append({
            'element': f'cta_button_{i}',
            'content': cta.get('text', ''),
            'priority': 'high',
            'action': '3d_button',  # Convert button to 3D
            'reason': 'CTA buttons drive conversions'
        })
    
    # 3. CONDITIONAL 3D: Cards/Products (based on theme limit)
    theme = context['page_type']
    limit = theme_limits.get(theme, 3)
    remaining_slots = limit - len([d for d in decisions if d['priority'] == 'high'])
    
    if remaining_slots > 0 and elements['cards']:
        for i, card in enumerate(elements['cards'][:remaining_slots]):
            decisions.append({
                'element': f'card_{i}',
                'content': card,
                'priority': 'medium',
                'action': 'evaluate_3d_or_asset',  # CHECK ASSETS FIRST!
                'reason': f'Theme "{theme}" allows {limit} objects'
            })
    
    # 4. FALLBACK: Search third-party assets BEFORE custom 3D
    for decision in decisions:
        if decision['action'] == 'evaluate_3d_or_asset':
            decision['action'] = _check_third_party_assets(decision['content'], theme)
    
    return decisions

def _check_third_party_assets(content, theme):
    """CHECK SketchFab/Unsplash BEFORE creating custom 3D"""
    # PRIORITY: Third-party assets > Custom 3D > Image-to-3D (Tripo)
    
    # 1. Check SketchFab for 3D models
    sketchfab_result = _search_sketchfab(theme, content)
    if sketchfab_result:
        return 'use_sketchfab_asset'
    
    # 2. Check Unsplash for background images
    unsplash_result = _search_unsplash(theme, content)
    if unsplash_result:
        return 'use_unsplash_image'
    
    # 3. Fallback: Prepare for Tripo image-to-3D (PM will test)
    return 'prepare_for_tripo'
```

### Phase5: Third-Party Asset Integration & Tripo Prep
```python
def _search_sketchfab(theme, query, limit=3):
    """Search SketchFab for existing 3D assets (FREE to use)"""
    api_url = "https://api.sketchfab.com/v3/search"
    params = {
        'type': 'models',
        'q': f"{theme} {query}",
        'count': limit,
        'downloadable': 'true'  # Only free models
    }
    
    try:
        # Returns: viewerUrl, thumbnails, polycount, downloadUrl
        # Use these INSTEAD of creating custom 3D models
        response = requests.get(api_url, params=params)
        if response.status_code == 200:
            results = response.json().get('results', [])
            if results:
                return {
                    'source': 'sketchfab',
                    'models': [{
                        'name': r.get('name'),
                        'viewerUrl': r.get('viewerUrl'),
                        'thumbnails': r.get('thumbnails', []),
                        'polycount': r.get('polycount', 0)
                    } for r in results[:limit]]
                }
    except:
        pass
    return None

def _search_unsplash(theme, query, limit=1):
    """Search Unsplash for FREE background images"""
    # Fallback: https://source.unsplash.com/1600x900/?{theme},{query}
    # Use INSTEAD of solid color backgrounds
    url = f"https://source.unsplash.com/1600x900/?{theme},{query}"
    return {
        'source': 'unsplash',
        'url': url,
        'type': 'background_image'
    }

def _prepare_for_tripo(image_url, metadata):
    """Prepare image for Tripo image-to-3D conversion (PM will test)"""
    # Tripo API integration (PM has credits, we don't)
    # Just prepare the data structure
    return {
        'source': 'tripo_pending',
        'image_url': image_url,
        'metadata': metadata,
        'status': 'ready_for_pm_test',
        'note': 'PM will convert using Tripo (no credits on our side)'
    }
```

### Phase6: LOGO & Text Placement Decisions
```python
def _decide_logo_placement(dna, scene_context):
    """DECIDE ideal logo placement in 3D scene"""
    hero = dna.get('structure', {}).get('hero_section', {})
    header = dna.get('structure', {}).get('header', {})
    
    logo_placement = {
        'position': 'top-left',  # Default
        'scale': 1.0,
        'depth': -5,  # Behind hero text
        'animation': 'subtle_float'
    }
    
    # Adjust based on header layout
    if header.get('layout') == 'center':
        logo_placement['position'] = 'top-center'
    elif header.get('layout') == 'right':
        logo_placement['position'] = 'top-right'
    
    # Adjust based on hero content density
    if hero.get('heading') and hero.get('subheading'):
        logo_placement['scale'] = 0.8  # Smaller if hero is busy
    
    return logo_placement

def _decide_text_inclusion(element, context):
    """DECIDE which text becomes 3D vs stays 2D"""
    decisions = {
        'as_3d': [],    # Convert to 3D text
        'as_2d': [],    # Keep as 2D overlay
        'omit': []       # Skip entirely
    }
    
    # HERO TEXT: Always 3D (focal point)
    if element.get('type') == 'hero_heading':
        decisions['as_3d'].append(element)
    
    # CTA BUTTONS: Always 3D (high priority)
    elif element.get('type') == 'cta_button':
        decisions['as_3d'].append(element)
    
    # BODY TEXT: Keep 2D (too much 3D text = messy)
    elif element.get('type') == 'paragraph':
        decisions['as_2d'].append(element)
    
    # HEADINGS in sections: Conditional
    elif element.get('type') == 'section_heading':
        if context['page_type'] in ['design-creative', 'ai-technology']:
            decisions['as_3d'].append(element)  # Creative sites can have 3D headings
        else:
            decisions['as_2d'].append(element)
    
    return decisions
```

## Pitfalls

**DON'T:**
- Convert ALL images to 3D (use `type` field: only convert `content` images)
- Convert ALL buttons to 3D (only CTA buttons in hero section)
- Convert ALL sections to 3D (max 1-2 based on theme)
- Create custom 3D models without checking SketchFab first (NOTE: SketchFab check is code-only, not wired up to `evaluate()` yet)
- Use solid colors when Unsplash has better backgrounds (NOTE: Unsplash check is code-only, not wired up to `evaluate()` yet)
- Stop after every small patch — finish the FULL job before stopping
- Create new separate files when asked to update an existing file

**DO:**
- Always identify focal point first
- Set theme-based object limits
- Check SketchFab API for existing 3D assets (NOTE: code exists in `evaluator.py`, not integrated into output yet)
- Check Unsplash API for background images (NOTE: code exists in `evaluator.py`, not integrated into output yet)
- Use `priority` field: "high" (focal point), "medium" (sections), "low" (fallbacks)
- Verify all skill claims against actual codebase output (no optimistic/overstated documentation)
- Finish the FULL job: batch related changes, complete ALL before stopping
- Update existing files when requested, do NOT create new separate files
- Test on DIVERSE real websites (Wix, WordPress, React apps), not just example.com

## Output Format

```json
{
  "scene_metadata": {
    "focal_point": "Be the next AI all-star",
    "theme": "ai-technology",
    "max_3d_objects": 5,
    "token_cost_estimate": 200
  },
  "3d_objects": [
    {
      "type": "hero_text",
      "content": "Be the next AI all-star",
      "priority": "high"
    },
    {
      "type": "cta_button",
      "text": "Start free",
      "priority": "high"
    },
    {
      "type": "sketchfab_asset",
      "asset": {"name": "...", "viewerUrl": "..."},
      "priority": "low",
      "note": "Fallback from SketchFab"
    }
  ]
}
```

## Reference Files

- `references/sketchfab-api.md` - SketchFab API endpoints and usage
- `references/unsplash-api.md` - Unsplash API endpoints and usage
- `references/theme-object-limits.md` - Detailed object limit rationale

## Critical Corrections (Reality Check)

⚠️ **IMPORTANT**: Several features documented in this skill are **code-only** (exist in `evaluator.py` but NOT wired up to `evaluate()` and NOT present in output JSON). Do NOT claim these work until verified.

### Code-Only Features (NOT in Actual Output)
1. **SketchFab Integration**: `_search_sketchfab()` method exists, but:
   - Not called during `evaluate()`
   - Results NOT added to `3d_scene_blueprint.json`
   - Needs API keys + wiring to be functional

2. **Unsplash Integration**: `_search_unsplash()` method exists, but:
   - Not called during `evaluate()`
   - Results NOT added to `3d_scene_blueprint.json`
   - Needs API keys + wiring to be functional

3. **Tripo Prep**: `_prepare_for_tripo()` method referenced, but:
   - No `tripo_prep` field in actual output
   - PM responsibility (we have no Tripo credits)
   - Not wired into `evaluate()`

4. **Logo/Text Placement**: `_decide_logo_placement()` + `_decide_text_inclusion()` referenced, but:
   - Not implemented in running evaluator
   - Output contains only basic `3d_objects`

### Actual Verified Output (2026-06-08)
```json
{
  "scene_metadata": {
    "focal_point": "Be the next AI all-star",
    "theme": "e-commerce",
    "max_3d_objects": 4,
    "token_cost_estimate": 200
  },
  "3d_objects": [
    {"type": "hero_text", "content": "...", "priority": "high"},
    {"type": "cta_button", "text": "Start free", "priority": "high"}
  ]
  // NO sketchfab_results, unsplash_results, or tripo_prep
}
```

### Documentation Rules
1. **Verify against codebase**: Never document a feature as "working" unless verified in actual output
2. **Distinguish code-only vs working**: Clearly mark features that exist in code but aren't wired up
3. **No optimistic claims**: If a feature needs API keys/integration, say so explicitly
4. **Test on real sites**: Validate adaptiveness on Wix, WordPress, React apps (not just example.com)
5. **Finish the full job**: Batch related changes, complete ALL before stopping
6. **Update existing files**: When asked to modify a file, update it directly — do NOT create new separate files

## Integration

Add to evaluator.py:
```python
def evaluate(self):
    focal_point = self._identify_focal_point(dna)
    theme = self._identify_theme(dna)
    scene = self._create_efficient_scene(dna, focal_point, theme)
    return scene
```
