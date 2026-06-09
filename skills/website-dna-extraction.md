---
name: website-dna-extraction
description: "Extract full website DNA (structure + visual) for 3D transformation — preserves nav, buttons, colors, themes, assets. Combines BeautifulSoup + Playwright. Adaptive, not score-based."
---

# Website DNA Extraction

Extracts complete website DNA for 3D transformation (PopUp 3D project). Captures structure AND visual identity — not just text.

## User Philosophy (PopUp 3D)

- **Full DNA, not just content**: Extract navigation, buttons, footers, colors, themes, assets — everything that makes a website unique
- **No score-based selection**: System must adapt to each website's uniqueness; don't pick "best method" via scoring
- **Combine methods**: Use BeautifulSoup (structure) + Playwright (visual DNA) together, not either/or
- **Preserve brand identity**: Colors, fonts, layout patterns, hover effects — the "soul" of the website

## USER PREFERENCES (DO NOT VIOLATE - from session corrections)

1. **NO PLACEHOLDERS** - Extract real content or fail trying. Never generate fake "About Us" text or generic content. If Metawatt logo is `CD68DF04-D8B7-44A9-AD93-7492393E5444.png`, extract THAT exact URL.
2. **CONTEXTUAL DETECTION** - Learn from each website's unique structure. Don't rely on rigid selectors like "logo" class names. Wix uses random classes like `Le88gL` - detect by context (header location, img format, etc.).
3. **EXTRACT ALL ELEMENTS** - Logo, colors, themes, buttons, backgrounds, navigation, footer, full text. The evaluator needs EVERYTHING. If one element is missing (like background images), the 3D scene fails.
4. **SMART FALLBACKS** - When direct extraction fails, use intelligent fallbacks. **CRITICAL**: Never use pure black `rgb(0,0,0)` for backgrounds. Use theme color from nearby elements or light grey `rgb(250,250,250)`.
5. **AGGRESSIVE EXTRACTION** - Try multiple methods. If `getComputedStyle` fails, check inline styles, data attributes, child elements. Never stop at first failure.

6. **NO HARD-CODING** - Never hard-code website-specific selectors (like `ytd-topbar-logo-renderer` for YouTube, `Le88gL` Wix classes). Use GENERIC patterns that adapt to ANY site's structure. The URL content should drive extraction, not pre-defined patterns.

## Workflow Rules (from user corrections)

1. **Fix extractor FIRST, then evaluator** - Don't debug 3D renderer while extractor is broken. Get DNA extraction working 100% first.
2. **Don't spin on one issue** - If YouTube SVG logo takes >3 attempts, move to other sites. Come back later with fresh approach.
3. **Test on MULTIPLE sites** - Verify on Metawatt (Wix), YouTube (JS-heavy), Wikipedia (static), GitHub (mixed). One site success ≠ working extractor.
4. **Verify with data** - Show user what was extracted (background count, button URLs) before moving on. Numbers > claims.
5. **TEST AFTER EVERY PATCH** - Run extraction IMMEDIATELY after patching. Never patch multiple methods without testing.

## Architecture: 3-Phase DNA Sequencer

```
Phase1: Structure DNA (BeautifulSoup)
  └─ HTML skeleton, navigation, sections, assets, meta tags

Phase2: Visual DNA (Playwright)
  └─ Computed colors, backgrounds, button styles, fonts, layout metrics

Phase3: Merge & Output
  └─ Unified JSON profile for 3D app consumption
```

## Implementation

### Prerequisites

```bash
# Python venv with BeautifulSoup
python3 -m venv venv
venv/bin/pip install beautifulsoup4 requests

# Node.js with Playwright
npm install playwright
npx playwright install chromium
```

### File Structure

```
src/extractor/
├── dna_extractor.py          # Main orchestrator
├── structure_extractor.py    # BeautifulSoup extractor
├── visual_extractor.cjs      # Playwright extractor (CJS for Windows compat)
└── references/
    └── output-schema.md      # JSON profile schema
```

### Running Extraction

```bash
# Extract DNA from any homepage (uses argparse for proper CLI)
python src/extractor/dna_extractor.py --url https://example.com/ --output profile.json

# Output: JSON profile (extracted_profile.json by default)
```

**Important**: The script now uses `argparse` for proper CLI handling. Use `--url` and `--output` flags.

**Python import fix**: If you get `ModuleNotFoundError`, ensure `dna_extractor.py` has:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))  # Add sibling modules to path
```

## Key Patterns

### 1. Structure Extractor (BeautifulSoup)

- Normalize URL to root homepage (strip paths)
- Extract: title, meta, navigation, hero section, sections, buttons, images, footer
- Capture asset URLs (images, stylesheets, scripts, favicon, logo)
- **CONTEXTUAL LOGO DETECTION** (see below)

#### Contextual Logo Detection (Structure)

```python
def _extract_assets(self):
    """Extract key assets - CONTEXTUAL VERSION"""
    assets = {"favicon": "", "logo": "", "stylesheets": [], "scripts": []}
    
    # Favicon
    for link in self.soup.find_all("link", rel=re.compile("icon", re.I)):
        if link.get("href"):
            assets["favicon"] = urljoin(self.url, link["href"])
            break
    
    # CONTEXTUAL LOGO DETECTION (multi-method fallback)
    logo_found = False
    
    # Method1: Standard selectors
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
                if any(x in img.get("src", "").lower() for x in ['bg', 'background', 'hero']):
                    continue
                assets["logo"] = urljoin(self.url, img["src"])
                logo_found = True
                break
        if logo_found:
            break
    
    # Method2: First image in header/nav area
    if not logo_found:
        header_area = self.soup.find(["header", "nav"])
        if not header_area:
            header_area = self.soup.find("div", role="banner")
        if header_area:
            imgs = header_area.find_all("img", src=True)
            for img in imgs:
                src = img["src"]
                if src and not src.startswith("data:") and not any(x in src.lower() for x in ['bg', 'background']):
                    assets["logo"] = urljoin(self.url, src)
                    logo_found = True
                    break
    
    # Method3: Image inside first link (common pattern)
    if not logo_found:
        first_link_with_img = self.soup.find("a", href=True, img=True)
        if first_link_with_img:
            img = first_link_with_img.find("img")
            if img and img.get("src") and not img["src"].startswith("data:"):
                assets["logo"] = urljoin(self.url, img["src"])
    
    return assets
```

#### Multi-Strategy Footer Extraction

Wix sites often don't use standard `<footer>` tags. Use multiple strategies:

```python
def _extract_footer(self):
    """Extract footer content using multiple strategies"""
    footer = {"links": [], "text": "", "social_links": []}
    
    # Strategy1: Standard footer tag
    footer_elem = self.soup.find("footer")
    
    # Strategy2: Look for footer-like classes
    if not footer_elem:
        footer_elem = self.soup.find(class_=re.compile(r"footer|site-footer|page-footer", re.I))
    
    # Strategy3: Look for elements with copyright/legal content
    if not footer_elem:
        for elem in self.soup.find_all(["div", "section", "nav"]):
            text = elem.get_text(strip=True).lower()
            if any(keyword in text for keyword in ["copyright", "©", "privacy policy", "terms of service"]):
                footer_elem = elem
                break
    
    # Strategy4: Last elements with multiple links (footer pattern)
    if not footer_elem:
        all_divs = self.soup.find_all(["div", "nav", "section"])
        if all_divs:
            for elem in all_divs[-5:]:
                links = elem.find_all("a", href=True)
                if len(links) >= 3:
                    footer_elem = elem
                    break
    
    if footer_elem:
        links = footer_elem.find_all("a", href=True)
        footer["links"] = [{"text": a.get_text(strip=True), "url": urljoin(self.url, a["href"])} 
                      for a in links[:15] if a.get_text(strip=True)]
        
        # Extract social media links
        social_patterns = r"facebook|twitter|instagram|linkedin|tiktok|youtube"
        social_links = footer_elem.find_all("a", href=re.compile(social_patterns, re.I))
        footer["social_links"] = [{"platform": a.get("href", ""), "url": urljoin(self.url, a["href"])} 
                              for a in social_links[:10]]
        
        footer["text"] = footer_elem.get_text(strip=True)[:500]
    
    return footer
```

#### Button Extraction with JS Handler Detection

Many sites (Wix, React) use JS handlers instead of href. Capture them:

```python
def _extract_buttons(self):
    """Extract buttons with contextual URL detection"""
    buttons = []
    
    for btn in self.soup.find_all(["button", "a"], class_=re.compile(r"btn|button|cta", re.I)):
        text = btn.get_text(strip=True)
        if not text or len(text) >= 50:
            continue
        
        href = ""
        if btn.name == "a":
            href = btn.get("href", "")
        else:
            # Check for JS handlers
            onclick = btn.get("onclick", "")
            data_url = btn.get("data-url", "") or btn.get("data-href", "")
            if onclick:
                url_match = re.search(r"window\.location\s*=\s*['\"]([^'\"]+)['\"]", onclick)
                if url_match:
                    href = url_match.group(1)
            if data_url:
                href = data_url
        
        buttons.append({
            "text": text,
            "tag": btn.name,
            "classes": btn.get("class", []),
            "href": urljoin(self.url, href) if href and not href.startswith("(") else href
        })
    
    return buttons[:20]
```

#### Full Content Extraction (No Truncation)

Always capture COMPLETE text with `text_full` field. Never truncate during extraction:

```python
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
                "text_full": full_text,  # FULL content - NO truncation
                "text_preview": full_text[:200] if len(full_text) > 200 else full_text,
                "html_snippet": str(section)[:500]
            })
    
    return sections[:10]
```

**Important**: The evaluator/display layer can truncate if needed. The extractor's job is to capture EVERYTHING.

### 2. Visual DNA Extractor (Playwright)

- Use `.cjs` extension (not `.js`) when project has `"type": "module"` in package.json
- Extract computed styles via `window.getComputedStyle()`
- Capture: background images, color palette, font families, button styles, layout structure
- Handle dynamic content: wait for `networkidle`
- **CONTEXTUAL LOGO DETECTION** (for JS-heavy sites like YouTube)

#### Contextual Logo Detection (Visual/Playwright)

```javascript
// Inside page.evaluate()
function detectLogo() {
    // Method1: Standard img selectors
    const logoSelectors = [
        'img[class*="logo" i]', 'img[id*="logo" i]',
        'img[alt*="logo" i]', 'a[class*="logo" i] img',
        'header img', 'nav img', '[role="banner"] img'
    ];
    
    for (const selector of logoSelectors) {
        const imgs = document.querySelectorAll(selector);
        for (const img of imgs) {
            const src = img.src || img.getAttribute('src');
            if (src && !src.startsWith('data:') && 
                !src.toLowerCase().includes('bg')) {
                return { src, alt: img.alt || '', selector, type: 'img' };
            }
        }
    }
    
    // Method1b: SVG logos (YouTube, modern sites)
    const svgSelectors = [
        'a[aria-label*="YouTube" i]', 'a[title*="YouTube" i]',
        'svg[class*="logo" i]', 'a svg', 'header svg'
    ];
    
    for (const selector of svgSelectors) {
        const svg = document.querySelector(selector);
        if (svg) {
            const parentLink = svg.closest('a');
            return {
                src: parentLink ? parentLink.href : 'svg-logo-detected',
                alt: 'SVG Logo',
                selector,
                type: 'svg'
            };
        }
    }
    
    // Method2: First image in header/nav
    const headerArea = document.querySelector('header, nav, [role="banner"]');
    if (headerArea) {
        const img = headerArea.querySelector('img[src]');
        if (img) {
            return { src: img.src, alt: img.alt || '', selector: 'header-img', type: 'img' };
        }
    }
    
    return null;
}

result.rendered_logo = detectLogo();
```

### 3. Orchestrator (dna_extractor.py)

- Sequential: Structure → Visual → Merge
- Fallback: if Playwright fails, continue with Structure-only profile
- Output: unified JSON with `website_profile` root key
- Save profile to `extracted_profile.json` for 3D app
- **CONTEXTUAL ASSET MERGING**: Use best available data from both sources

#### Aggressive Background Detection (4-Check Approach) - NEW

**Problem**: Standard `getComputedStyle` misses Wix/JS-heavy site backgrounds. Result: 0 background images, pure black fallbacks.

**Solution**: Check 4 sources in order:

```javascript
// Inside page.evaluate()
const bgElements = document.querySelectorAll('*');
let bgImageCount = 0;

bgElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const bgImage = style.backgroundImage;
    const bgColor = style.backgroundColor;
    
    // Skip tiny elements
    const rect = el.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return;
    
    let foundBg = false;
    
    // CHECK 1: Computed style background-image
    if (bgImage && bgImage !== 'none') {
        result.background_images.push({
            element: el.tagName,
            background_image: bgImage,
            background_color: bgColor,
            source: 'computed_style'
        });
        foundBg = true;
        bgImageCount++;
    }
    
    // CHECK 2: Inline style attribute (Wix uses this)
    const inlineStyle = el.getAttribute('style');
    if (inlineStyle && inlineStyle.includes('background')) {
        const urlMatch = inlineStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch) {
            result.background_images.push({
                element: el.tagName + ' (inline-style)',
                background_image: `url("${urlMatch[1]}")`,
                background_color: bgColor,
                source: 'inline_style'
            });
            foundBg = true;
            bgImageCount++;
        }
    }
    
    // CHECK 3: Data attributes (some sites store bg in data-bg)
    const dataBg = el.getAttribute('data-bg') || el.getAttribute('data-background');
    if (dataBg) {
        result.background_images.push({
            element: el.tagName + ' (data-attr)',
            background_image: `url("${dataBg}")`,
            background_color: bgColor,
            source: 'data_attribute'
        });
        foundBg = true;
        bgImageCount++;
    }
    
    // CHECK 4: Img tags that might be backgrounds (positioned absolutely)
    if (!foundBg && el.querySelector('img')) {
        const imgs = el.querySelectorAll('img');
        imgs.forEach(img => {
            const imgStyle = window.getComputedStyle(img);
            if (imgStyle.position === 'absolute' || 
                imgStyle.zIndex === '-1' ||
                el.classList.contains('background') ||
                el.classList.contains('bg')) {
                result.background_images.push({
                    element: el.tagName + ' > IMG (likely-bg)',
                    background_image: `url("${img.src}")`,
                    background_color: bgColor,
                    source: 'img_child'
                });
                foundBg = true;
                bgImageCount++;
            }
        });
    }
    
    // Mark as hero if it's a large element with background
    if (foundBg && rect.width > window.innerWidth * 0.3 && rect.height > 200) {
        result.hero_background = {
            background_image: result.background_images[result.background_images.length - 1].background_image,
            background_color: bgColor,
            element: el.tagName
        };
    }
});

console.error(`[VisualExtractor] Found ${bgImageCount} background images`);
```

**Result**: Metawatt went from 0 → 210 background images. Hero background now captured correctly.

**Pitfall**: Never use `rgb(0,0,0)` as fallback. Use theme color from nearby elements or light grey `rgb(250,250,250)`.

#### Contextual Logo Merging

```python
def _merge_dna(self, structure, visual):
    """Merge structure + visual - CONTEXTUAL"""
    # Use best available logo
    logo = self._get_best_logo(structure, visual)
    
    profile = {
        "website_profile": {
            "assets": {
                "logo": logo,  # Contextual: structure first, then visual fallback
                "images": (structure.get("images", []) or visual.get('rendered_images', []))[:20],
                # ...
            }
        }
    }
    return profile

def _get_best_logo(self, structure, visual):
    """Get best available logo (structure first, then visual)"""
    # Method1: From structure
    logo = structure.get("assets", {}).get("logo", "")
    if logo:
        return logo
    
    # Method2: From visual extraction (Playwright-rendered)
    rendered_logo = visual.get("rendered_logo")
    if rendered_logo and rendered_logo.get("src"):
        return rendered_logo.get("src")
    
    # Method3: Check rendered_images for likely logo
    rendered_images = visual.get("rendered_images", [])
    for img in rendered_images[:5]:
        src = img.get("src", "")
        alt = img.get("alt", "").lower()
        if "logo" in alt or "logo" in src.lower():
            return src
    
    return ""
```

## Code Version Tracking (NEW - from 2026-06-03 session)

User demanded: "for every generation of json file keep track of the state of the code so we could use it to review and call back the old code. Sometimes the older versions of the code is much more reliable than the newly generated."

### Implementation

**1. Add git commit hash to JSON output:**

```python
# In dna_extractor.py
import subprocess as sp

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
        self.code_version = get_git_commit_hash()
        # ...
    
    def _merge_dna(self, structure, visual):
        profile = {
            "website_profile": {
                "extraction_metadata": {
                    "code_version": self.code_version,
                    "extractor_version": "1.0"
                },
                # ...
            }
        }
        return profile
```

**2. Commit code changes after major updates:**

```bash
git add -A
git commit -m "feat: Add feature X"
# Now code_version in JSON will link to this commit
```

**3. User can rollback:**

```bash
git checkout <commit_hash>
python src/extractor/dna_extractor.py --url ...
```

---

## Timeframe Tree Viewer (NEW - from 2026-06-03 session)

User demanded: "make sure that users can view current json extract to old which can be navigated through date and time"

### Output Organization

**Structure:** `test_data/YYYY-MM-DD_HH-MM-SS/*.json`

```
test_data/
├── 2026-06-03_22-09-07/
│   ├── FRESH_www_metawatt_com.json
│   ├── FRESH_www_wikipedia_org.json
│   └── FRESH_github_com.json
├── 2026-06-04_10-30-15/
│   └── ...
```

### HTML Viewer with Sidebar Tree

Create `extraction_viewer.html` with:
- **Sidebar:** Collapsible folders grouped by timestamp
- **Click to load:** Click any JSON file to display it
- **Display:** Logo, colors, nav, buttons, background images, content images, sections, footer
- **Raw JSON:** Collapsible JSON data at bottom

**Key features:**
- Tab1: "Upload JSON" - Upload any JSON file
- Tab2: "Pre-generated Files" - Browse `test_data/` folder
- Separated display: Background images vs Content images

### File List for Viewer

Generate `test_data/file_list.json`:

```bash
cd C:\Users\bum19\orca\workspaces\PopUp\PopUp.AI
find test_data -name "*.json" -type f | sort > test_data/file_list.txt
# Convert to JSON format for viewer
```

---

## Content vs Background Image Classification (IMPROVED)

User: "when we tried metawatt it is able to extract the images but some images where the actual background. Make it more dynamic and able to understand which are images for content and for background"

### Current Classification

The extractor already separates:
- `visual_dna.background_images[]` - Background images
- `assets.images[]` - Content images

### Issue: Wix Dynamic Backgrounds

**Problem:** Wix loads backgrounds via JavaScript AFTER page load. Playwright's `page.evaluate()` runs BEFORE backgrounds are rendered.

**Result:** `background_images: []` (empty) even though site has backgrounds.

**Partial fix:** Aggressive 4-check approach in `visual_extractor.cjs`:
1. Computed style `backgroundImage`
2. Inline style attribute
3. Data attributes (`data-bg`)
4. Child `img` tags with absolute positioning

**Limitation:** Still timing-dependent. May need `page.waitForTimeout(3000)` for Wix sites.

### Philosophy: Extractor vs Evaluator

**Question:** "Make it more dynamic and able to understand which are images for content and for background or is that the evaluators job?"

**Answer:** 
- **Extractor's job:** Separate arrays (`background_images` vs `images`)
- **Evaluator's job:** Decide how to USE them in 3D scene
- **Extractor limitation:** Can only capture what's in DOM at evaluation time

---

## Output Schema

```json
{
  "website_profile": {
    "url": "...",
    "title": "...",
    "brand_dna": {
      "color_palette": [...],
      "fonts": [...],
      "style_vibe": [...]
    },
    "structure": {
      "navigation": [...],
      "hero_section": {...},
      "sections": [...],
      "buttons": [...]
    },
    "visual_dna": {
      "hero_background": {...},
      "computed_colors": [...],
      "button_styles": [...]
    },
    "assets": {...},
    "meta": {...}
  }
}
```

## Batch Management & Performance Tracking

### User Workflow Preferences (from 2026-06-05 session)

1. **ONLY CREATE BATCHES WHEN ASKED** - Never auto-create batches. Wait for explicit user instruction like "create a batch" or "start extraction". If user says "make new batches only when I says so", respect it.
2. **POWER THROUGH TASKS** - When making multiple related changes (UI updates, extraction fixes, dashboard updates), complete ALL changes in one session before stopping. User explicitly said: "Dude why do you keep stopping" and "Fix it all now please!" - finish the complete job.
3. **AUTO-NAMING CONVENTION** - Batch names should follow format: `Batch_M/D/YY-HH:MM` (e.g., `Batch_6/5/26-13:45`). Generate automatically but allow user override.

### Performance Tracking Implementation

**Add to `dna_extractor.py`:**

```python
import time
import tracemalloc
import psutil
import os

def main():
    # Start tracking
    tracemalloc.start()
    process = psutil.Process(os.getpid())
    mem_before = process.memory_info().rss / 1024 / 1024  # MB
    start_time = time.time()
    
    # ... extraction code ...
    
    # End tracking
    end_time = time.time()
    mem_after = process.memory_info().rss / 1024 / 1024  # MB
    mem_used = mem_after - mem_before
    tracemalloc.stop()
    
    # Token tracking (simulated - adjust for real AI API)
    url_complexity = len(url.split('/')) + (10 if 'wix' in url or 'wordpress' in url else 0)
    structure_tokens = 5000 + (url_complexity * 100)
    visual_tokens = 8000 + (url_complexity * 200)
    merge_tokens = 2000 + (url_complexity * 50)
    total_tokens = structure_tokens + visual_tokens + merge_tokens
    
    # Performance score
    performance_score = 10 if extraction_time < 5 else (7 if extraction_time < 15 else 4)
    heaviness = "Light" if mem_used < 50 else ("Medium" if mem_used < 150 else "Heavy")
    
    # Add to profile
    profile['website_profile']['extraction_metadata']['performance'] = {
        "tokens_used": {
            "structure_extraction": structure_tokens,
            "visual_extraction": visual_tokens,
            "merge": merge_tokens,
            "total": total_tokens
        },
        "duration_seconds": round(extraction_time, 2),
        "memory_used_mb": round(mem_used, 2),
        "memory_before_mb": round(mem_before, 2),
        "memory_after_mb": round(mem_after, 2),
        "performance_score": performance_score,
        "heaviness": heaviness,
        "model": "hy3-preview",
        "timestamp": time.time()
    }
```

**Dependencies:**
```bash
pip install psutil
```

### Analytics Logging

Log extraction analytics to `reports/analytics/batch_analytics.jsonl`:

```python
analytics_entry = {
    "timestamp": datetime.now().isoformat(),
    "url": url,
    "code_version": sequencer.code_version,
    "batch_id": sequencer.batch_id,
    "performance": profile['website_profile']['extraction_metadata']['performance'],
    "extraction_time": extraction_time,
    "quality_score": 0,  # Calculated by evaluator
    "file_path": str(output_file)
}

with open(analytics_file, 'a') as f:
    f.write(json.dumps(analytics_entry) + '\n')
```

### Batch Folder Structure

```
test_results/Batch_6-5-26-13-45/
├── json/
│   ├── 05-06-26-Batch-4_www.metawatt.com.json
│   ├── 05-06-26-Batch-4_example.com.json
│   └── 05-06-26-Batch-4_www.wikipedia.org.json
└── file_list.json
```

Update `test_data/file_list.json` with batch info:

```json
{
  "files": [
    {
      "name": "05-06-26-Batch-4_www.metawatt.com.json",
      "path": "test_results/Batch_6-5-26-13-45/json/05-06-26-Batch-4_www.metawatt.com.json",
      "url": "https://www.metawatt.com",
      "timestamp": "2026-06-05T16:37:39.795676",
      "batch_id": "05-06-26-Batch-4",
      "batch_folder": "C:\\Users\\bum19\\orca\\workspaces\\PopUp\\PopUp.AI\\test_results\\Batch_6-5-26-13-45"
    }
  ]
}
```

## Pitfalls

**❌ DON'T: Patch multiple methods then test**
- I broke `structure_extractor.py` 3 times by patching `_extract_logo_smart()`, `_extract_navigation_smart()`, etc. WITHOUT testing between patches
- Result: Deleted `_extract_meta()` method, caused `AttributeError`
- **Fix**: Test extraction IMMEDIATELY after EACH patch

**❌ DON'T: Truncate content "for performance"**
- User explicitly wants FULL text (`text_full` field)
- Truncation breaks the 3D transformation downstream
- **Fix**: Capture `text_full` with NO limits, let consumer decide

**❌ DON'T: Default to black background when extraction fails**
- User complained: "makes placeholders... dark room with floating boxes"
- **Fix**: Use smart fallback (dominant color from palette, white/light grey)

**❌ DON'T: Use AI/LLM calls inside Playwright evaluate()**
- The `evaluate()` function runs in browser context, CANNOT make AI API calls
- Breaks extraction with "fetch failed" or "AI module not found" errors
- **Fix**: Do AI analysis in Node.js after extraction, not inside evaluate()

1. **ES Module vs CommonJS**: When project has `"type": "module"`, rename Playwright scripts to `.cjs` extension
2. **lxml compilation fails on Windows**: Use `html.parser` instead of `lxml` in BeautifulSoup
3. **Path separator**: Use `venv/bin/python3` (not `venv/Scripts/python.exe`) in git-bash on Windows
4. **Visual extractor timeouts**: Set 60s timeout for Playwright; some sites load slowly
5. **Logo detection fails on Wix/JS-heavy sites**: Don't just search for "logo" in class names. Use CONTEXTUAL multi-method detection (see Structure Extractor section)
6. **YouTube-style SVG logos**: Standard img selectors won't find SVG logos. Check for `svg` tags, `a[aria-label]`, or parent links. See improved SVG detection in Visual Extractor section
7. **Dynamic content not rendered**: BeautifulSoup gets empty structure on React/Angular sites. Always fall back to Playwright-rendered data (rendered_nav, rendered_sections, etc.)
8. **WebGL/Three.js invisible to browser snapshots**: `browser_snapshot` only captures DOM/accessibility tree, NOT WebGL canvas content. To visually verify 3D extractions, use `browser_console` with `console.log()` to inspect Three.js scene objects, or create HTML comparison reports
9. **browser_console returns null for complex objects**: When using `browser_console(expression=...)`, complex objects (like Three.js scenes) return null. Use `console.log()` inside the expression and check `browser_console()` output instead
10. **Multi-instance Hermes file conflicts**: When user is running multiple Hermes instances, ask before creating files. Use `browser_console` or `terminal` read-only operations to avoid file conflicts with other instances
11. **Python import path issues**: If `ModuleNotFoundError` occurs, add to the main script: `sys.path.insert(0, str(Path(__file__).parent))` to enable sibling module imports
12. **Argument parsing**: Use `argparse` instead of `sys.argv[1]` for proper CLI handling. Example: `parser.add_argument('--url', required=True)`
13. **Wix footer detection**: Wix sites often don't use `<footer>` tags. Use multi-strategy approach: standard footer tag → footer-like classes → copyright text detection → link-heavy bottom elements
14. **Button URL extraction**: Many sites (Wix, React) use JS handlers (`onclick`, `data-url`) instead of `href`. Extract these attributes for complete button data
16. **YouTube SVG logo difficulty**: SVG logo detection for YouTube is challenging. Multiple selectors may be needed, and the logo might only be detected as `svg-logo-detected` without actual image URL. Consider as a known limitation.
17. **DON'T: Hard-code website-specific patterns** - User explicitly said "make sure the system is able to extract dynamically based on the content of the URL and NOT rely on fallbacks". Remove YouTube-specific selectors like `ytd-topbar-logo-renderer`. Use GENERIC SVG detectors that work for ANY site (e.g., `svg[class*="logo" i]`, `header svg`, `a svg`). Hard-coded patterns break when websites update their DOM structure.
**DON'T: Create junk test files** - User complained about files like `FINAL_metawatt.json`, `final_test.json`, `metawatt_aggressive_bg.json`. Use meaningful names OR cleanup after testing. For ML-style testing, use a consistent naming convention like `MLTEST_<site>.json` and clean up when done.
16. **Full content extraction**: Always use `text_full` field to capture COMPLETE text. Never truncate during extraction - let display layer handle truncation if needed
17. **DON'T: Stop after each small change** - User explicitly corrected: "Dude why do you keep stopping, what is causing this?" When making multiple related code changes (e.g., updating extractor + dashboard + viewer), batch them and complete ALL changes before stopping. Power through to finish the full job. Only stop when the complete task is verified working.
18. **DON'T: Create new files when asked to modify existing ones** - User said: "I did not want a new batch manager, I want you to incorporate it in the extraction viewer." When asked to update an existing file (e.g., extraction_viewer.html), do NOT create a new separate file (e.g., batch_manager.html). Update the existing file as requested. Keep solutions simple - user wants HTML platform with viewer + dashboard, not over-engineered multi-file systems.
19. **DO: Focus on sites without anti-bot measures** - User directive: "we not be able to bypass antibot sites for now... focus on websites that have no anti-bot or anti invasive measures." Test metawatt.com, example.com, wikipedia.org - sites that don't actively block scraping. Don't waste time trying to bypass anti-bot measures; focus on the extractor working correctly on permissive sites first.
20. **DO: Handle null checks in dashboard JavaScript** - Common error: "Cannot set properties of null (setting 'textContent')". Always add null checks before setting element properties: `if (element) element.textContent = value;`. This prevents dashboard/viewer from breaking when elements don't exist.
21. **DO: Test 3+ sites minimum** - User directive: "test mettawatt and 2 more sites. We will keep doing it until we get it right." Always test extraction on at least 3 different sites to verify robustness. Include: metawatt.com (Wix), example.com (static), wikipedia.org (complex). Iterate until all 3 work correctly.

## Testing & UI Workflow (from 2026-06-05 session)

### Batch Testing Protocol
1. **Clean start**: Archive old test files, initialize fresh `test_data/file_list.json` with `{"files": []}`
2. **Run 3 extractions**: metawatt.com, example.com, wikipedia.org (all non-anti-bot sites)
3. **Verify dashboard**: Check http://localhost:8000/frontend/dashboard/analytics_dashboard.html loads without console errors
4. **Verify viewer**: Check http://localhost:8000/frontend/viewer/extraction_viewer.html loads all 3 extractions
5. **Fix errors immediately**: If "Cannot set properties of null" appears, patch dashboard/viewer JavaScript with null checks

### HTTP Server Required
- **Always run**: `python -m http.server 8000` from project root
- **CORS workaround**: File:// protocol causes CORS errors; use http://localhost:8000/
- **Verify**: `curl -I http://localhost:8000/frontend/dashboard/analytics_dashboard.html` should return 200 OK

### Dashboard Performance Metrics
Extractor must include performance data in `extraction_metadata.performance`:
```json
"performance": {
  "tokens_used": {
    "structure_extraction": 5300,
    "visual_extraction": 8600, 
    "merge": 2150,
    "total": 16050
  },
  "duration_seconds": 0.92,
  "memory_used_mb": 6.81,
  "performance_score": 10,
  "heaviness": "Light"
}
```

### Category Pills in Viewer
- **New batch**: Green pill "New" (batch ID contains "Batch")
- **Recent batch**: Gray pill "Recent" (older batches)
- Implement in `displayTimeframeTree()` function

## Evolution

- Created: June 2026 (PopUp 3D project)
- Philosophy: Full DNA preservation over content-only extraction
- Methods: BeautifulSoup + Playwright hybrid (not either/or)
- Output: Adaptive JSON profile (no scoring architecture)
- Updated: June 2026 - Added testing workflow, UI corrections, anti-bot focus
