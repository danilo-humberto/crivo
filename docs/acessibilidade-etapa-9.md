# Etapa 9 — Verificação parcial de acessibilidade

Executada em 9 de novembro de 2026 no Chrome, no servidor local e com o projeto sintético da etapa 9. Não constitui certificação WCAG nem substitui teste com leitor de tela. Na primeira rodada não houve alteração de código; a continuação autorizada corrigiu o selo Planejado.

## Evidências

| Verificação | Resultado observado |
| --- | --- |
| Reflow em viewport de 320 × 800 CSS px | Catálogo, projeto público, gestão, auditoria e conta autenticada com conteúdo de 305 px (espaço restante ocupado pela barra vertical), sem overflow horizontal da página. |
| Link de salto público | Primeiro Tab selecionou “Ir para o conteúdo”, com outline azul sólido de 3 px. Enter moveu o foco ao título principal. |
| Rótulos do formulário de avaliação | Nenhum input, textarea ou select visível sem label/aria-label/aria-labelledby na inspeção DOM. Notas expostas como grupo de radios nomeados. |
| Campos obrigatórios | Envio vazio exibiu a validação nativa “Preencha este campo” e moveu foco para Nome, sem gravar avaliação. |
| Nota por teclado | Seta direita moveu seleção/foco de uma para duas estrelas. Não houve envio. |
| Diálogo da ficha | Nome acessível associado ao título; foco inicial no botão Fechar. Largura interna e scroll de 250 px em viewport 320, sem overflow horizontal do diálogo. Shift+Tab permaneceu no diálogo; Escape fechou e restaurou foco ao botão que o abriu. |
| Abas da gestão | Seta direita em Projetos selecionou Auditoria, atualizou aria-selected e moveu o foco para a aba correspondente. |
| Curadoria | Rodada anterior conferiu reexibição por Enter e manutenção de foco no controle após escrita; evidências no registro de execução. |

Viewport restaurado ao padrão ao final. A captura full-page da conta móvel expirou; não há screenshot válido dessa tentativa. As evidências acima vieram de DOM renderizado, árvore de acessibilidade e ações reais de teclado, não de uma imagem presumida.

## Contraste

Medição exploratória das cores computadas, com luminância relativa e fundo opaco ancestral. Inspecionados textos renderizados; gradientes, transparências compostas e fundos não resolvidos foram ignorados explicitamente. Não cobre bordas, placeholders, todos os estados de hover/foco ou conteúdo oculto.

- Projeto público: 59 elementos textuais calculados, quatro ignorados. **Selo “Planejado”: 4,42:1**, abaixo do mínimo de 4,5:1 para texto comum. Medição inicial: corrigida na continuação abaixo.
- Gestão: 67 elementos; auditoria: 174. O separador decorativo `/` resultou em 2,66:1 e não foi tratado como falha de conteúdo textual informativo. Nenhuma outra insuficiência identificada nesses estados.
- Conta autenticada: 16 elementos, sem insuficiência identificada nos textos medidos.

Referência: [WCAG 2.2 — contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), 4,5:1 para texto comum e 3:1 para texto grande. Reflow: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), critério 1.4.10.

## Pendências

Concluir contraste de estados/controles; zoom real de 200%; leitura com leitor de tela; Firefox/Safari; tela de cadastro/convite/aceite e erros vindos do servidor; foco de todos os diálogos e fluxos. Resultados desta amostra não encerram a acessibilidade da etapa 9.

## Convite com segunda conta

Necessário um segundo e-mail controlado pelo usuário, diferente da conta atual, com recebimento de mensagens de verificação. Preferir conta ainda não autorizada internamente. Não é necessário enviar senha, código, link de convite ou CPF real pelo chat.

Roteiro: gerar convite com a conta interna atual; abrir o link em sessão separada; criar/entrar na segunda conta, com senha digitada pelo usuário; verificar e-mail com código digitado pelo usuário; confirmar recusa da gestão antes do aceite; aceitar com nome/CPF sintéticos válidos; conferir acesso interno e autoria; tentar reutilizar o convite e confirmar recusa. CPF sintético será fornecido localmente ao executar o cenário. Não é necessário novo bootstrap, pois já existe usuário interno ativo.

A segunda conta obterá acesso interno aos projetos e poderá gerar convites conforme a política existente. Não enviar o link a terceiros. O usuário deve indicar o e-mail e participar das etapas de senha/verificação; geração/aceite só serão realizados para a conta de teste indicada. A revogação de acesso interno continua sem fluxo definido, portanto não prometer remoção automática da conta ao finalizar. Testes de expiração/revogação/uso único no repositório já passaram, mas não substituem esse fluxo real.

## Continuação autorizada — contraste

Cor compartilhada do selo alterada de #65708a para #596580 em src/web/styles/styles.css. Contraste passou de 4,42:1 para 5,21:1 no fundo #f0f2f6 do projeto público; sobre branco, 5,84:1. Nova varredura: projeto público 59 textos, quatro ignorados e nenhuma falha; catálogo 54 textos sem ignorados/falhas; gestão carregada 67 textos, nenhum ignorado e somente o separador decorativo já registrado.

Bordas de Nome, CPF e Comentário (#81899c): 3,50:1 sobre branco e 3,13:1 sobre fundo da página. Campos de texto com 48 px de altura; comentário 168 px. Radios nativos e demais estados ainda exigem avaliação própria.

Projeto público: idioma pt-BR, um main, um h1, nenhuma imagem sem alt e nenhum tabindex positivo. Diálogo Novo projeto: nome associado a form-title, foco inicial em Fechar, nenhum campo sem rótulo; Escape fecha e retorna foco a Novo projeto. Nenhum dado gravado.

Atalho de zoom não alterou devicePixelRatio=1 nem viewport de 1920 px. Zoom real de 200% permanece pendente; escala padrão solicitada ao final. Marcação inspecionada não substitui teste com leitor de tela.

npm test: 99/99 aprovados. npm run build: aprovado. Sem scripts de lint/tipos configurados. Integração não repetida para alteração exclusivamente visual; medição antes/depois substitui teste unitário artificial da constante CSS. Sem dependências novas, commit, push ou deploy. Convite aguardando segundo e-mail.

### Verificação de conta simplificada

Após cadastro, destino exibido como texto e associado ao código por aria-describedby; foco em Código após envio aceito. Rótulo explícito, inputmode numeric e autocomplete one-time-code preservados. Chrome conferido com sessão não verificada real: nenhum campo de e-mail visível, botão Reenviar código disponível e foco no código após reenvio. Leitor de tela continua pendente. Segundo e-mail já indicado e conta criada; recebimento/verificação e aceite do convite ainda aguardam o usuário.


Convite real aceito e acesso interno conferido em 9/11/2026; verificação concluída pelo usuário. Recusa anterior ao aceite e repetição pela mesma conta confirmadas. Detalhes e limites no registro de validação.


Continuação: diálogo da auditoria em 320 × 800, após estabilização: página 305/305, diálogo 250/250 e região comparativa 204/204 (client/scroll). Região nomeada, tabindex 0; Escape retorna ao registro de origem. Viewport restaurado. Leituras transitórias durante redimensionamento foram descartadas. Zoom real e demais pendências anteriores permanecem.


Modal personalizado de remoção validado no Chrome: título/descrição associados, foco inicial em Cancelar, Escape e Cancelar fecham apenas confirmação e restauram foco em Remover projeto. Nome inserido como texto; confirmação antiga não se reaproveita. Leitor de tela e cobertura completa de navegadores permanecem pendentes.
