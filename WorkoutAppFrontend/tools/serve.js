/* eslint-disable */
/** Static server with SPA fallback, so client-side routes resolve in tests. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || '/tmp/webbuild';
const PORT = Number(process.argv[3] || 8099);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const candidates = [
      path.join(ROOT, url),
      path.join(ROOT, `${url}.html`),
      path.join(ROOT, url, 'index.html'),
      path.join(ROOT, 'index.html'),
    ];
    for (const file of candidates) {
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        return fs.createReadStream(file).pipe(res);
      }
    }
    res.writeHead(404).end('not found');
  })
  .listen(PORT, () => console.log(`serving ${ROOT} on ${PORT}`));
