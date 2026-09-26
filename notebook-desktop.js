/* Vereda OS: a local, interactive desktop projected onto the notebook screen.
 * Load after three.min.js, atelier-forms.js and story-content.js.
 * Production flow is local. Internet opens real sites only after a user action.
 */
(function (global) {
  'use strict';

  const WIDTH = 960, HEIGHT = 600;
  const PROJECT_ID = 'vereda-lamp-demo-v1';
  const STORE_URL = 'https://veredacerrado.com/';
  const COLORS = { '#e5d9c4': 'Areia', '#b4552d': 'Terracota', '#5a6b4f': 'Musgo' };
  const names = { terminal: 'Terminal', internet: 'Internet', projeto: 'Projeto.stl', fatiador: 'Fatiador', acordo: 'Acordo', guia: 'Guia SLM', luz: 'Luz', jogo: 'Pega-luz', palavra: 'Palavra' };
  const icons = {
    palavra: '<rect x="3" y="4" width="26" height="26" rx="4"/><path d="M3 17h26M16 4v26M7 13l3-6 3 6M8 11h4M20 23h5m-5 3h5"/>',
    internet: '<circle cx="16" cy="17" r="13"/><ellipse cx="16" cy="17" rx="6" ry="13"/><path d="M3 17h26M6 9h20M6 25h20"/>',
    terminal: '<rect x="2" y="5" width="28" height="24" rx="4"/><path d="m8 13 5 4-5 4m9 1h7"/>',
    projeto: '<path d="M9 3h10l6 6v19H9zM19 3v7h6M13 17l4-3 5 3v6l-5 3-4-3zM13 17l4 3 5-3M17 20v6"/>',
    fatiador: '<path d="m3 10 13-6 13 6-13 6zM3 16l13 6 13-6M3 22l13 6 13-6"/>',
    acordo: '<rect x="6" y="4" width="20" height="25" rx="3"/><path d="M11 10h10M11 15h7m-7 7 3 3 7-7"/>',
    guia: '<path d="M16 8C11 4 5 5 3 6v22c5-2 9-1 13 2 4-3 8-4 13-2V6c-2-1-8-2-13 2Zm0 0v22M7 11l5 1M7 16l5 1M21 12l4-1M21 17l4-1"/>',
    luz: '<path d="M10 25h12M12 29h8M10 20c0-3-4-4-4-10a10 10 0 0 1 20 0c0 6-4 7-4 10v2H10zM16 1V0"/>',
    jogo: '<path d="M9 9h14c4 0 7 16 4 18-3 2-7-4-11-4s-8 6-11 4C2 25 5 9 9 9Z"/><path d="M8 16h8m-4-4v8m10-7v3m3 3h-3"/>'
  };
  const state = {
    loaded: false, reviewed: false, sliced: false, agreement: false,
    approved: false, paymentConfirmed: false, sent: false,
    color: '#e5d9c4', colorName: 'Areia', layer: 100, lit: false
  };
  let root, viewport, canvas, webApp, wordApp, callbacks = {}, active = null, visible = false;
  let expanded = false, expandedDialog = null, expansionReturnFocus = null, expansionWasVisible = false, rootPlaceholder = null;
  let renderer, scene, camera, lamp, lightRoom, graphicsFailed = false, frame = 0, clock = 0;
  let yaw = .55, pitch = .15, distance = 6, orbit = null, moving = null;
  const reducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)');
  const terminalHistory = [], bootTimers = new Set();
  let historyCursor = 0, booting = false, gameFrame = 0, gameLast = 0, gameCanvas, gameContext;
  const game = { score:0, goal:8, running:false, paused:true, player:{x:80,y:177}, keys:new Set(), trail:[] };
  const sparks = [{x:245,y:87},{x:490,y:242},{x:150,y:265},{x:517,y:110},{x:333,y:277},{x:84,y:72},{x:295,y:172},{x:505,y:287}];
  const gameDirections = { ArrowLeft:'left', a:'left', ArrowRight:'right', d:'right', ArrowUp:'up', w:'up', ArrowDown:'down', s:'down' };
  let removeListeners = [];
  const opened = new Set(), minimized = new Set();
  const q = (key) => root && root.querySelector('[data-vd="' + key + '"]');
  const win = (id) => root.querySelector('[data-vd-window="' + id + '"]');
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const escape = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ready = () => state.loaded && state.reviewed && state.sliced && state.agreement && state.approved && state.paymentConfirmed && !state.sent;
  const snapshot = (reason) => ({ ...state, reason, ready: ready(), simulation: true,
    surface: 'desktop', stateVersion: 1, projectId: PROJECT_ID,
    layerUnit: 'percent', layerProgress: state.layer / 100,
    material: 'PLA Matte', printer: 'Bambu P2S + AMS 2 Pro', file: state.loaded ? 'Projeto.stl' : null });
  const svg = (id) => '<svg viewBox="0 0 32 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + icons[id] + '</svg>';
  function listen(target, type, fn, options) {
    target.addEventListener(type, fn, options);
    removeListeners.push(() => target.removeEventListener(type, fn, options));
  }
  function notify(reason) { if (typeof callbacks.onChange === 'function') callbacks.onChange(snapshot(reason)); }
  function emit(kind, detail) { global.dispatchEvent(new CustomEvent('vereda:interaction', { detail:{ kind, surface:'desktop', ...(detail || {}) } })); }
  function status(text) { q('status').textContent = text; }
  function invalidates() {
    state.reviewed = false; state.sliced = false; state.agreement = false;
    state.approved = false; state.paymentConfirmed = false; state.sent = false; state.layer = 100;
    if (lamp) lamp.setProgress(1);
  }
  function invalidateAgreement() { state.agreement = false; state.approved = false; state.paymentConfirmed = false; state.sent = false; }

  function frameMarkup(id, content, extra) {
    return '<section class="vd-window ' + (extra || '') + '" data-vd-window="' + id + '" aria-labelledby="vd-title-' + id + '" hidden>' +
      '<header class="vd-window-bar" data-vd-drag="' + id + '"><div class="vd-window-controls">' +
      '<button type="button" class="vd-window-close" data-vd-close="' + id + '" aria-label="Fechar ' + names[id] + '"><span>×</span></button>' +
      '<button type="button" class="vd-window-min" data-vd-min="' + id + '" aria-label="Minimizar ' + names[id] + '"><span>−</span></button></div>' +
      '<h2 id="vd-title-' + id + '">' + svg(id) + names[id] + '</h2>' +
      '<button type="button" class="vd-window-expand" data-vd-expand aria-label="Ampliar computador">↗</button></header>' +
      '<div class="vd-window-body">' + content + '</div></section>';
  }
  function build() {
    root = document.createElement('div'); root.id = 'notebook-ui'; root.className = 'vd-desktop';
    root.setAttribute('aria-label', 'Computador Vereda OS. Estúdio de produção demonstrativo.');
    root.setAttribute('role', 'region'); root.hidden = true;
    const project = '<div class="vd-app-split"><div class="vd-view-host" data-vd-host="projeto"></div><aside class="vd-side"><p class="vd-eyebrow">O arquivo da próxima peça</p><h3>Começa com uma forma.</h3><p class="vd-copy">Abra o projeto e explore a luminária em 3D.</p><button type="button" class="vd-button vd-primary" data-vd="load">Carregar Projeto.stl <span>↗</span></button><fieldset class="vd-colors" data-vd="colors"><legend>Cor do PLA Matte</legend><label><input type="radio" name="vd-color" value="#e5d9c4" data-name="Areia" checked><span style="--vd-swatch:#e5d9c4"></span>Areia</label><label><input type="radio" name="vd-color" value="#b4552d" data-name="Terracota"><span style="--vd-swatch:#b4552d"></span>Terracota</label><label><input type="radio" name="vd-color" value="#5a6b4f" data-name="Musgo"><span style="--vd-swatch:#5a6b4f"></span>Musgo</label></fieldset><button type="button" class="vd-link" data-vd-open="fatiador">Abrir no fatiador →</button></aside></div>';
    const slicer = '<div class="vd-app-split vd-slicer"><div class="vd-view-host" data-vd-host="fatiador"></div><aside class="vd-side"><p class="vd-eyebrow">Bambu P2S + AMS 2 Pro</p><h3>Confira. Depois, fatie.</h3><button type="button" class="vd-button" data-vd="load-slicer">Carregar projeto</button><label class="vd-check"><input type="checkbox" data-vd="review"><span>Revisão humana concluída<small>Forma e viabilidade conferidas.</small></span></label><button type="button" class="vd-button vd-primary" data-vd="slice">Fatiar modelo <span>↗</span></button><div class="vd-layer"><label for="vd-layer">Inspecionar camadas <output data-vd="layer-output" for="vd-layer">100%</output></label><input id="vd-layer" data-vd="layer" type="range" min="0" max="100" value="100" step="1"><p class="vd-fine">Corte visual; o pedido mantém a peça completa.</p></div><button type="button" class="vd-link" data-vd="next-agreement">Preparar o acordo →</button></aside></div>';
    const agreement = '<div class="vd-agreement"><aside class="vd-order"><p class="vd-eyebrow">Projeto.stl</p><h3>A prévia vira acordo.</h3><div class="vd-order-color"><i data-vd="order-swatch"></i><span data-vd="order-color">PLA Matte · Areia</span></div><dl><dt>Preço</dt><dd>Calculadora da loja, após o fatiamento real.</dd><dt>Prazo</dt><dd>Fila + produção + frete cotado.</dd></dl><p class="vd-fine">Condições demonstrativas. Nenhum valor será cobrado.</p></aside><div class="vd-agreement-checks"><p class="vd-prereq" data-vd="agreement-prereq">Conclua a revisão e o fatiamento primeiro.</p><label class="vd-check"><input type="checkbox" data-vd="agreement"><span>Prévia, preço e prazo apresentados<small>Antes de pagar, como exige o acordo.</small></span></label><label class="vd-check"><input type="checkbox" data-vd="approved"><span>Cliente aprovou a prévia<small>Forma, cor, tamanho e nome.</small></span></label><label class="vd-check"><input type="checkbox" data-vd="payment"><span>Pagamento simulado confirmado<small>Simulação local · sem cobrança.</small></span></label><button type="button" class="vd-button vd-primary vd-send" data-vd="send">Enviar à Bambu <span>↗</span></button><p class="vd-fine">A produção só segue com as três confirmações.</p></div></div>';
    const guide = '<div class="vd-guide"><div class="vd-guide-intro"><div><p class="vd-eyebrow">Gerenciamento do nível de serviço</p><h3>A promessa precisa de um caminho.</h3></div><button class="vd-button" type="button" data-vd="chapter">Abrir conteúdo de SLM ↗</button></div><p class="vd-guide-path">SLR <span>→</span> UC <span>→</span> SLA <span>→</span> monitorar <span>→</span> revisar <span>→</span> SIP</p><div class="vd-guide-copy" data-vd="guide-copy"></div></div>';
    const light = '<div class="vd-app-split"><div class="vd-view-host" data-vd-host="luz"></div><aside class="vd-side vd-light-side"><p class="vd-eyebrow">A luz dentro da matéria</p><h3>Experimente o brilho.</h3><p class="vd-copy">A mesma peça, uma nova presença.</p><button class="vd-button vd-primary" type="button" data-vd="light" aria-pressed="false">Acender a peça <span>◌</span></button><button class="vd-link" type="button" data-vd-open="projeto">Voltar ao projeto →</button><p class="vd-fine">Prévia de iluminação. A simulação não altera o acordo.</p></aside></div>';
    const terminal = '<div class="vd-terminal"><div class="vd-terminal-heading"><span>Vereda OS / 01</span><span>Ateliê local</span></div><div class="vd-terminal-launch"><button type="button" data-vd-command="start vereda"><strong>Iniciar apresentação <b>↗</b></strong><span>Acompanhe o caminho da peça.</span></button><button type="button" data-vd-command="start jogo"><strong>Pega-luz <b>↗</b></strong><span>Uma pausa no caderno do ateliê.</span></button></div><div class="vd-terminal-log" data-vd="terminal-log" role="log" aria-live="polite" aria-label="Saída do terminal"><p class="vd-terminal-welcome">O que vamos abrir?</p><p>Escolha acima ou digite <strong>start vereda</strong>.</p><p class="vd-terminal-muted">Seu teclado funciona. As teclas do notebook também.</p></div><form class="vd-terminal-form" data-vd="terminal-form"><label for="vd-terminal-input">vereda@atelier <span>~</span> <b>%</b></label><input id="vd-terminal-input" data-vd="terminal-input" type="text" maxlength="128" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="Comando do terminal Vereda"><button type="submit" aria-label="Executar comando">↵</button></form><div class="vd-terminal-shortcuts"><button type="button" data-vd-command="open projeto">open projeto</button><button type="button" data-vd-command="help">help</button><button type="button" data-vd-command="open loja">open loja ↗</button><button type="button" data-vd-command="start termo">start termo</button></div></div>';
    const gameApp = '<div class="vd-game"><div class="vd-game-paper"><canvas data-vd="game-canvas" width="600" height="350" tabindex="0" aria-label="Pega-luz. Use as setas ou WASD para levar a pequena lanterna até os oito pontos de luz."></canvas><div class="vd-game-caption"><span>Caderno do ateliê / 01</span><span>setas ou W A S D</span></div></div><aside class="vd-game-side"><p class="vd-eyebrow">Uma pausa no ateliê</p><h3>Pega-luz</h3><p class="vd-copy">Leve a lanterninha até os oito pontos de luz.</p><div class="vd-game-score"><strong data-vd="game-score">0</strong><span>/ 8 luzes</span></div><p class="vd-game-message" data-vd="game-message" role="status" aria-live="polite">Um desenho pronto para brincar.</p><div class="vd-game-actions"><button type="button" class="vd-button vd-primary" data-vd="game-start">Jogar ↗</button><button type="button" class="vd-button" data-vd="game-pause" disabled aria-pressed="true">Pausar</button></div><div class="vd-game-pad" aria-label="Mover a lanterna"><button type="button" data-vd-direction="up" aria-label="Mover para cima">↑</button><button type="button" data-vd-direction="left" aria-label="Mover para a esquerda">←</button><button type="button" data-vd-direction="down" aria-label="Mover para baixo">↓</button><button type="button" data-vd-direction="right" aria-label="Mover para a direita">→</button></div></aside></div>';
    let layers = '';
    for (let i = 0; i < 16; i++) layers += '<path d="M' + (310+i*13) + ' 590 C' + (430+i*8) + ' 380,' + (980-i*10) + ' 490,990 ' + (160-i*11) + '"/>';
    root.innerHTML = '<div class="vd-wallpaper" aria-hidden="true"><svg viewBox="0 0 960 600" fill="none" stroke="currentColor" stroke-width="1">' + layers + '</svg><img src="assets/brand/logo-negativo.png" alt=""><p>A próxima peça<br>começa aqui.</p></div>' +
      '<header class="vd-menubar"><button type="button" class="vd-os" data-vd="home" aria-label="Mostrar mesa Vereda OS"><span>vereda</span><b>OS</b></button><span class="vd-menubar-app" data-vd="app-name">Terminal</span><span class="vd-sim-label">simulação</span><time data-vd="clock"></time><button class="vd-top-expand" type="button" data-vd-expand aria-label="Ampliar computador">↗</button></header>' +
      '<div class="vd-desktop-files"><button type="button" class="vd-file" data-vd-open="terminal">' + svg('terminal') + '<span>Terminal</span></button><button type="button" class="vd-file" data-vd-open="projeto">' + svg('projeto') + '<span>Projeto.stl</span></button><button type="button" class="vd-file" data-vd-open="jogo">' + svg('jogo') + '<span>Pega-luz</span></button></div>' +
      '<div class="vd-windows">' + frameMarkup('terminal',terminal,'vd-terminal-window') + frameMarkup('projeto',project) + frameMarkup('fatiador',slicer) + frameMarkup('acordo',agreement) + frameMarkup('guia',guide,'vd-guide-window') + frameMarkup('luz',light) + frameMarkup('jogo',gameApp,'vd-game-window') + frameMarkup('internet','<div data-vd-web-host></div>','vd-web-window') + frameMarkup('palavra','<div data-vd-word-host></div>','vd-word-window') + '</div>' +
      '<p class="vd-status" data-vd="status" role="status" aria-live="polite">Escolha um aplicativo no dock para explorar o ateliê.</p><nav class="vd-dock" aria-label="Aplicativos do computador">' + Object.keys(names).map(id => '<button type="button" class="vd-dock-app" data-vd-open="'+id+'" data-vd-dock="'+id+'" aria-label="Abrir '+names[id]+'">'+svg(id)+'<span>'+names[id]+'</span><i aria-hidden="true"></i></button>').join('') + '</nav>';
    document.body.appendChild(root);
    webApp=global.VeredaWeb?.create(root.querySelector('[data-vd-web-host]'),{storeUrl:STORE_URL,embedStore:false});
    wordApp=global.VeredaWordGame?.create(root.querySelector('[data-vd-word-host]'));
    viewport = document.createElement('div'); viewport.className = 'vd-viewport';
    viewport.innerHTML = '<div class="vd-view-grid" aria-hidden="true"></div><canvas data-vd="canvas" tabindex="0" aria-label="Modelo 3D. Arraste para girar. Setas giram; mais e menos aproximam."></canvas><div class="vd-view-empty" data-vd="empty">'+svg('projeto')+'<strong>Projeto.stl</strong><span>Uma forma à espera de matéria.</span><button type="button" class="vd-button vd-primary" data-vd="load-viewport">Carregar projeto ↗</button></div><div class="vd-view-fallback" data-vd="fallback" hidden><strong>Projeto carregado.</strong><p>Prévia 3D indisponível neste dispositivo.</p><span data-vd="fallback-info"></span></div><span class="vd-view-badge" data-vd="view-badge">PROJETO / PERSPECTIVA</span><div class="vd-view-controls" data-vd="view-controls" hidden><span>Arraste para girar</span><button type="button" data-vd="reset-view" aria-label="Recentrar vista">↺</button></div>';
    root.querySelector('[data-vd-host="projeto"]').appendChild(viewport); canvas = q('canvas');
    const content = global.VEREDA_CONTENT && global.VEREDA_CONTENT[4];
    q('guide-copy').innerHTML = content ? content.details : '<h4>Antes de fechar a promessa</h4><p>Levantar o SLR, conferir se os UC sustentam as metas e só então acordar o SLA. Acompanhar cada pedido; a revisão mensal alimenta o SIP.</p><p>Sem OLA: a operação é feita por uma pessoa.</p><a href="docs/folha-slm-respondida.html" target="_blank" rel="noopener">Ler a folha completa ↗</a>';
    gameCanvas=q('game-canvas');gameContext=gameCanvas.getContext('2d');
    bind(); update(); updateClock(); updateGameUI(); openApp('terminal', false);
  }

  function openApp(id, focus) {
    if (!root || !names[id]) return;
    if(id!=='terminal')cancelBoot();
    if(id!=='jogo')pauseGame(true);
    webApp?.setVisible?.(id==='internet'&&visible);wordApp?.setVisible?.(id==='palavra'&&visible);
    opened.add(id); minimized.delete(id); active = id;
    root.querySelectorAll('[data-vd-window]').forEach(w => { w.hidden = w.dataset.vdWindow !== id; });
    if (['projeto','fatiador','luz'].includes(id)) {
      root.querySelector('[data-vd-host="' + id + '"]').appendChild(viewport);
      if (lamp) { lamp.setProgress(id === 'fatiador' && state.sliced ? state.layer / 100 : 1); lamp.setLight(state.lit ? 1 : 0); }
    }
    q('app-name').textContent = names[id]; update(); requestRender();
    if(id==='jogo')drawGame(performance.now());
    if(visible && focus!==false)emit('open',{app:id});
    if (focus !== false && visible) {
      const button = id==='terminal'?q('terminal-input'):id==='jogo'?q('game-start'):win(id).querySelector('button:not(:disabled)');
      if(id==='internet')webApp?.focus();else if(id==='palavra')wordApp?.focus();else if (button) button.focus({ preventScroll: true });
    }
  }
  function closeApp(id, minimize) {
    if (!names[id]) return;
    if(id==='terminal')cancelBoot();if(id==='jogo')pauseGame(true);if(id==='internet')webApp?.setVisible?.(false);if(id==='palavra')wordApp?.setVisible?.(false);
    win(id).hidden = true;
    if (minimize) minimized.add(id); else { opened.delete(id); minimized.delete(id); }
    active = null;
    const previous = Array.from(opened).reverse().find(n => n !== id && !minimized.has(n));
    if (previous) openApp(previous, false); else { q('app-name').textContent = 'Mesa'; update(); cancelRender(); }
    const dock = root.querySelector('[data-vd-dock="' + id + '"]');
    if (visible && dock) dock.focus({ preventScroll: true });
  }
  function desktopPoint(event) {
    // Invert the 2D projective transform of the screen plane; drag stays local
    // even when the parent projects this 960×600 surface through a homography.
    const css = global.getComputedStyle(root).transform;
    if (css && css !== 'none' && global.DOMMatrix) {
      const m = new DOMMatrix(css), x = event.clientX, y = event.clientY;
      const a = m.m11 - x*m.m14, b = m.m21 - x*m.m24, c = x*m.m44 - m.m41;
      const d = m.m12 - y*m.m14, e = m.m22 - y*m.m24, f = y*m.m44 - m.m42;
      const det = a*e-b*d;
      if (Math.abs(det)>1e-8) return { x:(c*e-b*f)/det, y:(a*f-c*d)/det };
    }
    const r = root.getBoundingClientRect();
    return { x:(event.clientX-r.left)*WIDTH/(r.width || WIDTH), y:(event.clientY-r.top)*HEIGHT/(r.height || HEIGHT) };
  }
  function terminalPrint(text, kind) {
    if(!root)return;
    const log=q('terminal-log'),line=document.createElement('p');
    line.textContent=text;if(kind)line.className='vd-terminal-'+kind;
    log.appendChild(line);while(log.children.length>70)log.firstElementChild.remove();
    log.scrollTop=log.scrollHeight;
  }
  function cancelBoot() {
    bootTimers.forEach(timer=>global.clearTimeout(timer));bootTimers.clear();
    if(booting&&root)terminalPrint('Inicialização pausada. Digite start vereda para retomar.','muted');
    booting=false;if(root)q('terminal-input').removeAttribute('aria-busy');
  }
  function bootLater(fn, delay) {
    const timer=global.setTimeout(()=>{bootTimers.delete(timer);if(visible&&active==='terminal'&&!document.hidden)fn();else cancelBoot();},reducedMotion.matches?0:delay);
    bootTimers.add(timer);
  }
  function executeCommand(raw) {
    if(!root)return;
    const command=String(raw||'').slice(0,128).trim().replace(/\s+/g,' ');
    if(!command)return;
    cancelBoot();terminalHistory.push(command);if(terminalHistory.length>50)terminalHistory.shift();historyCursor=terminalHistory.length;
    terminalPrint('vereda@atelier ~ % '+command,'command');
    const normalized=command.replace(/^--\s*/,'').toLowerCase();
    if(normalized==='clear'){q('terminal-log').replaceChildren();return;}
    if(normalized==='help'){
      terminalPrint('start vereda  · inicia a apresentação');
      terminalPrint('start apresentacao | apresentacao | present · também iniciam');
      terminalPrint('start jogo    · abre o Pega-luz');
      terminalPrint('start termo   · abre Palavra, jogo de cinco letras');
      terminalPrint('ls            · mostra os arquivos e aplicativos');
      terminalPrint('open projeto | fatiador | acordo | guia | luz | jogo | internet | palavra');
      terminalPrint('open loja     · loja Vereda em uma nova aba');
      terminalPrint('pesquisar [termo] · busca no Google em uma nova aba');
      terminalPrint('clear         · limpa esta janela');
      terminalPrint('Seu teclado funciona. As teclas do notebook também.','muted');
      terminalPrint('Nenhum comando executa programas no seu sistema. Internet abre links reais.','muted');return;
    }
    if(normalized==='ls'){
      terminalPrint('Projeto.stl    Fatiador.app    Acordo.app');
      terminalPrint('Guia-SLM.app   Luz.app         Pega-luz.app');terminalPrint('Internet.app  · Loja Vereda e pesquisa na web');terminalPrint('Palavra.app   · Cinco letras, seis tentativas');return;
    }
    if(['start vereda','start apresentacao','start apresentação','apresentacao','apresentação','present'].includes(normalized)){
      booting=true;q('terminal-input').setAttribute('aria-busy','true');
      terminalPrint('↳ Abrindo o ateliê…','muted');
      bootLater(()=>terminalPrint('✓ Da ideia à entrega. O caminho da peça está pronto.','success'),150);
      bootLater(()=>terminalPrint('✓ Conteúdo de SLM disponível durante a jornada.','success'),390);
      bootLater(()=>{
        booting=false;q('terminal-input').removeAttribute('aria-busy');
        if(typeof callbacks.onPresent==='function'){
          if(expanded)collapse();status('A apresentação começa no ateliê.');emit('success',{action:'present'});callbacks.onPresent(snapshot('present'));
        }else terminalPrint('A apresentação não está disponível nesta prévia isolada. Digite open projeto ou start jogo.','muted');
      },650);
      return;
    }
    if(normalized==='start jogo'){terminalPrint('↳ Abrindo Pega-luz.','success');openApp('jogo');return;}
    if(['start termo','start palavra'].includes(normalized)){terminalPrint('↳ Abrindo Palavra.','success');openApp('palavra');return;}
    const searchCommand=/^(?:pesquisar|buscar|search)\s+(.+)$/i.exec(command.replace(/^--\s*/,''));
    if(searchCommand){openApp('internet');webApp?.navigate(searchCommand[1]);return;}
    if(normalized==='open loja'){openApp('internet');webApp?.visitStore();return;}
    if(normalized.startsWith('open ')){
      const alias={'projeto.stl':'projeto','projeto':'projeto','fatiador':'fatiador','acordo':'acordo','guia':'guia','guia-slm':'guia','luz':'luz','jogo':'jogo','pega-luz':'jogo','terminal':'terminal','internet':'internet','web':'internet','navegador':'internet','palavra':'palavra','termo':'palavra'};
      const app=alias[normalized.slice(5)];
      if(app){terminalPrint('↳ Abrindo '+names[app]+'.','success');openApp(app);return;}
      terminalPrint('Aplicativo não encontrado. Digite ls para ver os disponíveis.','muted');return;
    }
    terminalPrint('Comando não reconhecido. Digite help para ver o que este terminal faz.','muted');
  }
  function submitTerminal() {
    const input=q('terminal-input'),command=input.value;input.value='';
    emit('enter',{key:'Enter',app:'terminal'});executeCommand(command);
  }
  function typeKey(key) {
    if(!root||!visible||typeof key!=='string')return false;
    if(key==='Space'||key==='Spacebar')key=' ';
    if(key==='Escape'&&expanded){collapse();return true;}
    if(active==='jogo'){
      const direction=gameDirections[key]||gameDirections[key.toLowerCase()];
      emit(key==='Enter'?'enter':'key',{key,app:'jogo'});
      if(direction&&game.running&&!game.paused){moveGame(direction,22);drawGame(performance.now());return true;}
      if(key==='Enter'){if(!game.running)startGame();else toggleGamePause();return true;}
      if(key==='Escape'){closeApp('jogo',false);return true;}
      return !!direction;
    }
    if(key==='Escape'){if(active)closeApp(active,false);return true;}
    if(active==='palavra')return !!wordApp?.typeKey(key);
    if(active==='internet'){const handled=webApp?.typeKey(key);if(handled)emit(key==='Enter'?'enter':'key',{key,app:'internet'});return !!handled;}
    if(active!=='terminal')openApp('terminal');
    const input=q('terminal-input');input.focus({preventScroll:true});
    if(key==='Enter'){submitTerminal();return true;}
    const start=input.selectionStart==null?input.value.length:input.selectionStart,end=input.selectionEnd==null?start:input.selectionEnd;
    if(key==='Backspace')input.setRangeText('',start===end?Math.max(0,start-1):start,end,'end');
    else if(key==='Delete')input.setRangeText('',start,start===end?Math.min(input.value.length,end+1):end,'end');
    else if(key==='ArrowLeft'||key==='ArrowRight'){
      const next=clamp((key==='ArrowLeft'?start-1:end+1),0,input.value.length);input.setSelectionRange(next,next);
    }else if(key==='ArrowUp'||key==='ArrowDown')terminalRecall(key==='ArrowUp'?-1:1);
    else if(key.length===1&&input.value.length-(end-start)<128)input.setRangeText(key,start,end,'end');
    else return false;
    emit('key',{key,app:'terminal'});return true;
  }
  function terminalRecall(direction) {
    historyCursor=clamp(historyCursor+direction,0,terminalHistory.length);
    const input=q('terminal-input');input.value=terminalHistory[historyCursor]||'';input.setSelectionRange(input.value.length,input.value.length);
  }
  function gameCanRun(){return !!(root&&visible&&active==='jogo'&&!document.hidden&&game.running&&!game.paused);}
  function cancelGameFrame(){if(gameFrame){global.cancelAnimationFrame(gameFrame);gameFrame=0;}gameLast=0;}
  function pauseGame(silent) {
    const wasPlaying=game.running&&!game.paused;game.paused=true;game.keys.clear();cancelGameFrame();
    if(root){updateGameUI();if(visible&&active==='jogo')drawGame(performance.now());}
    if(wasPlaying&&!silent)emit('game',{action:'pause',score:game.score});
  }
  function startGame() {
    game.score=0;game.player={x:80,y:177};game.trail=[];game.keys.clear();game.running=true;game.paused=false;
    gameLast=0;updateGameUI();drawGame(performance.now());requestGameFrame();
    if(visible)gameCanvas.focus({preventScroll:true});emit('game',{action:'start',score:0});
  }
  function toggleGamePause() {
    if(!game.running)return;
    if(!game.paused){pauseGame(false);return;}
    game.paused=false;gameLast=0;updateGameUI();drawGame(performance.now());requestGameFrame();
    gameCanvas.focus({preventScroll:true});emit('game',{action:'resume',score:game.score});
  }
  function updateGameUI() {
    if(!root)return;
    q('game-score').textContent=game.score;
    q('game-message').textContent=game.score===game.goal?'O ateliê inteiro acendeu. Boa coleta!':!game.running?'Um desenho pronto para brincar.':game.paused?'Pausa no caderno. Retome quando quiser.':'Siga o brilho e colete a próxima luz.';
    q('game-start').textContent=game.running||game.score?'Reiniciar ↺':'Jogar ↗';
    q('game-pause').disabled=!game.running;q('game-pause').textContent=game.paused?'Retomar':'Pausar';q('game-pause').setAttribute('aria-pressed',String(game.paused));
    root.querySelectorAll('[data-vd-direction]').forEach(button=>button.disabled=!game.running||game.paused);
  }
  function moveGame(direction, amount) {
    if(!gameCanRun())return;
    if(direction==='left')game.player.x-=amount;if(direction==='right')game.player.x+=amount;
    if(direction==='up')game.player.y-=amount;if(direction==='down')game.player.y+=amount;
    game.player.x=clamp(game.player.x,52,566);game.player.y=clamp(game.player.y,45,315);
    const last=game.trail[game.trail.length-1];
    if(!last||Math.hypot(last.x-game.player.x,last.y-game.player.y)>15){game.trail.push({...game.player});if(game.trail.length>45)game.trail.shift();}
    const target=sparks[game.score];
    if(target&&Math.hypot(target.x-game.player.x,target.y-game.player.y)<23){
      game.score++;emit('game',{action:game.score===game.goal?'win':'collect',score:game.score});
      if(game.score===game.goal){game.running=false;game.paused=true;game.keys.clear();cancelGameFrame();}
      updateGameUI();
    }
  }
  function requestGameFrame() {
    if(gameFrame||!gameCanRun()||(reducedMotion.matches&&!game.keys.size))return;
    gameFrame=global.requestAnimationFrame(gameTick);
  }
  function gameTick(now) {
    gameFrame=0;if(!gameCanRun()){gameLast=0;return;}
    const elapsed=gameLast?Math.min((now-gameLast)/1000,.05):1/60;gameLast=now;
    const diagonal=(game.keys.has('left')||game.keys.has('right'))&&(game.keys.has('up')||game.keys.has('down'));
    const step=142*elapsed/(diagonal?Math.SQRT2:1);game.keys.forEach(direction=>moveGame(direction,step));
    drawGame(now);requestGameFrame();
  }
  function drawGame(now) {
    if(!gameContext||!root||!visible||active!=='jogo'||document.hidden)return;
    const c=gameContext;c.clearRect(0,0,600,350);c.fillStyle='#faf8f0';c.fillRect(0,0,600,350);
    c.lineWidth=.6;c.strokeStyle='#5a6b4f28';
    for(let y=26;y<350;y+=25){c.beginPath();c.moveTo(0,y);c.lineTo(600,y+.9);c.stroke();}
    c.strokeStyle='#b4552d38';c.beginPath();c.moveTo(37,0);c.lineTo(38,350);c.stroke();
    c.fillStyle='#6d765e';c.font='12px Manrope, sans-serif';c.fillText('ensaio de luz / ateliê vereda',55,24);
    // Hand-drawn workbench, shelf and pencil: an authored notebook setting.
    c.save();c.translate(355,51);c.rotate(-.025);c.fillStyle='#5a6b4f0d';c.fillRect(4,7,176,31);c.strokeStyle='#5a6b4f';c.lineWidth=1.2;
    c.strokeRect(0,0,177,31);c.beginPath();c.moveTo(2,33);c.lineTo(172,35);c.stroke();
    for(let x=8;x<175;x+=8){c.beginPath();c.moveTo(x,25);c.lineTo(x+4,29);c.stroke();}
    c.fillStyle='#faf8f0';c.fillRect(18,-8,23,26);c.strokeRect(18,-8,23,26);
    c.beginPath();c.moveTo(24,-10);c.quadraticCurveTo(3,-36,26,-20);c.quadraticCurveTo(47,-45,30,-8);c.stroke();
    c.strokeRect(66,6,31,11);c.beginPath();c.ellipse(81,6,15,4,0,0,Math.PI*2);c.stroke();
    c.fillStyle='#b4552d';c.fillRect(117,10,44,3);c.restore();
    c.save();c.translate(61,293);c.rotate(-.14);c.fillStyle='#b4552d';c.fillRect(0,0,63,6);c.strokeStyle='#5a6b4f';c.strokeRect(0,0,63,6);c.beginPath();c.moveTo(63,0);c.lineTo(73,3);c.lineTo(63,6);c.stroke();c.restore();
    game.trail.forEach((point,i)=>{c.globalAlpha=(i+1)/game.trail.length*.25;c.strokeStyle='#5a6b4f';c.beginPath();c.moveTo(point.x-2,point.y+9);c.lineTo(point.x+2,point.y+11);c.stroke();});c.globalAlpha=1;
    const target=sparks[game.score];
    if(target){
      const pulse=reducedMotion.matches||game.paused?1:1+.12*Math.sin(now/420);
      c.save();c.translate(target.x,target.y);c.scale(pulse,pulse);
      c.fillStyle='#efc65526';c.beginPath();c.arc(0,0,27,0,Math.PI*2);c.fill();
      c.fillStyle='#e8bf45';c.strokeStyle='#a68b38';c.lineWidth=1.25;c.beginPath();
      c.moveTo(0,-16);c.quadraticCurveTo(4,-3,14,0);c.quadraticCurveTo(3,4,0,16);c.quadraticCurveTo(-4,3,-14,0);c.quadraticCurveTo(-3,-4,0,-16);c.fill();c.stroke();
      c.strokeStyle='#8b7938';[[20,-13,25,-17],[-19,-12,-24,-15],[18,15,23,19]].forEach(p=>{c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[2],p[3]);c.stroke();});c.restore();
    }
    c.save();c.translate(game.player.x,game.player.y);
    c.fillStyle='#443e2e18';c.beginPath();c.ellipse(5,16,18,5,-.1,0,Math.PI*2);c.fill();
    c.fillStyle='#e7c65326';c.beginPath();c.arc(0,0,25+game.score*2,0,Math.PI*2);c.fill();
    c.strokeStyle='#945136';c.lineWidth=1.7;c.beginPath();c.arc(0,-11,7,Math.PI,0);c.stroke();
    c.fillStyle='#efcc67';c.beginPath();c.moveTo(-9,-10);c.lineTo(9,-11);c.lineTo(12,12);c.lineTo(-11,13);c.closePath();c.fill();c.stroke();
    c.fillStyle='#b4552d';c.fillRect(-11,-12,22,5);c.fillRect(-12,11,24,5);
    c.strokeStyle='#fdf7dd';c.lineWidth=2;c.beginPath();c.moveTo(-3,-5);c.lineTo(-4,7);c.moveTo(1,-5);c.lineTo(0,6);c.stroke();c.restore();
    if(game.score===game.goal){c.fillStyle='#5a6b4f';c.font='600 25px Manrope, sans-serif';c.fillText('Oito luzes. Um ateliê aceso.',129,174);}
    else if(!game.running){c.fillStyle='#777362';c.font='16px Manrope, sans-serif';c.fillText('uma lanterna, oito encontros.',177,330);}
  }
  function bind() {
    ['pointerdown','pointerup','click','keydown','keyup','wheel','touchmove'].forEach(type => {
      listen(root,type,event => event.stopPropagation(), { passive: type==='wheel' || type==='touchmove' });
    });
    listen(root,'click',event => {
      const target = event.target.closest('button'); if (!target || target.disabled) return;
      if (target.dataset.vdOpen) openApp(target.dataset.vdOpen);
      if (target.dataset.vdClose) closeApp(target.dataset.vdClose,false);
      if (target.dataset.vdMin) closeApp(target.dataset.vdMin,true);
      if (target.dataset.vdCommand) {q('terminal-input').value=target.dataset.vdCommand;submitTerminal();}
      if (target.hasAttribute('data-vd-expand')) expand();
    });
    listen(q('terminal-form'),'submit',event=>{event.preventDefault();submitTerminal();});
    listen(q('terminal-input'),'keydown',event=>{
      if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();terminalRecall(event.key==='ArrowUp'?-1:1);}
      if(!event.repeat&&!event.metaKey&&!event.ctrlKey&&event.key!=='Enter')emit('key',{key:event.key,app:'terminal'});
    });
    listen(q('game-start'),'click',startGame);listen(q('game-pause'),'click',toggleGamePause);
    listen(root,'keydown',event=>{
      if(active!=='jogo'||event.metaKey||event.ctrlKey||event.altKey)return;
      const direction=gameDirections[event.key]||gameDirections[event.key.toLowerCase()];
      if(!direction)return;
      event.preventDefault();
      if(!gameCanRun())return;
      if(!game.keys.has(direction))emit('key',{key:event.key,app:'jogo'});
      game.keys.add(direction);requestGameFrame();
    });
    listen(root,'keyup',event=>{
      if(active!=='jogo')return;
      const direction=gameDirections[event.key]||gameDirections[event.key.toLowerCase()];
      if(direction){event.preventDefault();game.keys.delete(direction);}
    });
    root.querySelectorAll('[data-vd-direction]').forEach(button=>{
      const direction=button.dataset.vdDirection;
      listen(button,'pointerdown',event=>{
        if(!gameCanRun()||event.button!==0)return;event.preventDefault();
        button.setPointerCapture(event.pointerId);game.keys.add(direction);requestGameFrame();emit('key',{key:direction,app:'jogo'});
      });
      ['pointerup','pointercancel','lostpointercapture'].forEach(type=>listen(button,type,()=>game.keys.delete(direction)));
      listen(button,'click',event=>{if(event.detail===0&&gameCanRun()){moveGame(direction,22);drawGame(performance.now());emit('key',{key:direction,app:'jogo'});}});
    });
    listen(global,'blur',()=>pauseGame(true));
    listen(q('home'),'click',() => { cancelBoot();pauseGame(true);webApp?.setVisible(false);wordApp?.setVisible(false);Array.from(opened).forEach(id => minimized.add(id)); root.querySelectorAll('[data-vd-window]').forEach(w=>w.hidden=true); active=null; q('app-name').textContent='Mesa'; update(); cancelRender(); });
    ['load','load-slicer','load-viewport'].forEach(key=>listen(q(key),'click',loadProject));
    listen(q('colors'),'change',event => {
      if (!state.loaded || !event.target.matches('input[type="radio"]')) return;
      state.color=event.target.value; state.colorName=event.target.dataset.name; invalidates();
      if(lamp)lamp.setColor(state.color); update(); requestRender(); notify('color');
      status('Cor alterada. Revise, fatie e confirme o acordo novamente.');
    });
    listen(q('review'),'change',()=>{
      state.reviewed=state.loaded && q('review').checked;
      state.sliced=false; state.layer=100; invalidateAgreement();
      if(lamp)lamp.setProgress(1); update();requestRender();notify('review');
      status(state.reviewed?'Revisão concluída na simulação. O modelo pode ser fatiado.':'Revisão pendente. Fatiamento e acordo precisam ser refeitos.');
    });
    listen(q('slice'),'click',()=>{
      if(!state.loaded || !state.reviewed || state.sliced)return;
      state.sliced=true; state.layer=100; invalidateAgreement();update();requestRender();notify('slice');
      emit('success',{action:'slice'});
      status('Fatiamento demonstrativo pronto. Confira as camadas e abra o acordo.');
    });
    listen(q('layer'),'input',()=>{
      if(!state.sliced)return;
      state.layer=Number(q('layer').value);if(lamp)lamp.setProgress(state.layer/100);
      updateLayer();requestRender();notify('layer');
    });
    listen(q('next-agreement'),'click',()=>{if(state.sliced)openApp('acordo');});
    listen(q('agreement'),'change',()=>{
      state.agreement=state.sliced && state.reviewed && q('agreement').checked;
      state.approved=false;state.paymentConfirmed=false;state.sent=false;update();notify('agreement');
      status(state.agreement?'Condições apresentadas. Confirme a aprovação da prévia.':'Apresente prévia, preço e prazo antes da aprovação.');
    });
    listen(q('approved'),'change',()=>{
      state.approved=state.agreement && q('approved').checked;state.paymentConfirmed=false;state.sent=false;
      update();notify('approval');status(state.approved?'Prévia aprovada na simulação. Falta confirmar o pagamento.':'A aprovação da prévia ainda está pendente.');
    });
    listen(q('payment'),'change',()=>{
      state.paymentConfirmed=state.approved && q('payment').checked;state.sent=false;update();notify('payment');
      status(ready()?'Tudo conferido. A peça pode seguir para a Bambu.':'Pagamento simulado ainda pendente.');
    });
    listen(q('send'),'click',()=>{
      if(!ready())return;
      const data=snapshot('send');state.sent=true;data.sent=true;update();
      opened.clear();minimized.clear();active=null;webApp?.setVisible(false);wordApp?.setVisible(false);root.querySelectorAll('[data-vd-window]').forEach(w=>w.hidden=true);
      q('app-name').textContent='Mesa';status('Projeto enviado na simulação. A próxima etapa é a impressão.');update();cancelRender();
      notify('send');if(typeof callbacks.onSend==='function')callbacks.onSend(data);
      emit('success',{action:'send'});
    });
    listen(q('chapter'),'click',()=>{if(typeof callbacks.onChapter==='function')callbacks.onChapter(4);});
    listen(q('light'),'click',()=>{
      if(!state.loaded)return;state.lit=!state.lit;if(lamp)lamp.setLight(state.lit?1:0);
      update();requestRender();notify('light');status(state.lit?'Luz acesa na prévia.':'Luz apagada na prévia.');
    });
    listen(q('reset-view'),'click',()=>{yaw=.55;pitch=.15;distance=6;requestRender();});
    listen(canvas,'pointerdown',event=>{
      if(!state.loaded || graphicsFailed || event.button!==0)return;
      orbit={id:event.pointerId,point:desktopPoint(event)};canvas.setPointerCapture(event.pointerId);canvas.classList.add('is-grabbing');event.preventDefault();
    });
    listen(canvas,'pointermove',event=>{
      if(!orbit || orbit.id!==event.pointerId)return;const p=desktopPoint(event);
      yaw+=(p.x-orbit.point.x)*.011;pitch=clamp(pitch+(p.y-orbit.point.y)*.008,-.45,.7);orbit.point=p;requestRender();
    });
    const release=()=>{orbit=null;canvas.classList.remove('is-grabbing');};
    listen(canvas,'pointerup',release);listen(canvas,'pointercancel',release);listen(canvas,'lostpointercapture',release);
    listen(canvas,'keydown',event=>{
      const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'];
      if(!state.loaded || !keys.includes(event.key))return;event.preventDefault();
      if(event.key==='ArrowLeft')yaw-=.15;if(event.key==='ArrowRight')yaw+=.15;
      if(event.key==='ArrowUp')pitch=clamp(pitch-.1,-.45,.7);if(event.key==='ArrowDown')pitch=clamp(pitch+.1,-.45,.7);
      if(event.key==='+' || event.key==='=')distance=clamp(distance-.3,4.8,8);if(event.key==='-')distance=clamp(distance+.3,4.8,8);
      if(event.key==='0'){yaw=.55;pitch=.15;distance=6;}requestRender();
    });
    root.querySelectorAll('[data-vd-drag]').forEach(bar=>{
      listen(bar,'pointerdown',event=>{
        if(expanded || event.target.closest('button') || event.button!==0)return;
        const w=win(bar.dataset.vdDrag);moving={id:event.pointerId,bar,w,start:desktopPoint(event),left:w.offsetLeft,top:w.offsetTop};
        bar.setPointerCapture(event.pointerId);event.preventDefault();
      });
      listen(bar,'pointermove',event=>{
        if(!moving || moving.id!==event.pointerId || moving.bar!==bar)return;
        const p=desktopPoint(event);moving.w.style.left=clamp(moving.left+p.x-moving.start.x,8,WIDTH-moving.w.offsetWidth-8)+'px';
        moving.w.style.top=clamp(moving.top+p.y-moving.start.y,46,HEIGHT-moving.w.offsetHeight-86)+'px';
      });
      ['pointerup','pointercancel','lostpointercapture'].forEach(type=>listen(bar,type,()=>moving=null));
    });
    listen(root,'keydown',event=>{if(event.key==='Escape'){if(expanded){event.preventDefault();collapse();}else if(active){event.preventDefault();closeApp(active,false);}}});
    listen(global,'resize',()=>{if(expanded){requestRender();if(active==='jogo')drawGame(performance.now());}});
    listen(document,'visibilitychange',()=>{if(document.hidden){cancelBoot();pauseGame(true);cancelRender();stopClock();}else if(visible){startClock();requestRender();if(active==='jogo')drawGame(performance.now());}});
  }
  function loadProject() {
    invalidates();state.loaded=true;
    if(!renderer && !graphicsFailed)createGraphics();
    if(lamp){lamp.setColor(state.color);lamp.setProgress(1);lamp.setLight(state.lit?1:0);}
    update();requestRender();notify('load');status('Projeto aberto. Explore a forma e faça a revisão no Fatiador.');
    emit('success',{action:'load'});
  }
  function updateLayer() {
    q('layer').value=state.layer;q('layer').setAttribute('aria-valuetext',state.layer+' por cento das camadas visíveis');
    q('layer-output').textContent=state.layer+'%';
    q('view-badge').textContent=active==='fatiador'&&state.sliced?'CAMADAS / '+state.layer+'%':'PROJETO / PERSPECTIVA';
    q('fallback-info').textContent='PLA Matte '+state.colorName+(active==='fatiador'&&state.sliced?' · '+state.layer+'% das camadas':' · peça completa');
  }
  function update() {
    if(!root)return;
    q('load').textContent=state.loaded?'Recarregar projeto ↺':'Carregar Projeto.stl ↗';
    q('load-slicer').hidden=state.loaded;q('colors').disabled=!state.loaded;
    q('colors').querySelectorAll('input[type="radio"]').forEach(input=>{input.checked=input.value===state.color;});
    q('review').disabled=!state.loaded;q('review').checked=state.reviewed;
    q('slice').disabled=!state.loaded||!state.reviewed||state.sliced;q('slice').textContent=state.sliced?'Fatiamento pronto ✓':'Fatiar modelo ↗';
    q('layer').disabled=!state.sliced;q('next-agreement').disabled=!state.sliced;
    q('agreement').disabled=!state.sliced||!state.reviewed;q('agreement').checked=state.agreement;
    q('approved').disabled=!state.agreement;q('approved').checked=state.approved;
    q('payment').disabled=!state.approved;q('payment').checked=state.paymentConfirmed;
    q('send').disabled=!ready();q('send').textContent=state.sent?'Enviado na simulação ✓':'Enviar à Bambu ↗';
    q('agreement-prereq').textContent=state.sliced?'Fatiamento conferido. Combine antes de produzir.':'Conclua a revisão e o fatiamento primeiro.';
    q('order-color').textContent='PLA Matte · '+state.colorName;q('order-swatch').style.backgroundColor=state.color;
    q('light').disabled=!state.loaded;q('light').setAttribute('aria-pressed',String(state.lit));q('light').textContent=state.lit?'Apagar a peça ◉':'Acender a peça ◌';
    q('empty').hidden=state.loaded;q('canvas').hidden=!state.loaded||graphicsFailed;q('canvas').tabIndex=state.loaded&&!graphicsFailed?0:-1;
    q('fallback').hidden=!state.loaded||!graphicsFailed;q('view-controls').hidden=!state.loaded||graphicsFailed;
    root.querySelectorAll('[data-vd-dock]').forEach(b=>{const id=b.dataset.vdDock;b.classList.toggle('is-open',opened.has(id));b.classList.toggle('is-active',active===id);b.setAttribute('aria-pressed',String(active===id));});
    root.querySelector('.vd-sim-label').textContent=active==='internet'?'web':(active==='jogo'||active==='palavra')?'jogo':'simulação';
    root.dataset.loaded=String(state.loaded);root.dataset.ready=String(ready());root.dataset.activeApp=active||'desktop';updateLayer();
  }
  function createGraphics() {
    const T=global.THREE;
    if(!T || !global.VeredaForms){graphicsFailed=true;return;}
    try {
      renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(global.devicePixelRatio||1,1.5));renderer.outputEncoding=T.sRGBEncoding;
      renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
      scene=new T.Scene();camera=new T.PerspectiveCamera(34,1,.1,30);
      scene.add(new T.HemisphereLight('#ffffff','#aa9b89',.9));
      const key=new T.DirectionalLight('#fff3dd',1.75);key.position.set(-3,6,5);scene.add(key);
      const rim=new T.DirectionalLight('#e8ecf0',.65);rim.position.set(4,3,-3);scene.add(rim);
      lamp=global.VeredaForms.createLamp({color:state.color});scene.add(lamp);lamp.setLight(0);if(global.VeredaLightRoom){lightRoom=global.VeredaLightRoom.create(T);scene.add(lightRoom.group);lightRoom.group.visible=false;}
      const floor=new T.Mesh(new T.CircleGeometry(1.85,80),new T.MeshBasicMaterial({color:'#8f7866',transparent:true,opacity:.075,depthWrite:false}));
      floor.rotation.x=-Math.PI/2;floor.position.y=-.008;scene.add(floor);
      listen(canvas,'webglcontextlost',event=>{event.preventDefault();graphicsFailed=true;cancelRender();update();status('A prévia 3D foi pausada; os controles do projeto continuam disponíveis.');});
    } catch(error) {graphicsFailed=true;if(renderer){renderer.dispose();renderer=null;} }
  }
  function requestRender() {
    if(frame || !visible || document.hidden || !renderer || graphicsFailed || !['projeto','fatiador','luz'].includes(active))return;
    frame=global.requestAnimationFrame(()=>{frame=0;render();});
  }
  function render() {
    if(!visible || document.hidden || !renderer || graphicsFailed || !['projeto','fatiador','luz'].includes(active))return;
    const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;const inRoom=active==='luz';if(lightRoom){lightRoom.group.visible=inRoom&&state.loaded;lightRoom.setLight(state.lit?1:0);}viewport.classList.toggle('vd-room-mode',inRoom&&state.loaded);
    if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
    const viewYaw=inRoom?Math.max(-.65,Math.min(.65,yaw)):yaw,viewPitch=inRoom?Math.max(.05,Math.min(.4,pitch)):pitch,viewDistance=distance*(inRoom?1.12:1);camera.position.set(Math.sin(viewYaw)*Math.cos(viewPitch)*viewDistance,1.25+Math.sin(viewPitch)*viewDistance,Math.cos(viewYaw)*Math.cos(viewPitch)*viewDistance);camera.lookAt(0,1.25,0);
    renderer.render(scene,camera);
  }
  function cancelRender(){if(frame){global.cancelAnimationFrame(frame);frame=0;}orbit=null;moving=null;}
  function updateClock(){if(root){q('clock').textContent=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});q('clock').dateTime=new Date().toISOString();}}
  function startClock(){stopClock();updateClock();clock=global.setInterval(()=>{if(visible&&!document.hidden)updateClock();},60000);}
  function stopClock(){if(clock){global.clearInterval(clock);clock=0;}}
  function setVisible(value){
    const next=expanded||!!value;if(next===visible)return;
    visible=next;if(!root)return;
    if(!visible && root.contains(document.activeElement))document.activeElement.blur();
    root.hidden=!visible;root.setAttribute('aria-hidden',String(!visible));webApp?.setVisible?.(visible&&active==='internet');wordApp?.setVisible?.(visible&&active==='palavra');
    if('inert' in root)root.inert=!visible;
    if(visible){if(state.loaded&&!renderer&&!graphicsFailed)createGraphics();update();startClock();requestRender();if(active==='jogo')drawGame(performance.now());}else{cancelBoot();pauseGame(true);stopClock();cancelRender();}
  }
  function ensureExpandedDialog(){
    if(expandedDialog)return;
    expandedDialog=document.createElement('dialog');expandedDialog.id='vd-expanded-shell';
    expandedDialog.setAttribute('aria-label','Computador Vereda ampliado');
    expandedDialog.innerHTML='<header class="vd-expanded-header"><span>Vereda OS <small>Ateliê local</small></span><button type="button" data-vd-collapse>↙ Voltar ao notebook</button></header>';
    document.body.appendChild(expandedDialog);
    listen(expandedDialog.querySelector('[data-vd-collapse]'),'click',collapse);
    listen(expandedDialog,'cancel',event=>{event.preventDefault();collapse();});
    listen(expandedDialog,'close',()=>{if(expanded&&!expandedDialog.open)collapse();});
    // A modal keyboard gesture belongs to the computer, including its header.
    ['keydown','keyup','click','pointerdown','pointerup','wheel','touchmove'].forEach(type=>listen(expandedDialog,type,event=>event.stopPropagation(),{passive:type==='wheel'||type==='touchmove'}));
  }
  function expand(){
    if(!root)return api;
    if(expanded){requestRender();return api;}
    ensureExpandedDialog();expansionReturnFocus=document.activeElement;expansionWasVisible=visible;
    rootPlaceholder=document.createComment('Vereda desktop projection');root.parentNode.insertBefore(rootPlaceholder,root);
    expanded=true;root.classList.add('vd-is-expanded');expandedDialog.appendChild(root);setVisible(true);
    expandedDialog.showModal();
    const focus=active==='terminal'?q('terminal-input'):active==='jogo'?q('game-start'):active==='internet'?root.querySelector('[data-vd-web-host] input'):expandedDialog.querySelector('[data-vd-collapse]');
    if(active==='palavra')wordApp?.focus();else if(focus)focus.focus({preventScroll:true});
    requestRender();if(active==='jogo')drawGame(performance.now());emit('open',{app:active||'desktop',expanded:true});
    return api;
  }
  function collapse(){
    if(!expanded)return api;
    pauseGame(true);expanded=false;
    if(rootPlaceholder&&rootPlaceholder.parentNode){rootPlaceholder.parentNode.insertBefore(root,rootPlaceholder);rootPlaceholder.remove();}
    else document.body.appendChild(root);
    rootPlaceholder=null;root.classList.remove('vd-is-expanded');
    if(expandedDialog.open)expandedDialog.close();
    setVisible(expansionWasVisible);requestRender();if(active==='jogo')drawGame(performance.now());
    if(expansionReturnFocus&&expansionReturnFocus.isConnected&&typeof expansionReturnFocus.focus==='function'&&!expansionReturnFocus.closest('[hidden]'))expansionReturnFocus.focus({preventScroll:true});
    expansionReturnFocus=null;return api;
  }
  // Silent, complete snapshot transfer; safe to call from Studio.onChange.
  // A changed source state is already validated by its UI, while every gate is
  // normalized again here. Explicit units distinguish 1% from ratio 1 (100%).
  function syncState(source){
    if(!source || source.simulation!==true)return snapshot('sync-ignored');
    const color=typeof source.color==='string'?source.color.toLowerCase():'';
    const compatible=(!source.projectId || source.projectId===PROJECT_ID)&&!!COLORS[color];
    state.loaded=compatible&&source.loaded===true;
    if(COLORS[color]){state.color=color;state.colorName=COLORS[color];}
    state.reviewed=state.loaded&&source.reviewed===true;
    state.sliced=state.reviewed&&source.sliced===true;
    state.agreement=state.sliced&&source.agreement===true;
    state.approved=state.agreement&&(source.approved===true||(source.approved===undefined&&source.paymentConfirmed===true));
    state.paymentConfirmed=state.approved&&source.paymentConfirmed===true;
    state.sent=state.paymentConfirmed&&source.sent===true;
    let progress=Number(source.layerProgress);
    if(source.layerProgress==null||!Number.isFinite(progress)){
      progress=Number(source.layer);
      if(source.layerUnit==='percent'||source.surface==='desktop'||progress>1)progress/=100;
    }
    state.layer=state.sliced&&Number.isFinite(progress)?Math.round(clamp(progress,0,1)*100):100;
    state.lit=source.lit===true;
    if(root){
      if(state.loaded&&visible&&!renderer&&!graphicsFailed)createGraphics();
      if(lamp){lamp.setColor(state.color);lamp.setProgress(active==='fatiador'&&state.sliced?state.layer/100:1);lamp.setLight(state.lit?1:0);}
      update();requestRender();
    }
    return snapshot('sync');
  }
  function dispose(){
    if(expanded)collapse();cancelBoot();pauseGame(true);stopClock();cancelRender();removeListeners.forEach(fn=>fn());removeListeners=[];
    if(scene)scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});
    webApp?.dispose();webApp=null;wordApp?.dispose();wordApp=null;
    if(renderer)renderer.dispose();if(root)root.remove();if(expandedDialog)expandedDialog.remove();expandedDialog=null;
    root=null;renderer=null;scene=null;camera=null;lamp=null;lightRoom=null;canvas=null;viewport=null;gameCanvas=null;gameContext=null;graphicsFailed=false;active=null;visible=false;opened.clear();minimized.clear();
  }
  const api={
    init(options){callbacks=options||{};if(!root)build();return api;},
    getElement(){return root;},setVisible,openApp,syncState,typeKey,expand,collapse,isExpanded(){return expanded;},
    runCommand(command){if(root&&visible){openApp('terminal');executeCommand(command);}},
    getState(){return snapshot('inspect');},
    getGameState(){return {score:game.score,goal:game.goal,running:game.running,paused:game.paused,player:{...game.player},target:sparks[game.score]?{...sparks[game.score]}:null,animating:!!gameFrame};},
    closeApp(id){if(root)closeApp(id||active,false);},
    minimizeApp(id){if(root)closeApp(id||active,true);},
    dispose
  };
  global.VeredaDesktop=api;
})(window);
