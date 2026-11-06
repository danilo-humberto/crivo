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
if(require.main===module)createServer({publicRepository}).listen(4186,'127.0.0.1',()=>console.log('Prévia sintética: http://127.0.0.1:4186/catalogo'));
