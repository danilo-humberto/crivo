const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createReviewProtection}=require('../server/public/review-protection.cjs');
const {takeAttempt}=require('../workers/rate-window.cjs');

test('tokens permanecem válidos entre instâncias e reinícios com segredo estável',()=>{
  const secret='synthetic-signing-secret-for-tests-only';
  const first=createReviewProtection({secret,now:()=>100});
  const second=createReviewProtection({secret,now:()=>101});
  assert.equal(second.verify(first.token('project'),'project'),true);
  assert.equal(second.verify(first.token('project'),'other'),false);
  assert.equal(createReviewProtection({secret:'other-secret-with-at-least-32-bytes',now:()=>101}).verify(first.token('project'),'project'),false);
  assert.equal(createReviewProtection({secret,now:()=>3600100}).verify(first.token('project'),'project'),false);
  assert.throws(()=>createReviewProtection({secret:'short'}));
});
test('janela preserva contagem serializada, limites por IP/global e expiração',()=>{
  let state;
  for(let i=0;i<200;i++){
    const result=takeAttempt(state,String(Math.floor(i/10)),1000);
    assert.equal(result.retry,0);state=JSON.parse(JSON.stringify(result.state));
    if(i===9)assert.equal(takeAttempt(state,'0',1001).retry,600);
  }
  assert.equal(takeAttempt(state,'new',1001).retry,600);
  assert.equal(Object.keys(state.ips).length,20);
  const next=takeAttempt(state,'0',601000);assert.equal(next.retry,0);assert.equal(next.state.count,1);
});
