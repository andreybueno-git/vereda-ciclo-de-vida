/* The page welcome precedes the notebook. It never opens or powers it. */
(function(global){
  'use strict';
  const root=document.getElementById('page-loader');
  if(!root){document.documentElement.classList.remove('page-loading');return;}
  const reduced=global.matchMedia('(prefers-reduced-motion: reduce)'),removers=[];
  const started=performance.now(),minimum=2400,maximum=8000;
  let done=false,leaving=false,minTimer=0,exitTimer=0,maxTimer=0;
  let domReady=document.readyState!=='loading',sceneReady=false,fontsReady=!document.fonts;
  const status=root.querySelector('[data-loader-status]');
  function listen(target,type,fn,options){target.addEventListener(type,fn,options);removers.push(()=>target.removeEventListener(type,fn,options));}
  function clean(){
    [minTimer,exitTimer,maxTimer,global.__veredaPageLoadFallback].forEach(timer=>global.clearTimeout(timer));
    removers.splice(0).forEach(remove=>remove());
  }
  function release(reason){
    if(done)return;done=true;clean();
    if(root.open&&typeof root.close==='function')root.close();
    root.remove();document.documentElement.classList.remove('page-loading');
    const entry=document.querySelector('#notebook-entry:not([hidden]) [data-entry-action]');
    const target=entry||document.querySelector('#story');
    if(target&&!document.hidden)target.focus({preventScroll:true});
    global.dispatchEvent(new CustomEvent('vereda:preload-end',{detail:{reason}}));
  }
  function dismiss(reason){
    if(done)return;
    if(reduced.matches||['skip','escape','closed','timeout'].includes(reason)){release(reason);return;}
    if(leaving)return;leaving=true;
    global.clearTimeout(minTimer);
    document.documentElement.classList.remove('page-loading');
    root.classList.add('vl-leaving');
    exitTimer=global.setTimeout(()=>release(reason),420);
  }
  function inspectScene(){
    const body=document.body;
    sceneReady=sceneReady||['loaded','fallback'].includes(body.dataset.assets)||body.classList.contains('no-webgl');
    if(domReady&&!global.VeredaScene)sceneReady=true;
  }
  function maybeFinish(){
    if(done||leaving)return;
    inspectScene();
    if(!domReady||!sceneReady||!fontsReady)return;
    const remaining=reduced.matches?0:minimum-(performance.now()-started);
    global.clearTimeout(minTimer);
    if(remaining>0)minTimer=global.setTimeout(maybeFinish,remaining);
    else dismiss('ready');
  }
  listen(global,'vereda:asset',event=>{
    if(event.detail?.name!=='scene'||!['loaded','error'].includes(event.detail.status))return;
    sceneReady=true;maybeFinish();
  });
  listen(root.querySelector('[data-loader-skip]'),'click',()=>dismiss('skip'));
  listen(root,'cancel',event=>{event.preventDefault();dismiss('escape');});
  listen(root,'close',()=>release('closed'));
  // Notebook and presentation shortcuts must not receive welcome-screen input.
  ['keydown','keyup','click','pointerdown','pointerup','wheel','touchmove'].forEach(type=>listen(root,type,event=>event.stopPropagation(),{passive:type==='wheel'||type==='touchmove'}));
  listen(document,'DOMContentLoaded',()=>{domReady=true;maybeFinish();},{once:true});
  listen(document,'visibilitychange',()=>root.classList.toggle('vl-is-paused',document.hidden));
  listen(reduced,'change',maybeFinish);
  listen(global,'vereda:preload-timeout',()=>release('watchdog'));
  // Convert the initial non-modal HTML fallback into a native modal without
  // changing any inert/aria-hidden state owned by notebook-entry.js.
  if(typeof root.showModal==='function'){
    root.removeAttribute('open');
    try{root.showModal();}catch(error){root.setAttribute('open','');}
  }
  root.classList.toggle('vl-is-paused',document.hidden);
  if(status)status.textContent='Preparando o ateliê…';
  if(document.fonts)document.fonts.ready.then(()=>{fontsReady=true;maybeFinish();},()=>{fontsReady=true;maybeFinish();});
  maxTimer=global.setTimeout(()=>dismiss('timeout'),maximum);
  global.VeredaPageLoader={dismiss:()=>dismiss('skip'),dispose:()=>release('disposed')};
  maybeFinish();
})(window);
