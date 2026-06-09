# PopUp AI - Skills Export for PM

**Date:** June 8, 2026  
**From:** Co-Developer (You) to Project Manager  
**Purpose:** Share the procedural knowledge (skills) used to build the extractor/evaluator system

---

## What Are These Files?

These `.md` files are **Hermes Agent skills** — the procedural knowledge base that drives the AI assistant's behavior when working on your project.

### Files Included:

1. **`website-dna-extraction.md`** — The extraction skill
   - How the DNA extractor works (BeautifulSoup + Playwright)
   - User preferences & pitfalls (learned from sessions)
   - Code patterns for structure/visual extraction
   - Tested on: Shopify, Notion, Framer, Metawatt (Wix)

2. **`website-to-3d-evaluator.md`** — The evaluator skill
   - How the evaluator decides what becomes 3D
   - Theme detection, object limits, third-party asset integration
   - **IMPORTANT:** Some features are "code-only" (exist but not wired up)

---

## What's NOT Included (On Purpose)

**Memory (`memory/`, `user/` files):**  
- These contain YOUR personal working style, preferences, and corrections
- Irrelevant for the PM — they're about how YOU work, not the project itself
- Example memory entries: "User prefers concise responses", "User corrects me when I create new files"

**Actual Code (`src/extractor/`):**  
- The skills document the *logic* and *patterns*, not the full codebase
- The actual Python/JS code is in `src/extractor/` (already pushed to main)

---

## How to Use These Skills

### For the PM:
1. **Read them** to understand the decision logic behind extraction & evaluation
2. **See what's actually working** vs "documented but not wired up"
3. **Reference for Tripo testing** — the evaluator output format is documented here

### For Future Developers:
1. Load these skills into their own Hermes Agent instance
2. The agent will then "know" how to work on PopUp AI project
3. Skills auto-load when relevant tasks are detected (e.g., "evaluate website for 3D")

---

## Key Reality Checks (Read Before Testing)

### ✅ What ACTUALLY Works (Verified 2026-06-08)
- Core extraction (structure + visual DNA)
- Core evaluation (focal point, theme detection, object limits)
- Batch extraction (`batch_extract.py`)
- Output: `3d_scene_blueprint.json`

### ❌ What's CODE-ONLY (Not in Actual Output)
- SketchFab API integration (method exists, not called)
- Unsplash API integration (method exists, not called)
- Tripo preparation (method referenced, no credits)
- Logo/text placement decisions (documented, not implemented)

### 📋 PM Testing Responsibilities
1. Test Tripo image-to-3D with `3d_scene_blueprint.json`
2. Validate evaluator decisions (object limits, focal point accuracy)
3. Wire up SketchFab/Unsplash (if desired) — methods exist, need API keys
4. Test on diverse sites (Wix, WordPress, React apps)

---

## File Inventory

```
PopUp.AI/
├── skills/
│   ├── website-dna-extraction.md    ← EXPORTED SKILL (this file)
│   └── website-to-3d-evaluator.md   ← EXPORTED SKILL (this file)
├── PopUp_AI_Handoff_REALISTIC.md     ← For PM testing (accurate status)
├── PROGRESS_DOCUMENTATION.md           ← Project evolution (PopUp.AI → Dimension)
└── src/extractor/                     ← Actual code (pushed to main)
```

---

## Next Steps

1. **PM tests** `3d_scene_blueprint.json` with Tripo
2. **PM feedback** → we fix/improve based on real-world testing
3. **Wire up third-party assets** (after PM validates approach)
4. **Wait for PM** before modifying core extractor/evaluator files

---

**Questions?** Contact me (Co-Developer) via [your preferred channel].

**Note:** These skills are also available in the Hermes Agent system (if you use Hermes), but exported here as flat files for easy sharing.
