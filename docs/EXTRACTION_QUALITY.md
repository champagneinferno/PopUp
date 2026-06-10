# PopUp Extraction Quality Metrics

## Overview
This document defines quality metrics for evaluating extraction performance and enabling self-learning.

## Quality Metrics

### 1. Logo Detection
- **Metric**: `logo_extracted` (boolean)
- **Target**: TRUE (logo found and valid URL)
- **Scoring**: 1 point if logo found, 0 if not

### 2. Background Images
- **Metric**: `background_image_count` (integer)
- **Target**: ≥3 background images for most sites
- **Scoring**:
  - 0 images: 0 points
  - 1-2 images: 1 point
  - 3+ images: 2 points

### 3. Color Palette
- **Metric**: `color_count` (integer)
- **Target**: ≥5 explicit colors
- **Scoring**:
  - 0-2 colors: 0 points
  - 3-4 colors: 1 point
  - 5+ colors: 2 points

### 4. Navigation Items
- **Metric**: `nav_item_count` (integer)
- **Target**: ≥1 navigation items
- **Scoring**: 1 point if ≥1, 0 if 0

### 5. Content Sections
- **Metric**: `section_count` (integer)
- **Target**: ≥1 sections
- **Scoring**: 1 point if ≥1, 0 if 0

### 6. Hero Section
- **Metric**: `hero_detected` (boolean)
- **Target**: TRUE (hero section with heading found)
- **Scoring**: 1 point if hero found, 0 if not

## Total Quality Score
- **Max Score**: 8 points
- **Quality Levels**:
  - 0-2: Poor
  - 3-4: Fair
  - 5-6: Good
  - 7-8: Excellent

## Self-Learning Integration
The extraction viewer will display these metrics for each extraction, allowing developers to:
1. Identify weak extractions
2. Compare extractions across different versions
3. Track improvement over time
4. Identify patterns in extraction failures

## Usage
The quality metrics will be added to the extraction JSON output and displayed in the viewer.
