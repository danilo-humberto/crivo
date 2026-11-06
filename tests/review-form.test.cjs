const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function field(value=''){
  return {value,selectionStart:value.length,selectionEnd:value.length,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}};
}
function setup(){
  const cpf=field(),comment=field(),counter={textContent:''};
  const form={addEventListener(){},querySelector:selector=>({'#review-cpf':cpf,'#review-comment':comment,'#review-comment-count':counter}[selector])};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/web/scripts/reviews.js'),'utf8'),{document:{querySelectorAll:()=>[],querySelector:()=>form},window:{addEventListener(){}}});
  return {cpf,comment,counter};
}
test('máscara formata digitação e colagem, preserva zero e posição de edição',()=>{
  const {cpf}=setup();
  for(const [raw,expected] of [['012','012'],['0123','012.3'],['01234567890','012.345.678-90'],['012.345.678-90','012.345.678-90']]){
    cpf.value=raw;cpf.selectionStart=cpf.selectionEnd=raw.length;cpf.listeners.input({isComposing:false});assert.equal(cpf.value,expected);
  }
  cpf.value='012.9345.678-90';cpf.selectionStart=cpf.selectionEnd=5;cpf.listeners.input({});assert.equal(cpf.selectionStart,5);
  cpf.value='012.345.678-90';cpf.selectionStart=cpf.selectionEnd=4;cpf.listeners.beforeinput({inputType:'deleteContentBackward'});assert.equal(cpf.selectionStart,2);assert.equal(cpf.selectionEnd,4);
});
test('contador acompanha digitação, remoção e limite do comentário',()=>{
  const {comment,counter}=setup();assert.equal(counter.textContent,'0 / 2.000');
  for(const size of [12,2000,0]){comment.value='a'.repeat(size);comment.listeners.input();assert.equal(counter.textContent,`${size.toLocaleString('pt-BR')} / 2.000`);}
});
