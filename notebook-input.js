/* Physical controls for the locally rendered notebook. No operating-system input. */
(function(){
'use strict';
const T=window.THREE;
if(!T)return;
function attach(asset,canvas,camera,isEnabled){
  const keys=[],hits=[],ray=new T.Raycaster(),point=new T.Vector2();
  const rows=[['Ctrl','Fn','Alt','z','x','c','v','b','n','m',',','.','/','Enter'],['Caps','a','s','d','f','g','h','j','k','l',';','\'','↑','Enter'],['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],['`','1','2','3','4','5','6','7','8','9','0','-','=','Backspace'],['Escape','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','Delete']];
  const old=asset.getObjectByName('Notebook_KeyLegends');if(old)old.visible=false;
  // Separate the actual Higgsfield keycaps into their 73 physical keys.
  const sourceCaps=asset.getObjectByName('Notebook_Keycaps'),pieces=Array.from({length:73},()=>({positions:[],normals:[]}));
  if(sourceCaps?.geometry){const g=sourceCaps.geometry,p=g.attributes.position,n=g.attributes.normal,idx=g.index,count=idx?idx.count:p.count;
    for(let i=0;i<count;i+=3){const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);let x=0,z=0;ids.forEach(k=>{x+=p.getX(k)/3;z+=p.getZ(k)/3;});
      const bucket=z>.022?(x<-.07?71:x>.07?72:70):Math.max(0,Math.min(4,Math.round((.011-z)/.0212)))*14+Math.max(0,Math.min(13,Math.round((x+.137)/.0209)));
      ids.forEach(k=>{pieces[bucket].positions.push(p.getX(k),p.getY(k),p.getZ(k));pieces[bucket].normals.push(n.getX(k),n.getY(k),n.getZ(k));});
    }sourceCaps.visible=false;
  }
  function highlight(hit,v){if(hit?.userData.key!==undefined)hit.material.emissiveIntensity=v;}

  let hover=null,held=null,lastX=0,lastY=0,moved=0,shift=false,cursorX=490,cursorY=290,cursor=null;
  function key(label,x,z,width=.0179){
    const group=new T.Group();group.position.set(x,.026,z);asset.add(group);
    const piece=pieces[keys.length];let geometry;
    if(piece.positions.length){geometry=new T.BufferGeometry();const positions=piece.positions.map((v,i)=>v-[x,.026,z][i%3]);geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(piece.normals,3));}else geometry=new T.BoxGeometry(width,.0035,.0173);
    const material=sourceCaps?.material?.clone()||new T.MeshStandardMaterial({color:'#242823',roughness:.48});material.emissive=new T.Color('#de9366').convertSRGBToLinear();material.emissiveIntensity=0;
    const hit=new T.Mesh(geometry,material);hit.castShadow=true;hit.receiveShadow=true;hit.userData.key=label;hit.userData.group=group;group.add(hit);hits.push(hit);keys.push(hit);
    const c=document.createElement('canvas');c.width=256;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#e9e7db';cx.textAlign='center';cx.textBaseline='middle';cx.font=(label.length>3?'500 36px':'600 64px')+' Manrope, sans-serif';cx.fillText(label==='Backspace'?'⌫':label==='Enter'?'↵':label==='Escape'?'esc':label==='Delete'?'del':label===' '?'space':label,128,64);
    const texture=new T.CanvasTexture(c);texture.encoding=T.sRGBEncoding;
    const legend=new T.Mesh(new T.PlaneGeometry(width*.85,.014),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));legend.rotation.x=-Math.PI/2;legend.position.y=.0021;group.add(legend);
  }
  rows.forEach((row,r)=>row.forEach((label,c)=>key(label,-.137+c*.0209,.011-r*.0212)));
  key(' ',0,.0325,.11);key('Shift',-.116,.0325,.05);key('→',.116,.0325,.05);
  const trackpad=asset.getObjectByName('Notebook_Trackpad');if(trackpad){trackpad.userData.hardware='trackpad';hits.push(trackpad);}
  const mouse=new T.Group();mouse.name='Vereda_Interactive_Mouse';mouse.position.set(-.218,.012,.008);mouse.rotation.y=.16;asset.add(mouse);
  const matte=new T.MeshStandardMaterial({color:new T.Color('#585c4e').convertSRGBToLinear(),roughness:.48,metalness:.28});
  const body=new T.Mesh(new T.SphereGeometry(1,32,20),matte);body.scale.set(.025,.013,.038);body.castShadow=true;mouse.add(body);
  const left=new T.Mesh(new T.SphereGeometry(1,24,12),matte);left.scale.set(.011,.002,.016);left.position.set(-.012,.011,-.012);left.visible=false;mouse.add(left);
  const right=left.clone();right.position.x=.012;right.visible=false;mouse.add(right);
  const wheel=new T.Mesh(new T.CylinderGeometry(.0035,.0035,.009,16),new T.MeshStandardMaterial({color:'#b26a47',roughness:.6}));wheel.rotation.z=Math.PI/2;wheel.position.set(0,.013,-.016);mouse.add(wheel);const seam=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,.007,-.032),new T.Vector3(0,.0115,-.02),new T.Vector3(0,.0132,-.002)]),new T.LineBasicMaterial({color:'#272d24'}));mouse.add(seam);
  mouse.traverse(o=>{if(o.isMesh&&o.visible){o.userData.hardware='mouse';hits.push(o);}});
  const cableCurve=new T.CatmullRomCurve3([new T.Vector3(-.218,.006,-.028),new T.Vector3(-.24,.004,-.1),new T.Vector3(-.205,.004,-.15),new T.Vector3(-.172,.014,-.052)]);
  const cable=new T.Mesh(new T.TubeGeometry(cableCurve,35,.0012,6,false),new T.MeshStandardMaterial({color:'#52554b',roughness:.8}));asset.add(cable);
  function sound(kind){window.dispatchEvent(new CustomEvent('vereda:interaction',{detail:{kind}}));}
  function cast(e){if(!isEnabled())return null;const r=canvas.getBoundingClientRect();point.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(point,camera);return ray.intersectObjects(hits.filter(hit=>{for(let o=hit;o;o=o.parent)if(!o.visible)return false;return true;}),false)[0]?.object||null;}
  function mark(target){if(hover&&hover!==target&&hover.userData.key!==undefined)highlight(hover,0);hover=target;if(target?.userData.key!==undefined)highlight(target,.22);canvas.style.cursor=target?'pointer':'';}
  function cursorElement(){const root=window.VeredaDesktop?.getElement();if(!root)return null;if(!cursor){cursor=document.createElement('span');cursor.className='vd-hardware-cursor';cursor.setAttribute('aria-hidden','true');cursor.style.cssText='position:absolute;pointer-events:none;z-index:50;width:17px;height:24px;background:#303b2b;clip-path:polygon(0 0,0 90%,27% 65%,47% 100%,63% 92%,44% 59%,84% 58%);filter:drop-shadow(1px 1px 0 white);transform:translate(-1px,-1px)';root.append(cursor);}return cursor;}
  function moveCursor(dx,dy){cursorX=Math.max(4,Math.min(950,cursorX+dx));cursorY=Math.max(4,Math.min(590,cursorY+dy));const c=cursorElement();if(c){c.style.left=cursorX+'px';c.style.top=cursorY+'px';c.hidden=false;}}
  function clickCursor(){const root=window.VeredaDesktop?.getElement();if(!root||root.hidden)return;const matrix=new DOMMatrix(getComputedStyle(root).transform),p=matrix.transformPoint(new DOMPoint(cursorX,cursorY,0,1)),target=document.elementFromPoint(p.x/p.w,p.y/p.w);if(!target||!root.contains(target))return;const action=target.closest('button,input,a,canvas');if(action){action.focus({preventScroll:true});action.click();sound('open');}}
  function press(label){if(label==='Shift'){shift=!shift;return;}let text=label==='↑'?'ArrowUp':label==='→'?'ArrowRight':label;if(text.length===1&&shift)text=text.toUpperCase();window.VeredaDesktop?.typeKey(text);}
  canvas.addEventListener('pointerdown',e=>{const hit=cast(e);if(!hit)return;e.preventDefault();e.stopImmediatePropagation();held=hit;lastX=e.clientX;lastY=e.clientY;moved=0;canvas.setPointerCapture(e.pointerId);if(hit.userData.key!==undefined){press(hit.userData.key);highlight(hit,.6);hit.userData.group.position.y=.0253;}else moveCursor(0,0);});
  canvas.addEventListener('pointermove',e=>{if(held){if(held.userData.hardware){const dx=e.clientX-lastX,dy=e.clientY-lastY;moved+=Math.abs(dx)+Math.abs(dy);moveCursor(dx*2.4,dy*2.4);if(held.userData.hardware==='mouse'){mouse.rotation.z=Math.max(-.12,Math.min(.12,dx*.015));left.position.y=.010;}}lastX=e.clientX;lastY=e.clientY;return;}mark(cast(e));});
  function release(e){if(!held)return;if(held.userData.key!==undefined){held.userData.group.position.y=.026;highlight(held,.22);}else if(e.type==='pointerup'&&moved<8)clickCursor();mouse.rotation.z=0;left.position.y=.011;held=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);canvas.addEventListener('pointerleave',()=>{if(!held)mark(null);});
  canvas.addEventListener('click',e=>{if(cast(e)){e.stopImmediatePropagation();e.preventDefault();}},true);
  // The physical mouse is part of the computer, including narrow browser panels.
  mouse.visible=cable.visible=true;
  return {mouse,keys};
}
window.VeredaHardware={attach};
})();
