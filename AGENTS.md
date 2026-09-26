# Vereda — apresentação

Esta pasta contém a versão atual **Da ideia à luz**, uma narrativa de 16 capítulos precedida por notebook fechado → abrir tampa → ligar → marca na tela → Terminal → jogo ou apresentação. `start vereda` conduz pela transição à história, ao fatiamento demonstrativo, à aprovação, à impressão dirigida pelo scroll e à luz final. Não restaurar a luminária de cogumelo/portal rejeitada, o preloader anterior de tela inteira ou a combinação antiga de fontes por conveniência.

## Fonte de verdade e conteúdo

- Preservar `docs/respostas-slm.json` e `docs/folha-slm-respondida.html`. O JSON contém respostas finais e os dez problemas dos revisores.
- `story-content.js` expõe `window.VEREDA_CONTENT`: 16 capítulos com síntese e `details` completos. Manter os botões de conteúdo completo e sua rolagem; não sacrificar informação acadêmica para caber na cena.
- Preservar rastreamento `sourceKeys`/`data-source`, tabela de seis indicadores, dez etapas do fluxo e os qualificadores das metas.
- Ordem SLM: SLR → conferir UC → acordar SLA → monitorar → revisar → SIP. Sem OLA porque há uma pessoa.
- IA somente no Desenho da encomenda, sem dados pessoais. Andrey revisa o modelo; o cliente aprova a prévia. Não atribuir à IA impressão, precificação, atendimento ou operação.
- Não converter metas internas em SLA. Não inventar resultados, números, ganhos medidos ou garantias de frete. Tempos/custos da cúpula original não descrevem a luminária demonstrativa.
- Revisão, fatiamento e cotação sustentam a prévia; preço e data são informados antes de pagar. Fila + produção + frete compõem o prazo. Aprovação e pagamento precedem impressão.

## Arquitetura ativa

- `index.html`: capítulos, controles e integração dos módulos. Não carrega `boot.js`/`boot.css` nem markup do preloader antigo.
- `atelier.css`/`atelier.js`: visual, navegação, conteúdo completo e ligação entre módulos.
- `atelier-forms.js`: `VeredaForms.createLamp({color})`; grupo compartilhado por cena, desktop e estúdio. Manter a mesma forma e cor na trajetória.
- `atelier-scene.js`: mundo Three, câmera, notebook/impressora, abertura articulada, camadas, projeção do desktop e inclinação suave pelo ponteiro. A resposta ao ponteiro respeita pausa e movimento reduzido; um ponteiro de mouse continua funcionando em painéis estreitos. Resize e homografia usam o retângulo real do canvas, incluindo deslocamentos.
- `notebook-entry.js`/`.css`: `VeredaEntry.init({onReady,onPresent})`, `.open()`, `.power()`, `.present(callback?)`, `.skip()`, `.snapshot()`. Estados `closed → opening → off → booting → ready → transition → story`, com `vereda:entry` para progresso. Não abrir ou ligar automaticamente. `lidProgress`, `powerProgress` e `transitionProgress` dirigem a cena; movimento reduzido resolve fases sem animação. Hash direto diferente de `#hero` preserva o capítulo e dispensa a introdução.
- `notebook-desktop.js`/`.css`: `VeredaDesktop`; nove aplicativos — Terminal, Internet, Projeto.stl, Fatiador, Acordo, Guia SLM, Luz, Pega-luz e Palavra. O terminal aceita `-- start vereda`/`start vereda` para iniciar a apresentação, `open projeto`, `open jogo`, `help` e comandos locais listados por `help`; não executa shell nem acessa o sistema. `expand()`/`collapse()` movem o MESMO `#notebook-ui` para/de um dialog nativo, mantendo aplicativo, estado e entrada; não substituir esse fluxo por outro editor.
- `notebook-web.js`/`.css`: app Internet, montado por `VeredaWeb.create`. Loja em `https://veredacerrado.com/`, confirmada no checkout original e HTTP 200. A loja bloqueia iframe por DENY/frame-ancestors none; manter abertura real em nova aba com noopener/noreferrer. Busca usa Google, somente após ação; não fabricar resultados nem contornar headers. Terminal aceita `open internet`, `open loja`, `pesquisar termo`. Teclado 3D passa por `typeKey`. Não confundir a loja real com os pedidos simulados.
- `notebook-words.js`/`.css`: app **Palavra**, jogo local de cinco letras e seis tentativas, com partidas livres. `VeredaWordGame.create(host)` retorna `typeKey`, `setVisible`, `focus` e `dispose`. Teclado nativo, clicável e 3D alimentam a mesma partida. Terminal aceita `start termo`, `start palavra`, `open termo` e `open palavra`; `start jogo` continua abrindo Pega-luz. Não substituir por link externo. Letras repetidas exigem contagem correta, palavra inválida não consome tentativa, e pistas precisam ter significado além da cor. Banco em `notebook-word-list.js`; fonte/licença em `docs/palavra-dicionario.md`.
- `notebook-input.js`: `VeredaHardware.attach`; separa os keycaps reais do GLB em 73 teclas e liga mouse/trackpad ao cursor do desktop. Entrada passa por `VeredaDesktop.typeKey()`. Não tratar como teclado completo do sistema; preservar mapeamento, foco e separação dos gestos de navegação.
- `notebook-stickers.js`: `VeredaStickers.apply`; cinco adesivos em CanvasTexture nas superfícies do notebook, sem downloads. Preservar posição local, marca oficial e limpeza de recursos.
- `studio.js`/`.css`: `VeredaStudio.init({onChange,onSend})`, `.open(state)`, `.close()`, `.syncState(state)`; dialog ampliado e fallback textual. Desktop e estúdio sincronizam snapshots completos em ambos os sentidos. Manter identificação da superfície e unidade explícita de camadas, normalizar travas e evitar feedback entre callbacks.
- `light-room.js`: `VeredaLightRoom.create(THREE)` retorna `group`, `setLight`, `dispose` e `info`. Cenário local do app Luz, sem substituir a factory da luminária. As dimensões da cena são unidades artísticas, não especificação de produto.
- `atelier-audio.js`/`.css`: `VeredaAudio.play(kind)`, `.setMusic()`, `.setKeys()`, `.setVolume()`, `.setMuted()`, `.dispose()`. Síntese instrumental original e sons `key`, `enter`, `open`, `success`, `game`; escuta `vereda:key`/`vereda:interaction`. Somente um clique real no botão Música libera o AudioContext; eventos e chamadas de API não autorizam áudio antes disso.
- Dependências de execução em `assets/vendor/`: Three **r128** e GLTFLoader compatível. Não misturar revisões ou introduzir CDN.
- Modelos em `assets/atelier/`; documentação de pivôs, nomes e hashes em `README.md`, `manifest.json` e `validacao.json` dessa pasta.

`boot.js`/`boot.css`, `surreal.*`, `fonts.css`, `notes.js`, `higgsfield-scene.js`, bibliotecas Three antigas na raiz e `assets/higgsfield/` são históricos, quando presentes na pasta de trabalho. O index atual não os carrega e o ZIP de entrega não os inclui. Não restaurar essas dependências, usá-las como arquitetura ativa ou adicioná-las ao pacote por cópia indiscriminada.

## Marca e desenho

- Fonte oficial atual: **Manrope variável 200–800**, hospedada em `assets/brand/manrope-latin-vf.woff2`. Manter a licença `OFL-Manrope.txt` junto.
- Usar `assets/brand/logo-negativo.png` ou `simbolo-app.png`, sem inventar um símbolo substituto como `✳`. O logo disponível é o PNG oficial, não um vetor redesenhado. Preservar proporção; filtro CSS para contraste no fundo claro é parte da versão atual.
- Base clara/névoa, terracota `#b4552d`, musgo `#5a6b4f`, areia `#e5d9c4`; luz quente e superfície noturna quando a narrativa pedir. Proveniência em `assets/brand/proveniencia.json`.
- Cada movimento deve servir ao conteúdo: câmera orienta atenção; fatiamento revela camadas; aprovação permite envio; impressão forma a peça; luz revela seu uso.
- Textos de produto devem explicar ações e estado, sem expor implementação, contadores de módulos ou jargão de renderização ao visitante.

## Simulação e limites

- Notebook, STL demonstrativo, fatiamento, aprovação, pagamento e envio à Bambu são **simulação local**. Não conectar APIs de cobrança, pedidos, dados pessoais, hardware ou envio externo nesta apresentação.
- A inicialização e a aproximação da câmera são sequências cênicas. Não descrever seus tempos ou barras como progresso real de assets, processamento de STL, fatiamento ou comunicação com uma Bambu.
- Manter a indicação discreta de simulação e as travas de ordem. Mudanças que invalidam revisão/acordo devem limpar as confirmações correspondentes.
- Não usar 11h41, três dias úteis ou custo da folha como estimativa do modelo da cena. Não apresentar proporções ou animações como validação de impressão física.
- O notebook e a impressora são GLBs reais gerados no Higgsfield. A impressora é uma representação autoral baseada na P2S + AMS 2 Pro, não CAD de fabricação.
- Projeto ativo: `36a75bfe-6671-48b3-8fa1-da06ea76be27`, revisão 2 no manifesto. Consultar o estado do projeto antes de futuras edições. Preservar grupos, pivôs e UVs necessários ao renderer.

## Robustez e acessibilidade

- A entrada mantém um caminho direto para a apresentação. Ocultar e tornar inerte o conteúdo narrativo somente durante a introdução; restaurar scroll, foco e controles ao entrar em `story`. Uma falha de recursos não pode prender o visitante na tampa ou na tela de inicialização.
- Durante a história, até 760 px, a projeção HTML fica desativada para não cobrir o texto. Durante a abertura em estado ready, manter desktop projetado, mouse e teclado funcionais independentemente da largura; Ampliar é uma opção. Nunca esconder o mouse nem expandir automaticamente apenas porque a janela estreitou. Preservar o breakpoint único `<=760` e `transform:none` do desktop no dialog. Não permitir uma miniatura fixa com z-index alto sobre o texto que rola.
- Sem WebGL/GLB, disponibilizar a história e controles textuais. Nunca manter um overlay bloqueando indefinidamente.
- Pausa e `prefers-reduced-motion` mantêm texto integral, navegação e ações funcionais; não congelar títulos parcialmente mascarados. Não introduzir orbit automático no desktop ou estúdio.
- Música começa desligada, usa volume baixo e tem controles separados de teclas, volume e mudo. Ocultar a aba, silenciar, zerar o volume ou descartar o módulo precisa cancelar agendamentos/vozes e suspender/fechar o contexto conforme o caso. Não adicionar autoplay, rede, amostras ou músicas externas.
- Terminal, jogo e hardware operam somente no desktop local. Pausar/cancelar timers e animações ao ocultar a superfície, minimizar/fechar ou mudar de capítulo. O Pega-luz deve continuar jogável por teclas e botões; não depender apenas de arrasto.
- Dialogs precisam de foco previsível, Esc e retorno ao acionador. Inputs, slider, canvas e janelas não podem disparar atalhos da apresentação.
- Resize/fullscreen preservam o capítulo e reconciliam posição, estado e câmera; retorno do scroll deve ser determinístico.
- A narrativa base passou na checagem básica em 1280×720, 1024×768, 1366×768, 1920×1080 e 390×844 sem overflow horizontal. A entrada e o dialog também foram inspecionados em 1280×800 e telas estreitas de 319/390 px; isso não certifica todas as interações, contraste, foco ou acessibilidade. Conferir também paisagem baixa e conteúdo contra rodapé/controles, não apenas `scrollHeight`.
- Validar o fluxo completo, modelo/cor compartilhados, falha de assets, teclado, foco, contraste e movimento reduzido. Testes de módulos isolados não substituem essa revisão.

## Rodar e registrar

Repositório: `andreybueno-git/vereda-ciclo-de-vida`. GitHub Pages: https://andreybueno-git.github.io/vereda-ciclo-de-vida/, origem `main:/`. Só publicar quando solicitado. Commits em português, sem `Co-Authored-By`; confirmar a conta `andreybueno-git`, o commit remoto e o deploy. Preservar o histórico da edição anterior.

Dentro desta pasta:

```sh
python3 -m http.server 8842 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8842/`; alternativa no Mac: `Abrir apresentacao.command`, que escolhe uma porta livre. Manter tudo em HTTP local.

A versão possui registros de checagem de conteúdo, estados do estúdio, fluxo do desktop, áudio opt-in, regressão do hash `#luz` e parsing dos GLBs. Os testes do preloader antigo não cobrem `notebook-entry`. Há evidência dos caminhos principais da entrada (tampa, energia física e botão acessível, comando e opção visual), Pega-luz, hardware e ambiente Luz. Alterações futuras exigem revalidar os caminhos afetados. O README distingue cada resultado da revisão completa de acessibilidade ainda não realizada. Atualizar documentação quando arquitetura, contratos ou estado de validação mudarem. Empacotar somente arquivos ativos e suas dependências. Não publicar automaticamente: esta pasta é uma entrega local.
