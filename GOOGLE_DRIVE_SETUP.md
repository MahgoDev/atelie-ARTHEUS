# Meu Acervo · configuração e teste

## Abrir a atualização no computador

Extraia o ZIP inteiro. Na pasta **Atelie-ARTHEUS**, abra um terminal e execute `node scripts/serve.mjs --dev` com Node.js 22 ou superior. Abra **http://localhost:4173/Atelie-ARTHEUS/**. Em **Meu Acervo → Configuração do cliente Google**, cole o Client ID público do cliente Web e toque em **Conectar ao Google Drive**. Se aparecer “Google pronto”, toque novamente para abrir a janela. Entre com a conta de teste autorizada.

O servidor Node usa a porta **4173**. O iniciador Windows da V1.0 abre `127.0.0.1:4173`. Se já tiver fichas nesse endereço, continue a usá-lo e acrescente **http://127.0.0.1:4173** às origens JavaScript autorizadas. Os navegadores mantêm dados locais separados por origem. Se usar PORT ou iniciar o Vite em outra porta, autorize a origem correspondente.

## Cliente Web do Google

No projeto configurado, confira **Google Auth Platform → Clientes**. Copie o identificador do cliente do tipo **Aplicativo da Web**, terminado em `.apps.googleusercontent.com`. Confira a Drive API ativada, o usuário de teste e o escopo `https://www.googleapis.com/auth/drive.file`.

| Ambiente | Origem JavaScript autorizada |
| --- | --- |
| GitHub Pages | `https://mahgodev.github.io` |
| Servidor Node via localhost | `http://localhost:4173` |
| Iniciador Windows, se usado | `http://127.0.0.1:4173` |
| Vite, se usado na porta padrão | `http://localhost:5173` |

A origem contém protocolo, host e porta. O caminho `/atelie-ARTHEUS/` pertence ao endereço do site. A única configuração a fornecer ao Ateliê é o **Client ID público**.

### Configurar uma vez para todos os dispositivos

No repositório GitHub, abra **Settings → Secrets and variables → Actions → Variables → New repository variable**. Use o nome **GOOGLE_OAUTH_CLIENT_ID** e cole o Client ID. O workflow manual inclui esse valor na build pública. Para adotar uma alteração na variável, execute novamente o workflow. Localmente, a mesma variável de ambiente é reconhecida por `node scripts/build.mjs` e `node scripts/serve.mjs --dev`.

Como alternativa, preencha a constante `GOOGLE_CLIENT_ID` em `src/drive/config.js`. A variável de build tem precedência. Quando a distribuição vem com o campo vazio, cada navegador pode informar o ID em **Meu Acervo**. Use o **mesmo cliente OAuth e a mesma conta** nos aparelhos.

## Arquivos e privacidade

A raiz **Ateliê ARTHEUS** contém **Galerias** e **Dados**. As galerias iniciais são Prisma, MusicArt, Bloodlines e Estudos. A pasta Dados está reservada. O título da obra é o nome do arquivo. A descrição nativa do Drive contém um JSON versionado com descrição artística, tags, data, status, favorita e anotações. Use o editor do Ateliê para mudar esses campos. Imagem e informações compartilham um ID, e a edição dos dados pode acompanhar uma mudança de galeria em uma única atualização.

- O upload aceita PNG, JPEG e WebP até **32 MB**. O envio otimizado produz uma cópia com até **2560 px** no maior lado, preservando a transparência quando presente. A grade usa miniaturas temporárias criadas no navegador.
- As ferramentas da V1.0 continuam usando IndexedDB e localStorage. O backup JSON cobre esses registros locais. As obras do acervo ficam na conta Google.
- Excluir uma obra move o arquivo para a lixeira do Drive. Para retirar uma galeria, mova ou remova cada obra individualmente. A pasta vazia é marcada como removida do acervo e preservada no Drive, protegendo eventuais arquivos que a permissão do app não permite listar.
- O aplicativo reconhece itens privados gerenciados pela combinação de IDs, propriedades, vínculos e propriedade da conta. Compartilhamentos ou movimentos externos podem tirar um item da interface. Nenhuma operação cria permissões de compartilhamento.
- Duplicatas estruturais geram aviso. A estrutura mais antiga tem preferência. Revise as outras pastas no Drive se necessário. Metadados ilegíveis são sinalizados antes de substituição pelo editor.
- A versão é conferida antes da edição. Quando o Ateliê detecta uma mudança em outro aparelho, mantém o formulário aberto e exibe um aviso. Copie as alterações desejadas, feche o editor, atualize e reaplique-as. A precondição HTTP também é usada quando a resposta fornece ETag. Esse controle básico não faz mesclagem colaborativa.
- Token, dados privados e URLs de imagem ficam em memória. A troca de conta, a desconexão e a expiração descartam a sessão. A consulta e a edição remotas exigem internet. As informações são consultadas ao abrir, depois de salvar, pelo botão **Atualizar acervo** e ao recuperar o foco após 15 segundos com o editor fechado.

## Teste real entre computador e iPad

1. No computador, crie uma galeria de teste e envie uma imagem que possa mover e excluir. Abra a obra e confira o título, a proporção e a capa.
2. No iPad, abra a distribuição HTTPS aprovada. Autorize **o mesmo cliente e a mesma conta Google**. O endereço localhost aponta para o próprio aparelho.
3. Confira a imagem no iPad, renomeie-a e toque em **Atualizar acervo** no computador. Abra o editor nos dois aparelhos antes de fazer a segunda alteração para testar o aviso de conflito.
4. No Safari, permita o popup para o site quando necessário. Se a autorização iniciada pelo aplicativo da Tela de Início não retornar ao acervo, abra o endereço diretamente no Safari e repita a conexão. Safari/iPadOS físico e PWA instalado ainda precisam de validação.
5. Desconecte e confira o desaparecimento das imagens. Se houver outra conta de teste, confirme o isolamento das galerias. Em modo avião, abra uma ferramenta local da V1.0 após o primeiro carregamento completo.

## Aplicar a atualização e publicar

O ZIP inclui a aplicação completa e `atualizacao-v1.1.patch` na raiz. A pasta da aplicação já contém as alterações. Para atualizar **um clone existente da V1.0**, coloque o patch no diretório imediatamente acima do clone. Na raiz do clone, com a árvore limpa e a revisão atual da V1.0 selecionada, execute:

```sh
git switch -c desenvolvimento-v1.1
git apply --check ../atualizacao-v1.1.patch
git apply ../atualizacao-v1.1.patch
node --test
node scripts/build.mjs
```

Se a branch já existir, use `git switch desenvolvimento-v1.1`. Se a checagem do patch apontar divergências, confira as mudanças locais antes de aplicar.

Depois de aprovar a revisão, faça o commit e envie a branch ao seu repositório. Em **Settings → Pages**, confirme **GitHub Actions** como origem. Em **Actions → Publicar Ateliê no GitHub Pages → Run workflow**, selecione a branch aprovada. O workflow testa, gera e publica `dist/`. Esse disparo atualiza o site público em **https://mahgodev.github.io/atelie-ARTHEUS/**.

## Referências oficiais

- [Autorização por token do Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Escopos da API do Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Uploads retomáveis](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Propriedades de arquivos do aplicativo](https://developers.google.com/workspace/drive/api/guides/properties)
## Atualização V1.1.1

A autorização temporária do Google Drive agora é
preservada em sessionStorage, permitindo atualizar
a página sem solicitar uma nova conexão enquanto
o token permanecer válido.

A expiração do token continua sendo respeitada.
Desconectar ou trocar de conta remove a sessão anterior.

O aplicativo não utiliza refresh tokens ou Client Secret.

As imagens permanecem privadas no Google Drive.
As miniaturas utilizam cache temporário em memória RAM.

O cache persistente via IndexedDB e o armazenamento
de miniaturas no Drive estão planejados para a V1.2.