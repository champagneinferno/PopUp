# Skills & Research: Building Self-Evolving Systems

## THE PROBLEM WITH HARDCODED SYSTEMS

Traditional web scrapers/extractors are **hardcoded**:
- You write specific selectors: `document.querySelector('.hero-title')`
- You write specific rules: `if site == 'Wix' then do X`
- When the website changes → **everything breaks**
- You have to manually update code for every site

**This doesn't scale.** Every website is different. Business websites change their structure. You can't hardcode rules for every possible site.

---

## THE SOLUTION: SELF-EVOLVING SYSTEMS (Skills + Research)

### WHAT ARE SKILLS?

**Skills = Procedural Memory**

Instead of hardcoding logic in code, you:
1. **Extract patterns** from successful extractions
2. **Save them as skills** (reusable procedures)
3. **Load skills** when encountering similar situations
4. **Update skills** when patterns change

**Example:**
```python
# HARDCODED (bad)
if 'wixsite.com' in url:
    framework = 'wix'
    use_wix_selectors()

# SKILL-BASED (good)
framework = detect_framework(url, html)
skill = load_skill(f'extract-{framework}')
result = skill.apply(html)
```

### WHAT IS RESEARCH?

**Research = Learning New Patterns**

Before implementing, you:
1. **Read expert knowledge** (tips, papers, articles)
2. **Understand WHY it works** (not just HOW)
3. **Save insights to memory** (for future use)
4. **Document in `research/`** (so you can reference later)
5. **THEN implement as skills** (when ready)

**Example:**
```
Research phase:
- Read "12 tips on how to think like a web scraping expert.txt"
- Learn: Framework detection is important (Tip #7)
- Save: research/web_scraping_expert_tips.md
- Memory: "PopUp.ai targets BUSINESS WEBSITES"

Implementation phase (later, when PM returns):
- Create skill: `framework-detection`
- Update `dna_extractor.py` to use skill
- Test on 5 business websites
- Update skill based on results
```

---

## WHY THIS MATTERS FOR PopUp.ai

### CURRENT STATE (Hardcoded):
```python
# dna_extractor.py (simplified)
def extract_hero_section(html):
    # Hardcoded selectors
    hero = soup.select_one('.hero')
    if not hero:
        hero = soup.select_one('#hero')
    if not hero:
        hero = soup.select_one('section[class*="hero"]')
    return hero
```

**Problems:**
- Breaks when site uses different class names
- Doesn't adapt to different frameworks (Wix vs WordPress vs custom)
- Can't handle dynamic content (React/Next.js)
- Requires manual updates for every new site

### FUTURE STATE (Self-Evolving with Skills):
```python
# dna_extractor.py (skill-driven)
def extract_hero_section(html, url):
    # Load relevant skills
    framework = detect_framework(html)  # from research
    skill = load_skill(f'extract-hero-{framework}')
    
    if not skill:
        # No skill yet → use research-backed fallback
        skill = load_skill('extract-hero-generic')
    
    # Apply skill
    result = skill.apply(html, url)
    
    # Self-improvement: save successful patterns
    if result.confidence > 0.8:
        update_skill(skill, result.pattern)
    
    return result
```

**Benefits:**
- ✅ Adapts to different frameworks automatically
- ✅ Learns from successful extractions
- ✅ Improves over time (self-evolving)
- ✅ Handles dynamic content (via research on Playwright/Scrapling)
- ✅ Scales to ANY business website

---

## TODAY'S GOAL: UNDERSTANDING & DOCUMENTATION

### WHAT WE'RE DOING:

1. **Understanding Skills** (this document)
   - What they are
   - Why they matter
   - How to create/use them

2. **Understanding Research** (in `research/`)
   - How to read expert knowledge
   - How to save insights
   - How to apply later as skills

3. **Moving from Hardcoded → Self-Evolving**
   - Document current hardcoded parts
   - Identify which skills are needed
   - Create research-backed skill roadmap

4. **Making it Transferable** (PC version)
   - Commit everything important
   - Push to `origin/main`
   - You pull on PC → continue working

---

## THE WORKFLOW (Agile + ML-like)

```
┌─────────────────────────────────────────────────────┐
│ 1. RESEARCH (Read & Learn)                         │
│    - Read expert tips/papers                      │
│    - Save insights to memory                      │
│    - Document in research/                       │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 2. EXTRACT (Test on Business Websites)             │
│    - Batch extract target sites                    │
│    - Generate HTML reports                        │
│    - Screenshot for visual validation             │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 3. EVALUATE (Check Quality)                       │
│    - Run evaluator.py                              │
│    - Check: logo_extracted?                       │
│    - Check: background_image_count?                │
│    - Check: quality_score (0-8)?                  │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 4. ITERATE (Improve Extractor)                    │
│    - If quality low → research WHY                │
│    - Update extraction approach                    │
│    - Go to step 2 (re-extract)                  │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 5. SCALE (More Sites)                            │
│    - Once target sites work well                  │
│    - Add more business websites                   │
│    - Extract → Evaluate → Iterate                 │
└─────────────────────────────────────────────────────┘
```

---

## NEXT STEPS (After PM Returns)

When the Project Manager returns and integration starts:

1. **Convert Research → Skills**
   - `research/web_scraping_expert_tips.md` → `skills/extractor/framework-detection.md`
   - `research/self-learning-systems.md` → `skills/extractor/adaptive-parsing.md`

2. **Update Extractor to Use Skills**
   - `dna_extractor.py` loads skills dynamically
   - No more hardcoded framework checks

3. **Update Evaluator to Use Skills**
   - `evaluator.py` loads 3D rules from skills
   - Adapts to business website type (corporate, startup, ecommerce)

4. **Test Self-Evolution**
   - Extract 10 business websites
   - Check if quality improves over time
   - Verify skills are being updated

---

## FILES & DIRECTORIES

```
PopUp/
├── backend/
│   └── server.js              ← Node.js backend (NOT hardcoded, uses skills)
├── research/
│   └── web_scraping_expert_tips.md  ← Expert knowledge (LEARNED, not implemented)
├── skills/                     ← (removed, moved to research/)
├── src/extractor/
│   ├── dna_extractor.py        ← Currently hardcoded (WILL BE UPDATED to use skills)
│   └── evaluator.py            ← Currently hardcoded (WILL BE UPDATED to use skills)
├── docs/
│   └── SKILLS_AND_RESEARCH.md  ← THIS FILE (explains the approach)
└── README.md                   ← (update to reference this doc)
```

---

## SUMMARY

**HARDCODED** = Write specific rules → breaks when sites change  
**SELF-EVOLVING** = Learn patterns → adapt to any site → improve over time  

**Skills** = Procedural memory (how to do things)  
**Research** = Domain knowledge (why things work)  

**Goal:** Make PopUp.ai **adapt to any business website** without manual updates.

---

**Next:** Pull this on your PC and continue the research → skills → implementation cycle.
