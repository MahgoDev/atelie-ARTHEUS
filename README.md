# Ateliê ARTHEUS

**Universos extraordinários. Sentimentos reais.**

Um grimório digital para criar, ler e refletir. A versão 1.0 roda inteiramente no navegador. O primeiro acesso carrega a aplicação estática. Os registros pessoais ficam no dispositivo.

## Abrir no computador

Extraia o ZIP inteiro. No Windows com **Node.js 22 ou superior**, dê dois cliques em **Abrir-Atelie.cmd**. Abra o endereço indicado na janela e mantenha-a aberta durante o uso.

No macOS, Linux ou Windows, também é possível abrir um terminal na pasta que contém `package.json` e executar:

```sh
node scripts/serve.mjs --dev
```

Abra **http://127.0.0.1:4173/Atelie-ARTHEUS/** no navegador. O comando prepara a distribuição e inicia o servidor local. Para encerrar, use Ctrl+C. Depois de editar o código, salve os arquivos e execute o comando novamente.

O fluxo principal usa apenas o Node. Os atalhos `npm run dev`, `npm run build`, `npm run preview` e `npm test` também estão disponíveis. O projeto inclui uma configuração opcional do Vite com base `/Atelie-ARTHEUS/`. A distribuição entregue foi gerada por `node scripts/build.mjs`.

## Um primeiro percurso

Abra **Banco de Ideias**, escolha uma proposta e selecione **Transformar em ficha**. No editor, experimente uma cor, descreva a atmosfera ou deixe apenas o título. Volte ao **Portal** para retomar a ficha. Em **Configurações**, exporte uma cópia de segurança.

| Ferramenta | O que você pode fazer |
| --- | --- |
| Meu Grimório | Percorrer os capítulos do dossiê com índice, consultar o DNA visual e a jornada emocional, copiar trechos e princípios. |
| A Magia de Criar | Ler 13 páginas na sequência original, retomar a posição, favoritar, sortear mensagens e ativar a leitura focada. |
| Ficha de Criação | Criar, editar, duplicar, excluir e consultar fichas com salvamento automático, categorias livres, paleta HEX, acabamentos, Markdown e impressão. |
| Avaliação Artística | Refletir pelos cinco critérios com radar interativo ou escrever livremente. Salvar, editar e excluir avaliações. |
| Filtro Criativo | Revisitar cinco perguntas, escrever uma anotação, vincular a uma ficha e reiniciar a reflexão atual. |
| Banco de Ideias | Filtrar, sortear, favoritar, criar e editar sugestões próprias, excluir as próprias e transformar qualquer proposta em ficha. |

As ideias de Prisma e Bloodlines são propostas de experimentação. Nesta edição há dois temas, navegação inferior no celular e configurações para backup e restauração.

## Dados e privacidade

As coleções de fichas, avaliações, ideias, reflexões e favoritos usam IndexedDB. Tema e posição de leitura ficam em localStorage. Os registros incluem identificador, versão do esquema e datas de criação e atualização. As fichas podem manter o identificador da ideia de origem e as reflexões podem apontar para uma ficha.

O navegador separa os dados por endereço, perfil e dispositivo. Use sempre o mesmo endereço para retomar o trabalho. Antes de limpar o navegador, mudar de aparelho ou migrar para o GitHub Pages, exporte o backup JSON em **Configurações**. A restauração valida o arquivo e pede confirmação antes de substituir os registros locais. Guarde o backup em um local privado.

**Revisão antes de qualquer publicação.** Em `src/editorial.js` estão o manifesto em primeira pessoa, mensagens pessoais, planos profissionais e de portfólio, proporções experimentais e menções a Prisma. Em `src/content.js` estão os nomes dos universos e as sugestões criativas. Leia esses dois arquivos como um leitor externo. Ao publicar o site, terceiros poderão ler o texto incluído na distribuição. PDFs e capturas originais de referência são privados e não acompanham o repositório. A pasta `capturas/` contém apenas imagens da aplicação pronta com dados de teste.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `index.html`, `src/app.js`, `src/style.css` | Portal, navegação por hash, temas, componentes visuais e layout adaptável. |
| `src/editorial.js`, `src/reading.js`, `src/reading.css` | Textos do dossiê e do minibook, diagramas e leitor. |
| `src/sheets.js`, `src/reflection.js`, `src/ideas.js` | Fichas, avaliações, filtro e ideias. |
| `src/content.js`, `src/icons.js`, `src/ui.js` | Campos e textos iniciais, ícones e controles compartilhados. |
| `src/data.js`, `src/backup.js` | Acesso aos registros, validação, exportação e restauração. |
| `public/` | Ilustração vetorial original, ícones locais e manifest da PWA. |
| `scripts/`, `tests/` | Servidor local, distribuição estática, geração do cache e testes. |
| `.github/workflows/pages.yml` | Publicação manual da pasta `dist/` no GitHub Pages. |
| `AGENTS.md`, `ROADMAP.md`, `PROGRESS.md` | Convenções, versões planejadas e resultados da verificação. |

## GitHub Pages

1. Revise o conteúdo autoral acima e aprove a exposição pública.
2. Crie o repositório independente **Atelie-ARTHEUS** em sua conta. A cópia local está na branch **desenvolvimento/v1**. O projeto Estudo-em-C é independente.
3. Depois da aprovação, configure o remoto do novo repositório e envie a revisão aprovada. Para o GitHub disponibilizar a ação manual, o arquivo de workflow deve existir na branch padrão.
4. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions**.
5. Em **Actions → Publicar Ateliê no GitHub Pages → Run workflow**, selecione a revisão aprovada e execute. A ação roda os testes, gera a distribuição e publica apenas `dist/`.
6. Quando a execução terminar, o endereço pretendido é **https://mahgodev.github.io/Atelie-ARTHEUS/**. Esse endereço é o destino planejado desta entrega local.

Para publicação manual em outra hospedagem estática, execute `node scripts/build.mjs` e sirva o conteúdo de `dist/`. Todos os recursos essenciais são locais. O service worker usa uma versão derivada do conteúdo e troca os caches do Ateliê após preparar a edição nova. A instalação PWA requer HTTPS ou localhost e suporte do navegador. A checagem em Safari/iOS físico permanece pendente.

## Verificação

```sh
node --test
node scripts/build.mjs
```

O relatório dos fluxos exercitados no Chrome, dos tamanhos de tela, das limitações e das próximas etapas está em `PROGRESS.md`. As capturas em desktop, tablet, celular, radar e tema de papel estão em `capturas/`.

