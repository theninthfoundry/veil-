/**
 * VEIL Master Server — AI Studio Dev & Production Entry Point
 *
 * Runs on port 3000 (host: 0.0.0.0)
 * Serves the VEIL Internet-in-a-Box Demo Portal, Test Apps, Command Center, and API endpoints.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT_DIR = __dirname;
const DEMO_DIR = path.join(ROOT_DIR, 'demo-sites');
const EXTENSION_DIR = path.join(ROOT_DIR, 'veil-extension');

let VLMAdapter = null;
let vlmInstance = null;
try {
  const vlmModule = require('./server/vlm_adapter.js');
  VLMAdapter = vlmModule.VLMAdapter;
  vlmInstance = new VLMAdapter();
} catch (e) {
  console.warn('[VEIL Server] VLM adapter optional load notice:', e.message);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm'
};

function resolveFilePath(pathname) {
  if (pathname === '/' || pathname === '/index.html') {
    return path.join(DEMO_DIR, 'index.html');
  }

  // 1. Direct in demo-sites
  const inDemo = path.join(DEMO_DIR, pathname);
  if (fs.existsSync(inDemo) && fs.statSync(inDemo).isFile()) {
    return inDemo;
  }

  // 2. Direct extension path: /veil-extension/...
  if (pathname.startsWith('/veil-extension/')) {
    const sub = pathname.replace(/^\/veil-extension\//, '');
    const inExt = path.join(EXTENSION_DIR, sub);
    if (fs.existsSync(inExt) && fs.statSync(inExt).isFile()) {
      return inExt;
    }
  }

  // 3. Extension shortcuts
  const extPrefixes = ['command-center', 'test-pages', 'proof', 'popup', 'sidepanel', 'comparison', 'lab', 'core', 'icons', 'vendor', 'benchmark', 'fixtures', 'test-apps'];
  const firstSegment = pathname.split('/')[1];
  if (extPrefixes.includes(firstSegment)) {
    const inExt = path.join(EXTENSION_DIR, pathname);
    if (fs.existsSync(inExt) && fs.statSync(inExt).isFile()) {
      return inExt;
    }
  }

  // 4. In repo root
  const inRoot = path.join(ROOT_DIR, pathname);
  if (fs.existsSync(inRoot) && fs.statSync(inRoot).isFile()) {
    return inRoot;
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VEIL-Session-Key, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // API: Checkout
  if (pathname === '/api/checkout' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        orderId: `ORD_${Date.now()}`,
        status: 'ORDER_CONFIRMED',
        message: 'Order processed successfully via VEIL Privacy Shield.'
      }));
    });
    return;
  }

  // API: Flights
  if (pathname === '/api/flights' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      flights: [
        { id: 'FL-01', airline: 'IndiGo 6E-204', dep: '06:15 HYD', arr: '08:35 DEL', price: 4499 },
        { id: 'FL-02', airline: 'Air India AI-542', dep: '09:30 HYD', arr: '11:55 DEL', price: 5899 },
        { id: 'FL-03', airline: 'Akasa Air QP-1102', dep: '18:45 HYD', arr: '21:05 DEL', price: 4199 }
      ]
    }));
    return;
  }

  // API: Health
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, status: 'VEIL_SERVER_ONLINE', port: PORT }));
    return;
  }

  // API: VLM Proposal
  if (pathname === '/api/vlm' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (vlmInstance) {
          const proposal = await vlmInstance.proposeAction(payload.task, payload.context || {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(proposal));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            action: 'CLICK',
            target: 'btn-proceed',
            reason: 'Fallback proposal in demo mode',
            mode: 'OFFLINE_DEMO'
          }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  const resolved = resolveFilePath(pathname);
  if (!resolved) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${pathname}`);
    return;
  }

  const safePath = path.normalize(resolved);
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  const ext = path.extname(safePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  const stream = fs.createReadStream(safePath);
  stream.pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(75));
  console.log('🛡️  VEIL INTERNET-IN-A-BOX & ZERO-TRUST VISION AGENT SERVER');
  console.log('='.repeat(75));
  console.log(`  ✔ Server running on: http://0.0.0.0:${PORT}`);
  console.log(`\n  AVAILABLE DEMO SURFACES:`);
  console.log(`   [1] Portal Index:       http://0.0.0.0:${PORT}/index.html`);
  console.log(`   [2] Task 1 (Shopping):  http://0.0.0.0:${PORT}/shop.html`);
  console.log(`   [3] Task 2 (Travel):    http://0.0.0.0:${PORT}/travel.html`);
  console.log(`   [4] Task 3 (Forms):     http://0.0.0.0:${PORT}/forms.html`);
  console.log(`   [5] Task 4 (Banking):   http://0.0.0.0:${PORT}/banking.html`);
  console.log(`   [6] Task 5 (ATTACK):    http://0.0.0.0:${PORT}/malicious-shop.html`);
  console.log(`   [7] Command Center:     http://0.0.0.0:${PORT}/veil-extension/command-center/command-center.html`);
  console.log(`   [8] 10-Case Eval Hub:   http://0.0.0.0:${PORT}/veil-extension/test-pages/index.html`);
  console.log(`   [9] SIH Proof Lab:      http://0.0.0.0:${PORT}/veil-extension/proof/proof.html`);
  console.log('='.repeat(75));
});

module.exports = server;
