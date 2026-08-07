const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const WEBSITES_DIR = path.join(__dirname, '../websites');
const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });
console.log(`[SPM DEV] WebSocket Server started on ws://localhost:${PORT}`);

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
