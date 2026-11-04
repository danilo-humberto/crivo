const {test}=require('node:test');
const assert=require('node:assert/strict');
const {transaction}=require('../server/persistence/database.cjs');
const {normalizeCpf,validateReview}=require('../server/persistence/reviews.cjs');
test('transação confirma sucesso e sempre libera a conexão',async()=>{
  const calls=[]; const client={query:async sql=>calls.push(sql),release:()=>calls.push('release')};
  assert.equal(await transaction({connect:async()=>client},async c=>{await c.query('WORK');return 42;}),42);
  assert.deepEqual(calls,['BEGIN','WORK','COMMIT','release']);
});
test('falha de operação reverte a transação e preserva a causa',async()=>{
  const calls=[],failure=Error('synthetic');
  const client={query:async sql=>calls.push(sql),release:()=>calls.push('release')};
  await assert.rejects(transaction({connect:async()=>client},async()=>{throw failure;}),e=>e===failure);
  assert.deepEqual(calls,['BEGIN','ROLLBACK','release']);
});
test('CPF sintético preserva zero inicial e valida dígitos verificadores',()=>{
  assert.equal(normalizeCpf('012.345.678-90'),'01234567890');
  for(const value of ['00000000000','01234567891','abc01234567890',1234567890,null])assert.throws(()=>normalizeCpf(value),/CPF/);
});
test('avaliação exige nome, comentário e nota inteira de 1 a 5',()=>{
  const valid={name:'Pessoa sintética',cpf:'01234567890',rating:5,comment:'Teste'};
  assert.equal(validateReview(valid).rating,5);
  for(const change of [{name:' '},{comment:''},{rating:0},{rating:6},{rating:1.5},{rating:'5'}])assert.throws(()=>validateReview({...valid,...change}));
});
