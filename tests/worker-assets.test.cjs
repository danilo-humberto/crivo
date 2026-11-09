const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createServer}=require('../server/server.cjs');

test('leitura de assets injetada mantém autorização e allowlist',async t=>{
  const reads=[];
  const server=createServer({auth:{session:async()=>null},authRepository:{lookup:async()=>null},
    readAsset:async file=>{reads.push(file);return Buffer.from('asset sintético');}});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal(await (await fetch(base+'/styles.css')).text(),'asset sintético');
  assert.equal((await fetch(base+'/management',{redirect:'manual'})).headers.get('location'),'/auth');
  for(const route of ['/.env','/server/server.cjs','/src/web/pages/index.html'])assert.equal((await fetch(base+route)).status,404);
  assert.deepEqual(reads,['src/web/styles/styles.css']);
});
