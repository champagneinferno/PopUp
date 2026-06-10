#!/usr/bin/env python3
"""
Structure Extractor - BeautifulSoup-based (Skill-Guided)
Extracts: HTML skeleton, navigation, sections, assets, links

NOW LOADS SKILL: skills/extractor/website-dna-extraction.md
Follows user preferences and patterns from the skill file
"""
import re
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import os
from pathlib import Path

class StructureExtractor:
    def __init__(self, url):
        self.url = self._normalize_url(url)
        self.domain = urlparse(self.url).netloc
        self.soup = None
        self.raw_html = ""
        
        # Load skill for guidance
        self.skill_data = self._load_skill()
    
    def _load_skill(self):
        """Load skill file for extraction guidance"""
        skill_path = Path(__file__).parent.parent.parent / "skills" / "extractor" / "website-dna-extraction.md"
        if skill_path.exists():
            print(f"[StructureExtractor] Loaded skill: {skill_path}")
            return {"path": str(skill_path), "loaded": True}
        else:
            print(f"[StructureExtractor] Warning: Skill not found at {skill_path}")
            return {"loaded": False}
        
    def _normalize_url(self, url):
        """Strip to root homepage"""
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}"
    
    def fetch(self):
        """Fetch static HTML"""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        try:
            resp = requests.get(self.url, headers=headers, timeout=20)
            resp.raise_for_status()
            self.raw_html = resp.text
            self.soup = BeautifulSoup(self.raw_html, 'html.parser')
            return True
        except Exception as e:
            print(f"[StructureExtractor] Fetch failed: {e}")
            return False
    
    def extract_all(self):
        """Run all extraction methods with SMART fallbacks"""
        if not self.soup:
            if not self.fetch():
                return {"error": "Failed to fetch URL"}
        
        # SMART EXTRACTION: Try multiple strategies for each critical piece
        nav = self._extract_navigation_smart()
        logo = self._extract_logo_smart()
        sections = self._extract_sections_smart()
        buttons = self._extract_buttons_smart()
        footer = self._extract_footer_smart()
        images = self._extract_images_smart()
        
        return {
            "url": self.url,
            "domain": self.domain,
            "title": self._extract_title(),
            "meta": self._extract_meta(),
            "navigation": nav,
            "hero_section": self._extract_hero(),
            "sections": sections,
            "buttons": buttons,
            "images": images,
            "footer": footer,
            "color_hints": self._extract_color_hints_smart(),
            "fonts": self._extract_fonts(),
            "assets": {
                "favicon": self._extract_favicon(),
                "logo": logo,
                "images": images[:30],
                "stylesheets": self._extract_stylesheets()
            }
        }
    
    def _extract_title(self):
        if self.soup.title and self.soup.title.string:
            return self.soup.title.string.strip()
        return ""
    
    def _extract_meta(self):
        """Extract meta tags"""
        meta = {}
        for tag in self.soup.find_all("meta"):
            key = tag.get("name") or tag.get("property") or ""
            content = tag.get("content", "")
            if key and content:
                meta[key] = content
        return meta
    
    def _extract_logo_smart(self):
        """Extract logo with MULTIPLE aggressive strategies"""
        logo = None
        
        # Strategy 1: Standard logo selectors
        for selector in ['img[class*="logo" i]', 'img[id*="logo" i]', 'img[alt*="logo" i]',
                       'a[class*="logo" i] img', 'div[class*="logo" i] img',
                       'header img', 'nav img', '[role="banner"] img']:
            img = self.soup.select_one(selector)
            if img and img.get('src'):
                src = img['src']
                if not src.startswith('data:') and 'bg' not in src.lower():
                    logo = urljoin(self.url, src)
                    print(f"[Logo] Found via: {selector}")
                    break
        
        # Strategy 2: First image in header/nav area
        if not logo:
            for container in ['header', 'nav', '[role="banner"]', '.header', '#header']:
                elem = self.soup.select_one(container)
                if elem:
                    img = elem.select_one('img[src]')
                    if img and img.get('src'):
                        logo = urljoin(self.url, img['src'])
                        print(f"[Logo] Found in: {container}")
                        break
        
        # Strategy 3: Favicon as fallback
        if not logo:
            favicon = self.soup.select_one('link[rel*="icon" i]')
            if favicon and favicon.get('href'):
                logo = urljoin(self.url, favicon['href'])
                print(f"[Logo] Using favicon")
        
        # Strategy 4: First reasonable image on page
        if not logo:
            for img in self.soup.find_all('img', src=True):
                src = img['src']
                if src and not src.startswith('data:') and len(src) > 10:
                    logo = urljoin(self.url, src)
                    print(f"[Logo] Using first image")
                    break
        
        # Strategy 5: Check for SVG logos
        if not logo:
            svg = self.soup.select_one('svg[class*="logo" i], svg[id*="logo" i], a[href="/"] svg')
            if svg:
                logo = 'svg-logo-detected'
                print(f"[Logo] SVG detected")
        
        return logo or ""
    
    def _extract_navigation_smart(self):
        """Extract navigation with multiple strategies"""
        nav_items = []
        
        # Strategy 1: Standard nav/header selectors
        nav_containers = self.soup.select('nav, header, [role="navigation"], .nav, .navbar, #nav')
        for container in nav_containers:
            links = container.select('a[href]')
            for link in links:
                text = link.get_text(strip=True)
                href = link['href']
                if text and href and len(text) < 50:
                    nav_items.append({
                        "text": text,
                        "url": urljoin(self.url, href),
                        "location": "nav"
                    })
        
        # Strategy 2: Any links in top of page (first 500 chars of HTML)
        if len(nav_items) < 3:
            for link in self.soup.find_all('a', href=True)[:20]:
                text = link.get_text(strip=True)
                href = link['href']
                if text and len(text) < 30 and href.startswith(('http', '/', '#')):
                    nav_items.append({
                        "text": text,
                        "url": urljoin(self.url, href),
                        "location": "nav-generic"
                    })
        
        # Strategy 3: Menu-like structures (ul > li > a)
        if len(nav_items) < 3:
            for ul in self.soup.select('ul, .menu, .navigation'):
                links = ul.select('a[href]')
                for link in links:
                    text = link.get_text(strip=True)
                    if text and len(text) < 50:
                        nav_items.append({
                            "text": text,
                            "url": urljoin(self.url, link['href']),
                            "location": "nav-menu"
                        })
        
        # DEDUPLICATION: Remove duplicates based on text+url combination
        seen = set()
        unique_nav = []
        for item in nav_items:
            key = (item['text'], item['url'])
            if key not in seen:
                seen.add(key)
                unique_nav.append(item)
        
        return unique_nav[:15]
    
    def _extract_sections_smart(self):
        """Extract sections with content (relentless)"""
        sections = []
        seen = set()  # DEDUP: Track section headings
        
        # Strategy 1: Standard section tags
        for idx, section in enumerate(self.soup.find_all(['section', 'div'], class_=re.compile(r'section|feature|about|service|hero|banner', re.I))):
            heading = section.find(['h1', 'h2', 'h3'])
            if heading:
                heading_text = heading.get_text(strip=True)
                # DEDUP: Only add if heading not seen
                if heading_text and heading_text not in seen:
                    seen.add(heading_text)
                    full_text = section.get_text(strip=True)
                    sections.append({
                        "id": f"section_{idx}",
                        "heading": heading_text,
                        "class": section.get("class", []),
                        "text_full": full_text,
                        "text_preview": full_text[:200] if len(full_text) > 200 else full_text,
                        "html_snippet": str(section)[:500]
                    })
        
        # Strategy 2: Any element with a heading
        if len(sections) < 3:
            for idx, elem in enumerate(self.soup.find_all(['div', 'article', 'main'])):
                heading = elem.find(['h1', 'h2', 'h3', 'h4'])
                if heading:
                    heading_text = heading.get_text(strip=True)
                    full_text = elem.get_text(strip=True)
                    # DEDUP: Only add if heading not seen AND meaningful content
                    if heading_text and heading_text not in seen and len(full_text) > 50:
                        seen.add(heading_text)
                        sections.append({
                            "id": f"section_dynamic_{idx}",
                            "heading": heading_text,
                            "class": elem.get("class", []),
                            "text_full": full_text,
                            "text_preview": full_text[:200] if len(full_text) > 200 else full_text,
                            "html_snippet": str(elem)[:500]
                        })
        
        return sections[:10]
    
    def _extract_buttons_smart(self):
        """Extract buttons with ALL possible URL sources"""
        buttons = []
        seen = set()  # DEDUPLICATION: Track (text, href) pairs
        
        # Strategy 1: Standard button selectors
        for btn in self.soup.select('button, a, input[type="button"], input[type="submit"]', class_=re.compile(r'btn|button|cta', re.I)):
            text = btn.get_text(strip=True)
            if not text or len(text) >= 50:
                continue
            
            href = ""
            
            # Source 1: Standard href
            if btn.name == 'a':
                href = btn.get('href', '')
            # Source 2: onclick attribute
            elif btn.name == 'button':
                onclick = btn.get('onclick', '')
                if onclick:
                    # Try multiple JS patterns
                    for pattern in [r'window\.location\s*=\s*["\']([^"\']+)["\']',
                                   r'window\.open\s*\(\s*["\']([^"\']+)["\']',
                                   r'location\.href\s*=\s*["\']([^"\']+)["\']']:
                        match = re.search(pattern, onclick)
                        if match:
                            href = match.group(1)
                            break
                    if not href:
                        href = '(js-handled)'
                
                # Source 3: Form action
                if not href:
                    parent_form = btn.find_parent('form')
                    if parent_form and parent_form.get('action'):
                        href = parent_form['action']
                    else:
                        btn_type = btn.get('type', '')
                        if btn_type == 'submit':
                            href = '(form-submit)'
            
            # Source 4: Data attributes
            data_url = btn.get('data-url') or btn.get('data-href') or btn.get('data-link')
            if data_url:
                href = data_url
            
            # Source 5: Nested <a> tag
            if not href and btn.name == 'button':
                nested_a = btn.select_one('a[href]')
                if nested_a:
                    href = nested_a['href']
            
            # Build absolute URL
            if href and href not in ['(js-handled)', '(form-submit)']:
                href = urljoin(self.url, href)
            
            # DEDUP: Only add if (text, href) pair not seen
            if (text, href) not in seen:
                seen.add((text, href))
                buttons.append({
                    "text": text,
                    "tag": btn.name,
                    "classes": btn.get("class", []),
                    "href": href
                })
        
        return buttons[:20]
    
    def _extract_footer_smart(self):
        """Extract footer with multiple strategies"""
        footer = {"links": [], "text": "", "social_links": []}
        
        # Strategy 1: Standard footer tag
        footer_elem = self.soup.find('footer')
        
        # Strategy 2: Footer-like classes
        if not footer_elem:
            footer_elem = self.soup.find(class_=re.compile(r'footer|site-footer|page-footer', re.I))
        
        # Strategy 3: Elements with copyright/legal content
        if not footer_elem:
            for elem in self.soup.find_all(['div', 'section', 'nav']):
                text = elem.get_text(strip=True).lower()
                if any(keyword in text for keyword in ["copyright", "©", "privacy policy", "terms of service"]):
                    footer_elem = elem
                    break
        
        # Strategy 4: Last div with multiple links
        if not footer_elem:
            all_divs = self.soup.find_all(['div', 'nav', 'section'])
            if all_divs:
                for elem in all_divs[-5:]:
                    links = elem.find_all('a', href=True)
                    if len(links) >= 3:
                        footer_elem = elem
                        break
        
        if footer_elem:
            # Extract links
            links = footer_elem.find_all('a', href=True)
            footer["links"] = [
                {"text": a.get_text(strip=True), "url": urljoin(self.url, a['href'])}
                for a in links[:15] if a.get_text(strip=True)
            ]
            
            # Extract social links
            social_patterns = re.compile(r'facebook|twitter|instagram|linkedin|tiktok|youtube|social', re.I)
            social_links = footer_elem.find_all('a', href=social_patterns)
            footer["social_links"] = [
                {"platform": a.get('href', ''), "url": urljoin(self.url, a['href'])}
                for a in social_links[:10]
            ]
            
            # Get footer text
            footer["text"] = footer_elem.get_text(strip=True)[:500]
        
        return footer
    
    def _extract_images_smart(self):
        """Extract images with context AND classification"""
        images = []
        
        for img in self.soup.find_all('img', src=True):
            src = img['src']
            if src and not src.startswith('data:'):
                # CLASSIFY the image
                image_type = self._classify_image(img)
                
                images.append({
                    "src": urljoin(self.url, src),
                    "alt": img.get('alt', ''),
                    "class": img.get('class', []),
                    "type": image_type  # NEW: content, background, or ui
                })
        
        return images[:30]
    
    def _classify_image(self, img_elem):
        """Classify image as content, background, or ui (icons/buttons/logos)"""
        src = img_elem.get('src', '').lower()
        alt = img_elem.get('alt', '').lower()
        classes = ' '.join(img_elem.get('class', [])).lower()
        parent_classes = ''
        if img_elem.parent:
            parent_classes = ' '.join(img_elem.parent.get('class', [])).lower()
        
        # BACKGROUND images
        if any(kw in classes for kw in ['bg', 'background', 'hero', 'cover']):
            return 'background'
        if 'background-image' in img_elem.get('style', '').lower():
            return 'background'
        
        # UI images (icons, buttons, logos)
        ui_keywords = ['icon', 'logo', 'button', 'btn', 'arrow', 'chevron', 'close', 'menu', 'hamburger']
        if any(kw in src for kw in ui_keywords):
            return 'ui'
        if any(kw in alt for kw in ui_keywords):
            return 'ui'
        if any(kw in classes for kw in ui_keywords):
            return 'ui'
        if any(kw in parent_classes for kw in ['nav', 'menu', 'header', 'footer']):
            return 'ui'
        
        # Content images (everything else)
        return 'content'
    
    def _extract_color_hints_smart(self):
        """Extract colors from ALL possible sources"""
        colors = set()
        
        # From inline styles
        for elem in self.soup.find_all(style=True):
            style = elem['style']
            hex_colors = re.findall(r'#([0-9a-fA-F]{3,6})', style)
            colors.update(hex_colors)
        
        # From style tags
        for style_tag in self.soup.find_all('style'):
            if style_tag.string:
                hex_colors = re.findall(r'#([0-9a-fA-F]{3,6})', style_tag.string)
                colors.update(hex_colors)
        
        return list(colors)[:20]
    
    def _extract_favicon(self):
        """Extract favicon URL"""
        favicon = self.soup.select_one('link[rel*="icon" i]')
        if favicon and favicon.get('href'):
            return urljoin(self.url, favicon['href'])
        return ""
    
    def _extract_stylesheets(self):
        """Extract stylesheet URLs"""
        stylesheets = []
        for link in self.soup.find_all('link', rel='stylesheet', href=True):
            stylesheets.append(urljoin(self.url, link['href']))
        return stylesheets[:10]
        meta = {}
        for tag in self.soup.find_all("meta"):
            key = tag.get("name") or tag.get("property") or ""
            val = tag.get("content", "")
            if key and val:
                meta[key] = val[:300]
        return meta
    
    def _extract_navigation(self):
        nav_elements = []
        seen = set()  # DEDUPLICATION: Track (text, url) pairs
        
        # Try nav tags (standard sites)
        for nav in self.soup.find_all(['nav', 'header']):
            links = nav.find_all('a', href=True)
            for link in links:
                text = link.get_text(strip=True)
                href = urljoin(self.url, link['href'])
                # DEDUP: Only add if (text, url) pair not seen
                if text and len(text) < 50 and (text, href) not in seen:
                    seen.add((text, href))
                    nav_elements.append({
                        "text": text,
                        "url": href,
                        "location": "nav"
                    })
        
        # Try common nav classes/ids
        for elem in self.soup.select('.nav, .navbar, .menu, #nav, #menu, [role="navigation"]'):
            links = elem.find_all('a', href=True)
            for link in links:
                text = link.get_text(strip=True)
                href = urljoin(self.url, link['href'])
                if text and len(text) < 50 and (text, href) not in seen:
                    seen.add((text, href))
                    nav_elements.append({
                        "text": text,
                        "url": href,
                        "location": "nav-class"
                    })
        
        # IMPROVED: Try generic selectors for JS-heavy sites (React, etc.)
        for elem in self.soup.select('[role="navigation"], [aria-label*="nav"], [class*="nav"], [class*="menu"]'):
            links = elem.find_all('a', href=True)
            for link in links:
                text = link.get_text(strip=True)
                href = urljoin(self.url, link['href'])
                if text and len(text) < 50 and (text, href) not in seen:
                    seen.add((text, href))
                    nav_elements.append({
                        "text": text,
                        "url": href,
                        "location": "nav-generic"
                    })
        
        # Try to find any links in header-like divs
        header_divs = self.soup.select('div[class*="header"], div[id*="header"], header')
        for div in header_divs:
            links = div.find_all('a', href=True)
            for link in links:
                text = link.get_text(strip=True)
                href = urljoin(self.url, link['href'])
                # DEDUP: Also check text not in [n['text'] for n in nav_elements]
                if text and len(text) < 50 and (text, href) not in seen:
                    seen.add((text, href))
                    nav_elements.append({
                        "text": text,
                        "url": href,
                        "location": "header-div"
                    })
        
        return nav_elements[:15]  # Limit to 15 items
    
    def _extract_hero(self):
        """Find hero/main section AND capture CTA buttons (AGGRESSIVE version)"""
        hero = {}
        hero_elem = None
        
        # Strategy 1: Standard hero selectors
        hero_selectors = [
            "section.hero", "div.hero", ".jumbotron", 
            "header", "section.banner", ".banner",
            "[class*='hero']", "[class*='Hero']", "[class*='banner']"
        ]
        
        for selector in hero_selectors:
            elem = self.soup.select_one(selector)
            if elem:
                h1 = elem.find("h1")
                if h1:
                    hero["heading"] = h1.get_text(strip=True)
                    hero["selector"] = selector
                    hero_elem = elem
                    break
        
        # Strategy 2: Find first h1 and get its parent section (AGGRESSIVE - go up multiple levels)
        if not hero.get("heading"):
            h1 = self.soup.find("h1")
            if h1:
                hero["heading"] = h1.get_text(strip=True)
                hero["selector"] = "h1 (fallback)"
                # AGGRESSIVE: Go up multiple levels to find the main container
                hero_elem = h1
                for _ in range(5):  # Go up to 5 levels up
                    hero_elem = hero_elem.find_parent(['section', 'div', 'header', 'main', 'article'])
                    if hero_elem:
                        # Check if this element has multiple children (likely a section container)
                        if len(hero_elem.find_all(['a', 'button'])) > 0:
                            break  # Found a container with buttons
                print(f"[Hero] Traversed up to find container: {hero_elem.name if hero_elem else 'None'}")
        
        # Strategy 3: If still no hero, use the first section with content
        if not hero_elem:
            for section in self.soup.find_all(['section', 'div']):
                if section.find('h1'):
                    hero_elem = section
                    hero["heading"] = section.find('h1').get_text(strip=True)
                    hero["selector"] = "first-section-with-h1"
                    break
        
        # CAPTURE CTA BUTTONS FROM HERO SECTION (AGGRESSIVE)
        cta_buttons = []
        
        if hero_elem:
            print(f"[Hero] Found hero element: {hero_elem.name} with classes {hero_elem.get('class', [])}")
            
            # Method 1: Direct links with href
            for link in hero_elem.select("a[href]"):
                text = link.get_text(strip=True)
                if text and len(text) < 50:
                    cta_buttons.append({
                        "text": text,
                        "href": link['href']
                    })
            
            # Method 2: Buttons with onclick or JS handlers
            if len(cta_buttons) == 0:
                for btn in hero_elem.select("button, [onclick], [data-href], [data-link]"):
                    text = btn.get_text(strip=True)
                    if text and len(text) < 50:
                        # Try to extract href from various sources
                        href = btn.get('data-href', '') or btn.get('data-link', '') or ''
                        if not href and btn.get('onclick'):
                            # Try to extract URL from onclick
                            import re
                            url_match = re.search(r"(?:window\.)?location\.?(?:href)?\s*=\s*['\"]([^'\"]+)['\"]", btn['onclick'])
                            if url_match:
                                href = url_match.group(1)
                        cta_buttons.append({
                            "text": text,
                            "href": href
                        })
            
            # Method 3: Look for any clickable element with text
            if len(cta_buttons) == 0:
                for elem in hero_elem.find_all(['a', 'button', 'div', 'span'], string=True):
                    text = elem.get_text(strip=True)
                    if text and 5 < len(text) < 30:
                        href = elem.get('href', '') or elem.get('data-href', '') or ''
                        cta_buttons.append({
                            "text": text,
                            "href": href
                        })
            
            print(f"[Hero] Found {len(cta_buttons)} CTA buttons")
        else:
            print("[Hero] WARNING: No hero element found")
        
        hero["cta_buttons"] = cta_buttons[:5]
        return hero
    
    def _extract_sections(self):
        sections = []
        
        # Find all section tags and divs with section-like classes
        for idx, section in enumerate(self.soup.find_all(["section", "div"], class_=re.compile("section|feature|about|service|hero|banner", re.I))):
            heading = section.find(["h1", "h2", "h3"])
            if heading:
                # Extract FULL text content (not just preview)
                full_text = section.get_text(strip=True)
                
                sections.append({
                    "id": f"section_{idx}",
                    "heading": heading.get_text(strip=True),
                    "class": section.get("class", []),
                    "text_full": full_text,  # FULL content
                    "text_preview": full_text[:200] if len(full_text) > 200 else full_text,
                    "html_snippet": str(section)[:500]  # Keep some HTML structure
                })
        
        return sections[:10]
    
    def _extract_buttons(self):
        """Extract buttons with contextual URL detection (IMPROVED)"""
        buttons = []
        
        # Find all button-like elements (expanded selectors)
        for btn in self.soup.find_all(["button", "a", "input"], class_=re.compile(r"btn|button|cta", re.I)):
            text = btn.get_text(strip=True)
            if not text or len(text) >= 50:
                continue
            
            # Get URL from multiple sources
            href = ""
            
            # Source 1: Standard href (for <a> tags)
            if btn.name == "a":
                href = btn.get("href", "")
            
            # Source 2: onclick attribute (JS handlers)
            elif btn.name == "button":
                onclick = btn.get("onclick", "")
                if onclick:
                    # Try to extract URL from onclick patterns
                    # Pattern 1: window.location='...'
                    url_match = re.search(r"window\.location\s*=\s*['\"]([^'\"]+)['\"]", onclick)
                    if url_match:
                        href = url_match.group(1)
                    else:
                        # Pattern 2: window.open('...')
                        url_match = re.search(r"window\.open\s*\(\s*['\"]([^'\"]+)['\"]", onclick)
                        if url_match:
                            href = url_match.group(1)
                        else:
                            # Pattern 3: Just mark as JS-handled
                            href = "(js-handled)"
            
            # Source 3: Data attributes (common in Wix/modern sites)
            data_url = btn.get("data-url") or btn.get("data-href") or btn.get("data-link")
            if data_url:
                href = data_url
            
            # Source 4: Form action (for submit buttons)
            if not href and btn.name == "button":
                btn_type = btn.get("type", "")
                if btn_type == "submit":
                    # Look for parent form
                    parent_form = btn.find_parent("form")
                    if parent_form and parent_form.get("action"):
                        href = parent_form.get("action")
                    else:
                        href = "(form-submit)"
            
            # Source 5: Check for nested <a> tag inside button
            if not href and btn.name == "button":
                nested_a = btn.find("a", href=True)
                if nested_a:
                    href = nested_a["href"]
            
            # Skip empty/junk buttons but keep js-handled ones
            if not href and btn.name == "button":
                continue
            
            # Build absolute URL
            if href and href not in ["(js-handled)", "(form-submit)"]:
                href = urljoin(self.url, href)
            
            buttons.append({
                "text": text,
                "tag": btn.name,
                "classes": btn.get("class", []),
                "href": href
            })
        
        return buttons[:20]
    
    def _extract_images(self):
        images = []
        
        for img in self.soup.find_all("img", src=True):
            src = img["src"]
            if src and not src.startswith("data:"):
                images.append({
                    "src": urljoin(self.url, src),
                    "alt": img.get("alt", ""),
                    "class": img.get("class", [])
                })
        
        return images[:30]
    
    def _extract_footer(self):
        """Extract footer content using multiple strategies"""
        footer = {"links": [], "text": "", "social_links": []}
        
        # Strategy 1: Standard footer tag
        footer_elem = self.soup.find("footer")
        
        # Strategy 2: Look for footer-like classes
        if not footer_elem:
            footer_elem = self.soup.find(class_=re.compile(r"footer|site-footer|page-footer", re.I))
        
        # Strategy 3: Look for elements at bottom of page with copyright/legal content
        if not footer_elem:
            # Find elements containing copyright symbols or common footer text
            for elem in self.soup.find_all(["div", "section", "nav"]):
                text = elem.get_text(strip=True).lower()
                if any(keyword in text for keyword in ["copyright", "©", "privacy policy", "terms of service", "all rights reserved"]):
                    footer_elem = elem
                    break
        
        # Strategy 4: Last nav or div with multiple links near bottom of body
        if not footer_elem:
            all_divs = self.soup.find_all(["div", "nav", "section"])
            if all_divs:
                # Check last 5 elements for link-heavy content
                for elem in all_divs[-5:]:
                    links = elem.find_all("a", href=True)
                    if len(links) >= 3:  # Footer typically has multiple links
                        footer_elem = elem
                        break
        
        if footer_elem:
            # Extract links
            links = footer_elem.find_all("a", href=True)
            footer["links"] = [
                {
                    "text": a.get_text(strip=True),
                    "url": urljoin(self.url, a["href"])
                }
                for a in links[:15] if a.get_text(strip=True)
            ]
            
            # Extract social media links specifically
            social_patterns = r"facebook|twitter|instagram|linkedin|tiktok|youtube|social"
            social_links = footer_elem.find_all("a", href=re.compile(social_patterns, re.I))
            footer["social_links"] = [
                {
                    "platform": a.get("href", ""),
                    "url": urljoin(self.url, a["href"])
                }
                for a in social_links[:10]
            ]
            
            # Get footer text (copyright, etc.)
            footer["text"] = footer_elem.get_text(strip=True)[:500]  # Limit text
        
        return footer
    
    def _extract_color_hints(self):
        """Extract inline styles and color hints"""
        colors = set()
        
        # Check inline styles
        for elem in self.soup.find_all(style=True):
            style = elem["style"]
            # Find hex colors
            hex_colors = re.findall(r'#([0-9a-fA-F]{3,6})', style)
            colors.update(hex_colors)
        
        # Check style tags
        for style_tag in self.soup.find_all("style"):
            if style_tag.string:
                hex_colors = re.findall(r'#([0-9a-fA-F]{3,6})', style_tag.string)
                colors.update(hex_colors)
        
        return list(colors)[:20]
    
    def _extract_fonts(self):
        """Extract Google Fonts and font families"""
        fonts = []
        
        # Google Fonts links
        for link in self.soup.find_all("link", href=True):
            href = link["href"]
            if "fonts.googleapis.com" in href:
                # Extract font names from URL
                match = re.search(r'family=([^&]+)', href)
                if match:
                    font_names = match.group(1).split('|')
                    fonts.extend([f.replace('+', ' ') for f in font_names])
        
        return fonts
    
    def _extract_assets(self):
        """Extract key assets - CONTEXTUAL VERSION"""
        assets = {
            "favicon": "",
            "logo": "",
            "stylesheets": [],
            "scripts": []
        }
        
        # Favicon
        for link in self.soup.find_all("link", rel=re.compile("icon", re.I)):
            if link.get("href"):
                assets["favicon"] = urljoin(self.url, link["href"])
                break
        
        # CONTEXTUAL LOGO DETECTION
        logo_found = False
        
        # Method 1: Standard selectors (logo in class, id, alt, or parent class)
        logo_selectors = [
            "img[class*='logo' i]",
            "img[id*='logo' i]",
            "img[alt*='logo' i]",
            "a[class*='logo' i] img",
            "div[class*='logo' i] img",
            "header img",
            "nav img",
            "[role='banner'] img"
        ]
        
        for selector in logo_selectors:
            imgs = self.soup.select(selector)
            for img in imgs:
                if img.get("src") and not img["src"].startswith("data:"):
                    # Verify it's likely a logo (not too large, in header area)
                    parent_classes = ' '.join(img.parent.get('class', []))
                    parent_id = img.parent.get('id', '')
                    img_classes = ' '.join(img.get('class', []))
                    
                    # Skip if it's clearly not a logo (e.g., large background images)
                    if any(x in img.get("src", "").lower() for x in ['bg', 'background', 'hero', 'banner']):
                        continue
                    
                    assets["logo"] = urljoin(self.url, img["src"])
                    logo_found = True
                    break
            if logo_found:
                break
        
        # Method2: Contextual fallback - first image in header/nav area
        if not logo_found:
            header_area = self.soup.find(["header", "nav"])
            if not header_area:
                header_area = self.soup.find("div", role="banner")
            if header_area:
                imgs = header_area.find_all("img", src=True)
                for img in imgs:
                    src = img["src"]
                    if src and not src.startswith("data:") and not any(x in src.lower() for x in ['bg', 'background', 'hero']):
                        assets["logo"] = urljoin(self.url, src)
                        logo_found = True
                        break
        
        # Method 3: Last resort - look for image inside first link (common logo pattern)
        if not logo_found:
            first_link_with_img = self.soup.find("a", href=True, img=True)
            if first_link_with_img:
                img = first_link_with_img.find("img")
                if img and img.get("src") and not img["src"].startswith("data:"):
                    assets["logo"] = urljoin(self.url, img["src"])
        
        # Stylesheets
        for link in self.soup.find_all("link", rel="stylesheet", href=True):
            assets["stylesheets"].append(urljoin(self.url, link["href"]))
        
        # Scripts
        for script in self.soup.find_all("script", src=True):
            assets["scripts"].append(urljoin(self.url, script["src"]))
        
        return assets


if __name__ == "__main__":
    import sys
    
    url = sys.argv[1] if len(sys.argv) > 1 else "https://www.metawatt.com/"
    
    print(f"Extracting structure from: {url}")
    print("=" * 60)
    
    extractor = StructureExtractor(url)
    result = extractor.extract_all()
    
    print(json.dumps(result, indent=2, ensure_ascii=False))
