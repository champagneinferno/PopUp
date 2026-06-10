"""Framework Detector - Identifies what platform/builder a website uses"""
import re

def detect_framework(soup, url=""):
    """
    Detect website framework by scanning HTML patterns.
    Returns dict with framework name, confidence score, and indicators found.
    """
    html_str = str(soup)
    meta_generator = ""
    meta_tag = soup.find("meta", {"name": "generator"})
    if meta_tag and meta_tag.get("content"):
        meta_generator = meta_tag["content"].lower()

    indicators = []
    framework = "static-html"
    confidence = 0.5

    # --- Wix Detection ---
    wix_patterns = [
        ("wixui-section", "wixui-section class"),
        ("data-hook", "data-hook attribute"),
        ("Wix.com Website Builder", "Wix generator meta"),
        ("wix-image", "wix-image pattern"),
        ("wix-ui-five", "wix-ui-five pattern"),
        ("WIX_MEDIA", "WIX_MEDIA pattern"),
    ]
    wix_score = 0
    for pattern, desc in wix_patterns:
        if pattern in html_str or pattern.lower() in meta_generator:
            wix_score += 1
            indicators.append(f"wix:{desc}")
    if wix_score >= 2 or "wix" in meta_generator:
        framework = "wix"
        confidence = 0.7 + (wix_score * 0.05)

    # --- WordPress Detection ---
    wp_patterns = [
        ("wp-content", "wp-content path"),
        ("wp-includes", "wp-includes path"),
        ("wp-json", "wp-json REST API"),
        ("WordPress", "WordPress generator meta"),
        ("elementor", "Elementor page builder"),
    ]
    wp_score = 0
    for pattern, desc in wp_patterns:
        if pattern.lower() in html_str:
            wp_score += 1
            if framework == "static-html":
                indicators.append(f"wordpress:{desc}")
    if wp_score >= 2 or "wordpress" in meta_generator:
        framework = "wordpress"
        confidence = 0.7 + (wp_score * 0.05)
        indicators = [f"wordpress:{desc}" for pattern, desc in wp_patterns if pattern.lower() in html_str]

    # --- React / Next.js Detection ---
    react_patterns = [
        ("__NEXT_DATA__", "Next.js data script"),
        ("__NUXT__", "Nuxt.js data script"),
        ("data-reactroot", "React root attribute"),
        ("data-reactid", "React ID attribute"),
        ("createRoot", "React createRoot API"),
        ("reactRoot", "React root element"),
        ("_next/static", "Next.js static path"),
        ("remix-run", "Remix framework"),
    ]
    react_score = 0
    for pattern, desc in react_patterns:
        if pattern in html_str:
            react_score += 1
            if framework == "static-html":
                indicators.append(f"react:{desc}")
    if react_score >= 2:
        framework = "react"
        confidence = 0.7 + (react_score * 0.05)
        indicators = [f"react:{desc}" for pattern, desc in react_patterns if pattern in html_str]

    # --- Shopify Detection ---
    shopify_patterns = [
        ("myshopify.com", "Shopify domain"),
        ("shopify", "Shopify branding"),
        ("Shopify", "Shopify meta generator"),
    ]
    shopify_score = 0
    for pattern, desc in shopify_patterns:
        if pattern.lower() in html_str or pattern.lower() in meta_generator:
            shopify_score += 1
            if framework == "static-html":
                indicators.append(f"shopify:{desc}")
    if "shopify" in meta_generator or "myshopify.com" in url:
        framework = "shopify"
        confidence = 0.8
        indicators = [f"shopify:{desc}" for pattern, desc in shopify_patterns if pattern.lower() in html_str or pattern.lower() in meta_generator]

    # --- Squarespace Detection ---
    if "squarespace" in meta_generator or "static1.squarespace.com" in html_str:
        framework = "squarespace"
        confidence = 0.8
        indicators.append("squarespace:detected")

    return {
        "framework": framework,
        "confidence": round(min(confidence, 0.95), 2),
        "indicators": indicators,
        "meta_generator": meta_generator
    }


def get_framework_extractors(framework):
    """
    Return extraction strategy hints for a given framework.
    Each framework has specific selectors/patterns that work best.
    """
    strategies = {
        "wix": {
            "note": "Wix uses CSS background layers with data-hook='bgLayers', sections with data-block-level-container, buttons with wixui-button class",
            "hero_selectors": ["[data-block-level-container]", "section.wixui-section", "[data-hook='bgLayers']"],
            "button_class": "wixui-button",
            "logo_selectors": ["header img", "nav img", "[class*='logo'] img"],
            "nav_selector": "nav, header",
        },
        "wordpress": {
            "note": "WordPress often uses article/post structure, has wp-block classes, may use Elementor or Gutenberg",
            "hero_selectors": [".hero", ".wp-block-cover", "article:first-of-type", "main section:first-child"],
            "button_class": "wp-block-button__link",
            "logo_selectors": [".custom-logo", ".logo img", "header img"],
            "nav_selector": "nav, .main-navigation, .primary-navigation",
        },
        "react": {
            "note": "React/Next.js apps render dynamically - need Playwright rendering. Look for role/aria selectors",
            "hero_selectors": ["[role='banner']", "main section:first-child", "header + section", "[class*='hero']"],
            "button_class": "",
            "logo_selectors": ["[aria-label*='logo'] img", "header img", "nav a:first-child img"],
            "nav_selector": "nav, [role='navigation'], header",
        },
        "shopify": {
            "note": "Shopify uses liquid templates, often has .shopify-section, product grid layouts",
            "hero_selectors": [".hero", ".slideshow", ".banner", "section:first-child"],
            "button_class": "btn",
            "logo_selectors": [".site-header__logo img", ".logo img", "header img"],
            "nav_selector": "nav, .site-nav, .header__navigation",
        },
        "static-html": {
            "note": "Static HTML - use generic strategies. Look for common section/hero patterns.",
            "hero_selectors": [".hero", ".banner", "header", "main section:first-child", "[class*='hero']"],
            "button_class": "",
            "logo_selectors": [".logo img", "header img", "nav img", "img[alt*='logo']"],
            "nav_selector": "nav, header, .nav, .navbar",
        }
    }
    return strategies.get(framework, strategies["static-html"])