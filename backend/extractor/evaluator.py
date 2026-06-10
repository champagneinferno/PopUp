#!/usr/bin/env python3
"""
Evaluator - Creative Director for 3D Transformation
Reads extracted DNA profile and decides:
1. Which elements become 3D
2. What style/theme to apply
3. How to layout the 3D scene
"""
import json
import sys
from pathlib import Path
import re

class WebsiteEvaluator:
    def __init__(self, profile_path="extracted_profile.json"):
        self.profile_path = Path(profile_path)
        self.profile = None
        self.token_usage = {
            "base_cost": 50,  # Reduced base tokens
            "complexity_multiplier": 1.0,
            "total_tokens": 0,
            "decisions_made": 0
        }
    
    def load_profile(self):
        """Load extracted DNA profile"""
        if not self.profile_path.exists():
            return {"error": f"Profile not found: {self.profile_path}"}
        
        with open(self.profile_path, 'r', encoding='utf-8') as f:
            self.profile = json.load(f)
        
        self.token_usage["total_tokens"] += self.token_usage["base_cost"]
        return self.profile
    
    def evaluate(self):
        """Main evaluation logic - decides what becomes 3D (EFFICIENT)"""
        if not self.profile:
            result = self.load_profile()
            if "error" in result:
                return result
        
        print(f"\n🎨 Evaluator - Creative Director")
        print("="*70)

        # Support both old (website_profile) and new (layer-based) formats
        if 'website_profile' in self.profile:
            dna = self.profile['website_profile']
        else:
            # New layer-based format: convert to legacy structure for evaluator
            raw = self.profile
            dna = {
                'url': raw.get('url', ''),
                'title': raw.get('meta', {}).get('title', '') or raw.get('url', ''),
                'structure': {
                    'navigation': raw.get('layers', {}).get('branding', {}).get('navigation', []),
                    'hero_section': {
                        'heading': raw.get('layers', {}).get('hero', {}).get('headline', ''),
                        'cta_buttons': raw.get('layers', {}).get('hero', {}).get('cta_buttons', [])
                    },
                    'sections': raw.get('layers', {}).get('content', {}).get('sections', []),
                    'buttons': [],
                    'footer': raw.get('layers', {}).get('footer', {}),
                },
                'assets': {
                    'images': [],
                    'logo': raw.get('layers', {}).get('branding', {}).get('logo', '')
                },
                'visual_dna': {
                    'computed_colors': raw.get('layers', {}).get('branding', {}).get('brand_colors', []),
                    'button_styles': [],
                    'hero_background': {},
                    'nav_styles': raw.get('layers', {}).get('branding', {}).get('nav_styles', {}),
                },
                'meta': raw.get('meta', {}),
                'analysis': {'complexity_score': 5}
            }

        print(f"Analyzing DNA Profile for: {dna.get('url', 'unknown')}")
        
        # Phase 1: Identify FOCAL POINT and THEME
        focal_point = self._identify_focal_point(dna)
        theme = self._identify_theme(dna)
        
        print(f"\n[Focal Point] {focal_point}")
        print(f"[Theme] {theme}")
        
        # Phase 2: Analyze website complexity
        complexity = self._analyze_complexity(dna)
        self.token_usage["complexity_multiplier"] = complexity['multiplier']
        self.token_usage["total_tokens"] *= complexity['multiplier']
        
        # Phase 3: Determine color palette (including implicit from images)
        colors = self._extract_all_colors(dna)
        
        # Phase 4: Decide 3D style based on DNA
        style = self._determine_3d_style(dna, colors)
        
        # Phase 5: Create EFFICIENT scene blueprint (only what's NEEDED)
        scene_blueprint = self._create_efficient_scene(dna, colors, style, focal_point, theme)

        # Add thought process and reasoning to blueprint
        scene_blueprint['_thought_process'] = {
            'focal_point': {
                'value': focal_point,
                'source': 'hero_section.heading' if dna.get('structure', {}).get('hero_section', {}).get('heading') else 'first_section_heading',
                'rationale': 'The hero heading is the first thing visitors see and defines the brand message — it must be the central 3D focal point.'
            },
            'theme': {
                'value': theme,
                'rationale': self._get_theme_rationale(dna, theme),
                'matched_keywords': self._get_theme_keywords(dna)
            },
            'style_decision': style,
            'complexity_analysis': complexity,
            'color_analysis': {
                'explicit_count': len(colors.get('explicit', [])),
                'implicit_count': len(colors.get('implicit', [])),
                'background_source': colors.get('background_source'),
                'explicit_colors': colors.get('explicit', []),
                'implicit_notes': [c.get('note', '') for c in colors.get('implicit', [])],
                'from_images': colors.get('from_images', [])
            },
            'objects_rationale': self._generate_objects_rationale(dna, scene_blueprint.get('3d_objects', []), theme)
        }

        # Include source assets from DNA for visual previews
        scene_blueprint['_source_assets'] = self._get_source_assets(dna)
        
        # Phase 6: Generate token report
        self._update_token_usage(scene_blueprint)
        
        return scene_blueprint
    
    def _identify_focal_point(self, dna):
        """Identify the MAIN focal point of the website (hero heading)"""
        hero = dna.get('structure', {}).get('hero_section', {})
        if hero and hero.get('heading'):
            return hero['heading']
        
        # Fallback: first section heading
        sections = dna.get('structure', {}).get('sections', [])
        if sections and sections[0].get('heading'):
            return sections[0]['heading']
        
        return dna.get('title', 'Untitled')
    
    def _identify_theme(self, dna):
        """Identify the website theme/category"""
        url = dna.get('url', '').lower()
        title = dna.get('title', '').lower()
        desc = dna.get('meta', {}).get('description', '').lower()
        
        combined = f"{url} {title} {desc}"
        
        # Theme detection
        if any(kw in combined for kw in ['shop', 'store', 'commerce', 'product', 'buy', 'sell']):
            return 'e-commerce'
        elif any(kw in combined for kw in ['ai', 'artificial intelligence', 'machine learning', 'agent']):
            return 'ai-technology'
        elif any(kw in combined for kw in ['design', 'creative', 'portfolio', 'studio']):
            return 'design-creative'
        elif any(kw in combined for kw in ['saas', 'software', 'platform', 'cloud']):
            return 'saas-platform'
        elif any(kw in combined for kw in ['blog', 'news', 'article', 'post']):
            return 'content-media'
        else:
                    return 'generic'

    def _get_theme_rationale(self, dna, theme):
        """Explain WHY this theme was chosen"""
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
        """Return the matching keywords that determined the theme"""
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
        """Generate rationale for each 3D object decision"""
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
                    'reasoning': 'Fallback 3D asset from SketchFab when website doesn\'t have enough content objects — low priority filler.',
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
        """Extract actual website assets for visual preview in the viewer"""
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

    def _analyze_complexity(self, dna):
        """Analyze website complexity to estimate token usage"""
        score = dna.get('analysis', {}).get('complexity_score', 5)
        
        # Count elements
        nav_count = len(dna.get('structure', {}).get('navigation', []))
        section_count = len(dna.get('structure', {}).get('sections', []))
        image_count = len(dna.get('assets', {}).get('images', []))
        button_count = len(dna.get('structure', {}).get('buttons', []))
        
        total_elements = nav_count + section_count + image_count + button_count
        
        # Complexity multiplier
        if total_elements < 10:
            multiplier = 1.0
            level = "simple"
        elif total_elements < 30:
            multiplier = 1.5
            level = "moderate"
        else:
            multiplier = 2.5
            level = "complex"
        
        print(f"\n[Complexity Analysis]")
        print(f"  Elements: {total_elements} (nav:{nav_count}, sections:{section_count}, images:{image_count}, buttons:{button_count})")
        print(f"  Complexity: {level} (multiplier: {multiplier}x)")
        
        return {
            'score': score,
            'multiplier': multiplier,
            'level': level,
            'total_elements': total_elements
        }
    
    def _extract_all_colors(self, dna):
        """Extract ALL colors - explicit and implicit (IMPROVED)"""
        colors = {
            "explicit": [],
            "implicit": [],
            "from_images": [],
            "dominant": [],
            "background_source": None
        }
        
        # 1. Explicit colors from computed styles (Playwright)
        visual = dna.get('visual_dna', {})
        explicit = visual.get('computed_colors', [])
        colors['explicit'] = explicit[:10]
        
        # 2. Check for background images (IMPLICIT COLORS)
        hero_bg = visual.get('hero_background', {})
        if hero_bg:
            bg_image = hero_bg.get('background_image')
            bg_color = hero_bg.get('background_color')
            
            # Handle transparent backgrounds
            if bg_color and 'rgba(0, 0, 0, 0)' in bg_color:
                colors['implicit'].append({
                    'source': 'transparent_background',
                    'value': bg_color,
                    'note': 'Background is transparent - check for parent elements with backgrounds'
                })
                colors['background_source'] = 'transparent'
            
            if bg_image and bg_image != 'none':
                # Background is an IMAGE → implicit color
                colors['implicit'].append({
                    'source': 'hero_background_image',
                    'value': bg_image,
                    'note': 'Background is an image - dominant color must be extracted from image',
                    'suggested_extraction': 'Use image analysis to get dominant color'
                })
                colors['background_source'] = 'image'
            elif bg_color and bg_color != 'rgba(0, 0, 0, 0)' and 'transparent' not in bg_color.lower():
                # Background is a solid color
                colors['explicit'].append(bg_color)
                colors['background_source'] = 'solid_color'
        
        # 3. Check meta/OG tags for image hints
        meta = dna.get('meta', {})
        og_image = meta.get('og:image', '')
        if og_image:
            colors['from_images'].append({
                'source': 'og:image',
                'value': og_image,
                'note': 'OG image may contain dominant brand colors'
            })
        
        # 4. Try to detect color from image filenames (basic heuristic)
        images = dna.get('assets', {}).get('images', [])
        for img in images[:5]:
            src = img.get('src', '')
            alt = img.get('alt', '').lower()
            
            # Look for color hints in alt text or filename
            color_keywords = ['blue', 'red', 'green', 'dark', 'light', 'white', 'black']
            for kw in color_keywords:
                if kw in alt or kw in src.lower():
                    colors['implicit'].append({
                        'source': 'image_alt_text',
                        'value': src,
                        'detected_hint': kw,
                        'note': f'Color hint from alt text: {kw}'
                    })
                    break
        
        print(f"\n[Color Analysis]")
        print(f"  Explicit colors (from CSS): {len(colors['explicit'])}")
        print(f"  Implicit colors (from images/bgs): {len(colors['implicit'])}")
        print(f"  Background source: {colors['background_source'] or 'unknown'}")
        
        return colors
    
    def _determine_3d_style(self, dna, colors):
        """Determine 3D style based on website DNA"""
        style_scores = {
            'minimalist': 0,
            'bold-cinematic': 0,
            'tech-corporate': 0,
            'creative-playful': 0,
            'dark-moody': 0
        }
        
        # Check colors
        all_colors = colors['explicit']
        color_str = ' '.join(all_colors).lower()
        
        # Blue colors → tech-corporate
        if 'blue' in color_str or '#00' in color_str or '#33' in color_str or '#66' in color_str:
            style_scores['tech-corporate'] += 3
        
        # Dark colors → dark-moody
        dark_keywords = ['#0', '#1', '#2', 'black', 'dark']
        if any(kw in color_str for kw in dark_keywords):
            style_scores['dark-moody'] += 2
        
        # Check if site has hero section
        structure = dna.get('structure', {})
        if structure.get('hero_section'):
            style_scores['bold-cinematic'] += 2
        
        # Check button styles (from visual DNA)
        visual = dna.get('visual_dna', {})
        button_styles = visual.get('button_styles', [])
        if button_styles:
            # Check for rounded buttons → playful
            for btn in button_styles[:5]:
                radius = btn.get('border_radius', '0px')
                if '50' in radius or '999' in radius:
                    style_scores['creative-playful'] += 1
        
        # Check meta description for keywords
        meta = dna.get('meta', {})
        desc = meta.get('description', '').lower()
        if any(kw in desc for kw in ['innovative', 'creative', 'design', 'art']):
            style_scores['creative-playful'] += 2
        if any(kw in desc for kw in ['business', 'enterprise', 'solution', 'professional']):
            style_scores['tech-corporate'] += 2
        
        # Pick winning style
        winning_style = max(style_scores, key=style_scores.get)
        confidence = style_scores[winning_style]
        
        print(f"\n[3D Style Decision]")
        print(f"  Winning style: {winning_style}")
        print(f"  Confidence: {confidence}/10")
        print(f"  Style scores: {style_scores}")
        
        return {
            'style': winning_style,
            'confidence': confidence,
            'all_scores': style_scores
        }
    
    def _create_efficient_scene(self, dna, colors, style_decision, focal_point, theme):
        """Create EFFICIENT 3D scene - only convert what's NEEDED"""
        
        # THEME-BASED OBJECT LIMITS (efficiency!)
        theme_limits = {
            'e-commerce': 4,      # hero + 2 CTA + 1 product
            'ai-technology': 5,     # hero + 2 CTA + 2 features
            'design-creative': 5,   # hero + 2 CTA + 2 examples
            'saas-platform': 4,      # hero + 2 CTA + 1 feature
            'content-media': 3,      # hero + 1 CTA + 1 article
            'generic': 3              # hero + 1 CTA + 1 section
        }
        
        max_objects = theme_limits.get(theme, 3)
        
        blueprint = {
            "scene_metadata": {
                "source_url": dna['url'],
                "title": dna['title'],
                "style": style_decision['style'],
                "theme": theme,
                "focal_point": focal_point,
                "complexity": self.token_usage["complexity_multiplier"],
                "token_cost_estimate": self.token_usage["total_tokens"],
                "max_3d_objects": max_objects  # EFFICIENCY marker
            },
            "environment": {
                "background": self._decide_background(dna, colors),
                "lighting": self._decide_lighting(style_decision['style']),
                "fog": self._decide_fog(style_decision['style'])
            },
            "3d_objects": []
        }
        
        object_count = 0
        
        # 1. FOCAL POINT → 3D (ALWAYS convert)
        hero = dna.get('structure', {}).get('hero_section', {})
        if hero and hero.get('heading') and object_count < max_objects:
            blueprint['3d_objects'].append({
                "type": "hero_text",
                "content": hero['heading'],
                "cta_buttons": hero.get('cta_buttons', []),
                "position": {"x": 0, "y": 0, "z": 0},
                "scale": 1.5 if style_decision['style'] == 'bold-cinematic' else 1.0,
                "priority": "high"  # Focal point = highest priority
            })
            object_count += 1
            self.token_usage['decisions_made'] += 1
        
        # 2. CTA BUTTONS → 3D (only if present, max 2)
        cta_buttons = hero.get('cta_buttons', [])[:2]  # Max 2 CTA
        if cta_buttons and object_count < max_objects:
            for idx, cta in enumerate(cta_buttons):
                if object_count >= max_objects:
                    break
                blueprint['3d_objects'].append({
                    "type": "cta_button",
                    "text": cta.get('text', ''),
                    "href": cta.get('href', ''),
                    "position": {
                        "x": -1 + (idx * 1),
                        "y": -1,
                        "z": 0
                    },
                    "priority": "high"
                })
                object_count += 1
                self.token_usage['decisions_made'] += 1
        
        # 3. CONTENT SECTIONS → 3D (max 1-2 based on theme)
        sections = dna.get('structure', {}).get('sections', [])
        max_sections = 1 if max_objects <= 3 else 2
        
        for idx, section in enumerate(sections[:max_sections]):
            if object_count >= max_objects:
                break
            
            blueprint['3d_objects'].append({
                "type": "content_panel",
                "heading": section.get('heading', ''),
                "preview": section.get('text_full', section.get('text_preview', ''))[:200],  # Truncate for efficiency
                "position": {
                    "x": 0,
                    "y": -2 - (idx * 1.5),
                    "z": -5 - (idx * 2)
                },
                "priority": "medium"
            })
            object_count += 1
            self.token_usage['decisions_made'] += 1
        
        # 4. SEARCH UNSPLASH for background if needed
        if blueprint['environment']['background']['type'] == 'color':
            unsplash_bg = self._search_unsplash(theme, focal_point)
            if unsplash_bg:
                blueprint['environment']['background'] = {
                    "type": "image",
                    "source": unsplash_bg,
                    "note": "From Unsplash API (free to use)"
                }
        
        # 5. SEARCH SKETCHFAB for 3D assets if needed (fallback)
        if object_count < max_objects:
            sketchfab_assets = self._search_sketchfab(focal_point, limit=1)
            if sketchfab_assets:
                blueprint['3d_objects'].append({
                    "type": "sketchfab_asset",
                    "asset": sketchfab_assets[0],
                    "position": {"x": 2, "y": 0, "z": -3},
                    "priority": "low",
                    "note": "Fallback 3D asset from SketchFab"
                })
                object_count += 1
        
        print(f"\n[Efficiency] Created {object_count} 3D objects (max: {max_objects})")
        print(f"[Theme] {theme} (limit: {max_objects} objects)")
        
        return blueprint
    
    def _decide_background(self, dna, colors):
        """Decide 3D background based on website"""
        visual = dna.get('visual_dna', {})
        hero_bg = visual.get('hero_background', {})
        
        if hero_bg and hero_bg.get('background_image'):
            return {
                "type": "image",
                "source": hero_bg['background_image'],
                "note": "Extracted from website hero background"
            }
        elif colors['explicit']:
            dominant = colors['explicit'][0]
            return {
                "type": "color",
                "value": dominant,
                "note": "From website color palette"
            }
        else:
            return {
                "type": "gradient",
                "colors": ["#06060f", "#1a1a2e"],
                "note": "Default dark gradient"
            }
    
    def _decide_lighting(self, style):
        """Decide lighting based on 3D style"""
        if style == 'dark-moody':
            return {"type": "ambient", "intensity": 0.3, "color": "#4444aa"}
        elif style == 'bold-cinematic':
            return {"type": "spotlight", "intensity": 1.0, "color": "#ffffff"}
        elif style == 'tech-corporate':
            return {"type": "directional", "intensity": 0.7, "color": "#3366cc"}
        else:
            return {"type": "hemisphere", "intensity": 0.5, "color": "#ffffff"}
    
    def _decide_fog(self, style):
        """Decide fog based on style"""
        if style == 'dark-moody':
            return {"enabled": True, "color": "#06060f", "density": 0.05}
        elif style == 'bold-cinematic':
            return {"enabled": False}
        else:
            return {"enabled": True, "color": "#1a1a2e", "density": 0.02}
    
    def _update_token_usage(self, blueprint):
        """Update and report token usage - OPTIMIZED"""
        # More conservative token calculation
        base = 50  # Reduced from 100
        decision_cost = self.token_usage['decisions_made'] * 10  # Reduced from 50
        
        self.token_usage['total_tokens'] = int((base + decision_cost) * self.token_usage['complexity_multiplier'])
        
        print(f"\n[Token Usage Report]")
        print(f"  Base cost: {base} tokens")
        print(f"  Complexity multiplier: {self.token_usage['complexity_multiplier']}x")
        print(f"  Decisions made: {self.token_usage['decisions_made']}")
        print(f"  Decision cost: {decision_cost} tokens (10 per decision)")
        print(f"  TOTAL ESTIMATED TOKENS: {self.token_usage['total_tokens']}")
        
        # Warning if too high
        if self.token_usage['total_tokens'] > 500:
            print(f"  ⚠️  High token usage - consider simplifying")
        else:
            print(f"  ✓ Token usage within reasonable range")
        
        # Add to blueprint
        blueprint['scene_metadata']['token_usage'] = self.token_usage
        blueprint['scene_metadata']['token_cost_estimate'] = self.token_usage['total_tokens']
    
    def _search_sketchfab(self, query, limit=3):
        """Search SketchFab for similar 3D assets (fallback when website assets aren't suitable)"""
        try:
            import requests
            
            # SketchFab public search API (no auth required for search)
            api_url = f"https://api.sketchfab.com/v3/search"
            params = {
                'type': 'models',
                'q': query,
                'count': limit
            }
            
            resp = requests.get(api_url, params=params, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                results = []
                
                for item in data.get('results', [])[:limit]:
                    results.append({
                        'name': item.get('name', ''),
                        'url': item.get('viewerUrl', ''),
                        'thumbnail': item.get('thumbnails', {}).get('images', [{}])[0].get('url', ''),
                        'author': item.get('user', {}).get('username', ''),
                        'polycount': item.get('vertexCount', 0)
                    })
                
                if results:
                    print(f"[SketchFab] Found {len(results)} fallback assets for: {query}")
                    return results
            
            return None
            
        except Exception as e:
            print(f"[SketchFab] Search failed (non-critical): {e}")
            return None
    
    def _search_unsplash(self, theme, query, limit=1):
        """Search Unsplash for free-to-use background images"""
        try:
            import requests
            
            # Unsplash public search (no auth needed for basic access)
            api_url = "https://api.unsplash.com/search/photos"
            params = {
                'query': f"{theme} {query}",
                'per_page': limit,
                'orientation': 'landscape'
            }
            
            # Note: Unsplash requires registration for API access
            # This is a fallback that tries public access
            # For production, you'd need to set UNSPLASH_ACCESS_KEY env var
            
            resp = requests.get(api_url, params=params, timeout=5)
            
            if resp.status_code == 200:
                data = resp.json()
                results = []
                
                for item in data.get('results', [])[:limit]:
                    results.append({
                        'url': item.get('urls', {}).get('regular', ''),
                        'thumb': item.get('urls', {}).get('thumb', ''),
                        'author': item.get('user', {}).get('name', ''),
                        'author_url': item.get('user', {}).get('links', {}).get('html', ''),
                        'download': item.get('links', {}).get('download', '')
                    })
                
                if results:
                    print(f"[Unsplash] Found {len(results)} background images for: {query}")
                    return results[0]['url']  # Return first image URL
            
            # Fallback: try simple Unsplash source (no API key needed)
            simple_url = f"https://source.unsplash.com/1600x900/?{theme},{query}"
            print(f"[Unsplash] Using simple source: {simple_url}")
            return simple_url
            
        except Exception as e:
            print(f"[Unsplash] Search failed (non-critical): {e}")
            return None
    
    def save_blueprint(self, blueprint, output_path="3d_scene_blueprint.json"):
        """Save the 3D scene blueprint"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(blueprint, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ 3D Scene Blueprint saved to: {Path(output_path).absolute()}")
        return output_path


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Website Evaluator for 3D Transformation")
    parser.add_argument("profile", nargs="?", default="extracted_profile.json", help="Path to extraction JSON profile")
    parser.add_argument("--output", "-o", default=None, help="Output path for the 3D blueprint JSON")
    args = parser.parse_args()

    profile_path = args.profile
    evaluator = WebsiteEvaluator(profile_path)
    blueprint = evaluator.evaluate()

    if "error" in blueprint:
        print(f"Error: {blueprint['error']}")
        sys.exit(1)

    # Save blueprint - use --output if provided, else default
    if args.output:
        output_path = args.output
        with open(output_path, 'w') as f:
            json.dump(blueprint, f, indent=2)
        print(f"✓ Blueprint saved to: {output_path}")
    else:
        evaluator.save_blueprint(blueprint)
    
    # Print summary
    print("\n" + "=" * 70)
    print("3D SCENE BLUEPRINT SUMMARY")
    print("=" * 70)
    print(f"Style: {blueprint['scene_metadata']['style']}")
    print(f"Objects to create: {len(blueprint['3d_objects'])}")
    print(f"Estimated tokens: {blueprint['scene_metadata']['token_usage']['total_tokens']}")
    print("\nReady for 3D rendering!")


if __name__ == "__main__":
    main()
