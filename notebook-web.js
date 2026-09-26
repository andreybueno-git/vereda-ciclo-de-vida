/* A real web launcher. All destinations open outside the simulated desktop. */
(function(global){
  'use strict';
  const mounted=new WeakMap();
  const icons={home:'<path d="m3 10 9-7 9 7v10H3zM9 20v-7h6v7"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',external:'<path d="M14 3h7v7m0-7L10 14M10 5H4v15h15v-6"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',shop:'<path d="M4 9h16v12H4zM3 9l2-6h14l2 6M8 21v-7h8v7M3 9c0 4 5 4 5 0 0 4 8 4 8 0 0 4 5 4 5 0"/>'};
  const svg=name=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
  function safeURL(value){
    let url;try{url=new URL(value);}catch(error){return null;}
    return /^(http:|https:)$/.test(url.protocol)&&url.hostname&&!url.username&&!url.password?url:null;
  }
  function destination(value){
    const query=String(value==null?'':value).trim();
    if(!query)return {error:'Digite uma pesquisa ou um endereço.'};
    if(query.length>2048)return {error:'Use uma pesquisa ou um endereço mais curto.'};
    if(/[\u0000-\u001f\u007f]/.test(query))return {error:'Confira o endereço e tente novamente.'};
    const search=()=>({url:'https://www.google.com/search?q='+encodeURIComponent(query),label:'Google',kind:'search',query});
    // Search operators are query syntax, not URL protocols.
    if(/^-?(?:site|filetype|intitle|inurl|after|before):/i.test(query))return search();
    // Bare loopback addresses use HTTP; explicit http(s) URLs retain their scheme.
    if(/^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:[/?#].*)?$/i.test(query)){
      const local=safeURL('http://'+query);
      return local?{url:local.href,label:local.hostname,kind:'address',query}:{error:'Confira o endereço local e tente novamente.'};
    }
    const hasScheme=/^[a-z][a-z\d+.-]*:/i.test(query);
    const looksLikeAddress=/^(?:www\.|localhost(?::\d+)?(?:[/?#]|$))/i.test(query)||(!/\s/.test(query)&&/^[^/?#]+\.[^/?#]+(?:[/?#].*)?$/.test(query));
    if(hasScheme||looksLikeAddress||query.startsWith('//')){
      const url=safeURL(hasScheme?query:'https://'+query.replace(/^\/\//,''));
      if(!url)return {error:'Use um endereço http ou https, sem usuário ou senha.'};
      return {url:url.href,label:url.hostname.replace(/^www\./,''),kind:'address',query};
    }
    return search();
  }
  function create(host,options={}){
    if(!host||typeof host.appendChild!=='function')throw new TypeError('VeredaWeb.create needs a host element.');
    if(mounted.has(host))return mounted.get(host);
    const store=safeURL(options.storeUrl||''),listeners=[];
    let visible=true,disposed=false,view='home',lastTarget=null;
    const root=document.createElement('section');root.className='vd-web';root.setAttribute('aria-label','Internet');
    root.innerHTML='<form class="vd-web-toolbar" role="search"><button class="vd-web-home" type="button" aria-label="Página inicial">'+svg('home')+'</button><label class="vd-web-address"><span class="vd-web-sr">Pesquisar na web ou digitar um endereço</span>'+svg('globe')+'<input class="vd-web-input" type="text" name="q" maxlength="2048" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="Pesquisar na web ou digitar um endereço"></label><button class="vd-web-go" type="submit">Ir '+svg('arrow')+'</button></form>'+
      '<nav class="vd-web-favorites" aria-label="Favoritos"><button class="vd-web-store" type="button">'+svg('shop')+'<span>Loja Vereda</span><span class="vd-web-favorite-mark" aria-hidden="true">✦</span></button><a class="vd-web-external" target="_blank" rel="noopener noreferrer" hidden>Abrir em nova aba '+svg('external')+'</a></nav>'+
      '<div class="vd-web-page"><div class="vd-web-homepage"><div class="vd-web-heading"><span class="vd-web-kicker">INTERNET / VEREDA</span><h3>Ideias encontram caminhos.</h3><p>Pesquise no Google ou visite a loja publicada.</p></div><button class="vd-web-store-card" type="button"><span class="vd-web-card-icon">'+svg('shop')+'</span><span class="vd-web-card-copy"><span class="vd-web-card-label">Loja publicada</span><strong class="vd-web-domain"></strong><span class="vd-web-card-note">A loja abre em uma nova aba.</span></span><span class="vd-web-card-visit">Visitar a loja '+svg('external')+'</span></button></div>'+
      '<div class="vd-web-result" hidden><span class="vd-web-result-icon">'+svg('globe')+'</span><span class="vd-web-kicker vd-web-result-kicker"></span><h3 class="vd-web-result-title"></h3><p class="vd-web-result-copy"></p><a class="vd-web-result-link" target="_blank" rel="noopener noreferrer">Continuar em nova aba '+svg('external')+'</a><button class="vd-web-back" type="button">Voltar ao início</button></div></div><p class="vd-web-status" role="status" aria-live="polite"></p>';
    host.appendChild(root);
    const q=s=>root.querySelector(s),form=q('form'),input=q('input'),home=q('.vd-web-homepage'),result=q('.vd-web-result'),status=q('.vd-web-status'),external=q('.vd-web-external');
    const storeButtons=[q('.vd-web-store'),q('.vd-web-store-card')];
    q('.vd-web-domain').textContent=store?store.hostname.replace(/^www\./,''):'Endereço não configurado';
    if(!store){storeButtons.forEach(b=>b.disabled=true);q('.vd-web-card-note').textContent='O atalho da loja ficará disponível quando houver um endereço.';q('.vd-web-card-visit').hidden=true;}
    function listen(el,type,fn){el.addEventListener(type,fn);listeners.push(()=>el.removeEventListener(type,fn));}
    function focus(){if(!disposed&&visible)input.focus({preventScroll:true});}
    function clearError(){input.removeAttribute('aria-invalid');root.classList.remove('vd-web-has-error');status.textContent='';}
    function showHome(){if(disposed)return;view='home';home.hidden=false;result.hidden=true;clearError();focus();}
    function prepare(target,kind){
      lastTarget=target;view=kind||target.kind;home.hidden=true;result.hidden=false;clearError();
      external.href=target.url;external.hidden=false;q('.vd-web-result-link').href=target.url;
      q('.vd-web-result-kicker').textContent=view==='store'?'LOJA PUBLICADA':target.kind==='search'?'PESQUISA NO GOOGLE':'ENDEREÇO DA WEB';
      q('.vd-web-result-title').textContent=view==='store'?'Visite a Vereda.':target.kind==='search'?target.query:target.label;
      q('.vd-web-result-copy').textContent=view==='store'?'A loja abre em uma nova aba.':target.kind==='search'?'Os resultados abrem no Google, em uma nova aba.':'Este site abre em uma nova aba.';
      q('.vd-web-result-link').firstChild.nodeValue=view==='store'?'Visitar a loja ':target.kind==='search'?'Abrir no Google ':'Abrir o site ';
      status.textContent='Se a nova aba não aparecer, use o link acima.';
    }
    function launch(target,kind){prepare(target,kind);global.open(target.url,'_blank','noopener,noreferrer');return true;}
    function navigate(value){
      if(disposed)return false;input.value=String(value==null?'':value);
      const target=destination(input.value);
      if(target.error){input.setAttribute('aria-invalid','true');root.classList.add('vd-web-has-error');status.textContent=target.error;focus();return false;}
      return launch(target);
    }
    function visitStore(){if(disposed||!store)return false;input.value=store.href;return launch({url:store.href,label:store.hostname,kind:'address',query:store.href},'store');}
    function typeKey(key){
      if(disposed||!visible||typeof key!=='string')return false;
      if(key==='Space'||key==='Spacebar')key=' ';
      const accepted=['Enter','Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(key)||Array.from(key).length===1;
      if(!accepted)return false;focus();
      if(key==='Enter'){if(form.requestSubmit)form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return true;}
      const start=input.selectionStart==null?input.value.length:input.selectionStart,end=input.selectionEnd==null?start:input.selectionEnd;
      const prev=i=>Math.max(0,i-(i>1&&/[\uDC00-\uDFFF]/.test(input.value[i-1])?2:1));
      const next=i=>Math.min(input.value.length,i+(input.value.codePointAt(i)>0xffff?2:1));
      if(key==='Backspace')input.setRangeText('',start===end?prev(start):start,end,'end');
      else if(key==='Delete')input.setRangeText('',start,start===end?next(end):end,'end');
      else if(key==='ArrowLeft'||key==='ArrowRight'){const pos=key==='ArrowLeft'?(start===end?prev(start):start):(start===end?next(end):end);input.setSelectionRange(pos,pos);return true;}
      else if(key==='Home'||key==='ArrowUp'){input.setSelectionRange(0,0);return true;}
      else if(key==='End'||key==='ArrowDown'){input.setSelectionRange(input.value.length,input.value.length);return true;}
      else if(input.value.length-(end-start)+key.length<=2048)input.setRangeText(key,start,end,'end');
      input.dispatchEvent(new Event('input',{bubbles:true}));return true;
    }
    listen(form,'submit',e=>{e.preventDefault();navigate(input.value);});listen(input,'input',clearError);
    listen(input,'keydown',e=>{if(!e.isComposing&&!e.repeat)global.dispatchEvent(new CustomEvent('vereda:interaction',{detail:{kind:e.key==='Enter'?'enter':'key',key:e.key,app:'internet',surface:'desktop'}}));});
    listen(q('.vd-web-home'),'click',showHome);listen(q('.vd-web-back'),'click',showHome);storeButtons.forEach(b=>listen(b,'click',visitStore));
    const api={focus,typeKey,navigate,visitStore,
      setVisible(value){if(disposed)return;visible=!!value;root.hidden=!visible;if(!visible&&root.contains(document.activeElement))document.activeElement.blur();},
      getState(){return {mounted:!disposed,visible:visible&&!disposed,view,input:input.value,url:lastTarget?lastTarget.url:null,storeUrl:store?store.href:null,embedded:false};},
      dispose(){if(disposed)return;disposed=true;listeners.forEach(remove=>remove());root.remove();mounted.delete(host);}
    };
    mounted.set(host,api);return api;
  }
  global.VeredaWeb={create};
})(window);
