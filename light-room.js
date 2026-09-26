/* Local, original room geometry for the Luz app. Lamp remains at (0,0,0). */
(function (global) {
  'use strict';
  function create(T) {
    if(!T)throw new Error('VeredaLightRoom requires THREE.');
    const group=new T.Group();group.name='Vereda_Light_Room';
    const geometries=new Set(),materials=new Set(),textures=new Set();let disposed=false;
    const linear=color=>new T.Color(color).convertSRGBToLinear();
    function material(color,extra){const m=new T.MeshStandardMaterial(Object.assign({color:linear(color),roughness:.83,metalness:0},extra));materials.add(m);return m;}
    function mesh(name,geometry,mat,position,parent=group){geometries.add(geometry);const o=new T.Mesh(geometry,mat);o.name=name;if(position)o.position.fromArray(position);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
    function box(name,size,position,mat,parent){return mesh(name,new T.BoxGeometry(...size),mat,position,parent);}
    function texture(canvas){const t=new T.CanvasTexture(canvas);t.encoding=T.sRGBEncoding;t.anisotropy=4;textures.add(t);return t;}
    function canvasTexture(w,h,draw){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;draw(canvas.getContext('2d'),w,h);return texture(canvas);}
    let seed=76421;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    const woodTexture=canvasTexture(1024,512,(c,w,h)=>{
      c.fillStyle='#96714e';c.fillRect(0,0,w,h);
      for(let i=0;i<270;i++){const yy=random()*h;c.beginPath();c.moveTo(0,yy);for(let x=0;x<=w;x+=32)c.lineTo(x,yy+Math.sin(x*.006+i*.7)*(2+random()*6));c.strokeStyle=i%3?'rgba(66,42,22,.08)':'rgba(246,211,156,.13)';c.lineWidth=.5+random()*1.7;c.stroke();}
    });
    const wood=material('#ffffff',{map:woodTexture,roughness:.64}),edge=material('#795539'),joint=material('#493b2c'),paper=material('#dfd6be'),terra=material('#a96242');
    const moss=material('#63715b'),plaster=material('#d9cbb0');
    const wall=mesh('Room_Moss_Wall',new T.PlaneGeometry(7,5),moss,[0,1.40,-1.235]);wall.castShadow=false;
    // Shallow timber console: its top is exactly 0.005 below the lamp origin.
    const consoleTop=box('Console_Oak_Top',[4.35,.16,1.98],[0,-.085,-.08],wood);
    box('Console_Oak_Lip',[4.39,.028,2.01],[0,-.031,-.08],edge);
    box('Console_Carcass',[4.06,.70,1.75],[0,-.515,-.13],edge);
    for(let i=0;i<3;i++){
      box('Console_Drawer_'+(i+1),[1.315,.607,.042],[-1.343+i*1.343,-.50,.767],wood);
      box('Console_Handle_'+(i+1),[.25,.015,.028],[-1.343+i*1.343,-.255,.803],joint);
    }
    [-1.62,1.62].forEach((x,i)=>box('Console_Leg_'+i,[.13,.40,1.37],[x,-1.045,-.16],joint));
    const floor=mesh('Room_Sand_Floor',new T.PlaneGeometry(10,9),material('#b8aa90'),[0,-1.249,0]);floor.rotation.x=-Math.PI/2;floor.castShadow=false;

    function arch(w,h,base=0){const s=new T.Shape();s.moveTo(-w/2,base);s.lineTo(w/2,base);s.lineTo(w/2,base+h-w/2);s.absarc(0,base+h-w/2,w/2,0,Math.PI,false);s.lineTo(-w/2,base);s.closePath();return s;}
    const aperture=arch(1.48,3.25),inside=arch(1.32,3.09,.08);aperture.holes.push(new T.Path(inside.getPoints(36)));
    mesh('Window_Plaster_Arch',new T.ExtrudeGeometry(aperture,{depth:.074,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,curveSegments:30}),plaster,[-1.63,-.025,-1.203]);
    const windowTexture=canvasTexture(256,512,(c,w,h)=>{
      const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#dce0d3');g.addColorStop(.48,'#c4c6a8');g.addColorStop(1,'#e5c78e');c.fillStyle=g;c.fillRect(0,0,w,h);
      c.fillStyle='rgba(244,232,190,.33)';c.beginPath();c.arc(w*.23,h*.28,w*.29,0,Math.PI*2);c.fill();
      c.fillStyle='rgba(100,117,91,.16)';c.beginPath();c.moveTo(0,h*.82);c.bezierCurveTo(w*.3,h*.68,w*.58,h*.77,w,h*.59);c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
    });
    const glazing=material('#ffffff',{map:windowTexture,roughness:1,emissive:linear('#d5c490'),emissiveIntensity:.12});
    mesh('Window_Frosted_View',new T.ShapeGeometry(arch(1.35,3.12,.065),30),glazing,[-1.63,-.025,-1.183]);
    box('Window_Oak_Mullion',[.023,3.06,.032],[-1.63,1.53,-1.144],edge);
    box('Window_Oak_Transom',[1.33,.023,.032],[-1.63,1.18,-1.142],edge);
    box('Window_Deep_Sill',[1.58,.062,.32],[-1.63,.01,-1.025],plaster);

    // Two quiet books and a clay dish sit clear of the lamp's maximum radius (0.818).
    function book(name,x,y,z,w,d,thick,color,turn){
      const g=new T.Group();g.name=name;g.position.set(x,y,z);g.rotation.y=turn;group.add(g);const cover=material(color);
      box(name+'_Pages',[w-.025,thick-.025,d-.023],[0,0,0],paper,g);
      box(name+'_CoverTop',[w,.013,d],[0,thick/2-.0065,0],cover,g);
      box(name+'_CoverBottom',[w,.013,d],[0,-thick/2+.0065,0],cover,g);
      box(name+'_Spine',[.018,thick,d],[-w/2+.009,0,0],cover,g);
      return g;
    }
    book('Book_Terra',1.37,.043,.14,.72,.49,.085,'#a46245',-.12);
    book('Book_Areia',1.38,.111,.13,.62,.44,.051,'#c5bca6',.055);
    const dish=mesh('Clay_Dish',new T.CylinderGeometry(.125,.115,.024,40),terra,[1.42,.149,.12]);
    const dishInset=mesh('Clay_Dish_Well',new T.CircleGeometry(.101,40),material('#864e36'),[1.42,.1612,.12]);dishInset.rotation.x=-Math.PI/2;

    const vasePoints=[[.10,0],[.155,.015],[.176,.075],[.166,.20],[.112,.31],[.103,.36]].map(p=>new T.Vector2(...p));
    mesh('Plant_Clay_Vase',new T.LatheGeometry(vasePoints,36),terra,[-1.48,.001,.25]);
    const lip=mesh('Plant_Vase_Lip',new T.TorusGeometry(.103,.008,8,36),terra,[-1.48,.361,.25]);lip.rotation.x=Math.PI/2;
    const soil=mesh('Plant_Soil',new T.CircleGeometry(.096,32),joint,[-1.48,.345,.25]);soil.rotation.x=-Math.PI/2;
    const stemMat=material('#566346'),leafMat=material('#526445',{side:T.DoubleSide});
    const foliage=new T.Group();foliage.name='Plant_Foliage';foliage.position.set(-1.48,.33,.25);group.add(foliage);
    const branches=[[[0,0,0],[-.04,.29,-.03],[-.14,.74,-.06]],[[.015,0,0],[.10,.26,.04],[.24,.61,.05]],[[-.02,0,0],[-.12,.17,.01],[-.28,.39,.06]]];
    branches.forEach((points,i)=>mesh('Plant_Stem_'+i,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,.009,5,false),stemMat,[0,0,0],foliage));
    const leafShape=new T.Shape();leafShape.moveTo(0,0);leafShape.bezierCurveTo(-.105,.065,-.12,.195,0,.31);leafShape.bezierCurveTo(.105,.19,.11,.08,0,0);
    const leaves=[[-.03,.22,-.02,-.8,.3],[-.08,.43,-.04,.85,-.2],[-.14,.65,-.06,-.45,.6],[.055,.17,.03,-.75,-.6],[.14,.37,.04,.85,.5],[.23,.53,.05,-.2,-.4],[-.12,.17,.02,.95,.5],[-.23,.31,.05,-.8,-.2]];
    leaves.forEach((p,i)=>{const leaf=mesh('Plant_Leaf_'+i,new T.ShapeGeometry(leafShape,9),leafMat,p.slice(0,3),foliage);leaf.rotation.set(.12,p[4],p[3]);leaf.scale.setScalar(i%3===0?.91:1);});

    // Soft contact and bounced light remain visible when the host disables shadow maps.
    function radialTexture(color){return canvasTexture(256,256,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,color);g.addColorStop(.35,color);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});}
    function wash(name,w,h,map,position,rotation){const m=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,opacity:0,polygonOffset:true,polygonOffsetFactor:-1});materials.add(m);const o=mesh(name,new T.PlaneGeometry(w,h),m,position);o.castShadow=o.receiveShadow=false;if(rotation)o.rotation.x=rotation;return o;}
    const contact=wash('Lamp_Contact_Shadow',1.43,1.29,radialTexture('rgba(39,30,18,.55)'),[0,-.004,0],-Math.PI/2);contact.material.opacity=.42;
    const pool=wash('Lamp_Warm_Console_Bounce',2.75,2,radialTexture('rgba(255,173,70,.82)'),[0,-.0025,-.03],-Math.PI/2);
    const wallBounce=wash('Lamp_Warm_Wall_Bounce',3.4,3.7,radialTexture('rgba(255,170,73,.78)'),[.06,1.22,-1.218]);
    const warm=new T.PointLight('#ffbd78',0,5.3,2);warm.name='Lamp_Environmental_Bounce';warm.position.set(.06,1.15,-.40);group.add(warm);
    const mossOff=linear('#63715b'),mossOn=linear('#756d51');
    const info={lampOrigin:[0,0,0],lampHeight:2.72,consoleTopY:-.005,wallZ:-1.235,windowCenterX:-1.63,booksCenter:[1.37,.10,.14],plantBase:[-1.48,.001,.25],defaultCamera:{yaw:.55,pitch:.15,distance:6,target:[0,1.25,0]},recommendedLightCamera:{yaw:.32,pitch:.15,distance:6.7},units:'same as VeredaForms'};
    group.userData.veredaRoom=info;
    function setLight(value){if(disposed)return;const v=T.MathUtils.clamp(Number(value)||0,0,1);warm.intensity=v*2.15;pool.material.opacity=v*.24;wallBounce.material.opacity=v*.25;moss.color.copy(mossOff).lerp(mossOn,v*.55);glazing.emissiveIntensity=.12-v*.045;}
    function dispose(){if(disposed)return;disposed=true;if(group.parent)group.parent.remove(group);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.clear();}
    setLight(0);return {group,setLight,dispose,info};
  }
  global.VeredaLightRoom={create};
})(window);
