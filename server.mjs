import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const port = Number(process.env.PORT || 4173);
http.createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405);res.end();return; }
  try {
    let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name==='/') name='/index.html';
    if(!['/index.html','/styles.css','/src/app.js','/src/domain.js','/data/configuration.json','/data/checklists.json','/docs/design.html'].includes(name)) {res.writeHead(404);res.end();return;}
    const data=await readFile(path.join(root,name));
    res.writeHead(200,{'Content-Type':mime[path.extname(name)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`5S prototype: http://127.0.0.1:${port}`));

