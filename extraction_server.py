#!/usr/bin/env python3
"""
Extraction Server - Serves static files and handles /api/extract & /api/job endpoints
Runs the DNA extractor backend when the viewer triggers extraction.
"""
import json
import os
import re
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

# Jobs tracking
JOBS = {}  # job_id -> {"status": str, "batch_name": str, "urls": [], "results": [], "created": "", "completed": ""}

PROJECT_ROOT = Path(__file__).parent.resolve()
OUTPUT_DIR = PROJECT_ROOT / "output" / "extraction"


class ExtractionHandler(SimpleHTTPRequestHandler):

    def do_POST(self):
        if self.path == '/api/extract':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            urls = data.get('urls', [])

            if not urls:
                self._json_response(400, {"status": "error", "message": "No URLs provided"})
                return

            # Create job
            job_id = str(uuid.uuid4())[:8]
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            batch_name = f"Batch_{timestamp}"

            JOBS[job_id] = {
                "status": "running",
                "batch_name": batch_name,
                "urls": urls,
                "results": [],
                "created": timestamp,
                "completed": None
            }

            # Run extraction in background thread
            t = threading.Thread(target=self._run_extraction, args=(job_id, urls, batch_name), daemon=True)
            t.start()

            self._json_response(200, {
                "status": "started",
                "job_id": job_id,
                "batch_name": batch_name,
                "urls": urls
            })

        elif self.path == '/api/create_batch':
            # Legacy endpoint support
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            urls = data.get('urls', [])
            if not urls:
                self._json_response(400, {"status": "error", "message": "No URLs provided"})
                return
            job_id = str(uuid.uuid4())[:8]
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            batch_name = f"Batch_{timestamp}"
            JOBS[job_id] = {
                "status": "running", "batch_name": batch_name, "urls": urls,
                "results": [], "created": timestamp, "completed": None
            }
            t = threading.Thread(target=self._run_extraction, args=(job_id, urls, batch_name), daemon=True)
            t.start()
            self._json_response(200, {"status": "success", "job_id": job_id, "batch_name": batch_name})

        elif self.path == '/api/run_extraction':
            # Legacy endpoint support
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            job_id = data.get('batch_id', '')
            urls = data.get('urls', [])
            if job_id in JOBS:
                JOBS[job_id]["status"] = "running"
                t = threading.Thread(target=self._run_extraction, args=(job_id, urls, job_id), daemon=True)
                t.start()
            self._json_response(200, {"status": "success", "message": "Extraction started"})

        else:
            self._json_response(404, {"status": "error", "message": "Not found"})

    def do_GET(self):
        # Job status endpoint
        job_match = re.match(r'^/api/job/([a-zA-Z0-9_-]+)$', self.path)
        if job_match:
            job_id = job_match.group(1)
            job = JOBS.get(job_id)
            if job:
                self._json_response(200, job)
            else:
                self._json_response(404, {"status": "error", "message": f"Job {job_id} not found"})
            return

        # Batches list endpoint
        if self.path == '/api/batches':
            # Read from batch_index.json
            index_path = OUTPUT_DIR.parent / "batch_index.json"
            batches = []
            if index_path.exists():
                try:
                    with open(index_path) as f:
                        data = json.load(f)
                    for folder in data.get("batches", []):
                        manifest_path = OUTPUT_DIR / folder / "batch_manifest.json"
                        if manifest_path.exists():
                            with open(manifest_path) as mf:
                                manifest = json.load(mf)
                            batches.append({
                                "batch_id": folder,
                                "batch_name": manifest.get("batch_name", folder),
                                "created_at": manifest.get("timestamp", ""),
                                "status": "completed",
                                "urls": [r["url"] for r in manifest.get("results", [])]
                            })
                except Exception:
                    pass
            # Include running jobs
            for jid, job in JOBS.items():
                if job["status"] == "running":
                    batches.append({
                        "batch_id": jid,
                        "batch_name": job["batch_name"],
                        "created_at": job["created"],
                        "status": "running",
                        "urls": job["urls"]
                    })
            self._json_response(200, batches)
            return

        # Batch files endpoint
        batch_files_match = re.match(r'^/api/batch_files\?batch_id=(.+)$', self.path)
        if batch_files_match:
            batch_id = batch_files_match.group(1)
            batch_dir = OUTPUT_DIR / batch_id
            files = []
            if batch_dir.exists():
                for f in sorted(batch_dir.glob("*.json")):
                    if f.name != "batch_manifest.json":
                        files.append({
                            "filename": f.name,
                            "url": f"../output/extraction/{batch_id}/{f.name}"
                        })
            self._json_response(200, files)
            return

        # Default: serve static file
        super().do_GET()

    def do_HEAD(self):
        super().do_HEAD()

    def _run_extraction(self, job_id, urls, batch_name):
        """Run extraction in background - sequential sites"""
        batch_base = OUTPUT_DIR / batch_name
        batch_base.mkdir(parents=True, exist_ok=True)
        results = []

        extractor_script = PROJECT_ROOT / "scripts" / "batch_extract.py"
        evaluator_script = PROJECT_ROOT / "backend" / "extractor" / "evaluator.py"

        for url in urls:
            try:
                print(f"[{job_id}] Extracting: {url}")
                # Run DNA extractor
                domain = url.replace('https://', '').replace('http://', '').split('/')[0]
                output_file = batch_base / f"{domain.replace('.', '_')}.json"

                cmd = [
                    "C:\Python314\python.exe",
                    str(PROJECT_ROOT / "backend" / "extractor" / "dna_extractor.py"),
                    "--url", url,
                    "--output", str(output_file)
                ]

                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=180, cwd=str(PROJECT_ROOT))
                print(f"[{job_id}] CMD: {' '.join(cmd)}")
                print(f"[{job_id}] RC: {proc.returncode}")
                status = "success" if proc.returncode == 0 else "error"
                if proc.returncode != 0:
                    stderr_tail = proc.stderr[-500:] if proc.stderr else ''
                    print(f"[{job_id}] STDERR: {stderr_tail}")
                    results[-1 if results else 0]["error"] = stderr_tail

                if status == "success":
                    # Run evaluator on the extraction output
                    eval_output = batch_base / f"{domain.replace('.', '_')}_evaluation.json"
                    eval_cmd = [
                        "C:\Python314\python.exe",
                        str(evaluator_script),
                        str(output_file),
                        "--output", str(eval_output)
                    ]
                    try:
                        subprocess.run(eval_cmd, capture_output=True, text=True, timeout=30, cwd=str(PROJECT_ROOT))
                    except Exception:
                        pass

                results.append({
                    "url": url,
                    "output": str(output_file),
                    "status": status
                })

            except subprocess.TimeoutExpired:
                results.append({"url": url, "error": "Timeout", "status": "error"})
            except Exception as e:
                results.append({"url": url, "error": str(e), "status": "error"})

        # Save manifest
        manifest = {
            "batch_name": batch_name,
            "timestamp": datetime.now().strftime("%Y-%m-%d_%H-%M-%S"),
            "total_sites": len(urls),
            "results": results
        }
        manifest_file = batch_base / "batch_manifest.json"
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)

        # Update batch_index.json
        index_path = OUTPUT_DIR.parent / "batch_index.json"
        index_data = {"batches": []}
        if index_path.exists():
            try:
                with open(index_path) as f:
                    index_data = json.load(f)
            except Exception:
                pass
        if batch_name not in index_data.get("batches", []):
            index_data.setdefault("batches", []).insert(0, batch_name)
        with open(index_path, 'w') as f:
            json.dump(index_data, f, indent=2)

        # Update job status
        JOBS[job_id]["status"] = "completed"
        JOBS[job_id]["completed"] = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        JOBS[job_id]["results"] = results

        # Save evaluator outputs to evaluation folder
        eval_dir = PROJECT_ROOT / "output" / "evaluation"
        eval_dir.mkdir(parents=True, exist_ok=True)
        eval_index = eval_dir / "eval_index.json"
        eval_entries = []
        if eval_index.exists():
            try:
                with open(eval_index) as f:
                    eval_entries = json.load(f)
            except Exception:
                pass

        for r in results:
            if r["status"] == "success":
                json_file = Path(r["output"])
                domain = json_file.stem
                eval_file = json_file.parent / f"{domain}_evaluation.json"
                if eval_file.exists():
                    eval_entries.append({
                        "batch": batch_name,
                        "url": r["url"],
                        "domain": domain,
                        "eval_file": str(eval_file),
                        "created": datetime.now().isoformat()
                    })

        with open(eval_index, 'w') as f:
            json.dump(eval_entries, f, indent=2)

        print(f"[{job_id}] Batch complete: {batch_name} ({len(results)} sites)")

    def _json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def log_message(self, format, *args):
        # Quieter logging
        if '/api/' in str(args[0]):
            print(f"[API] {args[0]}")
        else:
            super().log_message(format, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
    server = HTTPServer(('0.0.0.0', port), ExtractionHandler)
    print(f"\n{'='*60}")
    print(f"  PopUp Extraction Server")
    print(f"  Serving at http://localhost:{port}")
    print(f"  API: POST /api/extract (JSON: {{\"urls\": [...]}})")
    print(f"  API: GET /api/job/{{job_id}}")
    print(f"  API: GET /api/batches")
    print(f"  API: GET /api/batch_files?batch_id=...")
    print(f"  Static files served from: {PROJECT_ROOT}")
    print(f"{'='*60}\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.server_close()


if __name__ == '__main__':
    main()