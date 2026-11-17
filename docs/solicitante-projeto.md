# Solicitante e departamento do projeto

## Implementação — 17/11/2026

Campos opcionais de texto livre `requester` e `requester_department`, com limite de 120 caracteres e remoção de espaços nas extremidades. O checkbox `show_requester` controla ambos e inicia desmarcado. Pode ser marcado na criação, mas o projeto continua privado. Campos vazios não aparecem na página pública. Desmarcar retira a exposição sem apagar os valores internos.

O formulário compartilhado permite criação e edição; a ficha interna e a auditoria exibem os campos. A consulta pública usa projeção SQL condicional, sem retornar valores ocultos ao navegador. Textos são escapados na renderização. Cards, filtros, responsável e área mantêm seus comportamentos.

Migration `003-project-requester.sql` acrescenta colunas com defaults vazios/false e limites no banco, preservando registros antigos. Clientes antigos podem omitir os campos ao atualizar sem apagar os valores salvos. Importação e armazenamento local aceitam registros sem os novos campos; snapshots antigos não são reescritos. Novos campos participam da comparação de alterações, inclusive checkbox isolado.

## Validação

- RED: 3 testes novos falharam antes da implementação (validação, gravação e projeção pública); 20 testes relacionados passaram.
- GREEN final: `npm test`, 121/121; `npm run test:dev`, 1/1 com PostgreSQL/HTTP reais no Docker local. Inclui texto escapado, dados ocultos ausentes da API/HTML, campos vazios, limite excedido, omissão por cliente antigo, projeto privado e arquivado.
- `npm run build` aprovado; `npm run test:worker`, 4/4; `npm run check:worker`, dry-run aprovado, sem deploy.
- Migration aplicada somente no container local `crivo-development-db-1`, banco `crivo_dev`, após conferência de identidade e versões 1/2. O runtime usa `crivo_app` sem superusuário nem CREATE no schema; migration executada pelo proprietário local. Versão 3 aceita pelo runtime.
- Navegador local: cadastro sintético com checkbox marcado; ficha interna com textos sem espaços nas extremidades; reabertura para edição; desmarcação, gravação e recarga preservando dados. Layout conferido no desktop e viewport 390×844; alinhamento do checkbox corrigido e revalidado. Não equivale a teste em aparelho físico.
- Testes cobrem também auditoria da alteração isolada, armazenamento local, envio remoto e importação. Nenhuma dependência adicionada.

## Revisão e limites

Revisão preliminar do diff e revisão independente estática concluídas sem defeito bloqueante identificado. Removido o seletor CSS residual da posição anterior do checkbox. A auditoria do histórico será realizada após criar os três commits autorizados; seu resultado será informado na entrega.

A migration deve preceder a execução deste código em qualquer outro banco: consultas novas dependem das colunas. Volumes Docker antigos exigem aplicação explícita, sem reset, conforme [ambiente local](desenvolvimento-docker.md). Aplicação em produção não foi autorizada nem executada. Checkbox desmarcado não revoga cópias que terceiros possam ter feito enquanto os dados estavam públicos.

Usuário autorizou três commits locais por responsabilidade: dados/ambiente local, regras/persistência e interface/documentação. Push, PR, merge e deploy permanecem não autorizados e não executados. Há um projeto sintético privado deixado na gestão local para inspeção; registros dos testes automatizados são removidos pelos próprios testes.

## Roteiro manual

1. Em `/management`, criar projeto com os campos vazios e conferir que o cadastro funciona.
2. Editar e preencher solicitante/departamento; marcar a opção, salvar e reabrir para conferir persistência.
3. Publicar explicitamente o projeto sintético e conferir `/projetos/~ID`: somente valores preenchidos devem aparecer.
4. Desmarcar a opção e salvar; conferir ausência na página/API pública e presença na ficha interna e auditoria.
5. Repetir em tela estreita, usando Tab e Espaço para navegar pelos campos e alternar o checkbox.

## Orientação de formulário

Consultei `modern-web-guidance`, guia `forms`: “use native constraints: `required`, `minlength`, `maxlength`, `pattern`”. Os novos inputs usam `maxlength`, rótulos associados; a validação no servidor permanece obrigatória. O checkbox é nativo, com rótulo clicável e alinhamento responsivo.

## Ajuste visual solicitado

Removidos os dois textos auxiliares do solicitante e movido seu checkbox para Visibilidade pública. O checkbox permanece habilitado na criação; somente os controles de publicar projeto e link ficam desabilitados até a primeira gravação. Referências aria-describedby aos textos removidos também foram retiradas.
