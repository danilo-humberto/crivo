# Orientações para trabalhar no Crivo

## Referências obrigatórias

Consulte [o plano aprovado do catálogo público e das avaliações](docs/plano-avaliacoes.md) antes de implementar essa evolução ou esclarecer dúvidas sobre seus requisitos, fluxo, permissões, CPF, fotos, curadoria e etapas.

Consulte também o [README](README.md) para entender como executar o sistema e seu comportamento atual. O plano descreve o destino aprovado; não presuma que suas funcionalidades já existem. Confira o código e as evidências de testes.

Para infraestrutura e autenticação, consulte a [proposta técnica da etapa 2](docs/arquitetura-etapa-2.md). Respeite os itens pendentes de decisão; proposta não equivale a arquitetura aprovada.

## Execução

- Implemente etapa por etapa, dentro do escopo autorizado. A primeira etapa é apenas a organização das pastas, preservando comportamento e dados.
- Antes de editar, confira instruções locais, arquivos afetados, branch e estado do Git, quando houver repositório. Preserve alterações preexistentes.
- Prefira mudanças pequenas, legíveis e consistentes com a arquitetura existente.
- Não invente requisitos nem trate decisões técnicas pendentes do plano como aprovadas.
- Se houver conflito entre plano, documentação e código, apresente as evidências e solicite decisão antes de alterar o comportamento envolvido.
- Registre novas decisões aprovadas no plano, evitando documentação contraditória ou duplicada.
- Ao finalizar qualquer implementação, atualize obrigatoriamente a documentação afetada: README, acompanhamento do plano e documento da etapa, conforme aplicável. Confira a consistência entre comportamento implementado, decisões aprovadas, testes realmente executados, limitações e pendências. Diferencie implementação, validação, commit, integração, push e deploy; preserve registros históricos identificados como tais e não declare operações sem evidência.
- Escreva os planos de implementação de cada etapa de forma enxuta e direta, com escopo, abordagem recomendada, critérios de aceite e validação, riscos e decisões ou autorizações pendentes. Para escolhas relevantes, apresente as alternativas e seus trade-offs (benefícios, custos e limitações), justificando a recomendação. Evite repetir contexto, regras e requisitos já documentados; use links para as referências e detalhe apenas o necessário para decidir e executar a etapa.

## Segurança e aprovações

- Preserve os limites de autorização definidos pelo usuário. Aprovar o plano não autoriza automaticamente operações sensíveis posteriores.
- Solicite autorização específica antes de mudanças em autenticação, autorização, dados sensíveis, estrutura de banco, infraestrutura, dependências ou arquitetura relevante; também antes de operações destrutivas, commits, push, PRs, merges e deploys.
- Não leia credenciais reais por padrão nem exponha segredos ou CPFs reais em logs, mensagens ou documentação. Exceção funcional explicitamente aprovada: salvar CPF no Neon e incluí-lo na URL direta da foto exibida nas avaliações públicas, conforme o plano. Não acrescentar campo cpf separado às respostas públicas.
- Use dados sintéticos e não execute testes contra produção.
- Campos internos nunca devem vazar nas consultas públicas; proteção deve existir no servidor.

## Qualidade e comunicação

- Utilize TDD para comportamentos testáveis, com exceções tecnicamente justificadas. Execute verificações proporcionais à alteração.
- Diferencie falhas preexistentes de regressões e testes executados de verificações pendentes.
- Ao entregar, informe mudanças, arquivos relevantes, validações reais, riscos e pendências. Não declare como implementado o que está apenas planejado.
- Comunique-se em português, de forma clara e direta, com expressões pernambucanas naturais, conforme preferência do usuário.
