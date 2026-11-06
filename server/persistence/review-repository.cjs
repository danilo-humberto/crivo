const {createRepository}=require('./repository.cjs');

function createReviewRepository(pool,{photoBaseUrl='https://intranet-cifra.netlify.app/funcionarios/{cpf}.jpeg'}={}){
  const {addReview}=createRepository(pool);
  function publicReview(row){
    let photoUrl=null;
    if(/^\d{11}$/.test(row.cpf||''))try{
      const url=new URL(photoBaseUrl.replace('{cpf}',row.cpf));
      if(url.protocol==='https:'&&photoBaseUrl.includes('{cpf}')&&!url.username&&!url.password)photoUrl=url.href;
    }catch{/* A missing or invalid photo configuration keeps the default avatar. */}
    return {id:row.id,name:row.name,rating:row.rating,comment:row.comment,createdAt:new Date(row.created_at).toISOString(),photoUrl};
  }
  return {addReview,
    async listReviews(projectId,page=1){
      if(!Number.isInteger(page)||page<1||page>10000)throw Object.assign(Error('Página inválida.'),{status:400});
      // CPF is used only to compose the approved photo URL, never returned separately.
      const {rows}=await pool.query(`WITH eligible AS (SELECT r.id,r.name,r.cpf,r.rating,r.comment,r.created_at
        FROM vault.reviews r JOIN vault.projects p ON p.id=r.project_id
        WHERE r.project_id=$1 AND r.visible=true AND p.is_public=true AND p.archived_at IS NULL)
        SELECT batch.*, totals.total FROM (SELECT count(*)::int AS total FROM eligible) totals
        LEFT JOIN LATERAL (SELECT * FROM eligible ORDER BY created_at DESC,id DESC
          LIMIT 5 OFFSET LEAST($2, (GREATEST(totals.total-1,0)/5)*5)) batch ON true`,[projectId,(page-1)*5]);
      const total=rows[0]?.total||0,totalPages=Math.max(1,Math.ceil(total/5));
      page=Math.min(page,totalPages);
      return {items:rows.filter(row=>row.id!==null).map(publicReview),total,totalPages,page,nextPage:page<totalPages&&page<10000?page+1:null};
    }
  };
}
module.exports={createReviewRepository};
