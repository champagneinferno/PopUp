# Extractor Fixes Applied - June 10, 2026

## Problems Fixed

### visual_extractor.cjs
1. **Background images DEDUP** - Use `seenBgUrls` Set to track unique background image URLs. Was generating 50+ duplicate entries (same 3 Wix images repeated across HTML/BODY/DIV/MAIN elements).
2. **Image CLASSIFICATION** - Each enhanced_images entry now has a `type` field: `logo`, `icon`, `background`, `content`, `hero`. Classification rules:
   - Logo: matches rendered_logo URL or has "logo" in alt/class/src
   - Icon: small images (≤64x64) with social media names or "icon" in class
   - Background: position absolute, z-index -1, or in background URL set
   - Hero: large images (>50% viewport width, >300px height)
   - Content: everything else
3. **Nav styles extraction** - New `nav_styles` section with `background_color`, `color`, `font_family`, `font_size`, `link_style` (color, font, weight, transform, spacing)
4. **clean_url** - Background images now include `clean_url` extracted from CSS `url()` wrappers
5. **Button filtering** - Empty-text buttons still collected but cleaned in Python merge step

### dna_extractor.py
1. **Clean colors** (`_clean_colors`) - Removes transparent (`rgba(..., 0)`), default link blue (`rgb(0,0,238)`), deduplicates
2. **Clean buttons** (`_clean_buttons`) - Removes empty-text buttons, deduplicates by (text, bg_color)
3. **Font filtering** (`_merge_fonts`) - Filters out system defaults (Arial, Helvetica, Times New Roman, system-ui, etc.)
4. **Separated assets** - `assets.images` = content + hero images, `assets.icons` = icon images, `assets.hero_image` = first hero image or clean_url fallback
5. **nav_styles** in visual_dna section
6. All cleaning computed once and reused for both brand_dna and visual_dna

## New Data Structure
```
website_profile:
  brand_dna: { color_palette, fonts (no system fonts), style_vibe }
  structure: { navigation, hero_section, sections, footer, buttons }
  visual_dna:
    hero_background: { background_image, background_color, element, clean_url }
    background_images: [{ element, background_image, clean_url, source }]  # DEDUPED
    computed_colors: [cleaned colors]  # No transparent, no default blue
    button_styles: [cleaned buttons]   # No empty text
    nav_styles: { background_color, color, font_family, link_style: {...} }
    text_styles: { headings: {h1,h2,h3}, paragraphs, links }
    enhanced_images: [{ src, alt, width, height, type }]  # CLASSIFIED
  assets:
    logo: URL
    images: [content + hero images]
    icons: [social media + UI icons]
    hero_image: { src, type } or {}
    stylesheets: [URLs]
```

## Remaining Issues
- Background images from `<img>` tags with `position:absolute` appear in enhanced_images (type=background) but NOT in background_images array (which tracks CSS background-image)
- Hero image not always detected (needs large image or clean_url from hero_background)
- Screenshot only captured when output_dir passed to visual_extractor