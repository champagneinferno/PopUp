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
        """Main evaluation logic - decides what becomes 3D"""
        if not self.profile:
            result = self.load_profile()
            if "error" in result:
                return result
        
        print(f"\n🎨 Evaluator - Creative Director")
        print("=" * 70)
        print(f"Analyzing DNA Profile for: {self.profile['website_profile']['url']}")
        
        dna = self.profile['website_profile']
        
        # Phase 1: Analyze website complexity
        complexity = self._analyze_complexity(dna)
        self.token_usage["complexity_multiplier"] = complexity['multiplier']
        self.token_usage["total_tokens"] *= complexity['multiplier']
        
        # Phase 2: Determine color palette (including implicit from images)
        colors = self._extract_all_colors(dna)
        
        # Phase 3: Decide 3D style based on DNA
        style = self._determine_3d_style(dna, colors)
        
        # Phase 4: Map elements to 3D objects
        scene_blueprint = self._create_scene_blueprint(dna, colors, style)
        
        # Phase 5: Generate token report
        self._update_token_usage(scene_blueprint)
        
        return scene_blueprint
    
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
    
    def _create_scene_blueprint(self, dna, colors, style_decision):
        """Create the 3D scene blueprint"""
        blueprint = {
            "scene_metadata": {
                "source_url": dna['url'],
                "title": dna['title'],
                "style": style_decision['style'],
                "complexity": self.token_usage["complexity_multiplier"],
                "token_cost_estimate": self.token_usage["total_tokens"]
            },
            "environment": {
                "background": self._decide_background(dna, colors),
                "lighting": self._decide_lighting(style_decision['style']),
                "fog": self._decide_fog(style_decision['style'])
            },
            "3d_objects": []
        }
        
        # Process navigation → 3D ring or menu (DEDUPED)
        nav = dna.get('structure', {}).get('navigation', [])
        seen_nav = set()
        unique_nav = []
        for item in nav:
            if item['text'] not in seen_nav:
                seen_nav.add(item['text'])
                unique_nav.append(item)
        
        if unique_nav:
            blueprint['3d_objects'].append({
                "type": "navigation_ring",
                "elements": unique_nav[:6],  # Limit to 6 unique items
                "style": "floating" if style_decision['style'] == 'creative-playful' else "fixed",
                "position": {"x": 0, "y": 1.5, "z": -3}
            })
            self.token_usage['decisions_made'] += 1
        
        # Process hero section → center stage
        hero = dna.get('structure', {}).get('hero_section', {})
        if hero and hero.get('heading'):
            blueprint['3d_objects'].append({
                "type": "hero_text",
                "content": hero['heading'],
                "cta_buttons": hero.get('cta_buttons', []),
                "position": {"x": 0, "y": 0, "z": 0},
                "scale": 1.5 if style_decision['style'] == 'bold-cinematic' else 1.0
            })
            self.token_usage['decisions_made'] += 1
        
        # Process sections → 3D panels (REDUCED)
        sections = dna.get('structure', {}).get('sections', [])
        for idx, section in enumerate(sections[:3]):  # Reduced from 5 to 3
            blueprint['3d_objects'].append({
                "type": "content_panel",
                "heading": section.get('heading', ''),
                "preview": section.get('text_full', section.get('text_preview', '')),  # FULL content, no truncation
                "position": {
                    "x": 0,
                    "y": -1 - (idx * 1.5),
                    "z": -5 - (idx * 2)
                }
            })
            self.token_usage['decisions_made'] += 1
        
        # Process buttons → interactive 3D buttons (REDUCED)
        buttons = dna.get('structure', {}).get('buttons', [])
        visual_buttons = dna.get('visual_dna', {}).get('button_styles', [])
        
        for idx, btn in enumerate(buttons[:3]):  # Reduced from 5 to 3
            btn_3d = {
                "type": "interactive_button",
                "text": btn.get('text', ''),
                "classes": btn.get('classes', []),
                "position": {
                    "x": -1 + (idx * 1),
                    "y": -2,
                    "z": 0
                }
            }
            
            # Match with visual style if available
            if idx < len(visual_buttons):
                vb = visual_buttons[idx]
                btn_3d['visual_style'] = {
                    "bg_color": vb.get('bg_color'),
                    "color": vb.get('color'),
                    "border_radius": vb.get('border_radius')
                }
            
            blueprint['3d_objects'].append(btn_3d)
            self.token_usage['decisions_made'] += 1
        
        # Process images → 3D textures/spheres (REDUCED)
        images = dna.get('assets', {}).get('images', [])
        for idx, img in enumerate(images[:4]):  # Reduced from 8 to 4
            blueprint['3d_objects'].append({
                "type": "image_texture",
                "src": img.get('src', ''),
                "alt": img.get('alt', ''),
                "position": {
                    "x": -1.5 + (idx % 2) * 3,
                    "y": 1,
                    "z": -8 - (idx // 2) * 3
                }
            })
            self.token_usage['decisions_made'] += 1
        
        self.token_usage['total_tokens'] += (self.token_usage['decisions_made'] * 50)
        
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
    
    def save_blueprint(self, blueprint, output_path="3d_scene_blueprint.json"):
        """Save the 3D scene blueprint"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(blueprint, f, indent=2, ensure_ascii=False)
        
        print(f"\n✓ 3D Scene Blueprint saved to: {Path(output_path).absolute()}")
        return output_path


def main():
    profile_path = sys.argv[1] if len(sys.argv) > 1 else "extracted_profile.json"
    
    evaluator = WebsiteEvaluator(profile_path)
    blueprint = evaluator.evaluate()
    
    if "error" in blueprint:
        print(f"Error: {blueprint['error']}")
        sys.exit(1)
    
    # Save blueprint
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
