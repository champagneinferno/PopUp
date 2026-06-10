"""
Layer Extractor - Extracts website content organized by layers
Uses Playwright Python directly (no subprocess to Node.js)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import re
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, parse_qs, urlencode, urlunparse
from playwright.sync_api import sync_playwright

from framework_detector import detect_framework, get_framework_extractors


class LayerExtractor:
    def __init__(self, url, output_dir=None):
        self.url = url
        self.output_dir = output_dir
        self.soup = None
        self.page = None
        self.browser = None
        self.framework_info = None
        self.strategy = None

    @staticmethod
    def _clean_image_url(src):
        """Remove Wix blur/quality params so images aren't blurry placeholders"""
        if not src:
            return src
        # Wix: remove 'blur_30,' and upgrade q_30 → q_85
        cleaned = re.sub(r',blur_\d+,', ',', src)
        cleaned = re.sub(r'q_\d+', 'q_85', cleaned)
        cleaned = re.sub(r',blur_\d+', '', cleaned)
        return cleaned

    def extract(self):
        """Run full layer-based extraction using Playwright Python"""
        result = {"url": self.url, "layers": {}, "assets": {}, "meta": {}}

        try:
            with sync_playwright() as p:
                self.browser = p.chromium.launch(headless=True)
                page = self.browser.new_page(viewport={"width": 1920, "height": 1080})
                self.page = page

                # Navigate and wait for render
                page.goto(self.url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_selector("body", timeout=10000)
                page.wait_for_timeout(3000)  # Let JS render
                try:
                    page.wait_for_load_state("networkidle", timeout=5000)
                except:
                    pass

                # Get rendered HTML
                html = page.content()
                self.soup = BeautifulSoup(html, "lxml")

                # Detect framework
                self.framework_info = detect_framework(self.soup, self.url)
                self.strategy = get_framework_extractors(self.framework_info["framework"])
                result["framework"] = self.framework_info

                # Take screenshot if output_dir is set
                screenshot_path = None
                if self.output_dir:
                    import os
                    from urllib.parse import urlparse
                    domain = urlparse(self.url).hostname.replace(".", "_")
                    screenshot_path = os.path.join(self.output_dir, f"{domain}_screenshot.png")
                    page.screenshot(path=screenshot_path, full_page=True, type="png")
                    result["screenshot_path"] = screenshot_path
                result["section_screenshots"] = self._capture_section_screenshots()

                # Extract by layers
                result["layers"]["background"] = self._extract_background_layer()
                result["layers"]["branding"] = self._extract_branding_layer()
                result["layers"]["hero"] = self._extract_hero_layer()
                result["layers"]["content"] = self._extract_content_layer()
                result["layers"]["icons"] = self._extract_icons_layer()
                result["layers"]["footer"] = self._extract_footer_layer()
                result["layers"]["floating"] = self._extract_floating_elements()

                # Aggregate all assets
                result["assets"] = self._aggregate_assets(result["layers"])

                # Meta
                result["hidden_content"] = self._extract_hidden_content()
                result["meta"] = self._extract_meta()

                self.browser.close()
                return result

        except Exception as e:
            if self.browser:
                self.browser.close()
            return {"error": str(e), "url": self.url}

    def _extract_background_layer(self):
        """Extract background images, CSS gradients, full-bleed images"""
        bg_images = []
        seen_urls = set()
        hero_bg = None

        # Use Playwright's JS execution for computed styles
        bg_data = self.page.evaluate("""() => {
            const results = { background_images: [], hero_background: null };
            const seen = new Set();
            const allEls = document.querySelectorAll('*');

            allEls.forEach(el => {
                try {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 50 || rect.height < 50) return;

                    // Check computed background-image
                    const bgImg = style.backgroundImage;
                    if (bgImg && bgImg !== 'none') {
                        const match = bgImg.match(/url\\(["']?([^"')]+)["']?\\)/);
                        const url = match ? match[1] : bgImg;
                        if (!seen.has(url)) {
                            seen.add(url);
                            const isHero = rect.width > window.innerWidth * 0.5 && rect.top < 500;
                            results.background_images.push({
                                url: url,
                                element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
                                color: style.backgroundColor,
                                width: Math.round(rect.width),
                                height: Math.round(rect.height),
                                position: style.position,
                                is_hero_candidate: isHero,
                                type: 'css-background'
                            });
                            if (isHero) {
                                results.hero_background = { url, element: el.tagName, color: style.backgroundColor };
                            }
                        }
                    }

                    // Check inline style background
                    const inline = el.getAttribute('style');
                    if (inline && inline.includes('background')) {
                        const match = inline.match(/url\\(["']?([^"')]+)["']?\\)/);
                        if (match && !seen.has(match[1])) {
                            seen.add(match[1]);
                            results.background_images.push({
                                url: match[1],
                                element: el.tagName + ' (inline)',
                                color: style.backgroundColor,
                                width: Math.round(rect.width),
                                height: Math.round(rect.height),
                                type: 'inline-background'
                            });
                        }
                    }
                } catch(e) {}
            });

            // Check for full-bleed <img> tags used as backgrounds
            document.querySelectorAll('img[src]').forEach(img => {
                try {
                    const style = window.getComputedStyle(img);
                    const rect = img.getBoundingClientRect();
                    const src = img.src || '';
                    if (src.startsWith('data:') || seen.has(src)) return;
                    if (style.position === 'absolute' || style.zIndex === '-1' || rect.width > window.innerWidth * 0.7) {
                        seen.add(src);
                        results.background_images.push({
                            url: src,
                            element: 'IMG (full-bleed bg)',
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                            alt: img.alt || '',
                            type: 'img-background'
                        });
                    }
                } catch(e) {}
            });

            return results;
        }""")

        if bg_data:
            bg_images = bg_data.get("background_images", [])
            hero_bg = bg_data.get("hero_background")

        return {
            "background_images": bg_images[:15],
            "hero_background": hero_bg,
            "count": len(bg_images)
        }

    def _extract_branding_layer(self):
        """Extract logo, navigation styles, brand colors, brand fonts"""
        s = self.soup

        # --- Logo ---
        logo = None
        logo_selectors = self.strategy.get("logo_selectors", [])
        for selector in logo_selectors:
            img = s.select_one(selector)
            if img and img.get("src"):
                src = img["src"]
                if not src.startswith("data:"):
                    logo = urljoin(self.url, src)
                    break

        # Also check Playwright for rendered logo
        if not logo:
            logo_data = self.page.evaluate("""() => {
                const selectors = ['img[class*=\"logo\"]', 'img[id*=\"logo\"]', 'img[alt*=\"logo\"]',
                    'a[class*=\"logo\"] img', 'div[class*=\"logo\"] img', 'header img', 'nav img'];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el && el.src && !el.src.startsWith('data:')) return el.src;
                }
                const headerImg = document.querySelector('header img[src], nav img[src]');
                if (headerImg && headerImg.src && !headerImg.src.startsWith('data:')) return headerImg.src;
                return null;
            }""")
            if logo_data:
                logo = logo_data

        # --- Navigation ---
        nav_items = []
        nav_selector = self.strategy.get("nav_selector", "nav, header")
        nav_el = s.select_one(nav_selector)
        if nav_el:
            for a in nav_el.find_all("a", href=True):
                text = a.get_text(strip=True)
                if text and len(text) < 50 and not text.startswith("http"):
                    nav_items.append({"text": text, "href": urljoin(self.url, a["href"])})

        # Nav styles from Playwright
        nav_styles = self.page.evaluate("""() => {
            const nav = document.querySelector('nav, header, [role=\"navigation\"], .nav, .navbar');
            if (!nav) return null;
            const style = window.getComputedStyle(nav);
            const link = nav.querySelector('a');
            const linkStyle = link ? window.getComputedStyle(link) : null;
            return {
                background_color: style.backgroundColor,
                height: style.height,
                font_family: style.fontFamily,
                border_bottom: style.borderBottom,
                link_color: linkStyle ? linkStyle.color : null,
                link_font: linkStyle ? linkStyle.fontFamily : null,
                link_weight: linkStyle ? linkStyle.fontWeight : null,
                link_transform: linkStyle ? linkStyle.textTransform : null
            };
        }""")

        # --- Brand Colors (from CSS computed styles) ---
        brand_colors = self.page.evaluate("""() => {
            const colors = new Set();
            // Check header, nav, hero area for brand colors
            const targets = document.querySelectorAll('header, nav, .hero, [class*=\"hero\"], h1, h2, .logo');
            targets.forEach(el => {
                try {
                    const style = window.getComputedStyle(el);
                    ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
                        const val = style[prop];
                        if (val && val !== 'rgba(0,0,0,0)' && val !== 'transparent' && !val.startsWith('rgba(0, 0, 0, 0)')) {
                            colors.add(val);
                        }
                    });
                } catch(e) {}
            });
            return Array.from(colors).slice(0, 8);
        }""")

        # --- Brand Fonts ---
        brand_fonts = self.page.evaluate("""() => {
            const fonts = new Set();
            const targets = document.querySelectorAll('h1, h2, h3, .logo, nav a, .hero, [class*=\"hero\"]');
            targets.forEach(el => {
                try {
                    const style = window.getComputedStyle(el);
                    const font = style.fontFamily;
                    if (font && !font.includes('Arial') && !font.includes('Helvetica') && !font.includes('Times')) {
                        fonts.add(font.split(',')[0].replace(/['\"]/g, '').trim());
                    }
                } catch(e) {}
            });
            return Array.from(fonts).slice(0, 6);
        }""")

        return {
            "logo": logo,
            "logo_url": logo,
            "navigation": nav_items[:12],
            "nav_styles": nav_styles or {},
            "brand_colors": self._clean_colors(brand_colors) if brand_colors else [],
            "brand_fonts": brand_fonts or []
        }

    def _extract_hero_layer(self):
        """
        Extract hero section as a COMPOSITE:
        hero_image + headline + subheading + CTA buttons + background
        """
        s = self.soup
        framework = self.framework_info["framework"]

        result = self.page.evaluate("""(framework) => {
            const hero = { headline: '', subheading: '', cta_buttons: [], hero_image: null, background: null };

            // --- Find hero container ---
            let heroEl = null;
            const heroSelectors = [
                '.hero', '[class*=\"hero\"]', '.banner', '[class*=\"banner\"]',
                'header + section', 'main > section:first-child', '.wp-block-cover',
                'section:first-of-type', 'div:first-of-type > section'
            ];

            // Framework-specific selectors
            if (framework === 'wix') {
                heroSelectors.unshift('[data-block-level-container]', 'section.wixui-section');
            }

            for (const sel of heroSelectors) {
                const el = document.querySelector(sel);
                if (el && el.getBoundingClientRect().top < 500) {
                    heroEl = el;
                    break;
                }
            }
            if (!heroEl) {
                // Fallback: first large section near top
                const sections = document.querySelectorAll('section, div[class], header');
                for (const el of sections) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top < 300 && rect.height > 200) {
                        heroEl = el;
                        break;
                    }
                }
            }

            if (!heroEl) return hero;

            // --- Headline (h1 or largest heading in hero) ---
            const headings = heroEl.querySelectorAll('h1, h2, h3');
            if (headings.length > 0) {
                hero.headline = headings[0].textContent.trim().substring(0, 200);
            }

            // --- Subheading (text after headline, before CTA) ---
            const allText = heroEl.innerText || '';
            if (hero.headline) {
                const afterHeadline = allText.substring(allText.indexOf(hero.headline) + hero.headline.length).trim();
                // Find first sentence or significant text after headline
                const sentences = afterHeadline.split(/\\n+/).filter(t => t.trim().length > 10);
                if (sentences.length > 0) {
                    hero.subheading = sentences[0].trim().substring(0, 300);
                }
            }

            // --- Hero image (first large img in hero area) ---
            const imgs = heroEl.querySelectorAll('img[src]');
            for (const img of imgs) {
                const src = img.src || '';
                if (!src.startsWith('data:') && !src.includes('icon') && !src.includes('logo')) {
                    const rect = img.getBoundingClientRect();
                    if (rect.width > 100) {
                        hero.hero_image = {
                            src: src,
                            alt: img.alt || '',
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        };
                        break;
                    }
                }
            }

            // If no img, check CSS background on hero
                        if (!hero.hero_image) {
                            const style = window.getComputedStyle(heroEl);
                            const bgImg = style.backgroundImage;
                            if (bgImg && bgImg !== 'none') {
                                const match = bgImg.match(/url\(["']?([^"')]+)["']?\\)/);
                                if (match) {
                                    hero.hero_image = { src: match[1], type: 'css-background' };
                                }
                            }
                            // Also check child elements for background images
                            if (!hero.hero_image) {
                                const children = heroEl.querySelectorAll('*');
                                for (const child of children) {
                                    try {
                                        const cs = window.getComputedStyle(child);
                                        const childBg = cs.backgroundImage;
                                        if (childBg && childBg !== 'none') {
                                            const match = childBg.match(/url\(["']?([^"')]+)["']?\\)/);
                                            if (match) {
                                                hero.hero_image = { src: match[1], type: 'css-background-child' };
                                                break;
                                            }
                                        }
                                    } catch(e) {}
                                }
                            }
                        }

            // --- Background color/gradient of hero section ---
            const heroBgColor = window.getComputedStyle(heroEl).backgroundColor;
            const heroBgGradient = window.getComputedStyle(heroEl).backgroundImage;
            if (heroBgColor && heroBgColor !== 'rgba(0, 0, 0, 0)' && heroBgColor !== 'transparent') {
                hero.background_color = heroBgColor;
            }

            // --- Heading styles (font, size, weight, color) ---
            if (headings.length > 0) {
                const h1Style = window.getComputedStyle(headings[0]);
                hero.heading_style = {
                    font_family: h1Style.fontFamily,
                    font_size: h1Style.fontSize,
                    font_weight: h1Style.fontWeight,
                    color: h1Style.color,
                    line_height: h1Style.lineHeight ? h1Style.lineHeight.split(' ')[0] : null,
                    letter_spacing: h1Style.letterSpacing,
                    text_transform: h1Style.textTransform,
                    text_align: h1Style.textAlign
                };
            }

            // --- Subheading styles ---
            if (hero.subheading) {
                const subEl = Array.from(heroEl.querySelectorAll('p, h2, h3, h4, span, div'))
                    .find(el => el.textContent.trim() === hero.subheading);
                if (subEl) {
                    const subStyle = window.getComputedStyle(subEl);
                    hero.subheading_style = {
                        font_family: subStyle.fontFamily,
                        font_size: subStyle.fontSize,
                        font_weight: subStyle.fontWeight,
                        color: subStyle.color,
                        line_height: subStyle.lineHeight ? subStyle.lineHeight.split(' ')[0] : null
                    };
                }
            }

            // --- CTA Buttons ---
            const buttons = heroEl.querySelectorAll('a[class*=\"btn\"], a[class*=\"button\"], button, [role=\"button\"]');
            buttons.forEach(btn => {
                const text = btn.textContent.trim();
                if (text && text.length > 0 && text.length < 60) {
                    const style = window.getComputedStyle(btn);
                    hero.cta_buttons.push({
                        text: text,
                        href: btn.href || btn.getAttribute('data-href') || '',
                        style: {
                            bg: style.backgroundColor,
                            color: style.color,
                            radius: style.borderRadius,
                            padding: style.padding,
                            font: style.fontFamily,
                            weight: style.fontWeight
                        }
                    });
                }
            });

            // --- Background ---
            const heroBg = window.getComputedStyle(heroEl).backgroundImage;
            if (heroBg && heroBg !== 'none') {
                const match = heroBg.match(/url\\(["']?([^"')]+)["']?\\)/);
                if (match) {
                    hero.background = { url: match[1], type: 'hero-background' };
                }
            }

            return hero;
        }""", self.framework_info["framework"])

        return result

    def _extract_content_layer(self):
        """Extract content sections, cards, text blocks - deduplicated"""
        s = self.soup
        sections = []
        seen_headings = set()
        seen_texts = set()

        for section in s.find_all(["section", "div"], class_=re.compile(r"section|feature|about|service|content|card|grid", re.I)):
            heading = section.find(["h1", "h2", "h3", "h4"])
            if heading:
                heading_text = heading.get_text(strip=True)
                full_text = section.get_text(strip=True)
                if heading_text and heading_text not in seen_headings and len(heading_text) > 3:
                    seen_headings.add(heading_text)
                    # Get all images in this section
                    imgs = []
                    for img in section.find_all("img", src=True):
                        src = img["src"]
                        if not src.startswith("data:") and len(imgs) < 5:
                            imgs.append({"src": urljoin(self.url, src), "alt": img.get("alt", "")})

                    sections.append({
                        "heading": heading_text,
                        "text_preview": full_text[:300] if len(full_text) > 300 else full_text,
                        "text_length": len(full_text),
                        "images": imgs,
                        "class": " ".join(section.get("class", [])),
                        "tag": section.name
                    })

        # Dedup by heading
        unique = []
        seen = set()
        for sec in sections:
            if sec["heading"] not in seen:
                seen.add(sec["heading"])
                unique.append(sec)

        return {"sections": unique[:10], "count": len(unique)}

    def _extract_icons_layer(self):
        """Extract social media icons, UI icons, small decorative images"""
        icons = self.page.evaluate("""() => {
            const icons = [];
            document.querySelectorAll('img[src]').forEach(img => {
                try {
                    const rect = img.getBoundingClientRect();
                    const src = img.src || '';
                    if (src.startsWith('data:')) return;
                    const alt = (img.alt || '').toLowerCase();
                    const cls = (img.className || '').toLowerCase();

                    // Icon = small image (< 64x64) or social media icon
                    const isSmall = (rect.width <= 64 && rect.height <= 64);
                    const isSocial = alt.includes('instagram') || alt.includes('facebook') ||
                        alt.includes('twitter') || alt.includes('linkedin') || alt.includes('tiktok') ||
                        alt.includes('youtube') || alt.includes('social');
                    const isIcon = isSmall || isSocial || /icon/.test(cls) || /svg/.test(src);

                    if (isIcon) {
                        icons.push({
                            src: src,
                            alt: img.alt || '',
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                            type: isSocial ? 'social' : 'ui-icon'
                        });
                    }
                } catch(e) {}
            });
            return icons.slice(0, 20);
        }""")
        return {"icons": icons, "count": len(icons)}

    def _extract_footer_layer(self):
        """Extract footer content, links, social media, copyright"""
        s = self.soup
        footer = {"links": [], "social_links": [], "copyright": "", "text": ""}

        footer_el = s.find("footer")
        if not footer_el:
            footer_el = s.find(class_=re.compile(r"footer|site-footer", re.I))
        if not footer_el:
            for div in s.find_all(["div", "section"]):
                text = div.get_text(strip=True).lower()
                if "copyright" in text or "©" in text:
                    footer_el = div
                    break

        if footer_el:
            for a in footer_el.find_all("a", href=True):
                href = a["href"].lower()
                text = a.get_text(strip=True)
                if text:
                    footer["links"].append({"text": text[:50], "url": a["href"]})
                # Social detection
                if any(s in href for s in ["facebook", "twitter", "instagram", "linkedin", "tiktok", "youtube"]):
                    footer["social_links"].append({"platform": a["href"], "text": text[:30]})

            footer["text"] = footer_el.get_text(strip=True)[:500]

            # Find copyright
            for tag in footer_el.find_all(["p", "div", "span"]):
                txt = tag.get_text(strip=True)
                if "©" in txt or "copyright" in txt.lower():
                    footer["copyright"] = txt[:200]
                    break

        return footer

    def _extract_floating_elements(self):
        """Extract floating/floating UI elements (chat buttons, back-to-top, sticky bars)"""
        elements = self.page.evaluate("""() => {
            const results = [];
            const allEls = document.querySelectorAll('*');

            allEls.forEach(el => {
                try {
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    
                    // Must be a positioned floating element
                    const isFixed = style.position === 'fixed';
                    const isSticky = style.position === 'sticky';
                    if (!isFixed && !isSticky) return;
                    
                    // Must be visible and reasonable size
                    if (rect.width < 20 || rect.height < 20) return;
                    if (rect.width > 400 || rect.height > 600) return; // Skip modals
                    
                    // Must have content (not just a spacer)
                    const text = el.textContent.trim();
                    const hasImg = el.querySelector('img') || el.tagName === 'IMG';
                    const hasBtn = el.querySelector('button') || el.tagName === 'BUTTON';
                    const isClickable = el.onclick || el.getAttribute('onclick') || 
                        el.getAttribute('role') === 'button' || el.style.cursor === 'pointer';
                    
                    if ((text || hasImg || hasBtn) && (isClickable || hasBtn || hasImg)) {
                        const bgColor = style.backgroundColor;
                        const icon = el.querySelector('img') || el.querySelector('svg');
                        results.push({
                            text: text.substring(0, 50),
                            tag: el.tagName,
                            position: style.position,
                            top: Math.round(rect.top),
                            right: Math.round(window.innerWidth - rect.right),
                            bottom: Math.round(window.innerHeight - rect.bottom),
                            left: Math.round(rect.left),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                            background_color: bgColor,
                            color: style.color,
                            border_radius: style.borderRadius,
                            box_shadow: style.boxShadow,
                            z_index: style.zIndex,
                            icon_src: icon ? (icon.src || '') : '',
                            icon_alt: icon ? (icon.alt || '') : '',
                            type: text ? 'floating-button' : 'floating-icon'
                        });
                    }
                } catch(e) {}
            });
            return results;
        }""")
        return {"floating_elements": elements, "count": len(elements)}


    def _capture_section_screenshots(self):
        """Screenshots per viewport scroll: 1920x1080 slides with overlap and animation settling"""
        if not self.output_dir:
            return []
        import os
        results = []
        vh = 1080
        total_h = self.page.evaluate("() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 1080)")
        overlap = 100
        step = vh - overlap
        slides = max(1, (total_h + step - 1) // step)

        for i in range(slides):
            try:
                sy = i * step
                target_y = sy
                current_y = self.page.evaluate("window.pageYOffset || document.documentElement.scrollTop")
                if abs(current_y - target_y) > 200:
                    intermediate_steps = max(1, (target_y - current_y) // 400)
                    for s in range(intermediate_steps):
                        mid_y = current_y + (target_y - current_y) * (s + 1) // intermediate_steps
                        self.page.evaluate(f"window.scrollTo({{top: {mid_y}, behavior: 'instant'}})")
                        self.page.wait_for_timeout(150)
                else:
                    self.page.evaluate(f"window.scrollTo({{top: {target_y}, behavior: 'instant'}})")

                self.page.wait_for_timeout(2000)
                try:
                    unsettled = self.page.evaluate('''() => {
                        const els = document.querySelectorAll('[class*="animate"], [class*="fade"], [class*="reveal"], [data-aos]');
                        return els.length;
                    }''')
                    if unsettled > 0:
                        self.page.wait_for_timeout(1500)
                except Exception:
                    pass

                fp = os.path.join(self.output_dir, f"slide_{i+1}_of_{slides}.png")
                self.page.screenshot(path=fp, full_page=False, type="png")
                results.append({"index": i+1, "total": slides, "scroll_y": sy, "screenshot": fp,
                                "label": f"Slide {i+1}/{slides}", "overlap_px": overlap})
            except Exception:
                continue
        self.page.evaluate("window.scrollTo(0, 0)")
        return results

    def _extract_hidden_content(self):
        """Find content hidden behind scroll, lazy-load, or interaction"""
        return self.page.evaluate("""() => {
            const hidden = [];
            document.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy]').forEach(img => {
                hidden.push({type: "lazy-image", src: img.src || img.getAttribute("data-src") || "", alt: img.alt || ""});
            });
            const vpHeight = window.innerHeight;
            document.querySelectorAll("section, div[class], footer").forEach(el => {
                try {
                    const rect = el.getBoundingClientRect();
                    if (rect.top > vpHeight && rect.top < vpHeight * 3) {
                        const text = (el.textContent || "").trim().substring(0, 60);
                        if (text) hidden.push({type: "below-fold", tag: el.tagName, text: text, distance: Math.round(rect.top - vpHeight)});
                    }
                } catch(e) {}
            });
            return hidden.slice(0, 10);
        }""")

    def _extract_meta(self):
        """Extract meta tags"""
        meta = {}
        for tag in self.soup.find_all("meta"):
            name = tag.get("name") or tag.get("property") or ""
            content = tag.get("content", "")
            if name and content:
                meta[name] = content[:300]
        return meta

    def _aggregate_assets(self, layers):
        """Aggregate all extracted assets into a unified asset list"""
        assets = []
        clean = self._clean_image_url

        # Background images
        bg = layers.get("background", {})
        for img in bg.get("background_images", []):
            assets.append({
                "src": clean(img.get("url", "")),
                "type": "background",
                "width": img.get("width", 0),
                "height": img.get("height", 0),
                "element": img.get("element", ""),
                "layer": "background"
            })

        # Branding assets (logo)
        branding = layers.get("branding", {})
        if branding.get("logo"):
            assets.append({"src": clean(branding["logo"]), "type": "logo", "layer": "branding"})

        # Hero image
        hero = layers.get("hero", {})
        if hero.get("hero_image"):
            hi = hero["hero_image"]
            assets.append({
                "src": clean(hi.get("src", "")),
                "type": "hero",
                "alt": hi.get("alt", ""),
                "width": hi.get("width", 0),
                "height": hi.get("height", 0),
                "layer": "hero"
            })

        # Content images
        content = layers.get("content", {})
        for section in content.get("sections", []):
            for img in section.get("images", []):
                assets.append({
                    "src": clean(img.get("src", "")),
                    "type": "content",
                    "alt": img.get("alt", ""),
                    "section": section.get("heading", ""),
                    "layer": "content"
                })

        # Icons
        icons_data = layers.get("icons", {})
        for icon in icons_data.get("icons", []):
            assets.append({
                "src": clean(icon.get("src", "")),
                "type": icon.get("type", "icon"),
                "alt": icon.get("alt", ""),
                "width": icon.get("width", 0),
                "height": icon.get("height", 0),
                "layer": "icons"
            })

        return assets

    def _clean_colors(self, colors):
        """Remove junk/transparent colors"""
        clean = []
        seen = set()
        for c in colors:
            if not c or c in seen: continue
            if "rgba(0, 0, 0, 0)" in c or c == "transparent": continue
            if c == "rgb(0, 0, 238)": continue  # default link blue
            seen.add(c)
            clean.append(c)
        return clean[:10]


def extract_layers(url, output_dir=None):
    """Convenience function to run layer extraction"""
    extractor = LayerExtractor(url, output_dir)
    return extractor.extract()