const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createServer}=require('../server/server.cjs');
test('API verifica sessão, autorização, origem e autor antes de persistir',async t=>{
  let session=null,user=null,saved;
  const server=createServer({mode:'managed',origin:'http://localhost',auth:{session:async()=>session},authRepository:{lookup:async()=>user},repository:{saveProject:async(p,opts)=>{saved=opts;return p;},listState:async()=>({projects:[],audit:[]})}});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base+'/api/projects')).status,401);
  session={user:{id:'external',emailVerified:true},session:{expiresAt:'2099-01-01'}};
  assert.equal((await fetch(base+'/api/projects')).status,403);
  user={id:'internal',name:'Teste',active:true};
  assert.equal((await fetch(base+'/api/projects')).status,200);
  assert.equal((await fetch(base+'/api/projects',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'})).status,403);
  const csrf=await fetch(base+'/api/csrf'),token=(await csrf.json()).token;
  const cookie=csrf.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await fetch(base+'/api/csrf',{headers:{cookie}})).json()).token,token);
  const headers={origin:'http://localhost','content-type':'application/json','x-vault-csrf':token,cookie:csrf.headers.get('set-cookie').split(';')[0]};
  assert.equal((await fetch(base+'/api/projects',{method:'POST',headers,body:JSON.stringify({project:{id:'p'},expectedVersion:2,actorId:'forged'})})).status,200);
  assert.deepEqual(saved,{expectedVersion:2,actorId:'internal'});
  user.active=false;assert.equal((await fetch(base+'/api/projects')).status,403);
  session=null;assert.equal((await fetch(base+'/api/projects')).status,401);
});
test('recuperação oculta existência de conta mas informa indisponibilidade e limitação',async t=>{
  let status=404,received;
  const server=createServer({origin:'http://localhost',authRepository:{},auth:{proxy:async(_req,action,data)=>{received=data;return Response.json({private:'sensitive'},{status});}}});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const csrf=await fetch(base+'/api/csrf'),token=(await csrf.json()).token;
  const headers={origin:'http://localhost','content-type':'application/json','x-vault-csrf':token,cookie:csrf.headers.get('set-cookie').split(';')[0]};
  async function send(){return fetch(base+'/api/auth/request-password-reset',{method:'POST',headers,body:JSON.stringify({email:'test@example.invalid',redirectTo:'https://evil.example',role:'admin'})});}
  const absent=await send();assert.equal(absent.status,200);assert.deepEqual(await absent.json(),{status:true});
  assert.deepEqual(received,{email:'test@example.invalid',redirectTo:'http://localhost/auth'});
  status=503;assert.equal((await send()).status,503);status=429;assert.equal((await send()).status,429);
  assert.equal((await fetch(base+'/api/auth/admin/create-user',{method:'POST',headers,body:'{}'})).status,404);
});
test('falha de callback informa configuração sem expor resposta privada do provedor',async t=>{
  const server=createServer({origin:'http://localhost',authRepository:{},auth:{proxy:async()=>Response.json({code:'INVALID_CALLBACK_URL',message:'private detail'},{status:403})}});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`,csrf=await fetch(base+'/api/csrf'),token=(await csrf.json()).token;
  const response=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json','x-vault-csrf':token,cookie:csrf.headers.get('set-cookie').split(';')[0]},body:'{}'});
  assert.equal(response.status,503);const body=await response.json();assert.equal(body.code,'AUTH_ORIGIN_NOT_ALLOWED');assert.match(body.message,/endereço/);assert.ok(!JSON.stringify(body).includes('private detail'));
});
test('verificação diferencia código inválido, expirado e limite sem revelar detalhes',async t=>{
  let code='OTP_EXPIRED';
  const server=createServer({origin:'http://localhost',authRepository:{},auth:{proxy:async()=>Response.json({code,message:'private detail'},{status:400})}});
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`,csrf=await fetch(base+'/api/csrf'),token=(await csrf.json()).token;
  for(const [value,expected,status] of [['OTP_EXPIRED',/expirou/,400],['INVALID_OTP',/inválido/,400],['TOO_MANY_ATTEMPTS',/tentativas/,429]]){
    code=value;const response=await fetch(base+'/api/auth/email-otp/verify-email',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json','x-vault-csrf':token,cookie:csrf.headers.get('set-cookie').split(';')[0]},body:'{}'});
    assert.equal(response.status,status);const body=await response.json();assert.equal(body.code,value);assert.match(body.message,expected);assert.ok(!JSON.stringify(body).includes('private detail'));
  }
});
