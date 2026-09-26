/* Palavra: local word game. No network, timers, or global keyboard capture. */
(function(global){
  'use strict';
  const mounted=new WeakMap(),SAVE_KEY='vereda.palavra.round.v1';
  const ROWS=6,COLUMNS=5,labels={correct:'posição certa',present:'outro lugar',absent:'não aparece'},symbols={correct:'●',present:'◆',absent:'—'};
  let instance=0;
  function normalizeWord(value){return String(value==null?'':value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();}
  function gradeGuess(answer,guess){
    answer=normalizeWord(answer);guess=normalizeWord(guess);
    if(!/^[A-Z]{5}$/.test(answer)||!/^[A-Z]{5}$/.test(guess))throw new RangeError('A word must contain five letters.');
    const marks=Array(COLUMNS).fill('absent'),remaining=Object.create(null);
    for(let i=0;i<COLUMNS;i++){if(answer[i]===guess[i])marks[i]='correct';else remaining[answer[i]]=(remaining[answer[i]]||0)+1;}
    for(let i=0;i<COLUMNS;i++)if(marks[i]!=='correct'&&remaining[guess[i]]>0){marks[i]='present';remaining[guess[i]]--;}
    return marks;
  }
  function evaluateGuess(answer,guess,previous,allowed){
    const history=Array.isArray(previous)?previous.slice():[];guess=normalizeWord(guess);answer=normalizeWord(answer);
    if(history.length>=ROWS||history.includes(answer))return {accepted:false,reason:'finished'};
    if(!/^[A-Z]{5}$/.test(guess))return {accepted:false,reason:'incomplete'};
    if(!allowed||!allowed.has(guess))return {accepted:false,reason:'unknown'};
    const guesses=history.concat(guess),grade=gradeGuess(answer,guess);
    return {accepted:true,guess,guesses,grade,status:guess===answer?'won':guesses.length===ROWS?'lost':'playing'};
  }
  function dictionary(data){
    const valid=list=>Array.isArray(list)?list.map(normalizeWord).filter(w=>/^[A-Z]{5}$/.test(w)):[];
    const answers=[...new Set(valid(data&&data.answers))],allowed=new Set(valid(data&&data.allowed));answers.forEach(w=>allowed.add(w));return {answers,allowed};
  }
  function restoreRound(raw,words){
    if(!raw||raw.version!==1||!words.answers.includes(raw.answer)||!Array.isArray(raw.guesses)||raw.guesses.length>ROWS)return null;
    if(raw.guesses.some((word,i)=>!/^[A-Z]{5}$/.test(word)||!words.allowed.has(word)||(word===raw.answer&&i!==raw.guesses.length-1)))return null;
    if(typeof raw.current!=='string'||!/^[A-Z]{0,5}$/.test(raw.current))return null;
    const status=raw.guesses.includes(raw.answer)?'won':raw.guesses.length===ROWS?'lost':'playing';
    return {answer:raw.answer,guesses:raw.guesses.slice(),current:status==='playing'?raw.current:'',status};
  }
  function pickAnswer(answers,previous){
    const choices=answers.filter(w=>w!==previous);if(!choices.length)return null;
    let random=Math.random();try{if(global.crypto&&global.crypto.getRandomValues){const bytes=new Uint32Array(1);global.crypto.getRandomValues(bytes);random=bytes[0]/4294967296;}}catch(error){}
    return choices[Math.floor(random*choices.length)];
  }
  function create(host){
    if(!host||typeof host.appendChild!=='function')throw new TypeError('VeredaWordGame.create needs a host element.');
    if(mounted.has(host))return mounted.get(host);
    const words=dictionary(global.VEREDA_WORDS),available=words.answers.length>1,removers=[];let visible=true,disposed=false;
    let round=null;try{round=restoreRound(JSON.parse(global.localStorage.getItem(SAVE_KEY)),words);}catch(error){}
    if(!round&&available)round={answer:pickAnswer(words.answers),guesses:[],current:'',status:'playing'};
    const root=document.createElement('section');root.className='vd-words';root.tabIndex=0;root.setAttribute('aria-label','Palavra. Descubra uma palavra de cinco letras em seis tentativas.');
    const helpId='vd-words-help-'+(++instance);root.setAttribute('aria-describedby',helpId);
    root.innerHTML='<div class="vd-words-board-panel"><div class="vd-words-board-head"><span>PALAVRA / PT-BR</span><span class="vd-words-count"></span></div><div class="vd-words-board" role="group" aria-label="Seis tentativas de cinco letras"></div><p class="vd-words-message" aria-hidden="true"></p></div>'+
      '<div class="vd-words-controls"><div class="vd-words-info"><p class="vd-words-eyebrow">Caderno de palavras</p><h3>Uma letra muda<br>o caminho.</h3><p class="vd-words-intro" id="'+helpId+'">Acerte a palavra de 5 letras.<br>Você tem 6 tentativas.</p><div class="vd-words-legend" aria-label="Legenda das pistas"><span><b data-grade="correct" aria-hidden="true">●</b>Posição certa</span><span><b data-grade="present" aria-hidden="true">◆</b>Outro lugar</span><span><b data-grade="absent" aria-hidden="true">—</b>Não aparece</span></div><details class="vd-words-help"><summary>Como jogar <span aria-hidden="true">+</span></summary><div><p>Digite uma palavra de cinco letras e pressione <strong>Enter</strong>. Se ela não estiver na lista, você pode corrigir sem perder uma tentativa.</p><p>As pistas mostram onde cada letra aparece. Uma letra repetida só recebe uma pista para cada vez que existe na resposta.</p><p>Acentos e cedilha viram letras simples: <strong>Á → A, Ç → C</strong>. Use seu teclado ou toque nas letras abaixo.</p><p>Após a sexta tentativa, a palavra é revelada. <strong>Nova palavra</strong> inicia outra rodada, sem limite.</p></div></details></div><div class="vd-words-keyboard" role="group" aria-label="Teclado de Palavra"></div><div class="vd-words-actions"><span class="vd-words-round-label">Jogue no seu ritmo.</span><button class="vd-words-new" type="button">Nova palavra <span aria-hidden="true">↻</span></button></div></div><p class="vd-words-announcer" role="status" aria-live="polite" aria-atomic="true"></p>';
    host.appendChild(root);
    const q=s=>root.querySelector(s),board=q('.vd-words-board'),keyboard=q('.vd-words-keyboard'),message=q('.vd-words-message'),live=q('.vd-words-announcer'),count=q('.vd-words-count'),newButton=q('.vd-words-new');
    const rows=[],cells=[],keyButtons=new Map();
    for(let r=0;r<ROWS;r++){
      const row=document.createElement('div');row.className='vd-words-row';row.setAttribute('role','group');row.setAttribute('aria-label','Tentativa '+(r+1));board.appendChild(row);rows.push(row);
      const line=[];for(let c=0;c<COLUMNS;c++){const cell=document.createElement('span');cell.className='vd-words-tile';cell.setAttribute('role','img');cell.innerHTML='<span class="vd-words-letter" aria-hidden="true"></span><small class="vd-words-mark" aria-hidden="true"></small>';row.appendChild(cell);line.push(cell);}cells.push(line);
    }
    const layouts=['QWERTYUIOP'.split(''),'ASDFGHJKL'.split(''),['Enter',...'ZXCVBNM'.split(''),'Backspace']];
    layouts.forEach((layout,r)=>{
      const row=document.createElement('div');row.className='vd-words-key-row';row.dataset.row=String(r);keyboard.appendChild(row);
      layout.forEach(key=>{const b=document.createElement('button');b.type='button';b.className='vd-words-key';b.dataset.wordKey=key;
        if(key==='Enter'||key==='Backspace')b.classList.add('vd-words-key-action');
        b.innerHTML=key==='Enter'?'<span>Enter</span>':key==='Backspace'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5-6 7 6 7h12V5ZM12 9l6 6m0-6-6 6"/></svg>':'<span>'+key+'</span><small aria-hidden="true"></small>';
        b.setAttribute('aria-label',key==='Backspace'?'Apagar última letra':key==='Enter'?'Confirmar palavra':key);row.appendChild(b);keyButtons.set(key,b);
      });
    });
    function listen(el,type,fn){el.addEventListener(type,fn);removers.push(()=>el.removeEventListener(type,fn));}
    function emit(kind,extra){global.dispatchEvent(new CustomEvent('vereda:interaction',{detail:Object.assign({kind,app:'palavra',surface:'desktop'},extra)}));}
    function persist(){if(!round)return;try{global.localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,answer:round.answer,guesses:round.guesses,current:round.current}));}catch(error){}}
    function tell(text,announcement){message.textContent=text;live.textContent=announcement||text;}
    function render(){
      const active=!!round&&round.status==='playing',guesses=round?round.guesses:[],current=round?round.current:'',keyboardGrades=Object.create(null),rank={absent:1,present:2,correct:3};
      for(let r=0;r<ROWS;r++){
        const word=guesses[r]||(active&&r===guesses.length?current:''),marks=guesses[r]?gradeGuess(round.answer,guesses[r]):null;
        rows[r].classList.toggle('vd-words-current',active&&r===guesses.length);
        rows[r].setAttribute('aria-label','Tentativa '+(r+1)+(guesses[r]?': '+guesses[r]:' — '+(active&&r===guesses.length?'em andamento':'vazia')));
        for(let c=0;c<COLUMNS;c++){
          const cell=cells[r][c],letter=word[c]||'',grade=marks?marks[c]:'';
          cell.querySelector('.vd-words-letter').textContent=letter;cell.querySelector('.vd-words-mark').textContent=grade?symbols[grade]:'';cell.dataset.grade=grade;
          cell.classList.toggle('vd-words-filled',!!letter);cell.classList.toggle('vd-words-cursor',active&&r===guesses.length&&c===Math.min(current.length,4));
          cell.setAttribute('aria-label','Letra '+(c+1)+': '+(letter?letter+(grade?', '+labels[grade]:''):'vazia'));
          if(grade&&(!keyboardGrades[letter]||rank[grade]>rank[keyboardGrades[letter]]))keyboardGrades[letter]=grade;
        }
      }
      keyButtons.forEach((button,key)=>{
        const grade=keyboardGrades[key]||'';button.dataset.grade=grade;button.disabled=!active;
        if(key.length===1){button.querySelector('small').textContent=grade?symbols[grade]:'';button.setAttribute('aria-label',key+(grade?', '+labels[grade]:''));}
      });
      root.dataset.state=round?round.status:'unavailable';count.textContent=round?(round.status==='playing'?'Tentativa '+(guesses.length+1)+' / 6':guesses.length+' / 6'):'—';newButton.disabled=!available;
      q('.vd-words-round-label').textContent=round&&round.status!=='playing'?'Outra palavra espera.':'Jogue no seu ritmo.';
    }
    function focus(){if(!disposed&&visible)root.focus({preventScroll:true});}
    function typeKey(key){
      if(disposed||!visible||!round||typeof key!=='string')return false;
      const letter=normalizeWord(key),isLetter=Array.from(key).length===1&&/^[A-Z]$/.test(letter),erase=key==='Backspace'||key==='Delete',enter=key==='Enter';
      if(!isLetter&&!erase&&!enter)return false;
      if(round.status!=='playing')return true;
      root.classList.remove('vd-words-invalid');
      if(isLetter){if(round.current.length>=COLUMNS)return true;round.current+=letter;emit('key',{key:letter});tell(round.current.length===5?'Pressione Enter para tentar.':'Digite uma palavra de 5 letras.');}
      else if(erase){if(!round.current.length)return true;round.current=round.current.slice(0,-1);emit('key',{key:'Backspace'});tell('Digite uma palavra de 5 letras.');}
      else{
        const evaluated=evaluateGuess(round.answer,round.current,round.guesses,words.allowed);emit('enter',{key:'Enter'});
        if(!evaluated.accepted){root.classList.add('vd-words-invalid');tell(evaluated.reason==='incomplete'?'Complete as 5 letras antes de tentar.':'“'+round.current+'” não está na lista. Tente outra palavra.');return true;}
        round.guesses=evaluated.guesses;round.current='';round.status=evaluated.status;
        if(round.status==='won'){tell('Você acertou: '+round.answer+'!','Você acertou '+round.answer+' em '+round.guesses.length+' tentativa'+(round.guesses.length===1?'':'s')+'. Use Nova palavra para jogar de novo.');emit('success',{action:'words-win',attempts:round.guesses.length});}
        else if(round.status==='lost'){tell('A palavra era '+round.answer+'.','As seis tentativas terminaram. A palavra era '+round.answer+'. Use Nova palavra para tentar outra.');emit('game',{action:'words-loss'});}
        else{const detail=evaluated.guess.split('').map((l,i)=>l+' na posição '+(i+1)+': '+labels[evaluated.grade[i]]).join('; ');tell('Observe as pistas e tente outra palavra.','Tentativa '+round.guesses.length+'. '+detail+'.');}
      }
      persist();render();return true;
    }
    function newRound(){
      if(disposed||!available)return;const answer=pickAnswer(words.answers,round&&round.answer);if(!answer)return;
      round={answer,guesses:[],current:'',status:'playing'};root.classList.remove('vd-words-invalid');persist();render();tell('Nova palavra. Digite suas 5 letras.');emit('open',{action:'words-new'});focus();
    }
    listen(root,'keydown',event=>{
      if(!visible||event.metaKey||event.ctrlKey||event.altKey||event.isComposing)return;
      // Let native buttons, details, Escape and Tab retain their normal behavior.
      if(event.key==='Enter'&&event.target.closest('button,summary'))return;
      if(event.repeat&&event.key==='Enter'){event.preventDefault();return;}
      if(typeKey(event.key)){event.preventDefault();event.stopPropagation();}
    });
    listen(root,'compositionend',event=>{if(!visible)return;for(const letter of normalizeWord(event.data||''))typeKey(letter);});
    listen(keyboard,'click',event=>{const button=event.target.closest('button[data-word-key]');if(!button||button.disabled)return;typeKey(button.dataset.wordKey);focus();});
    listen(newButton,'click',newRound);
    render();
    if(!round)tell('A lista de palavras não está disponível. Reabra o jogo.');
    else if(round.status==='won')tell('Você acertou: '+round.answer+'!');
    else if(round.status==='lost')tell('A palavra era '+round.answer+'.');
    else tell(round.current.length===5?'Pressione Enter para tentar.':'Digite uma palavra de 5 letras.');
    persist();
    const api={typeKey,setVisible(value){if(disposed)return;visible=!!value;root.hidden=!visible;if('inert' in root)root.inert=!visible;if(!visible&&root.contains(document.activeElement))document.activeElement.blur();},focus,
      getState(){return {visible:visible&&!disposed,status:round?round.status:'unavailable',current:round?round.current:'',guesses:round?round.guesses.slice():[],grades:round?round.guesses.map(g=>gradeGuess(round.answer,g)):[],answer:round&&round.status!=='playing'?round.answer:null,message:message.textContent};},
      dispose(){if(disposed)return;persist();disposed=true;removers.forEach(remove=>remove());root.remove();mounted.delete(host);}
    };
    mounted.set(host,api);return api;
  }
  global.VeredaWordGame={create,gradeGuess,evaluateGuess,normalizeWord};
})(window);
