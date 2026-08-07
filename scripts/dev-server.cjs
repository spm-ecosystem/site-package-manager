const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const WEBSITES_DIR = path.join(__dirname, '../public/websites');
const PORT = 8080;

const server = http.createServer(async (req, res) => {
  // Set CORS headers for visual sandbox integration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  if (parsedUrl.pathname === '/fetch') {
    const target = parsedUrl.searchParams.get('url');
    if (!target) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing url query parameter' }));
      return;
    }

    try {
      console.log(`[SPM DEV Proxy] Fetching target: ${target}`);
      // Use Node v24 global fetch API with a real browser User-Agent
      const response = await fetch(target, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const text = await response.text();
      res.writeHead(response.status, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(text);
    } catch (err) {
      console.error(`[SPM DEV Proxy] Fetch failed for ${target}:`, err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });
console.log(`[SPM DEV] WebSocket & Proxy Server started on http://localhost:${PORT}`);

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('[SPM DEV] Visual Sandbox Client connected.');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('[SPM DEV] Visual Sandbox Client disconnected.');
  });
});

fs.watch(WEBSITES_DIR, (eventType, filename) => {
  if (filename && filename.endsWith('.json') && filename !== 'registry.json') {
    console.log(`[SPM DEV] File change detected: ${filename}. Syncing changes...`);
    try {
      const filePath = path.join(WEBSITES_DIR, filename);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const payload = JSON.stringify({
          type: 'theme-update',
          filename,
          content: JSON.parse(fileContent)
        });

        for (const client of clients) {
          if (client.readyState === 1) {
            client.send(payload);
          }
        }
      }
    } catch (err) {
      console.error('[SPM DEV] Error reading config file:', err);
    }
  }
});

server.listen(PORT);
