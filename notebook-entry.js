/* The entry owns only UI and timing. The scene owns the notebook and camera. */
(function (global) {
  'use strict';
  const reduced = global.matchMedia('(prefers-reduced-motion: reduce)');
  const durations = { opening:1100, booting:1100, transition:900 };
  const gated = '#story, .site-foot, .stage-caption, .scene-controls, .scene-hint, .mobile-studio-launch, .site-head [data-index], .site-head #fullscreen';
  const previousAccessibility = new Map();
  const presentCallbacks = new Set();
  let callbacks = {}, ui = null, timer = 0, startedAt = performance.now(), phaseDuration = 0;
  let state = hasDeepLink() ? 'story' : 'closed';
  let readyDelivered = false, presentDelivered = false, built = false;

  function hasDeepLink() {
    let hash = global.location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch (_) { /* Keep the literal hash. */ }
    return !!hash && hash.toLowerCase() !== 'hero';
  }
  function progress() {
    if (!durations[state]) return ['closed','off'].includes(state) ? 0 : 1;
    return phaseDuration ? Math.min(1, Math.max(0, (performance.now()-startedAt)/phaseDuration)) : 1;
  }
  function lidProgress() { return state==='closed' ? 0 : state==='opening' ? progress() : 1; }
  function powerProgress() { return ['closed','opening','off'].includes(state) ? 0 : state==='booting' ? progress() : 1; }
  function transitionProgress() { return state==='story' ? 1 : state==='transition' ? progress() : 0; }
  function snapshot() {
    return { state, progress:progress(), lidProgress:lidProgress(), powerProgress:powerProgress(), transitionProgress:transitionProgress(), reduced:reduced.matches };
  }
  function publish(reason) {
    document.documentElement.dataset.entry = state;
    if (document.body) document.body.dataset.entry = state;
    refresh();
    global.dispatchEvent(new CustomEvent('vereda:entry', { detail:{ ...snapshot(), reason:reason || 'state' } }));
  }
  function gateContent() {
    document.querySelectorAll(gated).forEach(element => {
      if (!previousAccessibility.has(element)) previousAccessibility.set(element, { inert:element.hasAttribute('inert'), aria:element.getAttribute('aria-hidden') });
      const before = previousAccessibility.get(element);
      if (state!=='story') { element.setAttribute('inert',''); element.setAttribute('aria-hidden','true'); }
      else {
        if (!before.inert) element.removeAttribute('inert');
        if (before.aria===null) element.removeAttribute('aria-hidden'); else element.setAttribute('aria-hidden',before.aria);
      }
    });
  }
  function refresh() {
    gateContent();
    if (!ui) return;
    const busy = ['opening','booting','transition'].includes(state);
    ui.hidden = state==='story';
    ui.setAttribute('aria-busy', String(busy));
    ui.dataset.phase = state;ui.querySelector('.ve-entry-intro').setAttribute('aria-hidden',String(state!=='closed'));
    const words = {
      closed:['Abrir notebook','Clique na tampa ou comece por aqui.','01 / O espaço'],
      opening:['Abrindo…','Seu espaço começa a ganhar forma.','01 / O espaço'],
      off:['Ligar notebook','Agora, acenda o computador.','02 / A energia'],
      booting:['Ligando…','Um instante para abrir o ateliê.','02 / A energia'],
      ready:['Ampliar computador','Digite start vereda ou escolha no Terminal.','03 / A escolha'],
      transition:['Entrando…','Da ideia à luz.','A história começa'],
      story:['Continuar','Da ideia à luz.','A história']
    }[state];
    ui.querySelector('[data-entry-label]').textContent = words[0];
    ui.querySelector('[data-entry-status]').textContent = words[1];
    ui.querySelector('[data-entry-step]').textContent = words[2];
    const button = ui.querySelector('[data-entry-action]');
    button.disabled = busy; button.setAttribute('aria-label', words[0]);
    ui.querySelector('[data-entry-skip]').disabled = state==='transition';
  }
  function clearTimer() { if(timer)global.clearTimeout(timer);timer=0; }
  function change(next, reason) {
    if(next==='story'&&state==='transition'&&!reduced.matches){document.body.classList.add('ve-story-arrival');global.setTimeout(()=>document.body.classList.remove('ve-story-arrival'),650);}
    clearTimer();state=next;startedAt=performance.now();phaseDuration=reduced.matches ? 0 : durations[next] || 0;
    publish(reason);
  }
  function afterPhase(expected, next, complete) {
    const finish = () => {
      timer=0;if(state!==expected)return;
      change(next);if(complete)complete();
    };
    if(phaseDuration===0)queueMicrotask(finish); else timer=global.setTimeout(finish,phaseDuration);
  }
  function announceReady() {
    if(readyDelivered || typeof callbacks.onReady!=='function')return;
    readyDelivered=true;callbacks.onReady(snapshot());
  }
  function announcePresent() {
    if(!presentDelivered && typeof callbacks.onPresent==='function'){
      presentDelivered=true;callbacks.onPresent(snapshot());
    }
    const pending=Array.from(presentCallbacks);presentCallbacks.clear();pending.forEach(fn=>fn(snapshot()));
  }
  function open() {
    ensureUI();if(state!=='closed')return api;
    change('opening','open');afterPhase('opening','off');return api;
  }
  function power() {
    ensureUI();if(state!=='off')return api;
    change('booting','power');afterPhase('booting','ready',announceReady);return api;
  }
  function present(callback) {
    if(typeof callback==='function')presentCallbacks.add(callback);
    if(state==='story'){const pending=Array.from(presentCallbacks);presentCallbacks.clear();pending.forEach(fn=>fn(snapshot()));return api;}
    if(state==='transition')return api;
    if(state!=='ready'){if(typeof callback==='function')presentCallbacks.delete(callback);return api;}
    global.VeredaDesktop?.collapse();
    change('transition','present');afterPhase('transition','story',announcePresent);return api;
  }
  function skip() {
    if(state==='story')return api;
    global.VeredaDesktop?.collapse();change('story','skip');announcePresent();return api;
  }
  function ensureUI() {
    if(!document.body || built)return;
    built=true;
    ui=document.createElement('section');ui.id='notebook-entry';
    ui.setAttribute('aria-labelledby','notebook-entry-title');
    ui.innerHTML='<div class="ve-entry-intro"><p>Vereda · Da ideia à luz</p><h1 id="notebook-entry-title">Um ateliê. Muitas possibilidades.</h1></div>'+
      '<div class="ve-entry-controls"><span class="ve-entry-step" data-entry-step></span><button type="button" class="ve-entry-action" data-entry-action><span data-entry-label>Abrir notebook</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h15m-6-7 7 7-7 7"/></svg></button><p data-entry-status role="status" aria-live="polite" aria-atomic="true"></p><button type="button" class="ve-entry-skip" data-entry-skip>Ir direto à apresentação</button></div>'+
      '<div class="ve-entry-wash" aria-hidden="true"></div>';
    document.body.appendChild(ui);
    ui.querySelector('[data-entry-action]').addEventListener('click',()=>{
      if(state==='closed')open();else if(state==='off')power();else if(state==='ready'){
        if(global.VeredaDesktop)global.VeredaDesktop.expand();
        else ui.querySelector('[data-entry-status]').textContent='O computador está pronto. Você também pode seguir direto à apresentação.';
      }
    });
    ui.querySelector('[data-entry-skip]').addEventListener('click',skip);
    // The entry buttons must not also activate presentation keyboard shortcuts.
    ['keydown','keyup','click','pointerdown','pointerup'].forEach(type=>ui.addEventListener(type,event=>event.stopPropagation()));
    if(state!=='story')global.scrollTo(0,0);
    publish('mounted');
  }
  const api = {
    init(options){callbacks={...callbacks,...(options||{})};ensureUI();if(state==='ready')announceReady();return api;},
    open,power,present,skip,
    getState(){return state;},getProgress:progress,snapshot,
    get state(){return state;},get progress(){return progress();},
    get lidProgress(){return lidProgress();},get powerProgress(){return powerProgress();},get transitionProgress(){return transitionProgress();}
  };
  global.VeredaEntry=api;
  document.documentElement.dataset.entry=state;
  if(document.body)ensureUI();else document.addEventListener('DOMContentLoaded',ensureUI,{once:true});
  global.addEventListener('hashchange',()=>{
    if(state!=='story'&&hasDeepLink()){
      global.VeredaDesktop?.collapse();change('story','deep-link');
      // Preserve the linked chapter: do not run the normal presentation-start callback.
    }
  });
  reduced.addEventListener('change',()=>{
    if(!reduced.matches)return;
    if(state==='opening')change('off','reduced-motion');
    else if(state==='booting'){change('ready','reduced-motion');announceReady();}
    else if(state==='transition'){change('story','reduced-motion');announcePresent();}
  });
})(window);
