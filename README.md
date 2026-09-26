# vereda — da ideia à luz

Apresentação interativa de **16 capítulos** sobre o serviço da Vereda, SLM e uso limitado de IA. A experiência começa com um notebook fechado: você abre a tampa, liga o computador e escolhe no Terminal entre a apresentação e um jogo. A narrativa acompanha a ideia no notebook, a revisão e o fatiamento, o acordo com o cliente, a impressão e a peça acesa. Cada capítulo mantém acesso ao conteúdo acadêmico completo pelo botão **Conteúdo de SLM**.

O notebook tem nove aplicativos: **Terminal, Internet, Projeto.stl, Fatiador, Acordo, Guia SLM, Luz, Pega-luz e Palavra**. Seu teclado 3D, mouse e trackpad controlam esse ambiente local; cinco adesivos personalizam a carcaça. O computador ampliado permite explorar o mesmo modelo, inspecionar camadas e percorrer as confirmações de um pedido. **Arquivo, aprovação, pagamento e envio à Bambu são uma simulação local.** Não há upload, cobrança, transmissão para impressora ou registro de pedido em serviço externo.

## Acessar

[Apresentação no GitHub Pages](https://andreybueno-git.github.io/vereda-ciclo-de-vida/) · [Repositório](https://github.com/andreybueno-git/vereda-ciclo-de-vida)

O GitHub Pages publica a raiz da branch `main`. Bibliotecas, fontes e modelos ficam no próprio repositório.

## Abrir localmente

Dentro da pasta da apresentação, execute no Terminal:

```sh
python3 -m http.server 8842 --bind 127.0.0.1
```

Abra [http://127.0.0.1:8842/](http://127.0.0.1:8842/). Mantenha o Terminal aberto; `Ctrl+C` encerra o servidor. Use HTTP, não a abertura direta por `file://`, para carregar os GLBs.

No Mac, `Abrir apresentacao.command` é uma alternativa: inicia o servidor numa porta livre e abre o navegador. Preserve a pasta inteira; fontes, bibliotecas e assets de execução são locais.

## Navegar e experimentar

Experimente esta sequência:

1. Clique no notebook fechado ou em **Abrir notebook**. Com a tampa aberta, acione **Ligar notebook**. A marca aparece na tela durante a breve inicialização visual.
2. No Terminal, escolha **Iniciar apresentação** ou digite `-- start vereda` e pressione Enter. `start vereda`, sem os dois traços, também funciona. A transição aproxima a tela e libera a história; a sequência de 16 capítulos começa em seguida.
3. Para brincar antes ou depois, escolha **Pega-luz** no Terminal ou digite `open jogo`. Clique em **Jogar**; use setas, WASD ou os botões de direção para alcançar os oito pontos de luz. Para adivinhar palavras de cinco letras, abra **Palavra** ou digite `start termo`. `help` mostra os outros comandos; `open projeto` abre o projeto demonstrativo.
4. Durante a história, entre no computador pelo botão do capítulo Desenho. No Projeto.stl, gire a prévia, escolha a cor e confirme a revisão humana. Abra o Fatiador e inspecione as camadas; no Acordo, confirme prévia, preço, prazo, aprovação e pagamento simulados. O envio leva à impressão conduzida pela rolagem.
5. Clique em **Música** para autorizar a trilha original e os sons de interação. Em Ajustes de áudio, altere volume, silencie tudo ou desligue somente os sons das teclas. Nada toca antes dessa ativação explícita.

**Ampliar computador** abre os mesmos aplicativos em um dialog, com a mesma janela, entrada e estado. Na abertura, o mouse e o desktop interativo permanecem disponíveis também em janelas estreitas; Ampliar é opcional. Durante a história, até 760 px, o desktop abre ampliado para não cobrir o texto que rola. Teclado, mouse e trackpad 3D funcionam quando o desktop está projetado na cena. **Ir direto à apresentação** dispensa a abertura, e links diretos como `#desenho` preservam o capítulo solicitado.

- Role para acompanhar as transformações. Setas, PageUp/PageDown e Espaço navegam entre capítulos; Home/End vão ao começo/fim.
- `I` abre o índice; `N` abre o conteúdo completo do capítulo. Os atalhos da apresentação não devem interferir em campos, desktop ou dialogs.
- Os botões do cabeçalho controlam pausa e tela cheia. Os controles da peça permitem girar e alternar a luz. O ponteiro também produz uma inclinação discreta da cena; pausa e movimento reduzido desativam essa resposta.
- Clique nas teclas 3D para digitar no terminal, ou use seu teclado. Arraste o mouse/trackpad do notebook para mover o cursor interno e dê um clique curto para acionar o controle apontado. Esses gestos não controlam o sistema operacional.
- No notebook, abra, minimize e feche os aplicativos. Expandir move o mesmo desktop para o dialog; **Voltar ao notebook** devolve-o à cena. O editor `VeredaStudio` é um módulo separado e mantém compatibilidade de estado, sem substituir o computador no comando de expandir.
- No modelo 3D, arraste para girar. Com o canvas em foco, setas giram, `+`/`−` ajustam a distância e Home recentra.
- Confirme revisão humana antes de fatiar. Apresente prévia, preço e prazo antes de confirmar aprovação e pagamento simulados. Só então o envio é liberado.
- A inspeção de camadas corta a **visualização**, sem reduzir a peça do pedido. Mudanças que invalidam o acordo exigem novas confirmações.
- O aplicativo Luz mostra a peça em um ambiente com aparador, janela, livros e planta; seu controle de luz altera a atmosfera junto da luminária.
- Esc fecha dialogs e janelas conforme o contexto. A abertura oferece um caminho explícito direto para a apresentação.

## Internet no notebook

Abra **Internet** no dock ou digite `open internet` no Terminal. O campo aceita uma pesquisa ou endereço HTTP/HTTPS. As teclas do notebook também escrevem nesse campo.

- `open loja`: visita [Vereda Cerrado](https://veredacerrado.com/) em uma nova aba.
- `pesquisar luminárias 3D`: pesquisa o termo no Google em uma nova aba.
- `open web` e `open navegador`: aliases do app Internet.

A loja publicada é real e abre fora da apresentação. Seus headers atuais (`X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`) impedem exibi-la dentro do notebook por iframe. O app oferece atalhos reais; não simula resultados, não altera a loja e não faz requisições externas antes de uma ação. Os pedidos no Fatiador/Acordo continuam demonstrativos e separados da loja.

## Palavra: uma pausa para jogar

Abra **Palavra** no dock ou use `start termo` no Terminal. Também funcionam `start palavra`, `open termo` e `open palavra`. O Pega-luz continua disponível.

Descubra uma palavra de **cinco letras em seis tentativas**. As peças indicam letra na posição certa, letra em outra posição ou letra ausente; letras repetidas respeitam a quantidade na resposta. Acentos e cedilha são normalizados. Palavras fora do banco não gastam tentativa. Use o teclado da tela, seu teclado ou as teclas 3D do notebook; Enter confirma e Apagar corrige. **Nova palavra** inicia outra rodada, sem limite diário.

A rodada fica salva neste navegador, inclusive o palpite em andamento. O banco reúne 240 respostas comuns e 18.153 palavras aceitas.

É um jogo local inspirado na mecânica de [Termo](https://term.ooo/), com interface própria da Vereda. Funciona dentro do computador da apresentação. Consulte `docs/palavra-dicionario.md` para a origem e a licença do vocabulário.

## Conteúdo e limites da demonstração

`docs/respostas-slm.json` é a fonte das respostas finais e dos dez apontamentos dos revisores. `docs/folha-slm-respondida.html` conserva a folha respondida. `story-content.js` organiza 16 capítulos e seus fragmentos completos, com rastreamento até as fontes. A narrativa visual é uma síntese; os detalhes mantêm qualificadores, tabela de indicadores e as dez etapas do fluxo.

A ordem preservada é **SLR → conferir UC → acordar SLA → monitorar → revisar → SIP**. IA fica no Desenho da encomenda, sem dados pessoais, com revisão humana. O prazo do cliente reúne fila, produção e frete cotado; aprovação e pagamento precedem a impressão.

A luminária da cena é um estudo visual compartilhado pelo mundo 3D, desktop e estúdio. Ela não tem medição de fabricação nesta entrega. Tempos, custos e metas da cúpula descrita na folha **não são medições desse modelo demonstrativo**. O arquivo STL e seu fatiamento são demonstrativos; a modelagem de impressora é uma representação autoral para narrativa, não CAD de fabricação nem conexão com uma Bambu real. A inicialização na tela do notebook é uma sequência cênica, não uma medição do progresso de download.

## Arquivos em uso

| Arquivo/pasta | Responsabilidade |
|---|---|
| `index.html` | Capítulos, controles e integração dos scripts da versão ativa. |
| `atelier.css`, `atelier.js` | Layout, navegação, índice, conteúdo completo e integração dos módulos. |
| `story-content.js`, `docs/` | Conteúdo acadêmico, rastreabilidade e documentos-fonte. |
| `atelier-forms.js` | Factory `VeredaForms.createLamp`, compartilhada pelas três prévias. |
| `atelier-scene.js` | Cena, câmera, progressão da impressão e projeção do desktop no notebook. |
| `notebook-desktop.js`, `notebook-desktop.css` | Desktop Vereda OS, aplicativos e fluxo interativo dentro da tela. |
| `notebook-web.js`, `notebook-web.css` | App Internet: barra de busca/endereço, atalho da loja publicada e navegação real em nova aba. |
| `notebook-words.js`, `notebook-words.css`, `notebook-word-list.js` | Palavra: jogo local de cinco letras, teclado, pistas e vocabulário. |
| `notebook-entry.js`, `notebook-entry.css` | Abertura da tampa, botão de ligar, inicialização visual, escolha no Terminal e transição para a história. |
| `notebook-input.js` | `VeredaHardware`: separa os keycaps do GLB em 73 teclas, associa a entrada ao desktop e controla mouse, trackpad e cursor interno. |
| `notebook-stickers.js` | Cinco adesivos locais: Sol, Camadas, Código, Palmas e Vereda, aplicados à base e moldura do notebook. |
| `studio.js`, `studio.css` | Editor de projeto separado, com dialog, inspeção de camadas e contrato de estado compatível com o desktop. |
| `light-room.js` | Ambiente 3D autoral do aplicativo Luz, com iluminação ligada à mesma luminária. |
| `atelier-audio.js`, `atelier-audio.css` | Trilha instrumental original por Web Audio, sons de interação e controles opt-in, sem downloads. |
| `assets/vendor/` | Three.js **r128**, GLTFLoader compatível e licença, sem CDN. |
| `assets/brand/` | Logo e ícone oficiais, Manrope variável 200–800, licença e proveniência. |
| `assets/atelier/` | Notebook e impressora em GLB, fonte Blender, previews, manifestos e validação. |

Notebook e impressora foram gerados no [Higgsfield 3D Jutsu — Vereda Atelier](https://higgsfield.ai/3d-jutsu/36a75bfe-6671-48b3-8fa1-da06ea76be27), revisão 2. A execução carrega `assets/atelier/atelier.glb`; há também `notebook.glb` e `printer.glb` isolados. Coordenadas, pivôs e proveniência estão em `assets/atelier/README.md` e `manifest.json`.

`VeredaDesktop.expand()`/`collapse()` movem o mesmo elemento entre cena e dialog, sem recriar o aplicativo. `VeredaDesktop` e o editor separado `VeredaStudio` também podem trocar snapshots por `getState()`/`syncState()` e callbacks `onChange`, sem emitir um ciclo de alterações. Cores, carga do projeto, revisão, fatiamento, camadas, acordo, aprovação e pagamento compõem esse contrato. A mesma factory de luminária alimenta os três contextos visuais.

O ZIP de entrega contém a versão ativa. Arquivos históricos como `boot.js`/`boot.css`, `surreal.*`, `fonts.css`, `notes.js`, `higgsfield-scene.js`, bibliotecas antigas na raiz e `assets/higgsfield/` podem continuar na pasta de trabalho, mas **ficam fora do ZIP** e não são carregados pelo `index.html` atual. O preloader de tela inteira foi substituído pela entrada no notebook.

## Estado da verificação

- **Conteúdo:** 16 IDs únicos; as 126 strings não vazias de `final` foram encontradas literalmente nos detalhes. Fluxo de dez etapas, tabela de seis indicadores e qualificadores conferidos. O JSON foi comparado byte a byte com a fonte original.
- **Estúdio:** sintaxe e testes isolados de ordem das etapas, fallback sem WebGL, camadas, invalidação das confirmações, envio único e reabertura passaram.
- **Desktop e sincronização:** o fluxo de preparação/envio foi verificado em navegador isolado, sem erros registrados nessa verificação. Terminal, Pega-luz, teclas físicas, mouse e trackpad tiveram seus caminhos principais conferidos; ampliar e retornar preservam o mesmo aplicativo.
- **Internet:** o atalho abriu a loja publicada e `pesquisar Vereda Cerrado luminárias` abriu resultados reais do Google, em novas abas. A janela foi inspecionada em 1280×720 e 407×734; na abertura estreita, uma tecla 3D escreveu no campo de pesquisa. A validação rejeitou um endereço `javascript:` sem navegar. Nenhum erro de console foi registrado nessa verificação.
- **Palavra:** 371 verificações de lógica passaram (letras repetidas, normalização, inválidas, vitória/derrota, restauração e escolha de outra resposta). Em navegador, `start termo` abriu o jogo; uma vitória em três tentativas e uma derrota na sexta foram concluídas. Palpite incompleto/inexistente não gastou tentativa. Clique nas letras seguido de Enter confirmou uma única vez; minimizar/reabrir e recarregar preservaram a partida. Tabuleiro, cores, teclado e legenda foram inspecionados em 1280×720 e 407×734.
- **Nova entrada:** clique na tampa 3D, botão físico de energia, botão acessível e passagem Terminal → história foram conferidos. O comando `-- start vereda` e a opção visual iniciaram a apresentação. Testes de estados cobriram callbacks, movimento reduzido, links diretos e restauração do conteúdo.
- **Assets:** cópias da marca conferidas por hash; GLBs lidos pelo GLTFLoader r128, com coordenadas, pivôs, UVs e materiais verificados.
- **Áudio:** sintaxe e harness passaram para ativação explícita, bloqueio de autoplay, preferências separadas, mudo, volume zero, visibilidade, retorno rápido e limpeza de timers/vozes. A audição no navegador não é substituída por esse teste.
- **Navegação:** a correção anterior de carregamento direto em `#luz` passou na regressão de inicialização, primeiro scroll e callback de resize. A regressão voltou a passar após a integração da nova entrada.
- **Dimensões:** a narrativa base foi conferida em 1280×720, 1024×768, 1366×768, 1920×1080 e 390×844 sem overflow horizontal na checagem básica. A abertura e o desktop ampliado também foram inspecionados em 1280×800 e telas estreitas de 319/390 px; a projeção móvel durante a história foi desativada e o ambiente Luz conferido apagado/aceso.

Esses resultados **não equivalem a uma auditoria completa de acessibilidade ou de todas as interações em cada tamanho**. Os caminhos principais foram conferidos; fullscreen, todas as combinações de paisagem baixa, foco, contraste e movimento reduzido do conjunto não receberam auditoria exaustiva. A publicação usa GitHub Pages; alterações locais só chegam ao site após push e conclusão do deploy.

Correção de 26/09: janela estreita não remove o mouse, o teclado interativo ou o terminal durante a abertura; o enquadramento inclui notebook e mouse. A expansão automática por largura foi removida. Em 407×734, arrastar o mouse 3D moveu o cursor interno e clicar abriu Pega-luz; o enquadramento também foi medido com os extremos de inclinação em 319, 390 e 407 px.
