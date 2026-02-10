/**
 * Reverse proxy: serves frontend (Next.js) + backend (API + Socket.io)
 * from a single port for Tailscale Funnel deployment.
 * 
 * Routes:
 * - /api/*        → backend (port 3001)
 * - /health       → backend (port 3001)  
 * - /socket.io/*  → backend (port 3001) with WebSocket upgrade
 * - everything else → frontend (port 3000)
 */

const http = require('http');
const httpProxy = require('http-proxy');

const FRONTEND = 'http://127.0.0.1:3000';
const BACKEND = 'http://127.0.0.1:3001';
const PORT = process.env.PROXY_PORT || 3333;

const proxy = httpProxy.createProxyServer({
  ws: true,
  changeOrigin: true,
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message);
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend unavailable' }));
  }
});

const server = http.createServer((req, res) => {
  // Route API and health to backend
  if (req.url.startsWith('/api/') || req.url.startsWith('/health') || req.url.startsWith('/socket.io/')) {
    proxy.web(req, res, { target: BACKEND });
  } else {
    proxy.web(req, res, { target: FRONTEND });
  }
});

// Handle WebSocket upgrade for Socket.io
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/socket.io/')) {
    proxy.ws(req, socket, head, { target: BACKEND });
  } else {
    // Next.js HMR websocket
    proxy.ws(req, socket, head, { target: FRONTEND });
  }
});

server.listen(PORT, () => {
  console.log(`🔀 Reverse proxy on port ${PORT}`);
  console.log(`   Frontend: ${FRONTEND}`);
  console.log(`   Backend:  ${BACKEND}`);
  console.log(`   Funnel:   https://lobstertank.tail94fdca.ts.net`);
});
