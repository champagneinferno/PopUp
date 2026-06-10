#!/usr/bin/env node
/**
 * Visual DNA Extractor - Playwright-based (IMPROVED for JS-heavy sites)
 * Extracts: computed colors, backgrounds, fonts, layout info, hover effects
 * FIXED: Removed duplicate bgElements declaration
 */
const { chromium } = require('playwright');
const fs = require('fs');

async function extractVisualDNA(url, outputDir = null) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();
    
    // Setup screenshot path
    let screenshotPath = null;
    if (outputDir) {
        const path = require('path');
        const absoluteOutputDir = path.resolve(outputDir);
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace(/\./g, '_');
        screenshotPath = path.join(absoluteOutputDir, `${domain}_screenshot.png`);
        console.error(`[VisualExtractor] Screenshot will be saved to: ${screenshotPath}`);
    }

    try {
        console.error(`[VisualExtractor] Navigating to: ${url}`);
        
        // IMPROVED: Better waiting strategy for JS-heavy sites
        await page.goto(url, { 
            waitUntil: 'domcontentloaded', // Don't wait for networkidle (bad for SPAs)
            timeout: 60000 
        });
        
        // Wait for body to ensure page started rendering
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Wait for common elements that indicate page is ready
        const readySelectors = [
            'nav', 'header', 'main', 'div[class]', 'h1', 'h2'
        ];
        
        let pageReady = false;
        for (const selector of readySelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                pageReady = true;
                console.error(`[VisualExtractor] Page ready (found: ${selector})`);
                break;
            } catch (e) {
                // Continue to next selector
            }
        }
        
        // Additional wait for dynamic content
        await page.waitForTimeout(3000); // Increased from 2000
        
        // Try to wait for network to be mostly idle (but don't fail if not)
        try {
            await page.waitForLoadState('networkidle', { timeout: 5000 });
        } catch (e) {
            console.error('[VisualExtractor] Network not fully idle, continuing anyway');
        }
        
        // Wait for dynamic content to load (IMPORTANT for Wix/JS-heavy sites)
        await page.waitForTimeout(3000); // Wait 3s for JS to render backgrounds
        
        // Also wait for YouTube-specific selectors
        if (url.includes('youtube.com')) {
            try {
                await page.waitForSelector('ytd-app, #contents, ytd-rich-grid-renderer', { timeout: 8000 });
                console.error('[VisualExtractor] YouTube app loaded');
            } catch (e) {
                console.error('[VisualExtractor] YouTube app not found, continuing...');
            }
        } else {
            try {
                await page.waitForSelector('.dynamic-background, [data-bg], [style*="background"]', { timeout: 5000 });
            } catch (e) {}
        }
        
        const result = await page.evaluate(() => {
        const result = {
            computed_colors: [],
            background_images: [],
            fonts_used: [],
            button_styles: [],
            layout_structure: {},
            hero_background: null,
            dominant_colors: [],
            page_text_length: 0,
            // NEW: Structural data from rendered page
            rendered_nav: [],
            rendered_headings: [],
            rendered_buttons: [],
            rendered_sections: [],
            // NEW: Logo detection for JS-heavy sites
            rendered_logo: null
        };
            
        // HELPER: Detect logo contextually (IMPROVED: Now handles SVGs too)
        function detectLogo() {
            // Method1a: SVG logos - GENERIC detection (NO site-specific)
            const svgSelectors = [
                // Generic SVG logo patterns (works for ANY site)
                'svg[class*="logo" i]',
                'svg[id*="logo" i]',
                'a[class*="logo" i] svg',
                'a[href="/"] svg',
                'header svg',
                'nav svg',
                '[role="banner"] svg',
                '.logo svg',
                '#logo svg'
            ];
                
            for (const selector of svgSelectors) {
                try {
                    const elem = document.querySelector(selector);
                    if (elem) {
                        let href = '';
                        let svgElement = elem;
                        
                        if (elem.tagName === 'A') {
                            href = elem.href;
                            const svgInside = elem.querySelector('svg');
                            if (svgInside) svgElement = svgInside;
                        } else if (elem.tagName === 'SVG') {
                            const parentLink = elem.closest('a');
                            if (parentLink) href = parentLink.href;
                        }
                        
                        return {
                            src: href || 'svg-logo-detected',
                            alt: 'SVG Logo',
                            selector: selector,
                            type: 'svg',
                            svg_html: svgElement.outerHTML ? svgElement.outerHTML.substring(0, 1000) : ''
                        };
                    }
                } catch (e) {}
            }
            
            // Method1b: Standard img logos (AFTER SVG check)
            const imgLogoSelectors = [
                'img[class*="logo" i]',
                'img[id*="logo" i]',
                'img[alt*="logo" i]',
                'a[class*="logo" i] img',
                'div[class*="logo" i] img',
                'header img',
                'nav img',
                '[role="banner"] img'
            ];
                
            for (const selector of imgLogoSelectors) {
                try {
                    const imgs = document.querySelectorAll(selector);
                    for (const img of imgs) {
                        const src = img.src || img.getAttribute('src');
                        if (src && !src.startsWith('data:') && 
                            !src.toLowerCase().includes('bg') && 
                            !src.toLowerCase().includes('background')) {
                            return {
                                src: src,
                                alt: img.alt || '',
                                selector: selector,
                                type: 'img'
                            };
                        }
                    }
                } catch (e) {}
            }
                
            // Method2: First image in header/nav area
            const headerArea = document.querySelector('header, nav, [role="banner"]');
            if (headerArea) {
                // Check for img first
                const imgs = headerArea.querySelectorAll('img[src]');
                for (const img of imgs) {
                    const src = img.src || img.getAttribute('src');
                    if (src && !src.startsWith('data:') && 
                        !src.toLowerCase().includes('bg')) {
                        return {
                            src: src,
                            alt: img.alt || '',
                            selector: 'header-area-img',
                            type: 'img'
                        };
                    }
                }
                    
                // Check for SVG in header
                const svg = headerArea.querySelector('svg');
                if (svg) {
                    const parentLink = svg.closest('a');
                    return {
                        src: parentLink ? parentLink.href : 'svg-logo-detected',
                        alt: 'SVG Logo',
                        selector: 'header-area-svg',
                        type: 'svg'
                    };
                }
            }
                
            // Method3: Image inside first link (common logo pattern)
            const firstLinkWithImg = document.querySelector('a[href][img]');
            if (firstLinkWithImg) {
                const img = firstLinkWithImg.querySelector('img');
                if (img) {
                    const src = img.src || img.getAttribute('src');
                    if (src && !src.startsWith('data:')) {
                        return {
                            src: src,
                            alt: img.alt || '',
                            selector: 'first-link-img',
                            type: 'img'
                        };
                    }
                }
            }
                
            return null;
        }
            
        // Detect logo
        result.rendered_logo = detectLogo();

            // Helper: extract colors from computed style
            function extractColorsFromStyle(style) {
                const colors = [];
                const props = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'];
                props.forEach(prop => {
                    const val = style[prop];
                    if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
                        colors.push(val);
                    }
                });
                return colors;
            }

            // 1. Get all colors from page
            const allElements = document.querySelectorAll('*');
            const colorSet = new Set();
            
            allElements.forEach(el => {
                try {
                    const style = window.getComputedStyle(el);
                    const colors = extractColorsFromStyle(style);
                    colors.forEach(c => colorSet.add(c));
                } catch (e) {}
            });
            
            // CLEAN colors: remove junk values
            result.computed_colors = Array.from(colorSet)
                .filter(c => {
                    if (!c || c === 'none' || c === '') return false;
                    if (c.includes('undefined') || c.includes('null')) return false;
                    // Keep only valid CSS color formats
                    if (c.startsWith('rgb') || c.startsWith('#') || c === 'transparent') return true;
                    if (c.match(/^[a-z]+$/i) && ['black','white','red','blue','green','yellow','orange','purple','pink','gray','grey'].includes(c.toLowerCase())) return true;
                    return false;
                })
                .slice(0, 15);  // Limit to 15 colors
            
            // 2. NEW: Extract structural data from RENDERED page
            
            // Extract nav links (even React-generated)
            const navSelectors = [
                'nav a', 'header a', '[role="navigation"] a',
                '[aria-label*="nav"] a', '[class*="nav"] a',
                '[class*="menu"] a', 'a[href]'
            ];
            
            navSelectors.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(link => {
                        const text = link.textContent.trim();
                        if (text && text.length < 50 && text.length > 0) {
                            result.rendered_nav.push({
                                text: text,
                                href: link.href || link.getAttribute('href')
                            });
                        }
                    });
                } catch (e) {}
            });
            
            // Limit to unique nav items
            const navMap = new Map();
            result.rendered_nav.forEach(item => {
                if (!navMap.has(item.text)) {
                    navMap.set(item.text, item);
                }
            });
            result.rendered_nav = Array.from(navMap.values()).slice(0, 15);
            
            // Extract headings
            document.querySelectorAll('h1, h2, h3').forEach(h => {
                const text = h.textContent.trim();
                if (text) {
                    result.rendered_headings.push({
                        level: h.tagName.toLowerCase(),
                        text: text
                    });
                }
            });
            
            // Extract buttons with text (IMPROVED for React/JS-heavy sites)
            // Look for actual button elements
            document.querySelectorAll('button, a[role="button"], [class*="btn"], [class*="button"]').forEach(btn => {
                const text = btn.textContent.trim();
                if (text && text.length < 50) {
                    result.rendered_buttons.push(text);
                }
            });
            
            // ALSO look for clickable divs with text (React pattern)
            document.querySelectorAll('div[onclick], div[role="button"], [class*="clickable"]').forEach(div => {
                const text = div.textContent.trim();
                if (text && text.length > 0 && text.length < 50) {
                    // Only include if it looks like a button (short text)
                    result.rendered_buttons.push(text);
                }
            });
            
            // Extract sections (IMPROVED for React/JS-heavy sites)
            // Look for any element with a heading inside
            document.querySelectorAll('div, section, article, main').forEach(elem => {
                const heading = elem.querySelector('h1, h2, h3, [role="heading"]');
                if (heading && heading.textContent.trim()) {
                    result.rendered_sections.push({
                        heading: heading.textContent.trim(),
                        tag: elem.tagName.toLowerCase()
                    });
                }
            });
            
            // Also look for common React patterns (divs with large text)
            document.querySelectorAll('div[class*="section"], div[class*="hero"], div[class*="banner"]').forEach(div => {
                const text = div.textContent.trim();
                if (text.length > 50 && text.length < 500) {  // Reasonable section length
                    result.rendered_sections.push({
                        heading: text.substring(0, 50) + '...',
                        tag: 'div-class'
                    });
                }
            });
            
            // 3. Find background images (AGGRESSIVE - DEDUPLICATED by URL)
                        const bgElements = document.querySelectorAll('*');
                        let foundHeroBackground = false;
                        const seenBgUrls = new Set();  // DEDUP by URL
            
                        bgElements.forEach(el => {
                            try {
                                const style = window.getComputedStyle(el);
                                const bgImage = style.backgroundImage;
                                const bgColor = style.backgroundColor;
                    
                                // Skip tiny elements
                                const rect = el.getBoundingClientRect();
                                if (rect.width < 50 || rect.height < 50) return;
                    
                                // CHECK1: Inline style background-image
                                if (bgImage && bgImage !== 'none') {
                                    const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
                                    const bgUrl = urlMatch ? urlMatch[1] : bgImage;
                                    if (!seenBgUrls.has(bgUrl)) {
                                        seenBgUrls.add(bgUrl);
                                        result.background_images.push({
                                            element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                                            background_image: bgImage,
                                            background_color: bgColor,
                                            source: 'computed_style',
                                            clean_url: bgUrl
                                        });
                                    }
                                }
                    
                                // CHECK2: Inline style attribute (Wix often uses this)
                                const inlineStyle = el.getAttribute('style');
                                if (inlineStyle && inlineStyle.includes('background')) {
                                    const urlMatch = inlineStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
                                    if (urlMatch && !seenBgUrls.has(urlMatch[1])) {
                                        seenBgUrls.add(urlMatch[1]);
                                        result.background_images.push({
                                            element: el.tagName + ' (inline-style)',
                                            background_image: `url("${urlMatch[1]}")`,
                                            background_color: bgColor,
                                            source: 'inline_style',
                                            clean_url: urlMatch[1]
                                        });
                                    }
                                }
                    
                                // CHECK3: Data attributes
                                const dataBg = el.getAttribute('data-bg') || el.getAttribute('data-background');
                                if (dataBg && !seenBgUrls.has(dataBg)) {
                                    seenBgUrls.add(dataBg);
                                    result.background_images.push({
                                        element: el.tagName + ' (data-attr)',
                                        background_image: `url("${dataBg}")`,
                                        background_color: bgColor,
                                        source: 'data_attribute',
                                        clean_url: dataBg
                                    });
                                }
                    
                                // CHECK4: Look for img tags that might be backgrounds (positioned absolutely)
                                const imgs = el.querySelectorAll(':scope > img');
                                imgs.forEach(img => {
                                    if (!img.src || img.src.startsWith('data:')) return;
                                    const imgStyle = window.getComputedStyle(img);
                                    if (imgStyle.position === 'absolute' || 
                                        imgStyle.zIndex === '-1' ||
                                        el.classList.contains('background') ||
                                        el.classList.contains('bg')) {
                                        if (!seenBgUrls.has(img.src)) {
                                            seenBgUrls.add(img.src);
                                            result.background_images.push({
                                                element: `${el.tagName} > IMG (likely-bg)`,
                                                background_image: `url("${img.src}")`,
                                                background_color: bgColor,
                                                source: 'img_child',
                                                clean_url: img.src
                                            });
                                        }
                                    }
                                });
                    
                    // Track if this element had a background
                                        const hadBg = result.background_images.length > 0;
                    
                                        // Mark as hero if it's a large element with background
                                        if (hadBg && rect.width > window.innerWidth * 0.3 && rect.height > 200) {
                                            const bg = result.background_images[result.background_images.length - 1];
                                            result.hero_background = {
                                                background_image: bg.background_image,
                                                background_color: bgColor,
                                                element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                                                clean_url: bg.clean_url || null
                                            };
                                            foundHeroBackground = true;
                                        }
                    
                    // Also check for hero/banner classes
                    if (el.classList.contains('hero') || el.classList.contains('banner') || 
                        el.tagName === 'BODY' || el.classList.contains('header')) {
                        
                        let finalBg = bgImage !== 'none' ? bgImage : null;
                        let finalColor = bgColor;
                        
                        // Smart fallback - avoid pure black
                        if (!finalBg && (!finalColor || finalColor === 'rgba(0, 0, 0, 0)' || finalColor === 'rgb(0, 0, 0)')) {
                            // Try to find a color from children
                            const children = el.querySelectorAll('*');
                            for (let child of children) {
                                try {
                                    const childStyle = window.getComputedStyle(child);
                                    const childBg = childStyle.backgroundColor;
                                    const childColor = childStyle.color;
                                    if (childBg && childBg !== 'rgba(0, 0, 0, 0)' && childBg !== 'rgb(0, 0, 0)') {
                                        finalColor = childBg;
                                        break;
                                    }
                                    if (childColor && childColor !== 'rgb(0, 0, 0)' && childColor !== 'rgba(0, 0, 0, 0)') {
                                        finalColor = childColor;
                                        break;
                                    }
                                } catch (e) {}
                            }
                        }
                        
                        result.hero_background = {
                                                    background_image: finalBg,
                                                    background_color: finalColor,
                                                    element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                                                    clean_url: finalBg ? (finalBg.match(/url\(["']?([^"')]+)["']?\)/) || [null, null])[1] || null : null
                                                };
                                                foundHeroBackground = true;
                                            }
                                        } catch (e) {}
                                    });
            
                                    console.error(`[VisualExtractor] Found ${result.background_images.length} unique background images`);
            
            // 4. Extract images from rendered page (IMPROVED)
            document.querySelectorAll('img[src]').forEach(img => {
                const src = img.src || img.getAttribute('src');
                const alt = img.alt || '';
                if (src && src.startsWith('http')) {
                    result.rendered_images = result.rendered_images || [];
                    result.rendered_images.push({
                        src: src,
                        alt: alt
                    });
                }
            });
            const fontSet = new Set();
            allElements.forEach(el => {
                try {
                    const style = window.getComputedStyle(el);
                    if (style.fontFamily) {
                        fontSet.add(style.fontFamily);
                    }
                } catch (e) {}
            });
            result.fonts_used = Array.from(fontSet).slice(0, 20);

            // 5. Analyze buttons (ENHANCED - capture MORE visual details)
            const buttons = document.querySelectorAll('button, a[class*="btn"], a[class*="button"], input[type="button"], input[type="submit"], [role="button"]');
            buttons.forEach(btn => {
                try {
                    const style = window.getComputedStyle(btn);
                    const hoverStyle = {}; // Would need Playwright to capture hover
                    
                    result.button_styles.push({
                        text: btn.textContent.trim().substring(0, 50),
                        // Core styles
                        background_color: style.backgroundColor,
                        color: style.color,
                        border_radius: style.borderRadius,
                        border: style.border,
                        padding: style.padding,
                        margin: style.margin,
                        font_size: style.fontSize,
                        font_weight: style.fontWeight,
                        font_family: style.fontFamily,
                        text_transform: style.textTransform,
                        letter_spacing: style.letterSpacing,
                        box_shadow: style.boxShadow,
                        cursor: style.cursor,
                        // Layout
                        display: style.display,
                        width: style.width,
                        height: style.height,
                        // Classes for identification
                        class: btn.className,
                        tag: btn.tagName.toLowerCase()
                    });
                } catch (e) {}
            });

            // 6. Layout structure
            result.layout_structure = {
                has_nav: !!document.querySelector('nav, header'),
                has_footer: !!document.querySelector('footer'),
                has_hero: !!document.querySelector('.hero, .banner, [class*="hero"]'),
                section_count: document.querySelectorAll('section').length,
                div_count: document.querySelectorAll('div').length,
                image_count: document.querySelectorAll('img').length,
                link_count: document.querySelectorAll('a').length
            };
            
            // 6b. NEW: Extract NAVIGATION styles
            result.nav_styles = {};
            const navEl = document.querySelector('nav, header, [role="navigation"], .nav, .navbar');
            if (navEl) {
                try {
                    const navStyle = window.getComputedStyle(navEl);
                    result.nav_styles = {
                        background_color: navStyle.backgroundColor,
                        color: navStyle.color,
                        font_family: navStyle.fontFamily,
                        font_size: navStyle.fontSize,
                        padding: navStyle.padding,
                        height: navStyle.height,
                        border_bottom: navStyle.borderBottom
                    };
                    
                    // Also capture first link style inside nav
                    const firstLink = navEl.querySelector('a');
                    if (firstLink) {
                        const linkStyle = window.getComputedStyle(firstLink);
                        const linkHoverStyle = {};
                        result.nav_styles.link_style = {
                            color: linkStyle.color,
                            font_family: linkStyle.fontFamily,
                            font_size: linkStyle.fontSize,
                            font_weight: linkStyle.fontWeight,
                            text_transform: linkStyle.textTransform,
                            letter_spacing: linkStyle.letterSpacing,
                            padding: linkStyle.padding,
                            margin: linkStyle.margin
                        };
                    }
                } catch (e) {}
            }
            
            // 6b. NEW: Capture text styling per element type
            result.text_styles = {
                headings: {},
                paragraphs: {},
                links: {},
                buttons: {}
            };
            
            // Capture heading styles (h1-h3)
            for (let i = 1; i <= 3; i++) {
                const heading = document.querySelector(`h${i}`);
                if (heading) {
                    const style = window.getComputedStyle(heading);
                    result.text_styles.headings[`h${i}`] = {
                        font_family: style.fontFamily,
                        font_size: style.fontSize,
                        font_weight: style.fontWeight,
                        color: style.color,
                        line_height: style.lineHeight,
                        letter_spacing: style.letterSpacing,
                        text_transform: style.textTransform,
                        margin: style.margin,
                        padding: style.padding
                    };
                }
            }
            
            // Capture paragraph styles
            const firstP = document.querySelector('p');
            if (firstP) {
                const style = window.getComputedStyle(firstP);
                result.text_styles.paragraphs.p = {
                    font_family: style.fontFamily,
                    font_size: style.fontSize,
                    font_weight: style.fontWeight,
                    color: style.color,
                    line_height: style.lineHeight,
                    margin: style.margin
                };
            }
            
            // Capture link styles
            const firstLink = document.querySelector('a');
            if (firstLink) {
                const style = window.getComputedStyle(firstLink);
                result.text_styles.links.a = {
                    font_family: style.fontFamily,
                    font_size: style.fontSize,
                    font_weight: style.fontWeight,
                    color: style.color,
                    text_decoration: style.textDecoration
                };
            }
            
            // 6c. NEW: Enhanced image properties with CLASSIFICATION
                        result.enhanced_images = [];
                        const heroBgUrls = new Set(result.background_images.map(bg => bg.clean_url).filter(Boolean));
                        const logoUrl = result.rendered_logo ? result.rendered_logo.src : null;
            
                        document.querySelectorAll('img[src]').forEach(img => {
                            try {
                                const style = window.getComputedStyle(img);
                                const rect = img.getBoundingClientRect();
                                const src = img.src || img.getAttribute('src') || '';
                                const alt = (img.alt || '').toLowerCase();
                                const classes = (img.className || '').toLowerCase();
                                const naturalW = img.naturalWidth || rect.width;
                                const naturalH = img.naturalHeight || rect.height;
                                const parentClasses = img.parentElement ? (img.parentElement.className || '').toLowerCase() : '';
                    
                                // Skip data URIs
                                if (src.startsWith('data:')) return;
                    
                                // CLASSIFY the image
                                let imageType = 'content';
                                let isIcon = false;
                    
                                // 1. Logo detection
                                if (logoUrl && src === logoUrl) {
                                    imageType = 'logo';
                                } else if (/logo/.test(alt) || /logo/.test(classes) || /logo/.test(src)) {
                                    imageType = 'logo';
                                }
                                // 2. Icon detection (small images, social media icons)
                                else if ((naturalW <= 64 && naturalH <= 64) || 
                                         (naturalW <= 50 && naturalH <= 50)) {
                                    if (alt.includes('instagram') || alt.includes('facebook') || 
                                        alt.includes('twitter') || alt.includes('linkedin') || 
                                        alt.includes('tiktok') || alt.includes('social') ||
                                        /icon/.test(classes) || /icon/.test(src) ||
                                        /svg/.test(src)) {
                                        imageType = 'icon';
                                        isIcon = true;
                                    }
                                }
                                // 3. Background image (positioned absolutely or in bg list)
                                else if (heroBgUrls.has(src) || style.position === 'absolute' || 
                                         style.zIndex === '-1' || parentClasses.includes('background') ||
                                         parentClasses.includes('bg')) {
                                    imageType = 'background';
                                }
                                // 4. Hero image (large image, first on page, in hero section)
                                else if (rect.width > window.innerWidth * 0.5 && rect.height > 300) {
                                    imageType = 'hero';
                                }
                    
                                result.enhanced_images.push({
                                    src: src,
                                    alt: img.alt || '',
                                    width: rect.width,
                                    height: rect.height,
                                    natural_width: naturalW,
                                    natural_height: naturalH,
                                    object_fit: style.objectFit,
                                    position: style.position,
                                    display: style.display,
                                    margin: style.margin,
                                    padding: style.padding,
                                    border_radius: style.borderRadius,
                                    box_shadow: style.boxShadow,
                                    type: imageType
                                });
                            } catch (e) {}
                        });
                        result.enhanced_images = result.enhanced_images.slice(0, 30);
            
            // 6d. NEW: Detect the primary HERO IMAGE (first large image at page top)
            result.hero_image = null;
            const allImages = document.querySelectorAll('img[src]');
            for (const img of allImages) {
                try {
                    const rect = img.getBoundingClientRect();
                    const src = img.src || '';
                    if (src.startsWith('data:')) continue;
                    // Hero image is usually: large (>300px wide), near top (<800px from top), visible
                    if (rect.width > 300 && rect.top < 800 && rect.top >= 0) {
                        const style = window.getComputedStyle(img);
                        result.hero_image = {
                            src: src,
                            alt: img.alt || '',
                            width: rect.width,
                            height: rect.height,
                            position: style.position,
                            object_fit: style.objectFit
                        };
                        break; // First large image = the hero image
                    }
                } catch (e) {}
            }
            
            // 7. NEW: Detect if page has meaningful content
            result.page_text_length = document.body ? document.body.innerText.length : 0;

            return result;
        });
        
        // NEW: Log if page seems empty (JS didn't load)
        if (result.page_text_length < 100) {
            console.error(`[VisualExtractor] WARNING: Page seems empty (${result.page_text_length} chars). JS may not have loaded.`);
        } else {
            console.error(`[VisualExtractor] Page loaded OK (${result.page_text_length} chars)`);
        }
        
        // TAKE SCREENSHOT if outputDir was provided
        if (screenshotPath) {
            try {
                await page.screenshot({ 
                    path: screenshotPath,
                    fullPage: false,
                    type: 'png'
                });
                result.screenshot_path = screenshotPath;
                console.error(`[VisualExtractor] Screenshot saved: ${screenshotPath}`);
            } catch (e) {
                console.error(`[VisualExtractor] Screenshot failed: ${e.message}`);
            }
        }
        
        await browser.close();
        return result;

    } catch (error) {
        await browser.close();
        console.error(`[VisualExtractor] Error: ${error.message}`);
        throw error;
    }
}

// Main execution
if (require.main === module) {
    const url = process.argv[2] || 'https://www.metawatt.com/';
    const outputDir = process.argv[3] || null;
    
    extractVisualDNA(url, outputDir)
        .then(result => {
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(err => {
            console.error(JSON.stringify({ error: err.message }));
            process.exit(1);
        });
}

module.exports = { extractVisualDNA };
