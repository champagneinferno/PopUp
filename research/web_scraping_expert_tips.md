# Web Scraping Expert Tips - Research for PopUp.ai

**Source:** "12 tips on how to think like a web scraping expert.txt"  
**Date:** 2026-06-09  
**Purpose:** Document expert knowledge for future PopUp.ai skill updates and extractor improvements

---

## **Critical Realization: PopUp.ai Targets BUSINESS WEBSITES**

NOT random websites. Business sites have:
- **Goals:** conversion, branding, trust
- **Structure:** hero, CTAs, testimonials, pricing
- **Design:** professional, corporate, clean
- **3D needs:** subtle, professional animations (NOT flashy)

**Implication:** Extraction/evaluation must prioritize business-relevant elements.

---

## **12 Expert Tips - Analysis & PopUp.ai Application**

### **Tip #1: Choose Data Source Wisely**
**Expert Insight:** Check for official API first. If unavailable, consider website or mobile app. Try multiple sources.

**PopUp.ai Application:**
- Add API detection to DNA extractor
- Check for `/api`, `/graphql`, `/rest` endpoints
- If API exists, use it for cleaner data extraction
- Fallback to HTML scraping if API unavailable

**Future Skill Update:** "API-First Extraction" skill

---

### **Tip #2: Check robots.txt and sitemap**
**Expert Insight:** robots.txt describes allowed behavior for crawlers. sitemap describes site structure. Useful for understanding site structure and finding direct links.

**PopUp.ai Application:**
- Add `fetch_robots_txt()` to DNA extractor
- Add `fetch_sitemap()` to discover site structure
- Use sitemap to identify important pages for 3D transformation
- Respect robots.txt rules (ethical scraping)

**Future Skill Update:** "Site Analysis Pre-Extraction" skill

---

### **Tip #3: Don't Neglect Site Analysis**
**Expert Insight:** Thorough site analysis is crucial. Sometimes analysis reveals data can be obtained with a single request (no scraper needed).

**PopUp.ai Application:**
- Add "Pre-Extraction Analysis" phase
- Detect if site is static (simple fetch) or dynamic (Playwright needed)
- Identify key pages: homepage, pricing, about, contact
- Optimize extraction strategy based on site complexity

**Future Skill Update:** "Adaptive Extraction Strategy" skill

---

### **Tip #4: Maximum Interactivity**
**Expert Insight:** Interact with site elements while watching Network tab. Understand frontend-backend interaction.

**PopUp.ai Application:**
- Use Playwright to interact with site BEFORE extraction
- Monitor network requests to understand data flow
- Detect AJAX calls that load critical content
- Capture dynamic content that appears after interaction

**Future Skill Update:** "Interactive Pre-Analysis" technique

---

### **Tip #5: Data Doesn't Appear Out of Thin Air**
**Expert Insight:** Data seen on page comes from somewhere (previous request, API, JS generation). Trace data origins.

**PopUp.ai Application:**
- Add "Data Lineage Tracking" to DNA extractor
- Trace where elements come from (API response? Inline HTML? CDN?)
- Match extracted elements to their data sources
- Use origin info for better 3D decisions (e.g., high-res CDN images → better textures)

**Future Skill Update:** "Data Origin Tracing" skill

---

### **Tip #6: Data is Cached**
**Expert Insight:** Sites cache data. Analyze in incognito mode. Clear cache between analyses.

**PopUp.ai Application:**
- Always launch Playwright in incognito/private mode
- Clear cookies/storage between extractions
- Ensure consistent extraction results (not affected by cache)
- Test extraction multiple times to verify consistency

**Already Implemented:** Playwright launches fresh browser context each time ✓

---

### **Tip #7: Learn More About the Framework** ⭐ **IMPLEMENTED**
**Expert Insight:** If site uses unknown framework, learn about it. Framework knowledge informs extraction strategy.

**PopUp.ai Application (ALREADY IMPLEMENTED):**
- ✓ Added `detect_framework()` to `dna_extractor.py`
- ✓ Detects: Wix, WordPress, Shopify, Next.js, React, Vue, Angular, Squarespace, Webflow
- ✓ Added Phase 3: Framework Detection to extraction pipeline
- ✓ Framework info added to output JSON profile

**Next Step:** Use framework detection to adapt extraction strategy:
- Wix sites → Bold, artistic 3D
- WordPress → Clean, professional 3D
- Shopify → Product-focused 3D with shopping elements

**Future Skill Update:** "Framework-Specific Extraction" skill

---

### **Tip #8: Reverse Engineering**
**Expert Insight:** Web scraping = reverse engineering. Study frontend-backend interaction. Decide when to switch from HTTP to headless browser.

**PopUp.ai Application:**
- Already using Playwright (headless browser) - good!
- Add "Protection Detection": detect if site uses anti-scraping (Cloudflare, CAPTCHA)
- If simple HTTP fails, automatically switch to Playwright
- Study JS code to understand custom data attributes/API endpoints

**Future Skill Update:** "Adaptive Protection Bypass" skill (ethical, for public data only)

---

### **Tip #9: Test Requests to Endpoints**
**Expert Insight:** After identifying endpoints, test them. Check for required headers, cookies, referrer. Some sites require specific header order.

**PopUp.ai Application:**
- Add "API Endpoint Testing" to DNA extractor
- If API detected (Tip #1), test endpoints with different parameters
- Discover hidden parameters (`per_page`, `limit`, `sort`, `order`)
- Handle authentication if needed (public data only)

**Future Skill Update:** "API Endpoint Exploration" skill

---

### **Tip #10: Experiment with Request Parameters**
**Expert Insight:** Change request parameters to discover new data. GraphQL especially supports custom field selection.

**PopUp.ai Application:**
- Add "Parameter Experimentation" for API endpoints
- Try different `sort`, `limit`, `filter` values
- For GraphQL: request additional fields not shown in UI
- Discover "hidden" data available via API but not displayed on site

**Example from Expert Tip:**
```python
# Instead of basic query, request MORE fields
data = {
    "query": """
        query Posts {
            posts {
                id
                title
                content  # Not shown in UI, but available via API!
                author
                createdAt
            }
        }
    """
}
```

**Future Skill Update:** "Parameter Fuzzing for Data Discovery" skill

---

### **Tip #11: Don't Be Afraid of New Technologies**
**Expert Insight:** Don't just use familiar tools. New sites use new technologies. Learn curl_cffi, botasaurus, Crawlee.

**PopUp.ai Application:**
- Evaluate if Playwright is still the best choice (it probably is ✓)
- Consider adding fallback extractors:
  - `curl_cffi` for sites with TLS fingerprint protection
  - `botasaurus` for stealth scraping
  - `Crawlee` for large-scale crawling
- Keep tech stack updated as web technologies evolve

**Future Skill Update:** "Multi-Tool Extraction Strategy" skill

---

### **Tip #12: Help Open-Source Libraries**
**Expert Insight:** Web scraping relies on open-source. Support tools you use (Crawlee, Scrapling, etc.).

**PopUp.ai Application:**
- Document PopUp.ai extraction techniques publicly
- Contribute to Playwright, BeautifulSoup if we fix bugs
- Share framework detection techniques with community
- Open-source PopUp.ai extractor for others to learn from

**Future Action:** Consider open-sourcing PopUp.ai extractor module

---

## **Summary: Research Findings & Next Steps**

### **What We Learned:**
1. **Business websites** need different extraction approach than random sites
2. **Framework detection** is CRITICAL (already implemented ✓)
3. **API-first approach** yields better data (not yet implemented)
4. **Site analysis before extraction** saves time (not yet implemented)
5. **Data tracing** improves element understanding (not yet implemented)

### **What We Documented:**
- 12 expert tips with PopUp.ai applications
- 1 technique already implemented (framework detection)
- 11 techniques flagged for future skill updates

### **Next Steps (When PM Returns / When Needed):**
1. **Create new skills** based on this research:
   - `api-first-extraction` skill
   - `site-analysis-pre-extraction` skill
   - `data-origin-tracing` skill
   - `parameter-fuzzing` skill
2. **Update existing skills:**
   - Update `website-dna-extraction.md` with framework-specific strategies
   - Update `website-to-3d-evaluator.md` with business-website-focused evaluation
3. **Implement gradually:**
   - Don't implement all at once
   - Wait for PM integration
   - Implement when specific need arises

---

## **Memory & Skill Updates**

**This research is saved:**
- ✅ In this .md file (`research/web_scraping_expert_tips.md`)
- ✅ In memory (key insights)
- ⏳ Ready for skill creation/update when needed

**Next time PM integrates or we need to improve extractor:**
1. Read this research file
2. Pick 1-2 techniques to implement
3. Create/update skills accordingly
4. Test on business websites (not random sites)

---

**File Created:** 2026-06-09  
**Status:** RESEARCH COMPLETE - Ready for future implementation  
**Next Action:** Wait for PM integration / user-provided .txt files / specific implementation needs
