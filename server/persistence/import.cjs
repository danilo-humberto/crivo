const {createHash}=require('node:crypto');
const {validateState}=require('../../src/domain/audit.js');

function canonical(value) {
  return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
}
function prepareImport(input,options={}) {
  if(typeof options.source!=='string'||!options.source.trim())throw Error('Informe a origem da importação.');
  if(!['keep','exclude'].includes(options.examples))throw Error('Defina o tratamento dos exemplos.');
  validateState(input);
  const excluded=options.excludeProjectIds??[];
  if(!Array.isArray(excluded)||excluded.some(id=>typeof id!=='string')||new Set(excluded).size!==excluded.length)throw Error('Seleção de exemplos inválida.');
  if(options.examples==='keep'&&excluded.length)throw Error('Seleção de exemplos contraditória.');
  const known=new Set([...input.projects.map(p=>p.id),...input.audit.map(e=>e.projectId)]);
  if(excluded.some(id=>!known.has(id)))throw Error('Projeto desconhecido na seleção de exemplos.');
  const excludedSet=new Set(excluded);
  const state=structuredClone({version:2,
    projects:input.projects.filter(p=>!excludedSet.has(p.id)),
    audit:input.audit.filter(e=>!excludedSet.has(e.projectId)&&(options.examples==='keep'||e.demo!==true))});
  const counts={projects:state.projects.length,alternatives:state.projects.reduce((sum,p)=>sum+p.alternatives.length,0),audit:state.audit.length};
  return {source:options.source.trim(),digest:createHash('sha256').update(canonical(state)).digest('hex'),state,counts,
    unmappedOwners:[...new Set(state.projects.map(p=>p.owner))].sort(),
    excluded:{projects:input.projects.length-counts.projects,audit:input.audit.length-counts.audit}};
}
module.exports={prepareImport};
