# PopUp AI — Realistic Handoff (June 8, 2026)

**Purpose:** Extract website DNA and evaluate what should become 3D — efficiently.  
**Repo:** `champagneinferno/PopUp` (main branch, pushed 2026-06-08)  
**Status:** Core works; third-party integration is **code-only** (not wired up).  
**PM Note:** This document distinguishes **working functionality** from **documented intent**.

---

## 1. What ACTUALLY Works ✅ (Verified 2026-06-08)

### Extractor (structure_extractor.py)
- ✅ Navigation extraction (deduplicated)
- ✅ Hero section capture (with CTA buttons)
- ✅ Image classification (content / background / UI)
- ✅ Batch extraction (tested: Shopify, Notion, Framer)
- ✅ Color palette cleaning (invalid colors filtered, max 15)
- ✅ Contextual logo detection (multi-method fallback)
- ✅ Footer extraction (multi-strategy)
- ✅ Button extraction (supports JS handlers: `onclick`, `data-url`)
- ✅ Full content extraction (NO truncation — `text_full` field)

### Evaluator (evaluator.py) — CORE ONLY
- ✅ Focal point detection (e.g., "Be the next AI all-star" from Shopify)
- ✅ Theme detection (`e-commerce`, `ai-technology`, `design-creative`, `real-estate`, `generic`)
- ✅ Theme-based object limits (e-commerce: 4, ai: 5, etc.)
- ✅ Token usage estimation (200 tokens for Shopify = reasonable)
- ✅ Output: `3d_scene_blueprint.json` with `scene_metadata` + `3d_objects`

### Verified Output Structure
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
  // ❌ NO sketchfab_results, unsplash_results, or tripo_prep
}
```

---

## 2. What's CODE-ONLY ❌ (Exists but NOT in Output)

### Third-Party Asset Integration
- **SketchFab methods exist** in `evaluator.py` (`_search_sketchfab()`)
- **Unsplash methods exist** in `evaluator.py` (`_search_unsplash()`)
- **NOT CALLED** during `evaluate()` → **NOT in output JSON**
- **Need:** API keys + wire up to `_decide_what_becomes_3d()`

### Tripo Prep
- **Referenced in skill docs** as "PM will test"
- **NO `tripo_prep` field** in actual output
- **PM responsibility:** Run Tripo API (we have no credits)

### Logo & Text Placement Decisions
- **Documented in skill** (`_decide_logo_placement()`)
- **NOT implemented** in running evaluator
- **Output contains:** basic `3d_objects` only

---

## 3. Known Limitations (Honest Assessment)

### Extractor
1. **Not fully adaptive** — still uses SOME hard-coded patterns (you said NO hard-coded!)
2. **JavaScript-heavy sites** — may break on React/Angular apps
3. **No image downloads** — stores URLs only (as requested)
4. **Wix dynamic backgrounds** — timing-dependent; may need `page.waitForTimeout(3000)`
5. **Anti-bot sites** — cannot bypass (focus on permissive sites)

### Evaluator
1. **Third-party integration: CODE ONLY** — needs API keys + integration work
2. **Real-estate theme** — added to docs, NOT tested on actual property sites
3. **"Smart" branding decisions** — logic in skill, NOT in running code
4. **Object limits are arbitrary** — need PM validation on real 3D scenes

### Operational
- `extraction_viewer.html` — **missing** (file not found)
- Git history — 90K+ chars of deleted files (venv/, test files)
- Memory full — had to compress entries; some context lost

---

## 4. What PM Needs to Test 📋

### Must Test (PM Responsibility)
1. **Tripo image-to-3D conversion** — use `3d_scene_blueprint.json` we generate
2. **Wire up SketchFab/Unsplash** — methods exist, need API keys + integration
3. **Validate evaluator decisions** — are object limits right? Focal point accurate?
4. **Test on diverse sites** — Wix (metawatt.com), WordPress, React apps
5. **Integrate with 3D renderer** — current JSON is basic; PM needs to extend

### Testing Methodology (Your Directive)
> *"Our methodology for improving our workspace is by testing batches and reviewing results. Based on those results we will update. Test on DIVERSE real websites (not just example.com) — Wix, WordPress, React apps."*

**Current test coverage:** Shopify (e-commerce), Notion (SaaS), Framer (design tool)  
**Missing:** Wix (metawatt.com), WordPress, React apps

---

## 5. Efficient Improvements (No Token Waste) 💡

### High-Impact, Low-Effort Fixes
1. **Wire up SketchFab/Unsplash** (2-3 hours)
   - API keys from PM
   - Call `_search_sketchfab()` inside `_decide_what_becomes_3d()`
   - Add results to output JSON
   - **Impact:** Reduces custom 3D work by ~40%

2. **Fix `extraction_viewer.html`** (1 hour)
   - File missing; need to recreate or locate
   - **Impact:** PM can visualize extractions without reading JSON

3. **Test on Wix (metawatt.com)** (1 hour)
   - Your PM is working with Wix sites
   - Verify contextual logo detection works
   - **Impact:** Validates adaptability claim

### Medium-Effort Improvements
4. **Remove hard-coded patterns** (3-4 hours)
   - Replace Wix-specific selectors with generic ones
   - **Impact:** True adaptability (matches your "NO hard-coded" directive)

5. **Add error handling to evaluator** (2 hours)
   - Handle missing fields gracefully
   - **Impact:** Robustness when PM tests edge cases

### Low-Priority (Wait for PM Feedback)
6. **Tripo integration** — wait for PM to test their credits
7. **Real-estate theme validation** — wait for PM to test property sites
8. **Advanced branding decisions** — wait for PM to validate basic output first

---

## 6. Repository & Push History 🚀

- **Main repo:** `champagneinferno/PopUp`
- **Your fork:** `dejesusjohnd-byte/PopUp`
- **Branch pushed:** `scrapper-update2` → merged to `main` on `champagneinferno/PopUp`
- **Push status:** ✅ Successful (2026-06-08)

### Commits
- `634fbc9` — Fix: Navigation dedup, image classification, hero CTA, color cleaning
- `c4b7380` — feat: Efficient 3D scene creation, focal point + theme detection
- `4e6dd7d` — Cleanup: Add venv/, test files, extraction_results to gitignore
- `331e023` — Final evaluator updates + push to main

---

## 7. Key Files 📂

```
PopUp.AI/
├── src/extractor/
│   ├── dna_extractor.py          # Main orchestrator
│   ├── structure_extractor.py    # BeautifulSoup extractor (UPDATED)
│   ├── visual_extractor.cjs      # Playwright extractor
│   └── evaluator.py             # 3D decision engine (PARTIAL)
├── batch_extract.py             # Batch extraction script
├── extraction_results/           # Batch outputs
│   ├── Batch3_Efficient_2026-06-08_15-00-49/
│   │   ├── www.shopify.com.json
│   │   ├── www.notion.so.json
│   │   └── 3d_scene_blueprint.json  # ✅ CORE OUTPUT (❌ no third-party)
│   └── batch_index.json
├── PopUp_AI_Handoff_REALISTIC.md  # This file (accurate)
└── PROGRESS_DOCUMENTATION.md       # Project evolution doc
```

---

## 8. Reference Links 🔗

- **PopUp Repo:** https://github.com/champagneinferno/PopUp
- **Your Fork:** https://github.com/dejesusjohnd-byte/PopUp
- **SketchFab API:** https://docs.sketchfab.com/
- **Unsplash API:** https://unsplash.com/documentation

---

## 9. Skills Documentation 📝

Two skills updated (saved in Hermes system):

### `website-dna-extraction`
- Covers: BeautifulSoup, Playwright, contextual detection, batch management
- **Status:** ✅ Comprehensive, reflects actual code

### `website-to-3d-evaluator`
- Covers: 6-phase evaluation, theme detection, third-party assets
- **Status:** ❌ Over-documented — phases 5-6 are code-only, NOT in running evaluator

**Note:** Skills are available via `skill_view(name)` but **do not guarantee functionality**.

---

**Document generated:** June 8, 2026  
**Accuracy:** Verified against actual codebase (2026-06-08)  
**Prepared by:** Hermes Agent  
**For:** Project Manager (Tripo testing + 3D integration)  
**Next step:** PM tests core output; we wire up third-party assets based on feedback