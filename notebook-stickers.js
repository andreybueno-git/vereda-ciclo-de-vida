/* Five local, removable decals for the Higgsfield Notebook asset (metres, Y up). */
(function (global) {
  'use strict';
  const applied = new WeakMap();
  const scriptURL = document.currentScript && document.currentScript.src;
  const brandURL = new URL('assets/brand/simbolo-app.png', scriptURL || document.baseURI).href;
  const palette = { paper: '#fffaf0', ink: '#433b32', terra: '#b4552d', green: '#59694e', sun: '#dda654' };

  function rounded(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();ctx.moveTo(x + r, y);ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);ctx.closePath();
  }
  function label(ctx, text, x, y, size, color, maxWidth) {
    ctx.fillStyle = color;ctx.textAlign = 'center';ctx.textBaseline = 'middle';
    ctx.font = '750 ' + size + 'px Manrope, sans-serif';
    if (maxWidth) ctx.fillText(text, x, y, maxWidth);else ctx.fillText(text, x, y);
  }
  function paper(ctx, w, h, color, radius) {
    rounded(ctx, 3, 3, w - 6, h - 6, radius);ctx.fillStyle = palette.paper;ctx.fill();
    rounded(ctx, 11, 11, w - 22, h - 22, Math.max(3, radius - 7));ctx.fillStyle = color;ctx.fill();
  }
  const drawings = {
    sun(ctx, w, h) {
      const cx=w/2,cy=h/2;
      ctx.beginPath();
      for(let i=0;i<=360;i++) {
        const a=i*Math.PI/180,r=w*(.413+.055*Math.cos(a*12));
        const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();ctx.fillStyle=palette.sun;ctx.fill();ctx.lineWidth=14;ctx.strokeStyle=palette.paper;ctx.stroke();
      ctx.strokeStyle=palette.terra;ctx.lineWidth=7;ctx.lineCap='round';
      for(let j=0;j<12;j++) {const a=j*Math.PI/6;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*111,cy+Math.sin(a)*111);ctx.lineTo(cx+Math.cos(a)*145,cy+Math.sin(a)*145);ctx.stroke();}
      ctx.beginPath();ctx.arc(cx,cy,85,0,Math.PI*2);ctx.fillStyle=palette.terra;ctx.fill();
      label(ctx,'SOL',cx,cy-14,47,palette.paper);label(ctx,'DO CERRADO',cx,cy+30,16,palette.paper);
    },
    layers(ctx,w,h) {
      paper(ctx,w,h,palette.green,38);
      const cx=w*.225,cy=h*.47,rx=w*.135,ry=h*.12;
      ctx.strokeStyle=palette.paper;ctx.lineWidth=7;ctx.lineJoin='round';
      for(let j=2;j>=0;j--) {const yy=cy+j*h*.12;ctx.beginPath();ctx.moveTo(cx-rx,yy);ctx.lineTo(cx,yy-ry);ctx.lineTo(cx+rx,yy);ctx.lineTo(cx,yy+ry);ctx.closePath();ctx.fillStyle=palette.green;ctx.fill();ctx.stroke();}
      label(ctx,'CAMADA',w*.66,h*.39,h*.19,palette.paper,w*.53);
      label(ctx,'POR CAMADA',w*.66,h*.65,h*.12,'#e4d2b2',w*.51);
    },
    code(ctx,w,h) {
      paper(ctx,w,h,palette.terra,30);
      label(ctx,'</>',w*.295,h*.48,h*.64,palette.paper,w*.46);
      label(ctx,'IDEIA',w*.738,h*.38,h*.17,palette.paper,w*.35);
      label(ctx,'VIRA COISA',w*.738,h*.65,h*.105,'#f2dbbd',w*.40);
    },
    palmas(ctx,w,h) {
      paper(ctx,w,h,palette.terra,h*.37);
      // The location mark is original line art, separate from the official brand symbol.
      const x=h*.85,y=h*.44,r=h*.16;
      ctx.beginPath();ctx.arc(x,y,r,Math.PI*.12,Math.PI*.88,true);ctx.lineTo(x,y+r*1.7);ctx.closePath();
      ctx.strokeStyle=palette.paper;ctx.lineWidth=h*.035;ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,r*.27,0,Math.PI*2);ctx.stroke();
      label(ctx,'feito em Palmas · TO',w*.54,h*.51,h*.48,palette.paper,w*.81);
    },
    brand(ctx,w,h,icon) {
      paper(ctx,w,h,palette.paper,h*.35);
      if(icon)ctx.drawImage(icon,h*.18,h*.16,h*.68,h*.68);
      label(ctx,'vereda',icon?w*.62:w*.5,h*.50,h*.61,palette.green,w*.70);
    }
  };

  // Coordinates are local to Notebook or Notebook_Lid; never compensate for outer scale.
  const placements = [
    { id:'Sol', drawing:'sun', parent:'deck', size:[.056,.056], position:[-.119,.02386,.074], turn:-.085, pixels:[512,512] },
    { id:'Camadas', drawing:'layers', parent:'deck', size:[.062,.028], position:[.113,.02391,.062], turn:.045, pixels:[640,290] },
    { id:'Codigo', drawing:'code', parent:'deck', size:[.064,.023], position:[.111,.02396,.096], turn:-.035, pixels:[640,230] },
    { id:'Palmas', drawing:'palmas', parent:'lid', size:[.112,.0077], position:[-.073,.0123,.00436], turn:-.003, pixels:[1120,96] },
    { id:'Vereda', drawing:'brand', parent:'lid', size:[.062,.0077], position:[.078,.0123,.00437], turn:.003, pixels:[800,104] }
  ];

  function apply(notebookAsset) {
    const T=global.THREE;
    if(!T || !notebookAsset || typeof notebookAsset.add!=='function')return null;
    if(applied.has(notebookAsset))return applied.get(notebookAsset);
    const lid=notebookAsset.getObjectByName('Notebook_Lid');
    const meshes=[],records=[],parents=[];let disposed=false,brandImage=null;
    const deckGroup=new T.Group();deckGroup.name='Notebook_Stickers_Palmrest';notebookAsset.add(deckGroup);parents.push(deckGroup);
    const lidGroup=lid?new T.Group():null;
    if(lidGroup){lidGroup.name='Notebook_Stickers_Bezel';lid.add(lidGroup);parents.push(lidGroup);}
    function redraw() {
      if(disposed)return;
      records.forEach(r=>{r.ctx.clearRect(0,0,r.canvas.width,r.canvas.height);drawings[r.spec.drawing](r.ctx,r.canvas.width,r.canvas.height,brandImage);r.texture.needsUpdate=true;});
    }
    placements.forEach(spec=>{
      const parent=spec.parent==='lid'?lidGroup:deckGroup;if(!parent)return;
      const canvas=document.createElement('canvas');canvas.width=spec.pixels[0];canvas.height=spec.pixels[1];
      const ctx=canvas.getContext('2d');if(!ctx)return;
      const texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;texture.anisotropy=4;
      const material=new T.MeshStandardMaterial({map:texture,roughness:.82,metalness:0,transparent:true,alphaTest:.035,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      const mesh=new T.Mesh(new T.PlaneGeometry(spec.size[0],spec.size[1]),material);
      mesh.name='Notebook_Sticker_'+spec.id;mesh.position.fromArray(spec.position);
      if(spec.parent==='deck'){mesh.rotation.x=-Math.PI/2;mesh.rotateZ(spec.turn);}else mesh.rotation.z=spec.turn;
      mesh.castShadow=false;mesh.receiveShadow=true;mesh.renderOrder=2;
      mesh.userData.veredaSticker={id:spec.id,surface:spec.parent,units:'metres'};
      parent.add(mesh);meshes.push(mesh);records.push({canvas,ctx,texture,spec});
    });
    redraw();
    const fonts=document.fonts&&document.fonts.load?document.fonts.load('750 24px Manrope').catch(()=>[]):Promise.resolve();
    const icon=new Promise(resolve=>{const img=new Image();img.onload=()=>{brandImage=img;resolve();};img.onerror=()=>resolve();img.src=brandURL;});
    const handle={
      meshes,
      placements:placements.map(p=>({id:p.id,parent:p.parent,size:p.size.slice(),position:p.position.slice()})),
      ready:Promise.all([fonts,icon]).then(()=>{redraw();return handle;}),
      dispose(){if(disposed)return;disposed=true;meshes.forEach(m=>{m.geometry.dispose();m.material.map.dispose();m.material.dispose();});parents.forEach(g=>g.parent&&g.parent.remove(g));applied.delete(notebookAsset);}
    };
    applied.set(notebookAsset,handle);return handle;
  }
  global.VeredaStickers={apply};
})(window);
