/* A single parametric form is shared by the story, slicer and printed object. */
(function () {
  'use strict';
  if (!window.THREE) return;
  const T = THREE;
  function createLamp(options = {}) {
    const group = new T.Group();
    group.name = 'Vereda_Lanterna';
    const rows = 144, sides = 240, positions = [], uv = [], indices = [];
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      for (let side = 0; side <= sides; side++) {
        const a = side / sides * Math.PI * 2;
        const fold = Math.cos(a * 48 + t * 5.2);
        const radius = .435 + .355 * Math.sin(Math.PI * (.06 + t * .84)) + .028 * fold;
        const y = .53 + t * 2.08 + .11 * Math.sin(a + .6) * Math.pow(t, 5);
        positions.push(Math.cos(a) * radius, y, Math.sin(a) * radius * .91);
        uv.push(side / sides, t);
        if (row < rows && side < sides) {
          const k = row * (sides + 1) + side;
          indices.push(k, k + sides + 1, k + 1, k + 1, k + sides + 1, k + sides + 2);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    const material = new T.MeshStandardMaterial({ color: options.color || '#e6d9c0', roughness: .64, metalness: .025, side: T.DoubleSide, emissive: '#ffc575', emissiveIntensity: .04 });
    const shell = new T.Mesh(geometry, material); shell.name = 'Cúpula — estudo de forma'; shell.castShadow = true; shell.receiveShadow = true; group.add(shell);
    const baseMat = new T.MeshStandardMaterial({ color: '#a75536', roughness: .79 });
    const base = new T.Mesh(new T.CylinderGeometry(.438, .47, .52, 96), baseMat); base.position.y = .26; base.castShadow = true; base.receiveShadow = true; group.add(base);
    const foot = new T.Mesh(new T.CylinderGeometry(.456, .456, .055, 96), new T.MeshStandardMaterial({ color:'#492e26', roughness:.7 })); foot.position.y = .027; group.add(foot);
    const collar = new T.Mesh(new T.TorusGeometry(.425,.018,8,96),new T.MeshStandardMaterial({color:'#bc8662',metalness:.65,roughness:.35})); collar.rotation.x=Math.PI/2; collar.position.y=.52; group.add(collar);
    const bulb = new T.Mesh(new T.SphereGeometry(.23,24,16),new T.MeshBasicMaterial({color:'#ffda8d',transparent:true,opacity:.5})); bulb.scale.y=2.5; bulb.position.y=1.35; group.add(bulb);
    const light = new T.PointLight('#ffb653',0,5,2); light.position.set(0,1.1,.12); group.add(light);
    const lines=[];
    for(let i=1;i<=100;i++) {
      const t=i/100, yy=.53+t*2.08, rr=.435+.355*Math.sin(Math.PI*(.06+t*.84));
      const pts=[]; for(let j=0;j<=144;j++){const a=j/144*Math.PI*2;const r=rr+.028*Math.cos(a*48+t*5.2);pts.push(new T.Vector3(Math.cos(a)*r,yy+.11*Math.sin(a+.6)*Math.pow(t,5),Math.sin(a)*r*.91));}
      const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#98694d',transparent:true,opacity:.13})); group.add(line);lines.push(line);
    }
    let progress=1, lit=.1;
    group.shell=shell;
    group.setProgress=function(p){progress=T.MathUtils.clamp(p,0,1);const body=T.MathUtils.clamp((progress-.16)/.84,0,1);geometry.setDrawRange(0,Math.floor(body*rows)*sides*6);base.scale.y=Math.max(.001,Math.min(progress/.16,1));base.position.y=.26*base.scale.y;foot.visible=progress>.005;collar.visible=progress>.16;bulb.visible=progress>.9 && lit>.01;lines.forEach((l,i)=>l.visible=(i+1)/100<=body);};
    group.setLight=function(v){lit=v;material.emissiveIntensity=.025+v*.33;light.intensity=v*1.3;bulb.material.opacity=v*.7;bulb.visible=progress>.9&&v>.01;};
    group.setColor=function(color){material.color.set(color).convertSRGBToLinear();};
    group.setWireframe=function(on){material.wireframe=!!on;lines.forEach(l=>l.material.opacity=on?.035:.13);};
    group.traverse(o=>{if(o.isMesh&&o.material?.isMeshStandardMaterial){o.material.color.convertSRGBToLinear();o.material.emissive.convertSRGBToLinear();}});
    group.setProgress(1); group.setLight(.1);
    return group;
  }
  window.VeredaForms={createLamp};
})();
