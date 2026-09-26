"""Extract named asset trees from the actual Higgsfield GLB; no remeshing."""
from pathlib import Path
import json, struct, copy, hashlib

folder=Path('outputs/vereda-surreal/assets/atelier')
raw=(folder/'atelier-source.glb').read_bytes()
magic,version,total=struct.unpack_from('<III',raw)
assert (magic,version,total)==(0x46546C67,2,len(raw))
jl,jt=struct.unpack_from('<II',raw,12)
source=json.loads(raw[20:20+jl])
bl,bt=struct.unpack_from('<II',raw,20+jl)
assert bt==0x004E4942
binary=raw[28+jl:28+jl+bl]

def pack(names,filename,center=False):
    j=copy.deepcopy(source)
    roots=[i for i,n in enumerate(j['nodes']) if n.get('name') in names]
    assert len(roots)==len(names)
    used=set()
    def descend(i):
        if i in used:return
        used.add(i)
        for c in j['nodes'][i].get('children',[]):descend(c)
    for i in roots:descend(i)
    nids=sorted(used);nm={old:new for new,old in enumerate(nids)}
    nodes=[j['nodes'][i] for i in nids]
    for n in nodes:
        if 'children' in n:n['children']=[nm[x] for x in n['children']]
    if center:
        for i in roots:nodes[nm[i]].pop('translation',None)
    mids=sorted({n['mesh'] for n in nodes if 'mesh' in n});mm={o:n for n,o in enumerate(mids)}
    meshes=[j['meshes'][i] for i in mids]
    for n in nodes:
        if 'mesh' in n:n['mesh']=mm[n['mesh']]
    matids=set();aids=set()
    for m in meshes:
        for p in m['primitives']:
            if 'material' in p:matids.add(p['material'])
            if 'indices' in p:aids.add(p['indices'])
            aids.update(p['attributes'].values())
            for t in p.get('targets',[]):aids.update(t.values())
    matids=sorted(matids);mtmap={o:n for n,o in enumerate(matids)}
    materials=[j['materials'][i] for i in matids]
    for m in materials:
        # Three r128 has no emissive-strength extension; fold into core PBR.
        ex=m.get('extensions',{}).pop('KHR_materials_emissive_strength',None)
        if ex:
            gain=ex.get('emissiveStrength',1)
            m['emissiveFactor']=[min(1,v*gain) for v in m.get('emissiveFactor',[0,0,0])]
        if not m.get('extensions'):m.pop('extensions',None)
    aids=sorted(aids);am={o:n for n,o in enumerate(aids)}
    accessors=[j['accessors'][i] for i in aids]
    views=sorted({a['bufferView'] for a in accessors if 'bufferView' in a});vm={o:n for n,o in enumerate(views)}
    outbin=bytearray();bufferViews=[]
    for i in views:
        v=copy.deepcopy(j['bufferViews'][i]);start=v.get('byteOffset',0)
        while len(outbin)%4:outbin.append(0)
        v['byteOffset']=len(outbin);v['buffer']=0
        outbin.extend(binary[start:start+v['byteLength']]);bufferViews.append(v)
    for a in accessors:
        assert 'sparse' not in a
        if 'bufferView' in a:a['bufferView']=vm[a['bufferView']]
    for m in meshes:
        for p in m['primitives']:
            if 'material' in p:p['material']=mtmap[p['material']]
            if 'indices' in p:p['indices']=am[p['indices']]
            p['attributes']={k:am[v] for k,v in p['attributes'].items()}
            if 'targets' in p:p['targets']=[{k:am[v] for k,v in t.items()} for t in p['targets']]
    out={'asset':{'version':'2.0','generator':'Blender 5.2 / Higgsfield 3D Jutsu; named-tree extraction for Three r128'},'scene':0,'scenes':[{'name':filename[:-4],'nodes':[nm[i] for i in roots]}],'nodes':nodes,'meshes':meshes,'materials':materials,'accessors':accessors,'bufferViews':bufferViews,'buffers':[{'byteLength':len(outbin)}],'extras':{'sourceProjectId':'36a75bfe-6671-48b3-8fa1-da06ea76be27','sourceRevision':2,'units':'metres','up':'+Y','front':'+Z','floorY':0}}
    jb=json.dumps(out,separators=(',',':'),ensure_ascii=False).encode()
    jb+=b' '*((-len(jb))%4);outbin+=b'\0'*((-len(outbin))%4)
    data=struct.pack('<III',0x46546C67,2,28+len(jb)+len(outbin))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(outbin),0x004e4942)+outbin
    path=folder/filename;path.write_bytes(data)
    tris=sum(accessors[p['indices']]['count']//3 for m in meshes for p in m['primitives'])
    stats={'file':filename,'bytes':len(data),'nodes':len(nodes),'meshes':len(meshes),'triangles':tris,'sha256':hashlib.sha256(data).hexdigest(),'roots':names,'centered':center}
    return stats

stats=[pack(['Notebook','Printer_P2S'],'atelier.glb'),pack(['Notebook'],'notebook.glb',True),pack(['Printer_P2S'],'printer.glb',True)]
manifest={'projectId':'36a75bfe-6671-48b3-8fa1-da06ea76be27','projectUrl':'https://higgsfield.ai/3d-jutsu/36a75bfe-6671-48b3-8fa1-da06ea76be27','revision':2,'source':'Higgsfield 3D Jutsu / Blender 5.2','assets':stats,'coordinateSystem':{'units':'m','up':'+Y','front':'+Z','floor':0},'hinges':{'Notebook_Lid':{'position':[0,.025,-.099],'restRotationX':-.20943951,'closedRotationX':1.57079633},'Printer_Door':{'position':[-.16,.235,.211],'restRotationY':0,'openRotationY':-1.919862},'AMS_Lid':{'positionRelativeToAMS':[0,.089,-.135],'openRotationX':-1.25}},'print':{'bedGroup':'Printer_Bed','bedRestPosition':[0,.122,0],'bedSurfaceY':.133,'bedUsableSize':[.256,.256],'gantryGroup':'Printer_Gantry','gantryRestPosition':[0,.389,0],'nozzleGroup':'Printer_Nozzle','nozzleRestPositionRelativeToGantry':[0,-.014,.031],'nozzleTipRelativeY':-.05,'nozzleTipRestY':.325},'screen':{'node':'Notebook_Screen','material':'Notebook_Display','size':[.311,.194],'positionRelativeToLid':[0,.115,.0041],'uv':'0..1','planar':True}}
(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(stats,indent=2))
