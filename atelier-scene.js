(function(){
  'use strict';
  if(!window.THREE || !window.VeredaForms) {document.body.classList.add('no-webgl');window.dispatchEvent(new CustomEvent('vereda:asset',{detail:{name:'scene',status:'error'}}));return;}
  const T=THREE, canvas=document.querySelector('#atelier-canvas');
  let renderer;
  try { renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'}); } catch(e){document.body.classList.add('no-webgl');window.dispatchEvent(new CustomEvent('vereda:asset',{detail:{name:'scene',status:'error'}}));return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(), camera=new T.OrthographicCamera(-4,4,2.4,-2.4,.1,50);
  camera.position.set(0,3.25,9);camera.lookAt(0,1.32,0);
  scene.add(new T.HemisphereLight('#fff8eb','#998c7e',.65));
  const key=new T.DirectionalLight('#fff4df',2.1);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6});key.shadow.normalBias=.035;key.shadow.bias=-.0005;scene.add(key);
  const rim=new T.DirectionalLight('#d6e3ee',.7);rim.position.set(5,4,-4);scene.add(rim);
  const root=new T.Group();scene.add(root);
  const lampWrap=new T.Group();root.add(lampWrap);const lamp=VeredaForms.createLamp();lampWrap.add(lamp);lamp.rotation.y=-.25;
  const podium=new T.Mesh(new T.CylinderGeometry(1.2,1.25,.12,96),new T.MeshStandardMaterial({color:'#d9d4cc',roughness:.88}));podium.position.y=-.08;podium.receiveShadow=true;lampWrap.add(podium);
  const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-.16;floor.receiveShadow=true;scene.add(floor);
  function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,159,56,.8)');g.addColorStop(.35,'rgba(245,163,71,.3)');g.addColorStop(1,'rgba(255,173,94,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
  const glow=new T.Mesh(new T.PlaneGeometry(5,5),new T.MeshBasicMaterial({map:glowTexture(),transparent:true,depthWrite:false,opacity:.18}));glow.rotation.x=-Math.PI/2;glow.position.y=-.013;lampWrap.add(glow);
  const cordCurve=new T.CatmullRomCurve3([new T.Vector3(0,.06,-.2),new T.Vector3(.3,.02,-.8),new T.Vector3(1,.01,-1),new T.Vector3(1.3,.01,-.6),new T.Vector3(2,.01,-.9)]);
  const cord=new T.Mesh(new T.TubeGeometry(cordCurve,42,.015,6,false),new T.MeshStandardMaterial({color:'#604e43',roughness:.9}));lampWrap.add(cord);
  const notebook=new T.Group(),printer=new T.Group();root.add(notebook,printer);
  const printLamp=VeredaForms.createLamp();printLamp.scale.setScalar(.34);printLamp.position.set(0,.4,.12);printer.add(printLamp);
  let laptopAsset=null, printerAsset=null, screenMaterial=null, screenMesh=null, screenCorners=[], nozzle=null, bed=null, nozzleRest=null, notebookLid=null, powerSwitch=null;
  const display=document.createElement('canvas');display.width=1024;display.height=640;const dx=display.getContext('2d');const displayTexture=new T.CanvasTexture(display);displayTexture.encoding=T.sRGBEncoding;displayTexture.flipY=false;
  function drawScreen(sent){dx.fillStyle='#f1f0ec';dx.fillRect(0,0,1024,640);dx.fillStyle='#dddcd6';dx.fillRect(0,0,1024,52);dx.fillStyle='#342d28';dx.font='22px sans-serif';dx.fillText('vereda / estúdio',35,35);dx.fillStyle='#b4552d';dx.fillRect(28,91,206,46);dx.fillStyle='white';dx.font='18px sans-serif';dx.fillText('lanterna.stl',51,121);dx.fillStyle='#aaa8a0';dx.font='16px sans-serif';dx.fillText('Forma • Camadas • Prévia',36,170);dx.strokeStyle='#d3d1ca';dx.lineWidth=1;for(let k=0;k<10;k++){dx.beginPath();dx.moveTo(300,195+k*30);dx.lineTo(980,195+k*30);dx.stroke();}dx.fillStyle='#a65636';dx.beginPath();dx.ellipse(659,493,80,23,0,0,Math.PI*2);dx.fill();dx.fillRect(579,432,160,62);dx.fillStyle='#dfd2b9';dx.beginPath();dx.moveTo(575,430);dx.bezierCurveTo(524,320,517,246,579,181);dx.quadraticCurveTo(650,155,731,184);dx.bezierCurveTo(785,255,779,341,738,430);dx.closePath();dx.fill();dx.strokeStyle='#a99a80';for(let j=0;j<23;j++){let xx=575+j*7;dx.beginPath();dx.moveTo(xx,432);dx.bezierCurveTo(xx-40+(j/23)*80,331,xx-25+(j/23)*50,260,xx,186);dx.stroke();}dx.fillStyle=sent?'#526745':'#b4552d';dx.fillRect(780,552,213,54);dx.fillStyle='#fff';dx.font='18px sans-serif';dx.fillText(sent?'Arquivo recebido ✓':'Abrir estúdio  ↗',806,586);dx.fillStyle='#74685c';dx.font='16px sans-serif';dx.fillText('Estudo de forma • demonstração',33,600);displayTexture.needsUpdate=true;}
  drawScreen(false);
  const bootLogo=new Image();bootLogo.src='assets/brand/logo-negativo.png';
  let entryScreen='',entryScreenAt=0;
  function drawEntryScreen(state,now){
    if(state==='story'||state==='ready'){if(entryScreen!==state){drawScreen(false);entryScreen=state;}return;}
    if(entryScreen===state&&state!=='booting')return;
    if(entryScreen!==state){entryScreenAt=now;entryScreen=state;}
    dx.fillStyle='#171c18';dx.fillRect(0,0,1024,640);
    if(state==='booting'||state==='transition'){
      if(bootLogo.complete&&bootLogo.naturalWidth){const ratio=bootLogo.naturalHeight/bootLogo.naturalWidth;dx.drawImage(bootLogo,392,174,240,240*ratio);}
      dx.fillStyle='#e2dccb';dx.font='17px sans-serif';dx.textAlign='center';dx.fillText(state==='booting'?'Acendendo o ateliê…':'Da ideia à luz.',512,428);dx.textAlign='left';
      dx.fillStyle='#485146';dx.fillRect(362,464,300,3);dx.fillStyle='#d4ad7b';dx.fillRect(362,464,300*Math.min(1,(now-entryScreenAt)/1.1),3);
    }
    displayTexture.needsUpdate=true;
  }

  function box(w,h,d,color){return new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness:.6,metalness:.3}));}
  // Functional silhouettes remain available if an external asset cannot be loaded.
  const lapFallback=new T.Group();const lb=box(2.65,.09,1.75,'#8b8982');lb.position.y=.1;lapFallback.add(lb);const fallbackHinge=new T.Group();fallbackHinge.position.set(0,.15,-.77);lapFallback.add(fallbackHinge);const lid=box(2.65,1.63,.08,'#393b39');lid.position.y=.815;fallbackHinge.add(lid);const lscreen=new T.Mesh(new T.PlaneGeometry(2.46,1.43),new T.MeshBasicMaterial({map:displayTexture}));lscreen.position.set(0,.815,.045);fallbackHinge.add(lscreen);notebook.add(lapFallback);
  const printFallback=new T.Group();[[0,.15,0,2.1,.3,1.9],[0,2.3,0,2.1,.2,1.9],[-.97,1.2,0,.16,2.2,1.9],[.97,1.2,0,.16,2.2,1.9],[0,1.2,-.9,1.9,2.2,.1]].forEach(([x,y,z,w,h,d])=>{const b=box(w,h,d,'#474b46');b.position.set(x,y,z);printFallback.add(b);});printer.add(printFallback);
  function prep(g){g.traverse(o=>{if(o.isMesh){o.castShadow=!(o.material?.transparent);o.receiveShadow=true;}});}
  const loader=new T.GLTFLoader();
  loader.load('assets/atelier/atelier.glb',g=>{
    const all=g.scene;const n=all.getObjectByName('Notebook'),p=all.getObjectByName('Printer_P2S');
    if(n){all.remove(n);n.position.set(0,0,0);n.scale.multiplyScalar(8.2);prep(n);window.VeredaStickers?.apply(n);window.VeredaHardware?.attach(n,canvas,camera,()=>!!window.VeredaDesktop&&!VeredaDesktop.getElement().hidden&&!VeredaDesktop.isExpanded()&&(window.VeredaEntry?.state==='ready'||window.VeredaEntry?.state==='story'));notebook.add(n);laptopAsset=n;lapFallback.visible=false;notebookLid=n.getObjectByName('Notebook_Lid');
      if(notebookLid){const emblem=n.getObjectByName('Notebook_BackEmblem');if(emblem)emblem.visible=false;const logoMap=new T.TextureLoader().load('assets/brand/logo-negativo.png');logoMap.encoding=T.sRGBEncoding;const logo=new T.Mesh(new T.PlaneGeometry(.10,.10*(1082/1345)),new T.MeshBasicMaterial({map:logoMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));logo.position.set(0,.12,-.0055);logo.rotation.set(0,Math.PI,Math.PI);notebookLid.add(logo);}
      const pc=document.createElement('canvas');pc.width=pc.height=128;const px=pc.getContext('2d');px.strokeStyle='#d8e3ca';px.lineWidth=9;px.lineCap='round';px.beginPath();px.arc(64,65,28,-Math.PI*.34,Math.PI*1.34);px.stroke();px.beginPath();px.moveTo(64,26);px.lineTo(64,59);px.stroke();
      powerSwitch=new T.Mesh(new T.CylinderGeometry(.0068,.0068,.0018,32),new T.MeshStandardMaterial({color:'#343e32',emissive:'#647b4f',emissiveIntensity:.25}));powerSwitch.position.set(.15,.026,-.091);n.add(powerSwitch);const symbol=new T.Mesh(new T.PlaneGeometry(.01,.01),new T.MeshBasicMaterial({map:new T.CanvasTexture(pc),transparent:true,depthWrite:false}));symbol.rotation.x=-Math.PI/2;symbol.position.y=.001;powerSwitch.add(symbol);
      const s=n.getObjectByName('Notebook_Screen');if(s){screenMaterial=new T.MeshBasicMaterial({map:displayTexture,side:T.DoubleSide});s.material=screenMaterial;screenMesh=s;const pos=s.geometry.attributes.position,seen=new Set();for(let j=0;j<pos.count;j++){const v=new T.Vector3().fromBufferAttribute(pos,j),k=v.toArray().map(n=>n.toFixed(5)).join(',');if(!seen.has(k)){screenCorners.push(v);seen.add(k);}}}}
    if(p){all.remove(p);p.position.set(0,0,0);p.scale.multiplyScalar(4.2);prep(p);printer.add(p);printerAsset=p;printFallback.visible=false;nozzle=p.getObjectByName('Printer_Nozzle');bed=p.getObjectByName('Printer_Bed');if(nozzle)nozzleRest=nozzle.position.clone();}
    document.body.dataset.assets='loaded';window.dispatchEvent(new CustomEvent('vereda:asset',{detail:{name:'scene',status:'loaded'}}));
  },undefined,()=>{document.body.dataset.assets='fallback';window.dispatchEvent(new CustomEvent('vereda:asset',{detail:{name:'scene',status:'error'}}));});
  const guides=new T.Group();root.add(guides);
  function line(points,color='#b4552d'){const l=new T.Line(new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p))),new T.LineBasicMaterial({color,transparent:true,opacity:.45}));return l;}
  guides.add(line([[-1,0,0],[-1,2.7,0]]),line([[-1.1,0,0],[-.9,0,0]]),line([[-1.1,2.7,0],[-.9,2.7,0]]));
  const ring=new T.Mesh(new T.TorusGeometry(1.36,.007,6,100),new T.MeshBasicMaterial({color:'#a8795d',transparent:true,opacity:.3}));ring.rotation.x=Math.PI/2;ring.position.y=.08;guides.add(ring);
  const points=[];for(let i=0;i<140;i++){let a=i*2.39996,r=1.2+(i%9)*.08;points.push(Math.cos(a)*r,.2+(i%23)/8,Math.sin(a)*r);}
  const matter=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.PointsMaterial({color:'#ae6d4e',size:.022,transparent:true,opacity:.45}));root.add(matter);
  const parcel=new T.Group();root.add(parcel);const baseBox=box(2.25,1.6,1.8,'#b99065');baseBox.position.y=.8;parcel.add(baseBox);const tape=box(.24,1.61,1.81,'#e5d3ad');tape.position.y=.81;parcel.add(tape);const label=box(.65,.4,.01,'#f4f1e8');label.position.set(.49,.91,.908);parcel.add(label);
  const room=new T.Group();root.add(room);const shelf=box(3.5,.16,2.2,'#86715a');shelf.position.y=-.1;room.add(shelf);const wall=new T.Mesh(new T.PlaneGeometry(3.8,4.8),new T.MeshStandardMaterial({color:new T.Color('#454336').convertSRGBToLinear(),roughness:1}));wall.position.set(.3,2.3,-1.55);room.add(wall);for(let i=0;i<8;i++){const slat=box(.08,4,.09,'#8c8171');slat.position.set(-1.8+i*.4,2,-1.38);room.add(slat);}const wallGlow=new T.Mesh(new T.PlaneGeometry(3.4,3.4),new T.MeshBasicMaterial({map:glowTexture(),transparent:true,opacity:.4,depthWrite:false,blending:T.AdditiveBlending}));wallGlow.position.set(0,1.5,-1.52);room.add(wallGlow);room.visible=false;
  const packet=new T.Mesh(new T.OctahedronGeometry(.095),new T.MeshStandardMaterial({color:'#d58557',emissive:'#df7a39',emissiveIntensity:.8}));root.add(packet);
  let current=0,target=0,progressInitialized=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,paused=false,frame=0,last=0,manualLight=null,lightChapter=0,sendTime=-10,drag=0,dragTarget=0,framing=1,aimX=0,aimY=0,leanX=0,leanY=0;
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
  function range(p,a,b){return smooth((p-a)/(b-a));}
  function presence(p,a,b){return range(p,a-.65,a)* (1-range(p,b,b+.65));}
  function scaleGroup(g,v){g.visible=v>.003;g.scale.setScalar(Math.max(.001,v));}
  function resize(){const bounds=canvas.getBoundingClientRect(),w=bounds.width||innerWidth,h=bounds.height||innerHeight;renderer.setSize(w,h,false);const span=w<=760?4.35:4.65;camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();root.position.x=w<=760?0:span*w/h*.245*framing;root.position.y=w<=760?.05:0;root.scale.setScalar(w<=760?.89:1);}
  resize();addEventListener('resize',resize);addEventListener('vereda:entry',resize);if(window.ResizeObserver)new ResizeObserver(resize).observe(canvas);
  addEventListener('pointermove',e=>{if(e.pointerType==='touch'||e.buttons||paused||reduced)return;aimX=Math.max(-1,Math.min(1,e.clientX/innerWidth*2-1));aimY=Math.max(-1,Math.min(1,e.clientY/innerHeight*2-1));},{passive:true,capture:true});
  document.documentElement.addEventListener('pointerleave',()=>{aimX=aimY=0;});
  const ray=new T.Raycaster(),pointer=new T.Vector2();canvas.addEventListener('click',e=>{
    const state=window.VeredaEntry?.state||'story';const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
    if(state==='closed'&&ray.intersectObject(notebook,true).length){VeredaEntry.open();return;}
    if(state==='off'&&powerSwitch&&ray.intersectObject(powerSwitch,true).length){VeredaEntry.power();return;}
  });
  window.VeredaScene={setProgress(p){target=p;if(!progressInitialized){current=p;progressInitialized=true;}},setPaused(v){paused=v;},setReduced(v){reduced=v;},setLight(v){manualLight=v;lightChapter=Number(document.body.dataset.chapter||0);},setColor(c){lamp.setColor(c);printLamp.setColor(c);},turn(v){dragTarget+=v;},send(){sendTime=performance.now()/1000;drawScreen(true);},resize};
  function render(ms){frame=requestAnimationFrame(render);if(document.hidden)return;const now=ms/1000,dt=Math.min(.06,(ms-last)/1000||.016);last=ms;current=reduced?target:current+(target-current)*(1-Math.exp(-dt*8));drag+= (dragTarget-drag)*.12;
    const entry=window.VeredaEntry?.state||'story',intro=entry!=='story',p=intro?0:current,opening=1-range(p,.72,1.15),laptop=opening+presence(p,5,6.4)+presence(p,11,11.3),print=presence(p,6.65,7.95),packed=presence(p,9,9.1);
    const side=document.body.dataset.layout==='reverse'?-1:1;framing=reduced?side:framing+(side-framing)*(1-Math.exp(-dt*5));
    const rect=canvas.getBoundingClientRect(),cw=rect.width,ch=rect.height;
    root.position.x=intro||innerWidth<=760?0:4.65*cw/ch*(.245-.075*opening)*framing;
    const lidProgress=smooth(window.VeredaEntry?.lidProgress??1);
    const desiredLid=Math.PI/2+(-.2094395-Math.PI/2)*lidProgress;
    if(notebookLid){notebookLid.rotation.x=desiredLid;notebookLid.position.y=.025+.0085*(1-lidProgress);}fallbackHinge.rotation.x=desiredLid;
    const cameraClosed=intro?1-lidProgress:0;
    camera.position.set(0,3.25+cameraClosed*3,9);camera.lookAt(0,1.32-cameraClosed*.85,0);
    const transition=entry==='transition'?(window.VeredaEntry?.transitionProgress||0):0;camera.zoom=1+transition*2;camera.updateProjectionMatrix();
    drawEntryScreen(entry,now);
    if(powerSwitch)powerSwitch.material.emissiveIntensity=entry==='off'?.8:entry==='ready'||entry==='story'?.5:.04;

    const lv=clamp(1-Math.max(laptop,print,packed));scaleGroup(lampWrap,lv);scaleGroup(notebook,clamp(laptop));scaleGroup(printer,print);scaleGroup(parcel,packed);
    lampWrap.rotation.y=-.25+drag+(reduced||paused?0:Math.sin(now*.12)*.07)+p*.052;
    const build=p<1?1:p<2?1-range(p,1,1.7)*.72:p<4?(.26+range(p,2,4)*.58):1;
    lamp.setProgress(build);lamp.setWireframe(p>1.7&&p<2.55);
    const lit=manualLight!==null && Number(document.body.dataset.chapter)===lightChapter?manualLight:p<.8?.45:p>14?range(p,14,15):p>12.7&&p<13.5?.3:.04;
    lamp.setLight(lit);glow.material.opacity=lit*.6;podium.visible=p<14;cord.visible=p<1||p>13;
    notebook.scale.multiplyScalar((1+opening*.4)*(intro&&innerWidth>760?1-.1*lidProgress:1)*(innerWidth<=760?Math.min(.76,cw/ch/1.18):Math.min(1,cw/ch/1.7)));notebook.position.set(intro||innerWidth<=760?.30*notebook.scale.x:0, -.14*opening+.05+(intro?(innerWidth<=760?.5:.12)*lidProgress:0), .15);if(reduced){leanX=leanY=0;}else if(!paused){leanX+=(aimX-leanX)*(1-Math.exp(-dt*4));leanY+=(aimY-leanY)*(1-Math.exp(-dt*4));}notebook.rotation.y=-.11+(intro?0:drag*.12)+leanX*.12;notebook.rotation.x=-leanY*.04;notebook.rotation.z=-leanX*.008;printer.position.set(0,-.03,0);printer.rotation.y=-.3;parcel.rotation.y=-.35;
    let pp=clamp((p-7)/.95);printLamp.setProgress(pp);printLamp.setLight(0);printLamp.rotation.y=.4;
    if(bed){const body=clamp((pp-.16)/.84),tr=Math.floor(body*144)/144,tl=Math.floor(body*100)/100;const height=Math.max(.52*Math.max(.001,Math.min(pp/.16,1)),pp>.005?.0545:0,pp>.16?.538:0,tr>0?.53+2.08*tr+.11*tr**5:0,tl>0?.53+2.08*tl+.11*tl**5:0);bed.position.y=.314-height*.34/4.2;printLamp.position.y=(bed.position.y+.011)*4.2;}
    if(nozzle&&nozzleRest){nozzle.position.copy(nozzleRest);if(pp>0&&pp<1&&!paused&&!reduced){const t=clamp((pp-.16)/.84),a=now*2,r=(pp<.16?.45:.435+.355*Math.sin(Math.PI*(.06+t*.84))+.028*Math.cos(a*48+t*5.2))*.34/4.2;const x=Math.cos(a)*r,z=Math.sin(a)*r*.91;nozzle.position.x=x*Math.cos(.4)+z*Math.sin(.4);nozzle.position.z=.12/4.2-x*Math.sin(.4)+z*Math.cos(.4);}}
    guides.visible=(p>.7&&p<4.6)||(p>9.7&&p<10.6);matter.visible=p>.8&&p<4.7;matter.rotation.y=reduced||paused?p*.18:now*.025+p*.18;
    wallGlow.material.opacity=lit*.45;room.visible=p>14.05;room.scale.setScalar(range(p,14.05,14.7));room.rotation.y=lampWrap.rotation.y;key.intensity=1.5-lit*.55;rim.intensity=.7-lit*.3;
    const age=now-sendTime;packet.visible=age>=0&&age<3&&!reduced;if(packet.visible){const u=age/3;packet.position.set(-1.4+u*2.5,1.3+Math.sin(u*Math.PI)*.8,.5);packet.rotation.y=age*3;}
    const pct=document.querySelector('#print-progress');if(pct&&p>6.3&&p<8.2)pct.textContent=Math.round(pp*100)+'%';
    renderer.render(scene,camera);projectDesktop(laptop);
  }
  function projectDesktop(visible){
    if(!window.VeredaDesktop)return;
    if(VeredaDesktop.isExpanded()){VeredaDesktop.setVisible(true);return;}
    const entry=window.VeredaEntry?.state||'story';
    const show=!document.body.classList.contains('no-webgl')&&(entry==='ready'||(entry==='story'&&innerWidth>760))&&visible>.97&&screenMesh&&screenCorners.length>=4;
    VeredaDesktop.setVisible(!!show);
    if(!show)return;
    const rect=canvas.getBoundingClientRect(),h=rect.height,w=rect.width;
    const pts=screenCorners.map(v=>{const p=v.clone().applyMatrix4(screenMesh.matrixWorld).project(camera);return{x:rect.left+(p.x+1)*w/2,y:rect.top+(1-p.y)*h/2};}).sort((a,b)=>a.y-b.y);
    const top=pts.slice(0,2).sort((a,b)=>a.x-b.x),bottom=pts.slice(-2).sort((a,b)=>a.x-b.x);const [a,b,c,d]=[top[0],top[1],bottom[1],bottom[0]];
    const dx1=b.x-c.x,dx2=d.x-c.x,dx3=a.x-b.x+c.x-d.x,dy1=b.y-c.y,dy2=d.y-c.y,dy3=a.y-b.y+c.y-d.y,det=dx1*dy2-dx2*dy1;
    const g=(dx3*dy2-dx2*dy3)/det,hh=(dx1*dy3-dx3*dy1)/det;
    const m=[(b.x-a.x+g*b.x)/960,(b.y-a.y+g*b.y)/960,0,g/960,(d.x-a.x+hh*d.x)/600,(d.y-a.y+hh*d.y)/600,0,hh/600,0,0,1,0,a.x,a.y,0,1];
    if(m.every(Number.isFinite))VeredaDesktop.getElement().style.transform='matrix3d('+m.join(',')+')';
  }
  requestAnimationFrame(render);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);document.body.classList.add('no-webgl');window.VeredaDesktop?.setVisible(false);});
})();
