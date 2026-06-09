import { execFile, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths for the Python extractor
const EXTRACTOR_PATH = path.resolve(
  __dirname, '..', '..',
  'adam-head', 'src', 'extractor', 'extract.py'
);
const CONVERTER_PATH = path.resolve(
  __dirname, 'convert_to_blueprint.py'
);
const PYTHON_VENV = path.resolve(
  __dirname, '..', '..',
  'adam-head', 'src', 'extractor', 'venv', 'bin', 'python3'
);

// In-memory progress store for SSE
const progressStore = new Map();

function checkExtractorReady() {
  try {
    return fs.existsSync(EXTRACTOR_PATH) && fs.existsSync(PYTHON_VENV);
  } catch {
    return false;
  }
}

/**
 * Generate a mock blueprint based on URL domain analysis.
 */
function mockBlueprint(url) {
  const domain = new URL(url).hostname.replace('www.', '');
  const sections = [
    {
      type: 'hero',
      title: domain.charAt(0).toUpperCase() + domain.slice(1),
      subtitle: 'Welcome to the extracted website',
      content: [],
    },
    {
      type: 'content',
      title: 'About',
      content: ['Primary content section extracted from ' + url],
    },
    {
      type: 'features',
      title: 'Features',
      items: ['Feature 1', 'Feature 2', 'Feature 3'],
    },
  ];

  // Derive a theme from domain characteristics
  let theme = 'tech';
  const techDomains = ['io', 'dev', 'tech', 'ai', 'app'];
  const creativeDomains = ['art', 'design', 'studio', 'agency'];
  const editorialDomains = ['news', 'blog', 'magazine', 'press'];
  const tld = domain.split('.').pop();
  if (editorialDomains.includes(tld) || domain.includes('news')) theme = 'editorial';
  else if (creativeDomains.includes(tld) || domain.includes('studio')) theme = 'creative';
  else if (techDomains.includes(tld)) theme = 'tech';
  else theme = 'minimal';

  const colors = {
    tech: { primary: '#0ea5e9', secondary: '#6366f1' },
    creative: { primary: '#ec4899', secondary: '#f59e0b' },
    minimal: { primary: '#1e293b', secondary: '#64748b' },
    editorial: { primary: '#92400e', secondary: '#1e40af' },
  };

  const palettes = {
    tech: ['Inter', 'ui-sans-serif'],
    creative: ['Playfair Display', 'Georgia'],
    minimal: ['Inter', 'system-ui'],
    editorial: ['Merriweather', 'Georgia'],
  };

  return {
    id: uuidv4(),
    url,
    status: 'complete',
    sections,
    focal_point: domain,
    theme,
    branding: {
      primary_color: colors[theme].primary,
      secondary_color: colors[theme].secondary,
      typography: {
        family: palettes[theme][0],
        fallback: palettes[theme][1],
      },
    },
    created_at: new Date().toISOString(),
    _mock: true,
  };
}

/**
 * Parse raw JSON output from the Python extractor into a blueprint.
 */
function parseExtractorOutput(rawJson, url) {
  let data;
  if (typeof rawJson === 'string') {
    data = JSON.parse(rawJson);
  } else {
    data = rawJson;
  }

  // Normalize sections
  const sections = (data.sections || []).map((s) => ({
    type: s.type || 'content',
    title: s.title || '',
    subtitle: s.subtitle || undefined,
    content: s.content || [],
    items: s.items || undefined,
    image: s.image || undefined,
    style: s.style || undefined,
  }));

  return {
    id: uuidv4(),
    url,
    status: 'complete',
    sections,
    focal_point: data.focal_point || new URL(url).hostname,
    theme: data.theme || 'tech',
    branding: {
      primary_color: data.branding?.primary_color || '#0ea5e9',
      secondary_color: data.branding?.secondary_color || '#6366f1',
      typography: {
        family: data.branding?.typography?.family || 'Inter',
        fallback: data.branding?.typography?.family || 'system-ui',
      },
    },
    created_at: new Date().toISOString(),
    _mock: false,
  };
}

/**
 * Run the Python extractor as a subprocess.
 * Returns an object with stdout, stderr, and optional error.
 */
function runExtractor(url, extractId) {
  return new Promise((resolve, reject) => {
    const extractorReady = checkExtractorReady();

    if (!extractorReady) {
      // Fallback: return mock blueprint
      updateProgress(extractId, 'Extractor not available, generating mock blueprint...', 50);
      setTimeout(() => {
        const blueprint = mockBlueprint(url);
        updateProgress(extractId, 'Mock blueprint generated', 100);
        resolve({ blueprint, mock: true });
      }, 500);
      return;
    }

    updateProgress(extractId, 'Starting Python extractor...', 10);

    const cmd = `${PYTHON_VENV} "${EXTRACTOR_PATH}" "${url}"`;
    const child = exec(
      cmd,
      {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONUNBUFFERED: '1' },
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error('Extractor error:', error.message, 'stderr:', stderr?.slice(0,500));
          // If the extractor fails, fall back to mock
          updateProgress(extractId, `Extractor failed (${error.message}), using mock...`, 70);
          setTimeout(() => {
            const blueprint = mockBlueprint(url);
            updateProgress(extractId, 'Mock blueprint generated after extractor failure', 100);
            resolve({ blueprint, mock: true, extractorError: error.message });
          }, 500);
          return;
        }

        try {
          // Pipe extractor output through converter script
          const convCmd = `${PYTHON_VENV} "${CONVERTER_PATH}"`;
          const converterChild = exec(
            convCmd,
            { timeout: 15000, maxBuffer: 10 * 1024 * 1024 },
            (convErr, convStdout) => {
              if (convErr) {
                // Converter failed, use raw parse
                try {
                  const blueprint = parseExtractorOutput(stdout, url);
                  updateProgress(extractId, 'Blueprint extraction complete', 100);
                  resolve({ blueprint, mock: false });
                } catch (parseErr) {
                  updateProgress(extractId, `Parse error: ${parseErr.message}, using mock...`, 90);
                  const blueprint = mockBlueprint(url);
                  resolve({ blueprint, mock: true, extractorError: parseErr.message });
                }
                return;
              }
              try {
                const blueprint = JSON.parse(convStdout);
                blueprint.id = uuidv4();
                blueprint.url = url;
                blueprint.status = 'complete';
                blueprint.created_at = new Date().toISOString();
                blueprint._mock = false;
                updateProgress(extractId, 'Blueprint extraction complete', 100);
                resolve({ blueprint, mock: false });
              } catch (parseErr) {
                updateProgress(extractId, `Converter parse error: ${parseErr.message}`, 90);
                const blueprint = mockBlueprint(url);
                resolve({ blueprint, mock: true, extractorError: parseErr.message });
              }
            }
          );
          converterChild.stdin.write(stdout);
          converterChild.stdin.end();
        } catch (parseErr) {
          updateProgress(extractId, `Parse error: ${parseErr.message}, using mock...`, 90);
          const blueprint = mockBlueprint(url);
          resolve({ blueprint, mock: true, extractorError: parseErr.message });
        }
      }
    );

    // Feed progress as we get stdout lines
    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          updateProgress(extractId, line, undefined);
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          updateProgress(extractId, `[stderr] ${line}`, undefined);
        }
      });
    }
  });
}

/**
 * Update the SSE progress store for a given extraction ID.
 */
function updateProgress(extractId, message, percent) {
  if (!progressStore.has(extractId)) {
    progressStore.set(extractId, {
      messages: [],
      percent: 0,
      listeners: new Set(),
    });
  }

  const entry = progressStore.get(extractId);
  entry.messages.push({ message, timestamp: Date.now() });
  if (percent !== undefined) {
    entry.percent = Math.min(100, Math.max(0, percent));
  }

  // Notify all SSE listeners
  const data = JSON.stringify({
    id: extractId,
    percent: entry.percent,
    messages: entry.messages,
  });
  for (const listener of entry.listeners) {
    try {
      listener(`data: ${data}\n\n`);
    } catch {
      // Client disconnected, will be cleaned up
    }
  }
}

/**
 * Add an SSE listener for a given extraction ID.
 * Returns a cleanup function, and a send function for immediate use.
 */
function addProgressListener(extractId, sendFn) {
  if (!progressStore.has(extractId)) {
    progressStore.set(extractId, {
      messages: [],
      percent: 0,
      listeners: new Set(),
    });
  }

  const entry = progressStore.get(extractId);
  entry.listeners.add(sendFn);

  // Send current state immediately
  const data = JSON.stringify({
    id: extractId,
    percent: entry.percent,
    messages: entry.messages,
  });
  try {
    sendFn(`data: ${data}\n\n`);
  } catch {
    // ignore
  }

  return () => {
    const e = progressStore.get(extractId);
    if (e) {
      e.listeners.delete(sendFn);
      if (e.listeners.size === 0) {
        // Clean up after 5 minutes of inactivity
        setTimeout(() => {
          const e2 = progressStore.get(extractId);
          if (e2 && e2.listeners.size === 0) {
            progressStore.delete(extractId);
          }
        }, 5 * 60 * 1000);
      }
    }
  };
}

export {
  checkExtractorReady,
  runExtractor,
  mockBlueprint,
  parseExtractorOutput,
  addProgressListener,
  updateProgress,
};
