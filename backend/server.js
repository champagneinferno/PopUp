import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5000;
const PROJECT_ROOT = path.resolve('..');
const EXTRACTION_RESULTS = path.join(PROJECT_ROOT, 'extraction_results');

// Middleware
app.use(express.json());
app.use(express.static(PROJECT_ROOT));

// In-memory job store
const jobs = {};

// Ensure extraction_results directory exists
try {
    fsSync.mkdirSync(EXTRACTION_RESULTS, { recursive: true });
} catch (err) {
    console.error('Error creating extraction_results:', err);
}

// Run DNA extractor
function runExtraction(url, jobId) {
    return new Promise((resolve) => {
        jobs[jobId].status = 'running';
        
        const outputFile = `${jobId}.json`;
        const cmd = 'uv';
        const args = [
            'run', 'python',
            path.join(PROJECT_ROOT, 'src', 'extractor', 'dna_extractor.py'),
            '--url', url,
            '--output', outputFile
        ];
        
        const proc = spawn(cmd, args, {
            cwd: PROJECT_ROOT,
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        proc.on('close', async (code) => {
            if (code === 0) {
                try {
                    await createBatch(jobId, url, outputFile);
                    jobs[jobId].status = 'completed';
                    jobs[jobId].result = 'Extraction completed successfully';
                } catch (err) {
                    jobs[jobId].status = 'failed';
                    jobs[jobId].error = err.message;
                }
            } else {
                jobs[jobId].status = 'failed';
                jobs[jobId].error = stderr || stdout;
            }
            resolve();
        });
        
        proc.on('error', (err) => {
            jobs[jobId].status = 'failed';
            jobs[jobId].error = err.message;
            resolve();
        });
    });
}

// Create batch structure
async function createBatch(jobId, url, profileFilename) {
    const batchFolder = path.join(EXTRACTION_RESULTS, `Batch${jobId.substring(0, 8)}`);
    
    // Create batch folder
    await fs.mkdir(batchFolder, { recursive: true });
    
    // Copy profile JSON to batch folder
    const src = path.join(PROJECT_ROOT, profileFilename);
    const dst = path.join(batchFolder, profileFilename);
    try {
        await fs.access(src);
        await fs.copyFile(src, dst);
    } catch (err) {
        console.log(`Source file not found: ${src}`);
    }
    
    // Create batch_manifest.json
    const domain = url.replace('https://', '').replace('http://', '').replace(/\/$/, '');
    const manifest = {
        batch_id: `Batch${jobId.substring(0, 8)}`,
        created_at: jobs[jobId].created_at,
        websites: [
            {
                domain: domain,
                url: url,
                data_path: profileFilename,
                extraction_status: 'completed',
                has_3d_blueprint: false
            }
        ]
    };
    
    await fs.writeFile(
        path.join(batchFolder, 'batch_manifest.json'),
        JSON.stringify(manifest, null, 2)
    );
    
    // Update batch_index.json
    const indexFile = path.join(EXTRACTION_RESULTS, 'batch_index.json');
    let index = [];
    try {
        const data = await fs.readFile(indexFile, 'utf8');
        index = JSON.parse(data);
    } catch (err) {
        index = [];
    }
    
    const batchName = `Batch${jobId.substring(0, 8)}`;
    if (!index.includes(batchName)) {
        index.push(batchName);
    }
    
    await fs.writeFile(indexFile, JSON.stringify(index, null, 2));
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(PROJECT_ROOT, 'extraction_viewer.html'));
});

app.post('/api/extract', async (req, res) => {
    const { urls } = req.body;
    
    if (!urls || urls.length === 0) {
        return res.status(400).json({ error: 'No URLs provided' });
    }
    
    const jobIds = [];
    
    for (const url of urls) {
        const jobId = uuidv4();
        jobs[jobId] = {
            url: url,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        jobIds.push(jobId);
        
        // Run extraction in background
        runExtraction(url, jobId).catch(err => {
            console.error(`Error in job ${jobId}:`, err);
            jobs[jobId].status = 'failed';
            jobs[jobId].error = err.message;
        });
    }
    
    res.status(202).json({
        status: 'started',
        job_ids: jobIds,
        message: `Started extraction for ${urls.length} URL(s)`
    });
});

app.get('/api/job/:jobId', (req, res) => {
    const { jobId } = req.params;
    
    if (!jobs[jobId]) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(jobs[jobId]);
});

app.get('/api/batches', async (req, res) => {
    const indexFile = path.join(EXTRACTION_RESULTS, 'batch_index.json');
    
    try {
        const data = await fs.readFile(indexFile, 'utf8');
        const batches = JSON.parse(data);
        res.json(batches);
    } catch (err) {
        res.json([]);
    }
});

app.get('/extraction_results/:filename', (req, res) => {
    const filePath = path.join(EXTRACTION_RESULTS, req.params.filename);
    res.sendFile(filePath);
});

app.listen(PORT, '127.0.0.1', () => {
    console.log('🚀 PopUp Backend Server starting...');
    console.log(`   API endpoint: http://127.0.0.1:${PORT}/api/extract`);
    console.log(`   Viewer: http://127.0.0.1:${PORT}/`);
    console.log(`   Extraction results: http://127.0.0.1:${PORT}/extraction_results/`);
});
