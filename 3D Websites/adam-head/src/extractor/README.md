# Website Extractor & Evaluator

This directory contains the website content extraction and evaluation system originally developed in the main branch. It is integrated here as a utility module for the R3F cyberspace project.

## Files

- **extract.py** — Content extraction spike that compares two methods on a given URL:
  - **Method A1**: `requests` + `BeautifulSoup` — static HTML parsing (no JS execution)
  - **Method A2**: `trafilatura` — semantic article extraction (intelligent content discovery)
  
  Outputs a side-by-side comparison of text length, metadata, headings, and extraction quality, with a recommendation for which method to use.

## Dependencies

### Python
- `requests` — HTTP client for fetching web pages
- `beautifulsoup4` — HTML parsing and DOM traversal
- `trafilatura` — Semantic text extraction (for Method A2)

Install with:
```bash
pip install requests beautifulsoup4 trafilatura
```

### Node.js
- `playwright` — Headless browser for JavaScript-rendered content (future enhancement)

Install with:
```bash
npm install playwright
```

## Usage

Run the extractor on any URL:

```bash
python3 src/extractor/extract.py https://example.com
```

Without arguments, it defaults to `https://www.metawatt.com/`.

## Future Integration

The extractor outputs are designed to feed into the R3F scene:
- Extracted headings → 3D text nodes orbiting the knowledge globe
- Metadata → Section content in the scroll-driven UI
- Trafilatura output → Richer article previews in cards

The next phase (Integration D) will pipe real scraped content from the extractor into the React components.
