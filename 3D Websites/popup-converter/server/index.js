import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import {
  checkExtractorReady,
  runExtractor,
  addProgressListener,
} from './extractor.js';

/* ------------------------------------------------------------------ */
/*  Setup                                                              */
/* ------------------------------------------------------------------ */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLUEPRINTS_DIR = path.join(__dirname, 'blueprints');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));

// Ensure blueprints directory exists
if (!fs.existsSync(BLUEPRINTS_DIR)) {
  fs.mkdirSync(BLUEPRINTS_DIR, { recursive: true });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function saveBlueprint(blueprint) {
  const filePath = path.join(BLUEPRINTS_DIR, `${blueprint.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(blueprint, null, 2), 'utf-8');
  return filePath;
}

function loadBlueprint(id) {
  // Sanitize: only allow UUID-like filenames (hex with dashes)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const filePath = path.join(BLUEPRINTS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/* ------------------------------------------------------------------ */
/*  Routes                                                             */
/* ------------------------------------------------------------------ */

/**
 * GET /api/health
 * Health-check endpoint.
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    extractor_ready: checkExtractorReady(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/convert
 * Accepts { url: "https://..." }, runs the extractor, stores the blueprint.
 */
app.post('/api/convert', async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing required field: url' });
  }

  if (!validateUrl(url)) {
    return res.status(400).json({
      error: 'Invalid URL. Must be a valid http:// or https:// URL.',
    });
  }

  const extractId = uuidv4();

  try {
    const result = await runExtractor(url, extractId);
    const blueprint = result.blueprint;
    blueprint.url = url; // ensure URL is set

    saveBlueprint(blueprint);

    return res.status(201).json(blueprint);
  } catch (err) {
    console.error('[convert] Unexpected error:', err);
    return res.status(500).json({ error: 'Extraction failed', details: err.message });
  }
});

/**
 * GET /api/convert/progress/:id
 * SSE endpoint for real-time extraction progress.
 */
app.get('/api/convert/progress/:id', (req, res) => {
  const { id } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', id })}\n\n`);

  const cleanup = addProgressListener(id, (data) => {
    res.write(data);
  });

  // Keep-alive ping every 15 seconds
  const keepAlive = setInterval(() => {
    res.write(`:keepalive\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    cleanup();
  });
});

/**
 * GET /api/blueprint/:id
 * Retrieve a previously generated blueprint by ID.
 */
app.get('/api/blueprint/:id', (req, res) => {
  const { id } = req.params;

  const blueprint = loadBlueprint(id);
  if (!blueprint) {
    return res.status(404).json({ error: 'Blueprint not found', id });
  }

  return res.json(blueprint);
});

/**
 * GET /api/blueprints
 * List all stored blueprints (metadata only, not full payloads).
 */
app.get('/api/blueprints', (_req, res) => {
  try {
    const files = fs.readdirSync(BLUEPRINTS_DIR)
      .filter((f) => f.endsWith('.json'));

    const blueprints = files.map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(BLUEPRINTS_DIR, f), 'utf-8'));
      return {
        id: data.id,
        url: data.url,
        status: data.status,
        theme: data.theme,
        focal_point: data.focal_point,
        created_at: data.created_at,
      };
    });

    // Sort newest first
    blueprints.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json(blueprints);
  } catch (err) {
    console.error('[blueprints] List error:', err);
    return res.status(500).json({ error: 'Failed to list blueprints' });
  }
});

/* ------------------------------------------------------------------ */
/*  Start server                                                       */
/* ------------------------------------------------------------------ */

app.listen(PORT, () => {
  console.log(`Popup Converter Server running on http://localhost:${PORT}`);
  console.log(`  Health:       http://localhost:${PORT}/api/health`);
  console.log(`  Convert POST: http://localhost:${PORT}/api/convert`);
  console.log(`  Blueprints:   http://localhost:${PORT}/api/blueprints`);
  console.log(`  Extractor ready: ${checkExtractorReady()}`);
  console.log(`  Blueprints dir: ${BLUEPRINTS_DIR}`);
});

export default app;