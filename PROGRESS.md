# Continuidade • Ateliê ARTHEUS 1.0

## A — Fundação
Projeto independente na branch `desenvolvimento/v1`. O portal, a navegação por hash e os temas usam módulos ES nativos, HTML semântico e CSS local. A base relativa permite servir a mesma distribuição em /Atelie-ARTHEUS/. O servidor e o build principal utilizam apenas Node. As referências privadas ficam fora do projeto. Próxima etapa: conectar as leituras e as ferramentas.

Arquivos de fundação: `index.html`, `src/app.js`, `src/style.css`, `src/icons.js`, `public/art/portal.svg`. O portal tem sugestão de ideia, acesso à última ficha, seis ferramentas e mensagem de liberdade. A navegação mobile usa uma barra inferior e um menu complementar. A aparência foi inspecionada nas capturas.

## B — Identidade

Os textos das 26 páginas do dossiê e das 13 páginas do minibook foram consultados nas cópias avulsas disponibilizadas pelo artista. O material resultou em 24 capítulos navegáveis do Grimório e 13 páginas do minibook. Os diagramas usam SVG e a sequência de leitura preserva os símbolos. Arquivos principais: `src/editorial.js`, `src/reading.js` e `src/reading.css`. Testamos conteúdo, índice, avanço, retorno, sorteio, posição, favoritos, cópia de texto e modo focado. Etapa seguinte concluída: ferramentas de criação.

## C — Ferramentas

A ficha reúne os campos opcionais, paleta HEX, categorias livres, acabamentos, salvamento automático, duplicação, exclusão, Markdown e impressão do texto integral. A avaliação usa os cinco critérios e aceita reflexão livre. O filtro preserva as respostas e o vínculo opcional com ficha. O banco contém 12 sugestões em 10 categorias, ideias próprias, edição, exclusão, sorteio, favoritos e conversão em ficha. Arquivos em `src/sheets.js`, `src/reflection.js`, `src/ideas.js` e `src/content.js`. Etapa seguinte concluída: recuperação dos registros.

## D — Persistência e recuperação

`src/data.js` isola IndexedDB e preferências. Os contratos TypeScript estão em `types/records.d.ts`. O arquivo `src/backup.js` valida o esquema e os campos antes de qualquer substituição. Gravações são confirmadas ao término da transação. A exclusão de uma ficha remove sua associação no filtro. A exclusão de ideia própria remove seu favorito na mesma transação. Testamos exportação real de um JSON pela interface, rejeição de arquivo inválido e restauração das coleções e preferências. Etapa seguinte concluída: distribuição estática.

## E — Entrega e verificações

Node 24.22.1 gerou a distribuição em `dist/`. O build copia apenas a aplicação e os ativos locais e gera um service worker versionado por conteúdo. O workflow do Pages exige disparo manual. Foram preparados README, AGENTS, ROADMAP e o iniciador para Windows. O projeto utiliza JavaScript modular nativo e contratos TypeScript. Há uma configuração opcional do Vite; o build verificado usa o script Node.

| Verificação | Resultado |
| --- | --- |
| `node --test` | 10 testes aprovados. Incluem esquema de backup, registros malformados, leitor e ciclo de cache simulado. |
| Contratos de dados | Compilador TypeScript verificou `types/records.d.ts` com configuração estrita, sem diagnóstico. |
| Build de produção | 20 recursos essenciais locais listados para pré-cache, além do próprio service worker. |
| Fluxos reais em Chrome 157 | Navegação, menu móvel, dois temas, criação e edição de ideias, favoritos, conversão de ideia, ficha mínima, categoria personalizada, paleta, duplicação, exclusão e IndexedDB após recarga. |
| Reflexão e leitura no Chrome | Radar atualizado pelos controles, avaliação salva e reaberta em modo livre, exclusão, filtro marcado e vinculado, reinício, favorito e posição do livro, ativação e saída do modo focado. |
| Exportação | Conteúdo do Markdown e conteúdo enviado à impressão conferidos. A saída física em impressora depende do dispositivo. |
| Backup no Chrome | Exportação pela interface, validação negativa, confirmação e restauração. Registros e estado do filtro retomados. |
| Layout | Capturas revistas em 1440×1000, 820×1180, 390×844 e 1280×900. Conferida também largura de 1180×820. Sem transbordamento horizontal nos portais avaliados. |
| Execução no navegador | Recursos da distribuição servidos no caminho `/Atelie-ARTHEUS/` por interceptação local de requisições para o teste. Os cenários exercitados terminaram sem exceções JavaScript observadas. |

### Pendências e limites da verificação

- O ZIP original não pôde ser extraído neste ambiente. Os PDFs avulsos forneceram o conteúdo textual e as capturas avulsas forneceram os textos e a organização dos menus e diagramas. A inspeção visual direta das páginas originais dos PDFs ficou pendente. A referência externa Estudo-em-C também não pôde ser aberta.
- A rede do ambiente bloqueou o acesso direto do navegador de teste ao servidor HTTP local. A navegação funcional foi testada com os bytes da build e IndexedDB real. O ciclo de cache, a consulta offline e a substituição de versão foram testados com cache simulado.
- Conferir a instalação PWA e a reabertura em modo avião em hospedagem HTTPS aprovada. Conferir Safari/iPadOS e iOS em aparelhos físicos. A opção de build Vite e a execução remota do GitHub Actions não foram exercitadas.
- O aplicativo permanece em desenvolvimento local. O próximo passo para disponibilizá-lo por endereço público é a revisão autoral seguida da aprovação do artista. Depois, o README descreve a publicação.

### Ponto de retomada

Abrir a branch `desenvolvimento/v1`, executar `node --test` e `node scripts/serve.mjs --dev`. Para a versão 1.1, consultar o percurso de entrada de uma obra no ROADMAP e aguardar nova solicitação antes de implementar as galerias.


## V1.1 · A — Autorização e transporte
Branch desenvolvimento-v1.1. src/drive/config.js, auth.js e api.js implementam GIS sob demanda, escopo drive.file, token em memória, cancelamento por sessão, paginação, operações REST e envio retomável em blocos. O Client ID será configurável. Validação real do consentimento depende da conta de teste.

## V1.1 · B — Galerias e obras
collection.js identifica a árvore por IDs e appProperties, reutiliza pastas, verifica proprietário/compartilhamento, versões e vínculos. Metadados e movimentação são gravados na mesma obra. Galerias vazias são retiradas do acervo sem apagar arquivos invisíveis ao escopo. images.js valida formatos e prepara versões otimizadas e prévias temporárias.

## V1.1 · C — Interface e sincronização
Meu Acervo integra a navegação desktop e móvel. view.js e acervo.css implementam conexão, galerias, edição, pesquisa, favoritos, escolha de capa, prévia, ampliação, status e atualização manual/ao recuperar foco. Diálogos, miniaturas e referências privadas são descartados na saída ou troca de sessão.

## V1.1 · D — Testes e entrega

O build Node inclui 27 recursos locais no pré-cache e gera a versão do service worker a partir do conteúdo. Requisições com Authorization e endereços do Google ficam fora da interceptação. O workflow continua com disparo manual e aceita GOOGLE_OAUTH_CLIENT_ID como variável pública do repositório. O guia GOOGLE_DRIVE_SETUP.md cobre configuração, aplicação do patch, publicação e validação em dois aparelhos.

- Node: 20 testes aprovados. Autorização, expiração, 401, popup bloqueado, isolamento de sessão, estrutura duplicada, autenticação de requisições, paginação, upload por intervalos, versões, movimentação, exclusão e validação de arquivos foram exercitados com dados simulados. Os testes originais e a troca de versão do cache também passaram.
- Chrome: build exercitada com GIS e Drive simulados, imagem PNG de teste, upload otimizado, ampliação, edição de capa, movimento, filtros, desconexão, troca de conta e retorno às fichas. Layout do acervo conferido em 390×844, 820×1180 e 1440×900. Regressão dos fluxos da V1.0 aprovada no Chrome, incluindo fichas, radar, leitura e backup.
- Configuração: build conferida com Client ID público fictício e repetida sem valor. O pacote final usa o campo configurável. Os arquivos-base alterados foram conferidos contra os identificadores de conteúdo da main do projeto no GitHub.
- Pendente: OAuth real com a conta de teste, acesso às mesmas obras em dois aparelhos, quotas reais, bloqueio de popups e retorno do consentimento no Safari/PWA físico. O cache offline foi exercitado em simulação. A revisão local aguarda aprovação de envio e publicação.
## V1.1.1 - Estabilidade e desempenho

Melhorias implementadas:
- Correção do carregamento de imagens privadas do Google Drive.
- Centralização visual das obras, títulos e descrições.
- Paralelização de consultas ao Google Drive.
- Otimização da recuperação de galerias.
- Cache de miniaturas em memória RAM.
- Persistência temporária da sessão via sessionStorage.
- Preservação da sessão ao atualizar a página.
- Correção do workflow de publicação no GitHub Pages.

Validação:
- 20 testes automatizados aprovados.
- Build executado com sucesso.
- Persistência da sessão confirmada em ambiente local.
- Tempo de carregamento observado de aproximadamente 4 segundos.

Próximos desenvolvimentos:

V1.2 - Acervo Inteligente
- Cache persistente com IndexedDB.
- Miniaturas privadas armazenadas no Google Drive.
- Cache limitado de imagens completas em RAM.
- Carregamento progressivo.
- Sincronização do acervo em segundo plano.
- Upload de múltiplas ilustrações.
- Cadastro dinâmico de tags.
- Histórico de tags.
- Reutilização da última combinação de tags.

V1.3 - Ateliê Conectado
- Sincronização das ferramentas entre dispositivos.
- Migração segura dos registros locais.
- Funcionamento offline.
- Fila persistente de sincronização.
- Tratamento de conflitos.
- Backups e recuperação.

A V1.2 será desenvolvida manualmente.
A V1.3 será desenvolvida pelo Codex em uma branch
independente, para integração posterior.