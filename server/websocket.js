const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');
const templateService = require('./services/template-service');

let wss;
const watchers = new Map(); // templateName -> chokidar watcher
// Track self-initiated writes to avoid feedback loops
let selfWriteUntil = 0;

function init(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.alive = true;
    ws.on('pong', () => { ws.alive = true; });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'watch-template') {
        watchTemplate(msg.name);
      }

      if (msg.type === 'update-css') {
        selfWriteUntil = Date.now() + 1000;
        templateService.saveCss(msg.name, msg.css);
        // Notify other clients
        broadcast({ type: 'css-updated', name: msg.name, css: msg.css }, ws);
      }
    });

    ws.on('close', () => {
      // Cleanup if no more clients
      if (wss.clients.size === 0) {
        for (const [name, watcher] of watchers) {
          watcher.close();
        }
        watchers.clear();
      }
    });
  });

  // Heartbeat
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.alive) return ws.terminate();
      ws.alive = false;
      ws.ping();
    });
  }, 30000);
}

function watchTemplate(name) {
  if (watchers.has(name)) return;

  const dir = templateService.getTemplatePath(name);
  const watcher = chokidar.watch(dir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  });

  watcher.on('change', (filePath) => {
    // Ignore changes triggered by our own writes
    if (Date.now() < selfWriteUntil) return;
    broadcast({ type: 'file-changed', name, file: filePath });
  });

  watchers.set(name, watcher);
}

function broadcast(data, exclude) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === 1) {
      client.send(msg);
    }
  });
}

module.exports = { init };
