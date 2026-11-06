// Isolated manual preview: synthetic projects only, no database or Auth connection.
const {createServer}=require('../../server/server.cjs');
const base={description:'Centralize as solicitações da equipe e acompanhe cada atendimento em um só lugar.',solution:'Um portal organiza os pedidos por área e permite acompanhar o andamento de cada solicitação.',category:'Operações',owner:'Equipe de tecnologia',requested:'2026-11-06',completed:''};
const projects=[
  {...base,id:'portal-sintetico',title:'Portal de atendimento',status:'Em andamento'},
  {...base,id:'relatorios-sinteticos',title:'Relatórios financeiros',category:'Financeiro',status:'Concluído',completed:'2026-11-06',url:'https://example.invalid/solucao'},
  {...base,id:'integracao-sintetica',title:'Integração de novas pessoas',category:'Pessoas',status:'Planejado'},
  {...base,id:'infraestrutura-sintetica',title:'Inventário de infraestrutura e equipamentos',category:'Infraestrutura',status:'Planejado'}
];
const publicRepository={listProjects:async()=>projects,getProject:async id=>projects.find(project=>project.id===id)||null};
const reviews=new Map();
if(process.argv.includes('--seed-reviews')){
  const comments=['Facilitou acompanhar as solicitações da equipe.','A organização por área ficou clara.','Encontrei rapidamente o andamento do pedido.','Gostei da apresentação das informações.','O portal ajudou na rotina de atendimento.','A navegação no celular ficou simples.','O resumo do projeto está bem explicado.','Consegui consultar as entregas com facilidade.','A solução trouxe mais organização.','As informações estão fáceis de localizar.','Gostaria de acompanhar as próximas melhorias.','Boa iniciativa para centralizar os pedidos.'];
  reviews.set('portal-sintetico',comments.map((comment,index)=>({
    id:`preview-review-${index+1}`,name:`Pessoa de teste ${String(index+1).padStart(2,'0')}`,
    rating:5-index%3,comment:`[Avaliação sintética ${index+1}] ${comment}`,
    createdAt:new Date(Date.UTC(2026,10,6,15)-index*3600000).toISOString(),photoUrl:null
  })));
}
const reviewRepository={
  listReviews:async(id,page=1)=>{
    const items=reviews.get(id)||[];
    const total=items.length,totalPages=Math.max(1,Math.ceil(total/5));
    page=Math.min(page,totalPages);
    return {items:items.slice((page-1)*5,page*5),total,totalPages,page,nextPage:page<totalPages?page+1:null};
  },
  addReview:async(id,input)=>{
    const items=reviews.get(id)||[];
    if(items.some(item=>item.cpf===input.cpf))throw Object.assign(Error(),{status:409});
    const review={...input,id:require('node:crypto').randomUUID(),createdAt:new Date().toISOString(),photoUrl:'/foto-sintetica-ausente.jpeg'};
    items.unshift(review);reviews.set(id,items);return {id:review.id};
  }
};
// Mirror the public projection even in this isolated preview.
const listReviews=reviewRepository.listReviews;
reviewRepository.listReviews=async(...args)=>{const result=await listReviews(...args);return {...result,items:result.items.map(({cpf,...item})=>item)};};
if(require.main===module){
  const port=Number(process.env.VAULT_PREVIEW_PORT||4186),origin=`http://127.0.0.1:${port}`;
  createServer({origin,publicRepository,reviewRepository}).listen(port,'127.0.0.1',()=>console.log(`Prévia sintética: ${origin}/catalogo`));
}
