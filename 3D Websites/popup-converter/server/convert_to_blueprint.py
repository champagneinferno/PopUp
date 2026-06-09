#!/usr/bin/env python3
"""Convert raw extractor output → scene blueprint JSON."""
import json, sys, re

def convert(data):
    meta = data.get("meta", {})
    title = data.get("title", meta.get("og:title", "Untitled"))
    desc = meta.get("og:description", meta.get("description", ""))
    og_image = meta.get("og:image", "")
    headings = data.get("headings", [])

    theme = guess_theme(title, desc, headings)
    palette = THEMES.get(theme, THEMES["tech"])

    sections = build_sections(title, desc, headings, meta, palette)
    # Detect real sections from h2/h3, fallback to generated
    h2s = [h for tag, h in headings if tag == "h2"]
    h3s = [h for tag, h in headings if tag == "h3"]

    if len(h2s) < 2:
        sections = generate_sections(title, desc, ["hero"], palette)
    else:
        hero = {
            "tag": "HERO",
            "heading": next((h for tag, h in headings if tag == "h1"), title),
            "body": desc[:300],
            "camera": [0, 1.5, 3.5],
            "target": [0, 0.5, 0],
        }
        sections = [hero]
        for i, h2 in enumerate(h2s):
            sections.append({
                "tag": f"SITE_{i+1:02d}",
                "heading": h2,
                "body": h3s[i*2:(i+1)*2] if h3s else [],
                "stats": [],
                "camera": [[0, 1.2, 4.5], [0.8, 0.6, 3], [1.5, 0.3, 5.5], [-2, 0.5, 6]][i % 4],
                "target": [[0, 0.5, 0], [0.3, 0.5, 0], [-0.5, 0.3, 0], [0, 0.4, -0.3]][i % 4],
            })

    return {
        "sections": sections,
        "focal_point": title,
        "theme": theme,
        "branding": {
            "primary_color": palette["primary"],
            "secondary_color": palette["secondary"],
            "accent": palette["accent"],
            "og_image": og_image,
            "typography": {"family": "Inter", "fallback": "system-ui"},
        },
    }

THEMES = {
    "tech":  {"primary": "#00f0ff", "secondary": "#ff00cc", "accent": "#00f0ff"},
    "creative": {"primary": "#ff8844", "secondary": "#ff4466", "accent": "#ff8844"},
    "minimal":  {"primary": "#ffffff", "secondary": "#888888", "accent": "#ffffff"},
    "editorial": {"primary": "#fff8e8", "secondary": "#446688", "accent": "#fff8e8"},
}

def guess_theme(title, desc, headings):
    t = (title + " " + desc + " " + str(headings)).lower()
    if any(w in t for w in ["saas", "enterprise", "api", "cloud", "data", "analytics", "platform"]): return "tech"
    if any(w in t for w in ["agency", "design", "studio", "creative", "art", "portfolio"]): return "creative"
    if any(w in t for w in ["news", "magazine", "blog", "editorial", "journal"]): return "editorial"
    return "minimal"

def build_sections(title, desc, headings, meta, palette):
    return generate_sections(title, desc, headings, palette)

def generate_sections(title, desc, headings, palette):
    h = []
    for tag, text in headings:
        h.append({"tag": tag.upper(), "heading": text, "body": ""})
    if not h:
        h = [{"tag": "HERO", "heading": title, "body": desc[:300]}]
    sections = []
    for i, s in enumerate(h):
        sections.append({
            "tag": s["tag"],
            "heading": s["heading"],
            "body": s["body"],
            "camera": [0, 1.8 - i * 0.3, 4.5 - i * 0.5],
            "target": [0, 0.5, 0],
        })
    return sections

if __name__ == "__main__":
    raw_text = sys.stdin.read()
    # Find the first complete JSON object in mixed text output
    data = None
    idx = raw_text.find('{')
    while idx >= 0:
        end = raw_text.find('}', idx) + 1
        if end > 0:
            try:
                data = json.loads(raw_text[idx:end])
                break
            except json.JSONDecodeError:
                pass
        idx = raw_text.find('{', idx + 1)
    if data is None:
        data = {"title": "Unknown", "headings": [], "meta": {}}
    blueprint = convert(data)
    json.dump(blueprint, sys.stdout, indent=2)
