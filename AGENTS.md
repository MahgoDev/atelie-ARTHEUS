# Convenções do Ateliê ARTHEUS

- Trabalhe em português brasileiro. Preserve a escrita de ARTHEUS, as intenções de liberdade criativa e a ordem do minibook.
- Use o grimório contemporâneo como direção de arte. Títulos serifados, superfícies de ametista ou papel, ícones lineares, acentos lavanda e ouro e espaço para a leitura. Consulte os tokens em `src/style.css`.
- Mantenha controles acessíveis por teclado e toque, foco visível, áreas seguras de iOS e preferência de movimento reduzido. Verifique diagramas em telas estreitas.
- Mantenha o código modular. Elementos compartilhados vivem em `ui.js` e `icons.js`, dados editoriais em `editorial.js`, modelos iniciais em `content.js`, módulos por tarefa e armazenamento em `data.js`.
- Use os métodos da camada de dados. Preserve IDs, datas, vínculos, formato dos backups e o versionamento do esquema. Novos formatos exigem validação e migração para dados anteriores. Operações que atingem várias coleções usam uma transação.
- Todo conteúdo inserido pelo artista precisa ser escapado antes da renderização em HTML. Propostas sobre Prisma e Bloodlines devem permanecer identificadas como propostas.
- A versão 1.0 funciona localmente. PDF, imagens de referência privadas, backups pessoais e credenciais ficam fora do Git, do build e de serviços externos. Revise o conteúdo editorial de toda build antes de publicar.
- Consulte ROADMAP.md para o escopo de cada versão. Upload, acervo, laboratório, prompts, nuvem e IA entram apenas com nova solicitação. A versão atual dispensa autenticação, analytics, anúncios e APIs.
- Desenvolva em branch independente. Push, merge na main e publicação dependem de aprovação expressa do artista.
- Antes da entrega, salve as alterações, execute `node --test` e `node scripts/build.mjs`, confira os fluxos afetados e atualize PROGRESS.md.

