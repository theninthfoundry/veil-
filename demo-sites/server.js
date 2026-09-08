/**
 * VEIL Internet-in-a-Box — Zero-Dependency Local Demo Server
 *
 * Runs locally on port 3000 to provide 100% offline, deterministic demo execution
 * for the Smart India Hackathon (SIH) evaluation.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.DEMO_PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // CORS Headers for Extension Content Scripts and Background Service Workers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VEIL-Session-Key, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;

  // Handle Root Redirect / Index
  if (pathname === '/' || pathname === '/index.html') {
    pathname = '/index.html';
  }

  // API Endpoints
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

  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, status: 'VEIL_DEMO_SERVER_ONLINE', port: PORT }));
    return;
  }

  // Static File Serving
  const safePath = path.normalize(path.join(BASE_DIR, pathname));
  if (!safePath.startsWith(BASE_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

if (require.main === module) {
  const isTest = process.argv.includes('--test');

  server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(75));
    console.log('🛡️  VEIL INTERNET-IN-A-BOX — LOCAL DEMO ENVIRONMENT');
    console.log('='.repeat(75));
    console.log(`  ✔ Server running on: http://127.0.0.1:${PORT}`);
    console.log(`\n  DEMO SURFACES:`);
    console.log(`   [1] Portal Index:       http://127.0.0.1:${PORT}/index.html`);
    console.log(`   [2] Task 1 (Shopping):  http://127.0.0.1:${PORT}/shop.html`);
    console.log(`   [3] Task 2 (Travel):    http://127.0.0.1:${PORT}/travel.html`);
    console.log(`   [4] Task 3 (Forms):     http://127.0.0.1:${PORT}/forms.html`);
    console.log(`   [5] Task 4 (Banking):   http://127.0.0.1:${PORT}/banking.html`);
    console.log(`   [6] Task 5 (ATTACK):    http://127.0.0.1:${PORT}/malicious-shop.html`);
    console.log('='.repeat(75));

    if (isTest) {
      console.log('✔ Self-test mode verified. Terminating cleanly.');
      server.close(() => process.exit(0));
    }
  });
}

module.exports = server;
