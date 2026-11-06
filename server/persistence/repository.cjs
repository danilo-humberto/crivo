const {randomUUID}=require('node:crypto');
const {validateProject}=require('../../src/domain/core.js');
const {changedFields}=require('../../src/domain/audit.js');
const {transaction}=require('./database.cjs');
const {prepareImport}=require('./import.cjs');
const {validateReview}=require('./reviews.cjs');

const projectColumns=`id,title,description,solution,owner_legacy AS owner,category,status,
  requested::text,coalesce(completed::text,'') AS completed,cost::float8 AS cost,solution_url AS url,
  version,owner_id,is_public,show_solution_url,archived_at`;
const projectValues=p=>[p.id,p.title,p.description,p.solution,p.owner,p.category,p.status,p.requested,p.completed||null,p.cost,p.url||''];

async function insertProject(client,p) {
  await client.query(`INSERT INTO vault.projects
    (id,title,description,solution,owner_legacy,category,status,requested,completed,cost,solution_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,projectValues(p));
  await insertAlternatives(client,p);
}
async function insertAlternatives(client,p) {
  for(const [position,a] of p.alternatives.entries())await client.query(
    'INSERT INTO vault.alternatives(project_id,position,name,cost,notes) VALUES ($1,$2,$3,$4,$5)',
    [p.id,position,a.name,a.cost,a.notes]);
}
async function readProject(client,id,lock=false) {
  const {rows}=await client.query(`SELECT ${projectColumns} FROM vault.projects WHERE id=$1${lock?' FOR UPDATE':''}`,[id]);
  if(!rows.length)return null;
  const p=rows[0];
  p.alternatives=(await client.query('SELECT name,cost::float8 AS cost,notes FROM vault.alternatives WHERE project_id=$1 ORDER BY position',[id])).rows;
  return p;
}
async function writeAudit(client,{id=randomUUID(),projectId,action,at=new Date().toISOString(),actorId=null,actor='Não identificado',before=null,after=null,legacy=null}) {
  await client.query(`INSERT INTO vault.audit
    (id,project_id,action,happened_at,actor_id,actor_legacy,before_snapshot,after_snapshot,legacy_event)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb)`,
    [id,projectId,action,at,actorId,actor,before===null?null:JSON.stringify(before),after===null?null:JSON.stringify(after),legacy===null?null:JSON.stringify(legacy)]);
}

function createRepository(pool) {
  return {
    async listState(){return transaction(pool,async client=>{
      await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const ids=(await client.query('SELECT id FROM vault.projects WHERE archived_at IS NULL ORDER BY requested DESC,id')).rows;
      const projects=[];for(const {id} of ids)projects.push(await readProject(client,id));
      const audit=(await client.query(`SELECT id,project_id AS "projectId",action,happened_at AS at,
        actor_legacy AS actor,before_snapshot AS before,after_snapshot AS after,
        coalesce(legacy_event->'demo'='true'::jsonb,false) AS demo FROM vault.audit ORDER BY happened_at DESC,id`)).rows;
      return {version:2,projects,audit};
    });},
    async deleteProject(id,{expectedVersion,actorId}){
      if(!Number.isInteger(expectedVersion)||expectedVersion<1)throw Object.assign(Error('Versão inválida.'),{status:400});
      return transaction(pool,async client=>{
        const actor=(await client.query('SELECT name FROM vault.internal_users WHERE id=$1 AND active=true FOR SHARE',[actorId])).rows[0];
        if(!actor)throw Object.assign(Error('Acesso interno não autorizado.'),{status:403});
        const before=await readProject(client,id,true);
        if(!before||before.archived_at||before.version!==expectedVersion)throw Object.assign(Error('Conflito de versão. Recarregue os dados.'),{status:409});
        // Review insertion takes FOR SHARE on this same row, serializing with removal.
        if((await client.query('SELECT id FROM vault.reviews WHERE project_id=$1 LIMIT 1',[id])).rows.length){
          await client.query('UPDATE vault.projects SET archived_at=clock_timestamp(),version=version+1 WHERE id=$1',[id]);
          const after=await readProject(client,id);
          await writeAudit(client,{projectId:id,action:'archived',actorId,actor:actor.name,before,after});
          return {id,action:'archived'};
        }
        await client.query('DELETE FROM vault.alternatives WHERE project_id=$1',[id]);
        await client.query('DELETE FROM vault.projects WHERE id=$1',[id]);
        await writeAudit(client,{projectId:id,action:'deleted',actorId,actor:actor.name,before});
        return {id,action:'deleted'};
      });
    },
    // Server/admin only: callers must authenticate and authorize before use.
    async getProject(id) {
      return transaction(pool,async client=>{
        await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
        return readProject(client,id);
      });
    },
    async saveProject(project,{expectedVersion=null,actorId}={}) {
      try{validateProject(project);}catch{throw Object.assign(Error('Projeto inválido.'),{status:400});}
      if(typeof actorId!=='string'||!actorId)throw Error('Autor obrigatório.');
      if(expectedVersion!==null&&(!Number.isInteger(expectedVersion)||expectedVersion<1))throw Error('Versão inválida.');
      return transaction(pool,async client=>{
        const actor=(await client.query('SELECT name FROM vault.internal_users WHERE id=$1 AND active=true FOR SHARE',[actorId])).rows[0];
        if(!actor)throw Error('Autor interno inativo ou inexistente.');
        const before=await readProject(client,project.id,true);
        if((!before&&expectedVersion!==null)||(before&&before.version!==expectedVersion))throw Object.assign(Error('Conflito de versão.'),{status:409});
        if(before?.archived_at)throw Error('Projeto arquivado.');
        for(const field of ['is_public','show_solution_url'])if(project[field]!==undefined&&typeof project[field]!=='boolean')throw Object.assign(Error('Visibilidade inválida.'),{status:400});
        const ownerId=project.owner_id===undefined?(before?.owner_id??null):project.owner_id;
        if(ownerId!==null&&(typeof ownerId!=='string'||!ownerId.trim()))throw Object.assign(Error('Responsável inválido.'),{status:400});
        let owner=before?.owner;
        if(ownerId&&ownerId!==before?.owner_id){
          const selected=(await client.query('SELECT name FROM vault.internal_users WHERE id=$1 AND active=true FOR SHARE',[ownerId])).rows[0];
          if(!selected)throw Object.assign(Error('Responsável inativo ou inexistente.'),{status:400});
          owner=selected.name;
        }else if(!before||(!ownerId&&before.owner_id))throw Object.assign(Error('Responsável obrigatório. Selecione um usuário ativo.'),{status:400});
        project={...project,owner,owner_id:ownerId,
          is_public:before?(project.is_public??before.is_public??false):false,
          show_solution_url:before?(project.show_solution_url??before.show_solution_url??false):false,
          archived_at:before?.archived_at??null};
        if(before&&!changedFields(before,project).length)return before;
        if(!before)await insertProject(client,project);
        else {
          await client.query(`UPDATE vault.projects SET title=$2,description=$3,solution=$4,owner_legacy=$5,
            category=$6,status=$7,requested=$8,completed=$9,cost=$10,solution_url=$11,version=version+1 WHERE id=$1`,projectValues(project));
          await client.query('DELETE FROM vault.alternatives WHERE project_id=$1',[project.id]);
          await insertAlternatives(client,project);
        }
        await client.query('UPDATE vault.projects SET owner_id=$2,is_public=$3,show_solution_url=$4 WHERE id=$1',
          [project.id,project.owner_id,project.is_public,project.show_solution_url]);
        const after=await readProject(client,project.id);
        await writeAudit(client,{projectId:project.id,action:before?'updated':'created',actorId,actor:actor.name,before,after});
        return after;
      });
    },
    async importState(input,options) {
      const plan=prepareImport(input,options);
      return transaction(pool,async client=>{
        // Concurrent attempts for the same source serialize on the unique key.
        const inserted=await client.query(`INSERT INTO vault.imports(source,digest,counts)
          VALUES ($1,$2,$3::jsonb) ON CONFLICT (source) DO NOTHING RETURNING source`,
          [plan.source,plan.digest,JSON.stringify(plan.counts)]);
        if(!inserted.rows.length) {
          const prior=(await client.query('SELECT digest,counts FROM vault.imports WHERE source=$1',[plan.source])).rows[0];
          if(!prior||prior.digest!==plan.digest)throw Error('Origem já importada com conteúdo diferente. Reconciliação necessária.');
          return {repeated:true,counts:prior.counts};
        }
        for(const p of plan.state.projects) {
          await insertProject(client,p);
          await client.query("INSERT INTO vault.import_records(source,kind,legacy_id,record_id) VALUES ($1,'project',$2,$2)",[plan.source,p.id]);
        }
        for(const e of plan.state.audit) {
          await writeAudit(client,{...e,actorId:null,legacy:e});
          await client.query("INSERT INTO vault.import_records(source,kind,legacy_id,record_id) VALUES ($1,'audit',$2,$2)",[plan.source,e.id]);
        }
        return {repeated:false,counts:plan.counts};
      });
    },
    async addReview(projectId,input) {
      const review=validateReview(input);
      return transaction(pool,async client=>{
        const project=(await client.query('SELECT id FROM vault.projects WHERE id=$1 AND is_public=true AND archived_at IS NULL FOR SHARE',[projectId])).rows[0];
        if(!project)throw Object.assign(Error('Projeto indisponível.'),{status:404});
        const id=randomUUID();
        try {
          await client.query('INSERT INTO vault.reviews(id,project_id,name,cpf,rating,comment) VALUES ($1,$2,$3,$4,$5,$6)',
            [id,projectId,review.name,review.cpf,review.rating,review.comment]);
        } catch(error) {
          // Do not propagate Postgres detail: it can contain the CPF.
          if(error.code==='23505')throw Object.assign(Error('Avaliação já registrada neste projeto.'),{status:409});
          throw Error('Não foi possível registrar a avaliação.');
        }
        return {id};
      });
    }
  };
}
module.exports={createRepository};
