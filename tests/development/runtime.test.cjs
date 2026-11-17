// Only the fixed local Docker database; never reads .env or integration credentials.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {once}=require('node:events');
const {createDevelopmentServer,createDevelopmentPool,developmentConfig}=require('../../server/dev-runtime.cjs');

test('Docker: HTTP, identidade fictícia, persistência entre conexões, auditoria e isolamento',async()=>{
  const {server,pool}=await createDevelopmentServer();
  const id=randomUUID(),origin=developmentConfig().origin;
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${server.address().port}`;
  try{
    const me=await fetch(base+'/api/me');assert.equal(me.status,200);
    assert.deepEqual(await me.json(),{id:'crivo-dev-user',name:'Pessoa de desenvolvimento',photoUrl:null});
    assert.equal((await fetch(base+'/catalogo')).status,200);
    const csrfResponse=await fetch(base+'/api/csrf');
    const {token}=await csrfResponse.json();
    const project={id,title:'Teste Docker sintético',description:'Descrição sintética',solution:'Solução sintética',owner:'Pessoa de desenvolvimento',owner_id:'crivo-dev-user',category:'Operações',status:'Planejado',requested:'2026-11-17',completed:'',cost:0,url:'',alternatives:[]};
    const headers={origin,'content-type':'application/json',cookie:`vault_csrf=${token}`,'x-vault-csrf':token};
    const denied=await fetch(base+'/api/projects',{method:'POST',headers:{...headers,origin:'https://example.invalid'},body:JSON.stringify({project})});
    assert.equal(denied.status,403);
    const saved=await fetch(base+'/api/projects',{method:'POST',headers,body:JSON.stringify({project})});
    assert.equal(saved.status,200);assert.equal((await saved.json()).id,id);
    const second=createDevelopmentPool();
    try{
      assert.equal((await second.query('SELECT title FROM vault.projects WHERE id=$1',[id])).rows[0].title,project.title);
      assert.equal((await second.query('SELECT actor_id FROM vault.audit WHERE project_id=$1',[id])).rows[0].actor_id,'crivo-dev-user');
      const permissions=(await second.query("SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user")).rows[0];
      assert.deepEqual(permissions,{rolsuper:false,rolcreatedb:false,rolcreaterole:false});
      assert.equal((await second.query("SELECT has_schema_privilege(current_user,'vault','CREATE') AS allowed")).rows[0].allowed,false);
    }finally{await second.end();}
    const state=await (await fetch(base+'/api/projects')).json();
    assert.ok(state.projects.some(p=>p.id===id));
    let current=state.projects.find(p=>p.id===id);
    assert.equal(current.requester,'');assert.equal(current.show_requester,false);
    async function save(changes){
      const response=await fetch(base+'/api/projects',{method:'POST',headers,body:JSON.stringify({project:{...current,...changes},expectedVersion:current.version})});
      assert.equal(response.status,200);current=await response.json();
    }
    await save({requester:'  <Pessoa sintética>  ',requester_department:'  Setor sintético  ',show_requester:true});
    assert.equal(current.requester,'<Pessoa sintética>');assert.equal(current.requester_department,'Setor sintético');
    const publicPath='/api/public/projects/~'+id,pagePath='/projetos/~'+id;
    assert.equal((await fetch(base+publicPath)).status,404);
    await save({is_public:true});
    let visible=await (await fetch(base+publicPath)).json();assert.equal(visible.requester,current.requester);
    let page=await (await fetch(base+pagePath)).text();assert.ok(page.includes('&lt;Pessoa sintética&gt;'));assert.ok(!page.includes('<Pessoa sintética>'));
    await save({show_requester:false});
    visible=await (await fetch(base+publicPath)).json();assert.ok(!Object.hasOwn(visible,'requester'));assert.ok(!Object.hasOwn(visible,'requester_department'));
    page=await (await fetch(base+pagePath)).text();assert.ok(!page.includes('Pessoa sintética'));assert.ok(!page.includes('Setor sintético'));
    assert.equal(current.requester,'<Pessoa sintética>');
    await save({show_requester:true,requester_department:''});
    visible=await (await fetch(base+publicPath)).json();assert.equal(visible.requester,current.requester);assert.ok(!Object.hasOwn(visible,'requester_department'));
    const before=current.version;
    const invalid=await fetch(base+'/api/projects',{method:'POST',headers,body:JSON.stringify({project:{...current,requester:'x'.repeat(121)},expectedVersion:before})});
    assert.equal(invalid.status,400);
    await save({requester:''});
    assert.equal(current.requester,'');
    // Old clients omit the new fields; updates must retain saved requester data.
    await save({requester:'Pessoa preservada',requester_department:'Setor preservado'});
    const legacy={...current,title:'Edição por cliente antigo'};
    delete legacy.requester;delete legacy.requester_department;delete legacy.show_requester;
    const updated=await fetch(base+'/api/projects',{method:'POST',headers,body:JSON.stringify({project:legacy,expectedVersion:current.version})});
    assert.equal(updated.status,200);current=await updated.json();assert.equal(current.requester,'Pessoa preservada');assert.equal(current.show_requester,true);
    await pool.query('UPDATE vault.projects SET archived_at=clock_timestamp() WHERE id=$1',[id]);
    assert.equal((await fetch(base+publicPath)).status,404);assert.equal((await fetch(base+pagePath)).status,404);
  }finally{
    // Remove only the synthetic record generated by this test and its own audit.
    await pool.query('DELETE FROM vault.audit WHERE project_id=$1',[id]);
    await pool.query('DELETE FROM vault.alternatives WHERE project_id=$1',[id]);
    await pool.query('DELETE FROM vault.projects WHERE id=$1',[id]);
    await new Promise(resolve=>server.close(resolve));await pool.end();
  }
});
