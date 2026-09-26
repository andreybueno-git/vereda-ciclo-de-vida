/* Local demonstration. No upload, payment, printer connection or network request. */
(function () {
  'use strict';

  const state = {
    loaded: false, sliced: false, reviewed: false,
    agreement: false, approved: false, paymentConfirmed: false,
    color: '#e5d9c4', colorName: 'Areia', layer: 1, lit: false
  };
  const PROJECT_ID = 'vereda-lamp-demo-v1';
  const COLORS = { '#e5d9c4': 'Areia', '#b4552d': 'Terracota', '#5a6b4f': 'Musgo' };
  let callbacks = {}, dialog, returnFocus, renderer, scene, camera, lamp, resizeObserver;
  let renderPending = false, graphicsFailed = false, sent = false;
  let yaw = 0.62, pitch = 0.18, distance = 6.25, drag = null;
  const q = (key) => dialog.querySelector('[data-studio="' + key + '"]');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const ready = () => state.loaded && state.sliced && state.reviewed && state.agreement && state.approved && state.paymentConfirmed && !sent;
  const snapshot = (reason) => ({
    ...state, reason, ready: ready(), simulation: true, sent,
    surface: 'studio', stateVersion: 1, projectId: PROJECT_ID,
    layerUnit: 'ratio', layerProgress: state.layer,
    printer: 'Bambu P2S + AMS 2 Pro', material: 'PLA Matte',
    payment: state.paymentConfirmed ? 'confirmed-simulation' : 'pending-simulation'
  });
  function notify(reason) {
    if (typeof callbacks.onChange === 'function') callbacks.onChange(snapshot(reason));
  }
  function announce(message) { q('status').textContent = message; }

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'vs-dialog';
    dialog.setAttribute('aria-labelledby', 'vs-title');
    dialog.setAttribute('aria-describedby', 'vs-description');
    dialog.innerHTML = `
      <header class="vs-header">
        <div class="vs-brand"><img src="assets/brand/logo-negativo.png" alt="Vereda" width="1345" height="1082"></div>
        <div class="vs-heading"><p>ESTÚDIO DE PRODUÇÃO <span>DEMONSTRAÇÃO</span></p><h2 id="vs-title">Uma ideia. Pronta para ganhar forma.</h2></div>
        <button class="vs-close" type="button" data-studio="close" aria-label="Fechar estúdio">×</button>
      </header>
      <p id="vs-description" class="vs-sr">Abra o modelo demonstrativo, confira as camadas e confirme o acordo antes de simular o envio à impressora.</p>
      <div class="vs-body">
        <section class="vs-workspace" aria-label="Prévia do modelo">
          <div class="vs-filebar"><span class="vs-file-icon" aria-hidden="true">◇</span><span data-studio="filename">Nenhum modelo aberto</span><span class="vs-filetag" data-studio="filetag">.STL</span></div>
          <div class="vs-viewport" data-studio="viewport">
            <canvas data-studio="canvas" tabindex="0" aria-label="Vista 3D da luminária. Arraste ou use as setas para girar. Mais e menos ajustam a distância." aria-describedby="vs-orbit-help"></canvas>
            <div class="vs-empty" data-studio="empty"><span class="vs-empty-icon" aria-hidden="true">↗</span><strong>O projeto começa aqui.</strong><p>Abra a luminária de demonstração para explorar a forma antes da fabricação.</p><button type="button" class="vs-button vs-button-primary" data-studio="load-main">Carregar STL demonstrativo</button></div>
            <div class="vs-fallback" data-studio="fallback" hidden><span aria-hidden="true">◇</span><strong>Prévia textual disponível</strong><p>O 3D está indisponível neste dispositivo. O modelo e a simulação continuam nos controles ao lado.</p><p data-studio="fallback-detail"></p></div>
            <div class="vs-view-top"><span data-studio="view-label">MODELO / PERSPECTIVA</span><span data-studio="layer-badge" hidden>100% DAS CAMADAS</span></div>
            <div class="vs-view-bottom" data-studio="view-controls" hidden><p id="vs-orbit-help">Arraste para girar · setas no quadro 3D</p><button class="vs-text-button" type="button" data-studio="reset-view">Recentrar vista ↺</button></div>
          </div>
          <div class="vs-layer-panel" data-studio="layer-panel" hidden><div><label for="vs-layers">Inspecionar camadas</label><output for="vs-layers" data-studio="layer-output">100%</output></div><input id="vs-layers" data-studio="layers" type="range" min="0" max="100" value="100" step="1" aria-valuetext="100 por cento das camadas visíveis"><p>O corte altera só a visualização. O pedido mantém a peça completa.</p></div>
          <div class="vs-model-meta"><span><i aria-hidden="true"></i> <span data-studio="material">PLA Matte · modelo demonstrativo</span></span><span>Bambu P2S + AMS 2 Pro</span></div>
        </section>
        <aside class="vs-sidebar" aria-label="Preparar o pedido">
          <ol class="vs-steps" aria-label="Etapas da preparação"><li data-studio-step="1" class="is-current"><span>01</span> Modelo</li><li data-studio-step="2"><span>02</span> Revisão</li><li data-studio-step="3"><span>03</span> Acordo</li></ol>
          <section class="vs-section"><div class="vs-section-title"><span>01</span><h3>Escolha a matéria.</h3></div><p>A mesma forma que você vê aqui seguirá até a impressão.</p><button class="vs-button vs-button-secondary" type="button" data-studio="load">Carregar STL demonstrativo</button><fieldset class="vs-colors" data-studio="colors" disabled><legend>Cor do PLA Matte</legend><label><input type="radio" name="vs-color" value="#e5d9c4" data-color-name="Areia" checked><span style="--vs-swatch:#e5d9c4"></span>Areia</label><label><input type="radio" name="vs-color" value="#b4552d" data-color-name="Terracota"><span style="--vs-swatch:#b4552d"></span>Terracota</label><label><input type="radio" name="vs-color" value="#5a6b4f" data-color-name="Musgo"><span style="--vs-swatch:#5a6b4f"></span>Musgo</label></fieldset></section>
          <section class="vs-section"><div class="vs-section-title"><span>02</span><h3>Confira antes de fabricar.</h3></div><p>Na operação, Andrey revisa o modelo, faz os ajustes no Blender e fatia no Bambu Studio antes de enviar a prévia.</p><label class="vs-check"><input type="checkbox" data-studio="review" disabled><span>Revisão humana concluída <small>Forma e viabilidade conferidas nesta simulação.</small></span></label><button type="button" class="vs-button vs-button-secondary" data-studio="slice" disabled>Fatiar modelo <span aria-hidden="true">↗</span></button><p class="vs-note">A inspeção de camadas é demonstrativa. Tempo de máquina e preço dependem do fatiamento real de cada pedido.</p></section>
          <section class="vs-section vs-agreement"><div class="vs-section-title"><span>03</span><h3>A prévia vira acordo.</h3></div><div class="vs-promise"><span>O prazo reúne</span><strong>fila + produção + frete</strong><p>A cotação de frete e a capacidade de produção são conferidas antes de fechar o SLA.</p></div><label class="vs-check"><input type="checkbox" data-studio="agreement" disabled><span>Prévia, preço e prazo apresentados <small>Na operação, o cliente recebe esses dados antes de pagar.</small></span></label><label class="vs-check"><input type="checkbox" data-studio="approved" disabled><span>Cliente aprovou a prévia <small>Forma, cor, tamanho e nome conferidos.</small></span></label><label class="vs-check"><input type="checkbox" data-studio="payment" disabled><span>Pagamento simulado confirmado <small>Simulação: nenhum valor é cobrado.</small></span></label></section>
        </aside>
      </div>
      <footer class="vs-footer"><div><p class="vs-status" data-studio="status" role="status" aria-live="polite">Abra o modelo para começar.</p><p class="vs-disclaimer">Ambiente demonstrativo · sem upload, cobrança ou conexão com uma impressora real.</p></div><button type="button" class="vs-button vs-button-primary vs-send" data-studio="send" disabled>Enviar à Bambu <span aria-hidden="true">↗</span></button></footer>`;
    document.body.appendChild(dialog);
    q('close').addEventListener('click', close);
    // The presentation behind the modal must not consume its arrows or wheel.
    dialog.addEventListener('keydown', (event) => event.stopPropagation());
    dialog.addEventListener('wheel', (event) => event.stopPropagation(), { passive: true });
    dialog.addEventListener('touchmove', (event) => event.stopPropagation(), { passive: true });
    dialog.addEventListener('close', () => {
      drag = null;
      notify('close');
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    // Escape is deliberately left to the native modal dialog.
    q('load').addEventListener('click', loadModel);
    q('load-main').addEventListener('click', loadModel);
    q('review').addEventListener('change', () => {
      state.reviewed = state.loaded && q('review').checked;
      sent = false;
      if (!state.reviewed) {
        state.sliced = false; state.agreement = false; state.approved = false; state.paymentConfirmed = false; state.layer = 1;
        if (lamp) lamp.setProgress(1);
      }
      update(); notify('review'); requestRender();
      announce(state.reviewed ? 'Revisão simulada concluída. Agora você pode fatiar o modelo.' : 'Revisão desmarcada. O fatiamento e o acordo precisam ser confirmados novamente.');
    });
    q('slice').addEventListener('click', () => {
      if (!state.loaded || !state.reviewed || state.sliced) return;
      state.sliced = true; state.layer = 1;
      state.agreement = false; state.approved = false; state.paymentConfirmed = false; sent = false;
      update(); notify('slice'); requestRender();
      announce('Fatiamento demonstrativo pronto. Explore as camadas e confirme as condições do pedido.');
    });
    q('layers').addEventListener('input', () => {
      if (!state.sliced) return;
      state.layer = Number(q('layers').value) / 100;
      if (lamp) lamp.setProgress(state.layer);
      updateLayer(); notify('layer'); requestRender();
    });
    q('colors').addEventListener('change', (event) => {
      if (!state.loaded || !event.target.matches('input[type="radio"]')) return;
      state.color = event.target.value; state.colorName = event.target.dataset.colorName;
      state.reviewed = false; state.sliced = false; state.layer = 1;
      state.agreement = false; state.approved = false; state.paymentConfirmed = false; sent = false;
      if (lamp) { lamp.setColor(state.color); lamp.setProgress(1); }
      update(); notify('color'); requestRender();
      announce('Cor ' + state.colorName.toLowerCase() + ' selecionada. Revise, fatie e confirme o acordo novamente.');
    });
    q('agreement').addEventListener('change', () => {
      state.agreement = state.sliced && state.reviewed && q('agreement').checked;
      state.approved = false; state.paymentConfirmed = false; sent = false;
      update(); notify('agreement');
      announce(state.agreement ? 'Condições apresentadas. Falta confirmar a aprovação da prévia.' : 'Confirme a prévia, o preço e o prazo para continuar.');
    });
    q('approved').addEventListener('change', () => {
      state.approved = state.agreement && q('approved').checked;
      state.paymentConfirmed = false; sent = false;
      update(); notify('approval');
      announce(state.approved ? 'Prévia aprovada na simulação. Falta confirmar o pagamento.' : 'A aprovação da prévia ainda está pendente.');
    });
    q('payment').addEventListener('change', () => {
      state.paymentConfirmed = state.approved && q('payment').checked; sent = false;
      update(); notify('payment');
      announce(ready() ? 'Acordo confirmado na simulação. Pedido pronto para seguir à Bambu.' : 'Aprovação e pagamento simulados ainda pendentes.');
    });
    q('send').addEventListener('click', () => {
      if (!ready() || sent) return;
      const data = snapshot('send');
      sent = true; data.sent = true;
      update(); notify('send');
      close();
      if (typeof callbacks.onSend === 'function') callbacks.onSend(data);
    });
    q('reset-view').addEventListener('click', () => { yaw = 0.62; pitch = 0.18; distance = 6.25; requestRender(); });
    bindOrbit();
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(q('viewport'));
    } else window.addEventListener('resize', resize);
    update();
  }

  function loadModel() {
    state.loaded = true; sent = false;
    state.reviewed = false; state.sliced = false; state.agreement = false;
    state.approved = false; state.paymentConfirmed = false; state.layer = 1;
    if (!lamp && !graphicsFailed) createGraphics();
    if (lamp) { lamp.setColor(state.color); lamp.setProgress(1); lamp.setLight(state.lit ? 1 : 0); }
    update(); notify('load'); requestRender();
    announce(graphicsFailed ? 'Modelo demonstrativo aberto em modo textual. A revisão e a inspeção de camadas continuam disponíveis.' : 'Modelo demonstrativo aberto. Gire a forma e confirme a revisão humana.');
  }

  function updateLayer() {
    const percent = Math.round(state.layer * 100);
    q('layers').value = percent;
    q('layers').setAttribute('aria-valuetext', percent + ' por cento das camadas visíveis');
    q('layer-output').textContent = percent + '%';
    q('layer-badge').textContent = percent + '% DAS CAMADAS';
    q('fallback-detail').textContent = 'Luminária Vereda · PLA Matte ' + state.colorName + (state.sliced ? ' · corte em ' + percent + '%' : ' · peça completa');
  }
  function update() {
    q('empty').hidden = state.loaded;
    q('canvas').hidden = !state.loaded || graphicsFailed;
    q('canvas').tabIndex = state.loaded && !graphicsFailed ? 0 : -1;
    q('fallback').hidden = !state.loaded || !graphicsFailed;
    q('view-controls').hidden = !state.loaded || graphicsFailed;
    q('filename').textContent = state.loaded ? 'luminaria-vereda.stl' : 'Nenhum modelo aberto';
    q('filetag').textContent = state.sliced ? 'FATIADO · DEMO' : '.STL · DEMO';
    q('load').textContent = state.loaded ? 'Recarregar modelo demonstrativo ↺' : 'Carregar STL demonstrativo';
    q('load').disabled = false;
    q('colors').disabled = !state.loaded;
    q('colors').querySelectorAll('input[type="radio"]').forEach(input => { input.checked = input.value === state.color; });
    q('review').disabled = !state.loaded;
    q('review').checked = state.reviewed;
    q('slice').disabled = !state.loaded || !state.reviewed || state.sliced;
    q('slice').textContent = state.sliced ? 'Fatiamento demonstrativo pronto ✓' : 'Fatiar modelo ↗';
    q('layer-panel').hidden = !state.sliced;
    q('layer-badge').hidden = !state.sliced;
    q('view-label').textContent = state.sliced ? 'INSPEÇÃO / CAMADAS' : 'MODELO / PERSPECTIVA';
    q('agreement').disabled = !state.sliced || !state.reviewed;
    q('agreement').checked = state.agreement;
    q('approved').disabled = !state.agreement;
    q('approved').checked = state.approved;
    q('payment').disabled = !state.approved;
    q('payment').checked = state.paymentConfirmed;
    q('send').disabled = !ready();
    q('send').textContent = sent ? 'Enviado na simulação ✓' : 'Enviar à Bambu ↗';
    q('material').textContent = 'PLA Matte · ' + state.colorName;
    dialog.dataset.loaded = String(state.loaded);
    dialog.dataset.ready = String(ready());
    const step = state.sliced ? 3 : state.loaded ? 2 : 1;
    dialog.querySelectorAll('[data-studio-step]').forEach((item) => {
      const n = Number(item.dataset.studioStep);
      item.classList.toggle('is-current', n === step);
      item.classList.toggle('is-complete', n < step);
      if (n === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    updateLayer();
  }

  function fallback() {
    graphicsFailed = true;
    if (renderer) { renderer.dispose(); renderer = null; }
    update();
  }
  function createGraphics() {
    const THREE = window.THREE;
    if (!THREE || !window.VeredaForms || typeof window.VeredaForms.createLamp !== 'function') { fallback(); return; }
    try {
      renderer = new THREE.WebGLRenderer({ canvas: q('canvas'), antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.localClippingEnabled = true;
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x9c8873, 1.35));
      const key = new THREE.DirectionalLight(0xfff3dd, 2.3); key.position.set(4, 7, 5); scene.add(key);
      const fill = new THREE.DirectionalLight(0xe4edff, 1.1); fill.position.set(-4, 3, -2); scene.add(fill);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(2.45, 64), new THREE.MeshStandardMaterial({ color: 0xe6e5e3, roughness: 1 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.025; scene.add(floor);
      const grid = new THREE.GridHelper(7, 28, 0xb6b1aa, 0xd5d1ca);
      grid.position.y = -0.015;
      grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
      lamp = window.VeredaForms.createLamp({ color: state.color });
      lamp.setProgress(state.layer); lamp.setLight(state.lit ? 1 : 0); scene.add(lamp);
      q('canvas').addEventListener('webglcontextlost', (event) => {
        event.preventDefault(); fallback(); announce('Prévia 3D interrompida. A simulação continua pelos controles.');
      });
      resize();
    } catch (error) {
      console.warn('Vereda Studio: modo textual ativado.', error);
      fallback();
    }
  }
  function resize() {
    if (!renderer || !camera || !dialog.open) return;
    const rect = q('viewport').getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    requestRender();
  }
  function requestRender() {
    if (renderPending || !dialog || !dialog.open || !renderer) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      if (!dialog.open || !renderer || !camera) return;
      // Input-driven view only: no autonomous orbit or idle animation.
      const framedDistance = distance * (camera.aspect < 0.8 ? Math.min(1.5, 0.8 / camera.aspect) : 1);
      camera.position.set(Math.sin(yaw) * Math.cos(pitch) * framedDistance, 1.3 + Math.sin(pitch) * framedDistance, Math.cos(yaw) * Math.cos(pitch) * framedDistance);
      camera.lookAt(0, 1.3, 0);
      renderer.render(scene, camera);
    });
  }
  function bindOrbit() {
    const canvas = q('canvas');
    canvas.addEventListener('pointerdown', (event) => {
      if (!state.loaded || graphicsFailed || (event.pointerType === 'mouse' && event.button !== 0)) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!drag || drag.id !== event.pointerId) return;
      yaw -= (event.clientX - drag.x) * 0.008;
      pitch = clamp(pitch + (event.clientY - drag.y) * 0.006, -0.14, 1.1);
      drag.x = event.clientX; drag.y = event.clientY;
      requestRender();
    });
    const stopDrag = () => { drag = null; canvas.classList.remove('is-dragging'); };
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);
    canvas.addEventListener('lostpointercapture', stopDrag);
    canvas.addEventListener('keydown', (event) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'];
      if (!keys.includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      if (event.key === 'ArrowLeft') yaw -= 0.15;
      if (event.key === 'ArrowRight') yaw += 0.15;
      if (event.key === 'ArrowUp') pitch = clamp(pitch + 0.12, -0.14, 1.1);
      if (event.key === 'ArrowDown') pitch = clamp(pitch - 0.12, -0.14, 1.1);
      if (event.key === '+' || event.key === '=') distance = clamp(distance - 0.35, 4, 9);
      if (event.key === '-') distance = clamp(distance + 0.35, 4, 9);
      if (event.key === 'Home') { yaw = 0.62; pitch = 0.18; distance = 6.25; }
      requestRender();
    });
  }
  function init(options) {
    callbacks = { ...callbacks, ...(options || {}) };
    if (!dialog) build();
    return window.VeredaStudio;
  }
  // A full simulation snapshot is authoritative. Normalize each dependency so a
  // malformed or partial transfer can never unlock production on its own.
  // Silent by default: onChange can relay snapshots between both surfaces
  // without recursive callbacks. Layers retain an explicit unit at the boundary.
  function syncState(source) {
    if (!source || source.simulation !== true) return snapshot('sync-ignored');
    const color = typeof source.color === 'string' ? source.color.toLowerCase() : '';
    const compatible = (!source.projectId || source.projectId === PROJECT_ID) && !!COLORS[color];
    state.loaded = compatible && source.loaded === true;
    if (COLORS[color]) { state.color = color; state.colorName = COLORS[color]; }
    state.reviewed = state.loaded && source.reviewed === true;
    state.sliced = state.reviewed && source.sliced === true;
    state.agreement = state.sliced && source.agreement === true;
    state.approved = state.agreement && (source.approved === true || (source.approved === undefined && source.paymentConfirmed === true));
    state.paymentConfirmed = state.approved && source.paymentConfirmed === true;
    sent = state.paymentConfirmed && source.sent === true;
    let progress = Number(source.layerProgress);
    if (source.layerProgress == null || !Number.isFinite(progress)) {
      progress = Number(source.layer);
      if (source.layerUnit === 'percent' || source.surface === 'desktop' || progress > 1) progress /= 100;
    }
    state.layer = state.sliced && Number.isFinite(progress) ? clamp(progress, 0, 1) : 1;
    state.lit = source.lit === true;
    if (dialog) {
      if (state.loaded && dialog.open && !lamp && !graphicsFailed) createGraphics();
      if (lamp) { lamp.setColor(state.color); lamp.setProgress(state.layer); lamp.setLight(state.lit ? 1 : 0); }
      update(); requestRender();
    }
    return snapshot('sync');
  }
  function open(source) {
    if (!dialog) init();
    if (source && source.simulation === true) syncState(source);
    if (dialog.open) return;
    returnFocus = document.activeElement;
    dialog.showModal();
    if (state.loaded && !lamp && !graphicsFailed) createGraphics();
    if (lamp) { lamp.setColor(state.color); lamp.setProgress(state.layer); lamp.setLight(state.lit ? 1 : 0); }
    update();
    resize(); requestRender(); notify('open');
    announce(sent ? 'Este projeto já foi enviado na simulação. Recarregue-o para iniciar outro ciclo.' : ready() ? 'Projeto e acordo preservados. Pronto para enviar à Bambu.' : state.sliced ? 'Projeto e camadas preservados. Continue a confirmação do acordo.' : state.loaded ? 'Projeto preservado. Continue a revisão e o fatiamento.' : 'Abra o modelo para começar.');
    q('close').focus({ preventScroll: true });
  }
  function close() { if (dialog && dialog.open) dialog.close(); }
  window.VeredaStudio = { init, open, close, syncState, getState: () => snapshot('inspect') };
})();
