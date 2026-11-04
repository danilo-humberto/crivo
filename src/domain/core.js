(function (root) {
  const statuses = ['Concluído', 'Em andamento', 'Planejado'];
  const categories = ['Operações', 'Financeiro', 'Pessoas', 'Infraestrutura', 'Comercial'];
  function safeUrl(value) { try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
  function validateProject(p) {
    if (!p || ['id','title','description','solution','owner','requested'].some(k => typeof p[k] !== 'string' || !p[k].trim())) throw Error('Preencha todos os campos obrigatórios.');
    if (!statuses.includes(p.status) || !categories.includes(p.category)) throw Error('Status ou área inválidos.');
    const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
    if (!date(p.requested) || (p.completed && !date(p.completed))) throw Error('Informe datas válidas.');
    if (p.status === 'Concluído' && !p.completed) throw Error('Projetos concluídos precisam da data de conclusão.');
    if (p.completed && p.completed < p.requested) throw Error('A conclusão não pode ser anterior à solicitação.');
    if (p.status !== 'Concluído' && p.completed) throw Error('Use o status Concluído para informar uma conclusão.');
    if (typeof p.cost !== 'number' || !Number.isFinite(p.cost) || p.cost < 0) throw Error('Informe um custo mensal válido.');
    if (p.url && (typeof p.url !== 'string' || !safeUrl(p.url))) throw Error('O link deve começar com http:// ou https://.');
    if (!Array.isArray(p.alternatives) || p.alternatives.some(a => !a || typeof a.name !== 'string' || !a.name.trim() || typeof a.notes !== 'string' || typeof a.cost !== 'number' || !Number.isFinite(a.cost) || a.cost < 0)) throw Error('Revise os nomes e custos das alternativas.');
    return p;
  }
  const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function filterProjects(items, query='', status='', category='') { return items.filter(p => (!status || p.status === status) && (!category || p.category === category) && normalize([p.title,p.description,p.solution,p.owner,p.category].join(' ')).includes(normalize(query))); }
  function savings(p) { return p.alternatives.length ? Math.max(0, Math.min(...p.alternatives.map(a=>a.cost))-p.cost) : 0; }
  const api = {validateProject,filterProjects,savings,safeUrl,statuses,categories};
  if (typeof module !== 'undefined') module.exports = api; else root.VaultCore = api;
})(globalThis);
