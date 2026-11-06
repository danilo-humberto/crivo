const {safeUrl}=require('../../src/domain/core.js');

// Never reuse the internal project projection: even a hidden URL stays in the database.
const columns=`id,title,description,solution,category,status,requested::text,
  coalesce(completed::text,'') AS completed,owner_legacy AS owner,
  CASE WHEN show_solution_url THEN solution_url ELSE NULL END AS url,
  (SELECT count(*)::int FROM vault.reviews WHERE project_id=vault.projects.id AND visible=true) AS review_count,
  (SELECT avg(rating)::float8 FROM vault.reviews WHERE project_id=vault.projects.id AND visible=true) AS review_average`;
const visible='is_public=true AND archived_at IS NULL';

function publicProject(row){
  const {id,title,description,solution,category,status,requested,completed,owner}=row;
  const project={id,title,description,solution,category,status,requested,completed,owner,
    reviewCount:row.review_count??0,reviewAverage:row.review_average??null};
  const url=safeUrl(row.url);
  if(url)project.url=url;
  return project;
}

function createPublicRepository(pool){
  return {
    async listProjects(){
      const {rows}=await pool.query(`SELECT ${columns} FROM vault.projects WHERE ${visible} ORDER BY requested DESC,id`);
      return rows.map(publicProject);
    },
    async getProject(id){
      const {rows}=await pool.query(`SELECT ${columns} FROM vault.projects WHERE ${visible} AND id=$1`,[id]);
      return rows.length?publicProject(rows[0]):null;
    }
  };
}
module.exports={createPublicRepository};
