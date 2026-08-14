// Minimal static file server for previewing kidslearn.
const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT = process.env.PORT || 5174;
const ROOT = __dirname;
const MIME = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.json':'application/json',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.ico':'image/x-icon',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(url.parse(req.url).pathname);
  if(p === '/') p = '/index.html';
  const full = path.join(ROOT, p);
  if(!full.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.stat(full, (err, st) => {
    if(err){ res.writeHead(404); return res.end('not found'); }
    if(st.isDirectory()){
      const idx = path.join(full, 'index.html');
      return fs.readFile(idx, (e, d) => {
        if(e){ res.writeHead(404); return res.end('no index'); }
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
        res.end(d);
      });
    }
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream'});
    fs.createReadStream(full).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`kidslearn static server on http://localhost:${PORT}`);
});
