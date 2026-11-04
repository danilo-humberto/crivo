const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
// Keep public URLs stable and expose only explicitly listed assets.
const files = new Map(Object.entries({
  '/':'src/web/pages/index.html', '/index.html':'src/web/pages/index.html',
  '/core.js':'src/domain/core.js', '/audit.js':'src/domain/audit.js',
  '/local-storage.js':'src/infrastructure/local-storage.js',
  '/app.js':'src/web/scripts/app.js', '/styles.css':'src/web/styles/styles.css',
  '/motion.css':'src/web/styles/motion.css'
}));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function createServer() {
  return http.createServer((req,res)=>{
    const file=files.get(req.url.split('?')[0]);
    if(!file){res.writeHead(404);return res.end('Not found');}
    fs.readFile(path.join(__dirname,'..',file),(err,data)=>{
      if(err){res.writeHead(500);return res.end('Unable to read file');}
      res.writeHead(200,{'Content-Type':types[path.extname(file)]});res.end(data);
    });
  });
}
function start(){return createServer().listen(4173,'127.0.0.1',()=>console.log('Vault TI: http://127.0.0.1:4173'));}
if(require.main===module)start();
module.exports={createServer,start};
