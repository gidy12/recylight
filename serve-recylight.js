// Tiny dependency-free static server for the RecyLight storefront.
// Dev convenience only — not part of the deployed output (no build step, no package manager).
// Run:  node serve-recylight.js
// Then open: http://localhost:8000/

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const ROOT = path.join(__dirname, 'outputs', 'recy-light');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.manifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function serve(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(ROOT, url.pathname);
  // Directory requests -> index.html
  if (filePath.endsWith(path.sep) || filePath === ROOT) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mime[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p><a href="/">Return to storefront</a></p>');
      return;
    }

    const headers = { 'Content-Type': contentType };
    if (path.basename(filePath) === 'service-worker.js') {
      headers['Service-Worker-Allowed'] = '/';
      headers['Cache-Control'] = 'no-cache';
    }
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

http.createServer(serve).listen(PORT, '127.0.0.1', () => {
  console.log(`RecyLight storefront running at http://localhost:${PORT}/`);
  console.log(`Serving files from: ${ROOT}`);
  console.log('Press Ctrl+C to stop.');
});
