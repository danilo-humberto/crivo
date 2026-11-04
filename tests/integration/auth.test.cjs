// Run only against a disposable, empty development database with migrations 001/002.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {createPool}=require('../../server/persistence/database.cjs');
const {createAuthRepository}=require('../../server/auth/repository.cjs');
test('Postgres: convite único sob concorrência, expiração, revogação e rollback',async()=>{
  assert.equal(process.env.VAULT_DB_ENV,'development');assert.equal(process.env.VAULT_INTEGRATION_APPROVED,'yes');
  assert.ok(process.env.VAULT_EXPECTED_DATABASE);assert.ok(process.env.VAULT_EXPECTED_ROLE);
  const pool=createPool(process.env.DATABASE_URL);
  try{
    const target=(await pool.query(`SELECT current_database() AS database,current_user AS role,
      (has_table_privilege(current_user,'vault.invitations','SELECT') AND
       has_table_privilege(current_user,'vault.invitations','INSERT') AND
       has_table_privilege(current_user,'vault.invitations','UPDATE')) AS allowed`)).rows[0];
    assert.equal(target.database,process.env.VAULT_EXPECTED_DATABASE);assert.equal(target.role,process.env.VAULT_EXPECTED_ROLE);assert.equal(target.allowed,true);
    const issuer=randomUUID();await pool.query('INSERT INTO vault.internal_users(id,auth_subject,name,cpf,active) VALUES ($1,$1,$2,$3,true)',[issuer,'Emissor sintético','01234567890']);
    const repo=createAuthRepository(pool),invite=await repo.invite(issuer);
    const input={token:invite.token,name:'Convidado sintético',cpf:'01234567890'},subjects=[randomUUID(),randomUUID()];
    const results=await Promise.allSettled(subjects.map(subject=>repo.accept(subject,input)));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await pool.query('SELECT id FROM vault.internal_users WHERE auth_subject=ANY($1::text[])',[subjects])).rows.length,1);
    await assert.rejects(repo.accept(randomUUID(),input));
    const expired=await repo.invite(issuer),subject=randomUUID();
    await pool.query("UPDATE vault.invitations SET created_at=clock_timestamp()-interval '49 hours',expires_at=clock_timestamp()-interval '1 hour' WHERE id=$1",[expired.id]);
    await assert.rejects(repo.accept(subject,{...input,token:expired.token}));assert.equal(await repo.lookup(subject),null);
    const revoked=await repo.invite(issuer);await repo.revoke(revoked.id,issuer);
    await assert.rejects(repo.accept(subject,{...input,token:revoked.token}));assert.equal(await repo.lookup(subject),null);
    const next=await repo.invite(issuer);await assert.rejects(repo.revoke(next.id,results.find(r=>r.status==='fulfilled').value.id));
    const second=createPool(process.env.DATABASE_URL);try{assert.ok(await createAuthRepository(second).lookup(subjects[results.findIndex(r=>r.status==='fulfilled')]));}finally{await second.end();}
  }finally{await pool.end();}
});
