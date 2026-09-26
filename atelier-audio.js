/* Original, locally synthesized sound. No recordings, downloads or autoplay. */
(function () {
  'use strict';
  if (window.VeredaAudio) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const voices = new Set(), listeners = [];
  const harmonies = [
    [48, 55, 59, 62, 64], [45, 52, 55, 59, 60],
    [41, 48, 52, 55, 57], [43, 50, 55, 57, 59]
  ];
  const pattern = [0, 2, 1, 3, 2, 4, 1, 3, 0, 2, 4, 3, 1, 2, 3, 4];
  const stepLength = 60 / 64 / 2; // A quiet original arpeggio, 64 beats/minute.
  let context, master, musicBus, keysBus, warmth, delay, feedback, echo;
  let root, musicButton, settingsButton, panel, keysButton, muteButton, volumeInput, volumeText, status;
  let consent = false, music = false, keys = false, keysChosen = false, muted = false, volume = .28;
  let disposed = false, pageHidden = false, scheduler = 0, step = 0, nextNote = 0, revision = 0;
  let lastKey = -Infinity, lastCue = -Infinity, error = '';

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  }
  function hidden() { return document.hidden || pageHidden; }
  function wantsSound() { return consent && !disposed && !hidden() && !muted && volume > 0 && (music || keys); }
  function musicCanRun() { return wantsSound() && music && context && context.state === 'running'; }
  function state() {
    return { music, keys, muted, volume, authorized: consent, available: !!AudioContextClass,
      playing: !!(musicCanRun() && scheduler), suspended: !!context && context.state !== 'running', disposed };
  }
  function render() {
    if (!root) return;
    root.dataset.playing = String(!!(musicCanRun() && scheduler));
    musicButton.setAttribute('aria-pressed', String(music));
    musicButton.setAttribute('aria-label', music ? 'Pausar música' : 'Ativar música');
    musicButton.title = music ? 'Pausar música' : 'Ativar música';
    keysButton.setAttribute('aria-pressed', String(keys));
    keysButton.textContent = keys ? 'Ligados' : 'Desligados';
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.textContent = muted ? 'Reativar som' : 'Silenciar tudo';
    volumeInput.value = String(Math.round(volume * 100));
    volumeText.value = Math.round(volume * 100) + '%';
    volumeText.textContent = volumeText.value;
    status.textContent = error || (!consent ? 'O som começa ao ativar Música.' : muted || !volume ? 'Som silenciado.' : music ? 'Uma trilha suave para criar.' : keys ? 'Música pausada. Sons de interação ligados.' : 'Tudo em silêncio.');
  }
  function ramp(param, value, at, duration) {
    param.cancelScheduledValues(at);
    param.setValueAtTime(param.value, at);
    param.linearRampToValueAtTime(value, at + duration);
  }
  function makeContext() {
    if (context || !consent || !AudioContextClass || disposed) return context;
    context = new AudioContextClass();
    master = context.createGain(); master.gain.value = volume * .32;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -20; limiter.knee.value = 18; limiter.ratio.value = 3;
    limiter.attack.value = .008; limiter.release.value = .25;
    master.connect(limiter); limiter.connect(context.destination);
    musicBus = context.createGain(); musicBus.gain.value = .9;
    keysBus = context.createGain(); keysBus.gain.value = .68; keysBus.connect(master);
    warmth = context.createBiquadFilter(); warmth.type = 'lowpass'; warmth.frequency.value = 1900; warmth.Q.value = .45;
    musicBus.connect(warmth); warmth.connect(master);
    return context;
  }
  function resetEcho(start) {
    if (delay) {
      try { warmth.disconnect(delay); } catch (_) {}
      [delay, feedback, echo].forEach((node) => { try { node.disconnect(); } catch (_) {} });
      delay = feedback = echo = null;
    }
    if (!start || !context) return;
    // A fresh delay also prevents frozen echo buffers from replaying after visibility/mute.
    delay = context.createDelay(.8); delay.delayTime.value = .31;
    feedback = context.createGain(); feedback.gain.value = .16;
    echo = context.createGain(); echo.gain.value = .13;
    warmth.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(echo); echo.connect(master);
  }
  function releaseVoice(voice) {
    if (!voices.delete(voice)) return;
    voice.nodes.forEach((node) => { try { node.disconnect(); } catch (_) {} });
  }
  function stopVoices(kind) {
    for (const voice of [...voices]) {
      if (kind && voice.kind !== kind) continue;
      voice.oscillators.forEach((oscillator) => { try { oscillator.stop(); } catch (_) {} });
      releaseVoice(voice);
    }
  }
  function note(midi, at, duration, strength, kind, pan) {
    if (!context || context.state !== 'running' || !wantsSound()) return;
    if (voices.size > 42) return;
    const envelope = context.createGain(), frequency = 440 * Math.pow(2, (midi - 69) / 12);
    const fundamental = context.createOscillator(), overtone = context.createOscillator(), partial = context.createGain();
    fundamental.type = 'sine'; fundamental.frequency.value = frequency;
    overtone.type = 'triangle'; overtone.frequency.value = frequency * 2; partial.gain.value = .09;
    const bus = kind === 'music' ? musicBus : keysBus;
    const nodes = [fundamental, overtone, partial, envelope];
    fundamental.connect(envelope); overtone.connect(partial); partial.connect(envelope);
    if (context.createStereoPanner) {
      const spatial = context.createStereoPanner(); spatial.pan.value = pan || 0;
      envelope.connect(spatial); spatial.connect(bus); nodes.push(spatial);
    } else envelope.connect(bus);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.001, strength), at + .009);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    const voice = { kind, nodes, oscillators: [fundamental, overtone] };
    voices.add(voice);
    fundamental.onended = () => releaseVoice(voice);
    fundamental.start(at); overtone.start(at);
    fundamental.stop(at + duration + .025); overtone.stop(at + duration + .025);
  }
  function schedule() {
    if (!musicCanRun()) return;
    const now = context.currentTime;
    if (nextNote < now - .25) nextNote = now + .035; // Never replay a backlog after a blocked frame.
    while (nextNote < now + .22) {
      const beat = step % 16, chordIndex = Math.floor(step / 16) % harmonies.length;
      const chord = harmonies[chordIndex], tone = chord[pattern[beat]] + 12;
      if (beat !== 7 && beat !== 15) note(tone, nextNote, 1.65, beat % 4 === 0 ? .19 : .135, 'music', (pattern[beat] - 2) * .13);
      if (beat === 0) {
        note(chord[0], nextNote, 3.1, .11, 'music', -.12);
        note(chord[2] + 12, nextNote + .06, 2.5, .055, 'music', .2);
      }
      if (beat === 10) note(chord[4] + 24, nextNote + .06, 1.7, .045, 'music', .28);
      nextNote += stepLength; step++;
    }
  }
  function stopMusic() {
    if (scheduler) clearInterval(scheduler);
    scheduler = 0; stopVoices('music');
    resetEcho(false);
  }
  async function reconcile() {
    const ownRevision = ++revision;
    if (!wantsSound()) {
      stopMusic(); stopVoices();
      if (context && context.state !== 'closed') { try { await context.suspend(); } catch (_) {} }
      render(); return;
    }
    try {
      makeContext();
      if (!context) { render(); return; }
      // Queue resume even while running: a previous suspend may still be pending.
      await context.resume();
      if (ownRevision !== revision || !wantsSound()) return;
      ramp(master.gain, volume * .32, context.currentTime, .05);
      if (music && context.state === 'running' && !scheduler) {
        resetEcho(true); nextNote = context.currentTime + .045;
        scheduler = setInterval(schedule, 90); schedule();
      } else if (!music) stopMusic();
      if (!keys) stopVoices('keys');
    } catch (_) {
      error = 'Não foi possível iniciar o som. Tente ativar Música novamente.';
      music = false; stopMusic();
    }
    render();
  }
  function setMusic(value) {
    if (disposed || (value && !consent)) return false;
    music = !!value; error = ''; reconcile(); render(); return music;
  }
  function setKeys(value) {
    if (disposed) return false;
    keys = !!value; keysChosen = true; reconcile(); render(); return keys;
  }
  function setMuted(value) { if (!disposed) { muted = !!value; reconcile(); render(); } }
  function setVolume(value) {
    if (disposed || !Number.isFinite(Number(value))) return;
    volume = Math.max(0, Math.min(1, Number(value))); reconcile(); render();
  }
  function authorizeMusic(event) {
    // The sole unlock path is a real click on the visible Music control.
    if (!event.isTrusted || disposed || !AudioContextClass) return;
    if (!consent) { consent = true; if (!keysChosen) keys = true; }
    if (!music) { muted = false; if (!volume) volume = .28; }
    setMusic(!music);
  }
  function play(kind) {
    if (!keys || !wantsSound() || !context || context.state !== 'running') return false;
    kind = typeof kind === 'string' ? kind.toLowerCase() : 'key';
    if (!['key', 'enter', 'open', 'success', 'game'].includes(kind)) return false;
    const now = context.currentTime;
    if (kind === 'key') {
      if (now - lastKey < .045) return false;
      lastKey = now; note(52 + (Math.floor(now * 31) % 3) * 2, now, .048, .115, 'keys', 0);
    } else {
      if (now - lastCue < .085) return false;
      lastCue = now;
      const tones = { enter: [55, 62], open: [60, 64], success: [60, 64, 67], game: [72, 76] }[kind];
      tones.forEach((tone, i) => note(tone, now + i * .065, kind === 'success' ? .6 : .2, .075, 'keys', (i - 1) * .1));
    }
    return true;
  }
  function interaction(event) {
    const detail = event.detail;
    play(typeof detail === 'string' ? detail : detail && (detail.kind || detail.type) || 'key');
  }
  function showPanel(open, focus) {
    panel.hidden = !open; settingsButton.setAttribute('aria-expanded', String(open));
    if (focus) (open ? volumeInput : settingsButton).focus({ preventScroll: true });
  }
  function mount() {
    if (disposed || root) return;
    const host = document.querySelector('[data-vereda-audio-host]') || document.querySelector('.head-actions');
    if (!host) return;
    root = document.createElement('div'); root.className = 'vereda-audio'; root.id = 'vereda-audio';
    root.innerHTML = '<div class="va-buttons"><button type="button" class="va-music" aria-pressed="false" aria-label="Ativar música"><span class="va-bars" aria-hidden="true"><i></i><i></i><i></i></span><span>Música</span></button><button type="button" class="va-settings" aria-expanded="false" aria-controls="vereda-audio-panel" aria-label="Ajustes de áudio" title="Ajustes de áudio"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4v12M10 4v12M16 4v12M2 8h4M8 13h4M14 7h4"/></svg></button></div><section class="va-panel" id="vereda-audio-panel" aria-label="Ajustes de áudio" hidden><div class="va-panel-title"><strong>Som do ateliê</strong><span>Trilha original</span></div><label class="va-volume-label" for="vereda-audio-volume">Volume <output for="vereda-audio-volume">28%</output></label><input id="vereda-audio-volume" type="range" min="0" max="100" step="1" value="28" aria-label="Volume do áudio"><div class="va-key-row"><span>Sons de interação<small>Teclas e pequenos gestos.</small></span><button type="button" class="va-keys" aria-pressed="false" aria-label="Sons de interação">Desligados</button></div><button type="button" class="va-mute" aria-pressed="false">Silenciar tudo</button><p class="va-status" role="status" aria-live="polite"></p></section>';
    host.prepend(root);
    host.closest('.site-head')?.classList.add('has-audio-controls');
    musicButton = root.querySelector('.va-music'); settingsButton = root.querySelector('.va-settings');
    panel = root.querySelector('.va-panel'); keysButton = root.querySelector('.va-keys'); muteButton = root.querySelector('.va-mute');
    volumeInput = root.querySelector('input'); volumeText = root.querySelector('output'); status = root.querySelector('.va-status');
    listen(musicButton, 'click', authorizeMusic);
    listen(settingsButton, 'click', () => showPanel(panel.hidden, false));
    listen(keysButton, 'click', () => setKeys(!keys));
    listen(muteButton, 'click', () => setMuted(!muted));
    listen(volumeInput, 'input', () => setVolume(Number(volumeInput.value) / 100));
    // Isolate sliders, Space, I and N from the presentation's chapter shortcuts.
    listen(root, 'keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); showPanel(false, true); }
    });
    listen(root, 'wheel', (event) => event.stopPropagation(), { passive: true });
    listen(document, 'pointerdown', (event) => { if (!panel.hidden && !root.contains(event.target)) showPanel(false, false); });
    listen(document, 'focusin', (event) => { if (!panel.hidden && !root.contains(event.target)) showPanel(false, false); });
    if (!AudioContextClass) {
      error = 'O áudio não está disponível neste navegador.';
      musicButton.disabled = true; keysButton.disabled = true; muteButton.disabled = true; volumeInput.disabled = true;
    }
    render();
  }
  function dispose() {
    if (disposed) return;
    disposed = true; revision++; stopMusic(); stopVoices();
    listeners.splice(0).forEach((remove) => remove());
    if (context && context.state !== 'closed') context.close().catch(() => {});
    if (root) { root.closest('.site-head')?.classList.remove('has-audio-controls'); root.remove(); root = null; }
  }

  listen(window, 'vereda:key', interaction);
  listen(window, 'vereda:interaction', interaction);
  listen(document, 'visibilitychange', () => { reconcile(); });
  listen(window, 'pagehide', () => { pageHidden = true; reconcile(); });
  listen(window, 'pageshow', () => { pageHidden = false; reconcile(); });
  window.VeredaAudio = { play, setMusic, setKeys, setVolume, setMuted, dispose, getState: state };
  if (document.readyState === 'loading') listen(document, 'DOMContentLoaded', mount, { once: true });
  else mount();
})();
