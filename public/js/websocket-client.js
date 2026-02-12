/**
 * WebSocket client with auto-reconnection.
 */
const WsClient = (() => {
  let ws = null;
  let handlers = {};
  let reconnectTimer = null;

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${location.host}`);

    ws.addEventListener('open', () => {
      console.log('[WS] connected');
      if (handlers.open) handlers.open();
    });

    ws.addEventListener('message', (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (handlers[msg.type]) handlers[msg.type](msg);
    });

    ws.addEventListener('close', () => {
      console.log('[WS] disconnected, reconnecting...');
      scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 2000);
  }

  function send(data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  function on(type, fn) {
    handlers[type] = fn;
  }

  connect();

  return { send, on };
})();
