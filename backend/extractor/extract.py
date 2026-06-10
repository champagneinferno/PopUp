#!/usr/bin/env python3
"""
Spike A: Content Extraction Comparison
Tests 3 methods on a given URL and compares the results.
"""

import sys
import json
import requests
from bs4 import BeautifulSoup

URL = sys.argv[1] if len(sys.argv) > 1 else "https://www.metawatt.com/"
HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}


def method_requests_bs(url: str) -> dict:
    """Method A1: Plain requests + BeautifulSoup (no JS)"""
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")

    # Kill script/style tags
    for tag in soup(["script", "style", "link", "noscript"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    text = soup.get_text(separator="\n", strip=True)

    # Metadata
    meta = {}
    for m in soup.find_all("meta"):
        key = m.get("name") or m.get("property") or ""
        val = m.get("content", "")
        if key and val:
            meta[key] = val[:200]

    # Headings
    headings = []
    for h in soup.find_all(["h1", "h2", "h3"]):
        t = h.get_text(strip=True)
        if t:
            headings.append((h.name, t))

    return {
        "method": "A1 - requests + BeautifulSoup",
        "title": title,
        "meta": meta,
        "headings": headings[:20],
        "text_length_chars": len(text),
        "text_length_words": len(text.split()),
        "text_preview": text[:1000],
        "script_count": len(soup.find_all("script")),
        "has_javascript_boot": "window.__INITIAL_STATE__" in r.text
        or "root.render" in r.text
        or "createRoot" in r.text,
    }


def method_trafilatura(url: str) -> dict:
    """Method A2: trafilatura (semantic article extraction)"""
    import trafilatura

    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        return {"method": "A2 - trafilatura", "error": "Failed to download", "text": "", "text_length_chars": 0}

    text = trafilatura.extract(downloaded, include_links=False, include_images=False, output_format="txt")
    text_md = trafilatura.extract(downloaded, include_links=True, include_images=False, output_format="markdown")

    return {
        "method": "A2 - trafilatura",
        "text": (text or "")[:1000],
        "text_markdown_preview": (text_md or "")[:1000],
        "text_length_chars": len(text or ""),
        "text_length_words": len((text or "").split()),
        "extraction_success": text is not None,
    }


def main():
    print("=" * 60)
    print(f"SPIKE A: Content Extraction — {URL}")
    print("=" * 60)

    print("\n[1/2] Running A1: requests + BeautifulSoup (static HTML)...")
    result_bs = method_requests_bs(url=URL)
    print(json.dumps(result_bs, indent=2, ensure_ascii=False))

    print("\n[2/2] Running A2: trafilatura (semantic extraction)...")
    result_traf = method_trafilatura(url=URL)
    print(json.dumps(result_traf, indent=2, ensure_ascii=False))

    # Summary
    print("\n" + "=" * 60)
    print("COMPARISON SUMMARY")
    print("=" * 60)
    print(f"{'Metric':35s} {'BeautifulSoup':>15s} {'Trafilatura':>15s}")
    print("-" * 65)

    bs_chars = result_bs["text_length_chars"]
    traf_chars = result_traf.get("text_length_chars", 0)
    bs_words = result_bs["text_length_words"]
    traf_words = result_traf.get("text_length_words", 0)

    print(f"{'Text length (chars)':35s} {bs_chars:>15d} {traf_chars:>15d}")
    print(f"{'Text length (words)':35s} {bs_words:>15d} {traf_words:>15d}")

    bs_title = result_bs.get("title", "")[:40]
    traf_text = result_traf.get("text", "")[:60].replace("\n", " ")
    print(f"{'Title extractable':35s} {'Yes' if bs_title else 'No':>15s} {'-':>15s}")

    has_js = result_bs.get("has_javascript_boot", False)
    print(f"{'JS-boot detected':35s} {'Yes' if has_js else 'No':>15s} {'-':>15s}")

    traf_ok = result_traf.get("extraction_success", False)
    print(f"{'Extraction success':35s} {'-':>15s} {'Yes' if traf_ok else 'No':>15s}")

    # Recommendation
    if traf_chars > 100:
        best = "trafilatura"
    elif bs_chars > 100:
        best = "BeautifulSoup"
    else:
        best = "neither — need JS rendering (Playwright)"
    print(f"\nRecommendation: {best}")


if __name__ == "__main__":
    main()
