#!/usr/bin/env node
/**
 * Visual DNA Extractor - Playwright-based (IMPROVED for JS-heavy sites)
 * Extracts: computed colors, backgrounds, fonts, layout info, hover effects
 * FIXED: Removed duplicate bgElements declaration
 */
const { chromium } = require('playwright');
const fs = require('fs');

async function extractVisualDNA(url) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();

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
            const logoSelectors = [
                'img[class*="logo" i]',
                'img[id*="logo" i]',
                'img[alt*="logo" i]',
                'a[class*="logo" i] img',
                'div[class*="logo" i] img',
                'header img',
                'nav img',
                '[role="banner"] img'
            ];
                
            for (const selector of logoSelectors) {
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
                
            // Method1b: SVG logos (for modern sites like YouTube)
            const svgSelectors = [
                // YouTube-specific selectors
                'ytd-topbar-logo-renderer a',
                'ytd-topbar-logo-renderer svg',
                'a[aria-label*="YouTube" i]',
                'a[title*="YouTube" i]',
                // Generic SVG logo selectors
                'svg[class*="logo" i]',
                'a svg',
                'header svg',
                '[role="banner"] svg',
                // Look for any SVG near the top of the page
                'body > * svg',
                '#logo svg',
                '.logo svg'
            ];
                
            for (const selector of svgSelectors) {
                try {
                    const elem = document.querySelector(selector);
                    if (elem) {
                        // For YouTube's logo, the <a> tag has the href, SVG is inside
                        let href = '';
                        let svgElement = elem;
                        
                        if (elem.tagName === 'A') {
                            href = elem.href;
                            // Try to find SVG inside the link
                            const svgInside = elem.querySelector('svg');
                            if (svgInside) svgElement = svgInside;
                        } else if (elem.tagName === 'SVG') {
                            // SVG element - look for parent link
                            const parentLink = elem.closest('a');
                            if (parentLink) href = parentLink.href;
                        }
                        
                        // Return SVG logo info
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
            
            result.computed_colors = Array.from(colorSet).slice(0, 50);
            
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
            
            // 3. Find background images (AGGRESSIVE - check MANY sources)
            const bgElements = document.querySelectorAll('*');
            let foundHeroBackground = false;
            let bgImageCount = 0;
            
            bgElements.forEach(el => {
                try {
                    const style = window.getComputedStyle(el);
                    const bgImage = style.backgroundImage;
                    const bgColor = style.backgroundColor;
                    
                    // Skip tiny elements
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 50 || rect.height < 50) return;
                    
                    // CHECK1: Inline style background-image
                    let foundBg = false;
                    if (bgImage && bgImage !== 'none') {
                        result.background_images.push({
                            element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
                            background_image: bgImage,
                            background_color: bgColor,
                            source: 'computed_style'
                        });
                        foundBg = true;
                        bgImageCount++;
                    }
                    
                    // CHECK2: Inline style attribute (Wix often uses this)
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
                    
                    // CHECK3: Data attributes (some sites store bg in data-bg)
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
                    
                    // CHECK4: Look for img tags that might be backgrounds (positioned absolutely)
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
                            element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : '')
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
                            element: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : '')
                        };
                        foundHeroBackground = true;
                    }
                } catch (e) {}
            });
            
            console.error(`[VisualExtractor] Found ${bgImageCount} background images`);
            
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

            // 5. Analyze buttons
            const buttons = document.querySelectorAll('button, a[class*="btn"], a[class*="button"], input[type="button"], input[type="submit"]');
            buttons.forEach(btn => {
                try {
                    const style = window.getComputedStyle(btn);
                    result.button_styles.push({
                        text: btn.textContent.trim().substring(0, 50),
                        bg_color: style.backgroundColor,
                        color: style.color,
                        border_radius: style.borderRadius,
                        padding: style.padding,
                        font_size: style.fontSize,
                        class: btn.className
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
            
            // 7. NEW: Detect if page has meaningful content
            result.page_text_length = document.body ? document.body.innerText.length : 0;

            return result;
        });
        
        // NEW: Log if page seems empty (JS didn't load)
        if (visualDNA.page_text_length < 100) {
            console.error(`[VisualExtractor] WARNING: Page seems empty (${visualDNA.page_text_length} chars). JS may not have loaded.`);
        } else {
            console.error(`[VisualExtractor] Page loaded OK (${visualDNA.page_text_length} chars)`);
        }

        await browser.close();
        return visualDNA;

    } catch (error) {
        await browser.close();
        console.error(`[VisualExtractor] Error: ${error.message}`);
        throw error;
    }
}

// Main execution
if (require.main === module) {
    const url = process.argv[2] || 'https://www.metawatt.com/';
    
    extractVisualDNA(url)
        .then(result => {
            console.log(JSON.stringify(result, null, 2));
        })
        .catch(err => {
            console.error(JSON.stringify({ error: err.message }));
            process.exit(1);
        });
}

module.exports = { extractVisualDNA };
