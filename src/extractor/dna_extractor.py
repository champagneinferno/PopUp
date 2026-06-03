#!/usr/bin/env python3
"""
Main Brain Orchestrator - Website DNA Sequencer
Combines Structure + Visual DNA extractors into unified profile
"""
import json
import subprocess
import sys
import os
import argparse
from pathlib import Path
import subprocess as sp

# Fix import path so we can find sibling modules
sys.path.insert(0, str(Path(__file__).parent))

# Import our structure extractor
from structure_extractor import StructureExtractor

def get_git_commit_hash():
    """Get current git commit hash for code version tracking"""
    try:
        result = sp.run(['git', 'rev-parse', '--short', 'HEAD'], 
                      capture_output=True, text=True, cwd=Path(__file__).parent.parent.parent)
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        pass
    return "unknown"

class WebsiteDNASequencer:
    def __init__(self, url):
        self.url = url
        self.project_root = Path(__file__).parent.parent.parent
        self.visual_extractor_path = self.project_root / "src" / "extractor" / "visual_extractor.cjs"
        self.code_version = get_git_commit_hash()
        
    def sequence_dna(self):
        """Run full DNA extraction sequence"""
        print(f"\n🧬 Starting Website DNA Sequencer for: {self.url}")
        print("=" * 70)
        
        # Phase 1: Structure Extraction (BeautifulSoup)
        print("\n[Phase 1/3] Extracting Structure DNA (BeautifulSoup)...")
        structure_data = self._extract_structure()
        
        if "error" in structure_data:
            print(f"❌ Structure extraction failed: {structure_data['error']}")
            return {"error": "Structure extraction failed"}
        
        print(f"✓ Found: {len(structure_data.get('navigation', []))} nav items, "
              f"{len(structure_data.get('sections', []))} sections, "
              f"{len(structure_data.get('images', []))} images")
        
        # Phase 2: Visual DNA Extraction (Playwright)
        print("\n[Phase 2/3] Extracting Visual DNA (Playwright)...")
        visual_data = self._extract_visual()
        
        if "error" in visual_data:
            print(f"⚠️  Visual extraction warning: {visual_data['error']}")
            visual_data = {"warning": visual_data["error"]}
        else:
            print(f"✓ Found: {len(visual_data.get('computed_colors', []))} colors, "
                  f"{len(visual_data.get('background_images', []))} background images, "
                  f"{len(visual_data.get('fonts_used', []))} fonts")
        
        # Phase 3: Merge & Analyze
        print("\n[Phase 3/3] Merging DNA & Building Profile...")
        profile = self._merge_dna(structure_data, visual_data)
        
        print(f"✓ DNA Profile complete!")
        print("=" * 70)
        
        return profile
    
    def _extract_structure(self):
        """Run BeautifulSoup structure extractor"""
        try:
            extractor = StructureExtractor(self.url)
            return extractor.extract_all()
        except Exception as e:
            return {"error": str(e)}
    
    def _extract_visual(self):
        """Run Playwright visual extractor via Node.js"""
        try:
            # Ensure visual_extractor.js exists
            if not self.visual_extractor_path.exists():
                return {"error": f"Visual extractor not found at {self.visual_extractor_path}"}
            
            # Run Node.js script
            result = subprocess.run(
                ["node", str(self.visual_extractor_path), self.url],
                capture_output=True,
                text=True,
                timeout=60,
                cwd=str(self.project_root)
            )
            
            if result.returncode != 0:
                return {"error": result.stderr or "Visual extraction failed"}
            
            # Parse JSON output (only from stdout)
            output = result.stdout.strip()
            if not output:
                return {"error": "No output from visual extractor"}
            
            return json.loads(output)
            
        except subprocess.TimeoutExpired:
            return {"error": "Visual extraction timed out (60s)"}
        except json.JSONDecodeError as e:
            return {"error": f"Failed to parse visual extraction output: {e}"}
        except Exception as e:
            return {"error": str(e)}
    
    def _merge_dna(self, structure, visual):
        """Merge structure + visual into unified Website DNA Profile (IMPROVED for JS-heavy sites)"""
        
        # IMPROVED: Check if Playwright found structural data
        rendered_nav = visual.get('rendered_nav', [])
        rendered_headings = visual.get('rendered_headings', [])
        rendered_buttons = visual.get('rendered_buttons', [])
        rendered_sections = visual.get('rendered_sections', [])
        
        # Use rendered data if BeautifulSoup found nothing
        nav_data = structure.get('navigation', [])
        if not nav_data and rendered_nav:
            nav_data = rendered_nav
            print(f"[Merge] Using Playwright-rendered nav: {len(rendered_nav)} items")
        
        # For sections, use rendered if available
        section_data = structure.get('sections', [])
        if not section_data and rendered_sections:
            section_data = rendered_sections
            print(f"[Merge] Using Playwright-rendered sections: {len(rendered_sections)} items")
        
        # For buttons, supplement with rendered data
        button_data = structure.get('buttons', [])
        if not button_data and rendered_buttons:
            # Convert rendered button texts to button objects
            button_data = [{"text": text, "tag": "button", "classes": [], "href": ""} 
                          for text in rendered_buttons[:10]]
            print(f"[Merge] Using Playwright-rendered buttons: {len(rendered_buttons)} items")
        
        # Build comprehensive profile
        profile = {
            "website_profile": {
                "url": self.url,
                "title": structure.get("title", ""),
                "extraction_timestamp": self._get_timestamp(),
                "extraction_metadata": {
                    "code_version": self.code_version,
                    "extractor_version": "1.0"
                },
                
                # Brand DNA
                "brand_dna": {
                    "color_palette": self._extract_color_palette(visual),
                    "fonts": self._merge_fonts(structure, visual),
                    "style_vibe": self._detect_style_vibe(structure, visual)
                },
                
                # Structure (use best available data)
                "structure": {
                    "navigation": nav_data,
                    "hero_section": self._get_hero_from_data(structure, rendered_headings),
                    "sections": section_data,
                    "footer": structure.get("footer", {}),
                    "buttons": button_data
                },
                
                # Visual Elements
                "visual_dna": {
                    "hero_background": visual.get("hero_background"),
                    "background_images": visual.get("background_images", []),
                    "computed_colors": visual.get("computed_colors", []),
                    "button_styles": visual.get("button_styles", []),
                    "layout_structure": visual.get("layout_structure", {})
                },
                
                # Assets (use best available data - CONTEXTUAL)
                "assets": {
                    "favicon": structure.get("assets", {}).get("favicon", ""),
                    "logo": self._get_best_logo(structure, visual),
                    "images": (structure.get("images", []) or visual.get('rendered_images', []))[:20],
                    "stylesheets": structure.get("assets", {}).get("stylesheets", [])
                },
                
                # Meta & SEO
                "meta": structure.get("meta", {}),
                
                # Analysis
                "analysis": {
                    "has_dynamic_content": self._detect_dynamic_content(structure),
                    "complexity_score": self._calculate_complexity(structure, visual),
                    "recommended_3d_style": self._recommend_3d_style(structure, visual)
                }
            }
        }
        
        return profile
    
    def _get_hero_from_data(self, structure, rendered_headings):
        """Get hero section from available data (structure or rendered)"""
        # First check if structure already has hero
        hero = structure.get('hero_section', {})
        if hero and hero.get('heading'):
            return hero
        
        # If no hero in structure, check rendered headings
        if rendered_headings and len(rendered_headings) > 0:
            # Use first h1 as hero
            h1 = rendered_headings[0]
            if h1.get('level') == 'h1':
                return {
                    'heading': h1.get('text', ''),
                    'selector': 'rendered_h1',
                    'cta_buttons': []
                }
        
        # No hero found
        return {}
    
    def _get_best_logo(self, structure, visual):
        """Get the best available logo (structure first, then visual fallback)"""
        # Method1: From structure extraction
        logo = structure.get("assets", {}).get("logo", "")
        if logo and 'svg-logo' not in logo:  # Don't use placeholder SVG markers
            return logo
        
        # Method2: From visual extraction (Playwright-rendered)
        rendered_logo = visual.get("rendered_logo")
        if rendered_logo:
            logo_type = rendered_logo.get("type", "img")
            logo_src = rendered_logo.get("src", "")
            
            # For SVG logos, return a special marker with selector info
            if logo_type == "svg":
                print(f"[Merge] Using SVG logo: {rendered_logo.get('selector', 'unknown')}")
                # Return the selector so evaluator can find the SVG
                return f"svg-logo:{rendered_logo.get('selector', 'svg')}"
            
            # For img logos, return the src if valid
            if logo_src and logo_src not in ["", "https://www.youtube.com/", "svg-logo-detected"]:
                print(f"[Merge] Using Playwright-rendered logo: {rendered_logo.get('selector', 'unknown')}")
                return logo_src
        
        # Method3: Check rendered_images for likely logo
        rendered_images = visual.get("rendered_images", [])
        for img in rendered_images[:5]:  # Check first 5 images
            src = img.get("src", "")
            alt = img.get("alt", "").lower()
            # Heuristic: logo often has "logo" in alt or filename
            if "logo" in alt or "logo" in src.lower():
                return src
        
        return ""
    
    def _extract_color_palette(self, visual):
        """Extract dominant colors from visual data"""
        colors = visual.get("computed_colors", [])
        
        # Filter and clean colors
        clean_colors = []
        for color in colors:
            if color and color not in clean_colors:
                # Keep only interesting colors (not black/white/grey)
                clean_colors.append(color)
        
        return clean_colors[:10]  # Top 10 colors
    
    def _merge_fonts(self, structure, visual):
        """Merge fonts from both extractors"""
        fonts = set()
        
        # From structure (Google Fonts links)
        for font in structure.get("fonts", []):
            fonts.add(font)
        
        # From visual (computed styles)
        import re
        for font in visual.get("fonts_used", []):
            # Clean font string - remove quotes and split by comma
            clean = re.sub(r'[\'"\\\\]', '', font.split(',')[0]).strip()
            if clean:
                fonts.add(clean)
        
        return list(fonts)[:10]
    
    def _detect_style_vibe(self, structure, visual):
        """Analyze the website's style vibe"""
        vibe_indicators = []
        
        # Check colors
        colors = visual.get("computed_colors", [])
        if any("blue" in c.lower() or "#00" in c.lower() or "#33" in c.lower() for c in colors):
            vibe_indicators.append("blue-themed")
        
        # Check layout
        layout = visual.get("layout_structure", {})
        if layout.get("has_hero"):
            vibe_indicators.append("hero-focused")
        
        # Check buttons
        buttons = visual.get("button_styles", [])
        if buttons:
            vibe_indicators.append("interactive")
        
        return vibe_indicators if vibe_indicators else ["minimalist"]
    
    def _detect_dynamic_content(self, structure):
        """Check if site likely uses JavaScript heavily"""
        meta = structure.get("meta", {})
        
        # Check for React/JS framework hints
        hints = ["__INITIAL_STATE__", "root.render", "createRoot"]
        # This is simplified - would need to check actual HTML
        
        return len(structure.get("assets", {}).get("scripts", [])) > 5
    
    def _calculate_complexity(self, structure, visual):
        """Calculate website complexity score (1-10)"""
        score = 0
        
        score += min(len(structure.get("navigation", [])), 5)
        score += min(len(structure.get("sections", [])), 3)
        score += min(len(visual.get("computed_colors", [])), 5)
        score += 1 if visual.get("hero_background") else 0
        
        return min(score, 10)
    
    def _recommend_3d_style(self, structure, visual):
        """Recommend 3D transformation style"""
        vibe = self._detect_style_vibe(structure, visual)
        
        if "hero-focused" in vibe:
            return "cinematic-flythrough"
        elif "minimalist" in vibe:
            return "clean-layered"
        else:
            return "interactive-explorer"
    
    def _get_timestamp(self):
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()


def main():
    parser = argparse.ArgumentParser(description='Website DNA Sequencer')
    parser.add_argument('--url', required=True, help='Website URL to extract')
    parser.add_argument('--output', default='extracted_profile.json', help='Output JSON file path')
    args = parser.parse_args()
    
    url = args.url
    output_path = args.output
    
    sequencer = WebsiteDNASequencer(url)
    profile = sequencer.sequence_dna()
    
    # Output unified JSON profile
    print("\n" + "=" * 70)
    print("WEBSITE DNA PROFILE (JSON Output):")
    print("=" * 70)
    print(json.dumps(profile, indent=2, ensure_ascii=False))
    
    # Save to file for 3D app consumption
    output_file = Path(output_path)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(profile, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Profile saved to: {output_file.absolute()}")
    print("\n🎨 Ready for 3D Transformation!")


if __name__ == "__main__":
    main()
