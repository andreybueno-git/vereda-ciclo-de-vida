import bpy, math
from mathutils import Vector

# Metres. Blender +Z is up and -Y faces the viewer; glTF becomes +Y up / +Z front.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for d in list(bpy.data.materials): bpy.data.materials.remove(d)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
scene.render.engine='BLENDER_EEVEE'

def rgb(h):
    vals=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in vals)
def mat(name,h,metal=0,rough=.4,alpha=1,emit=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); col=rgb(h)
    p.inputs['Base Color'].default_value=(*col,alpha)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    p.inputs['Alpha'].default_value=alpha
    if emit:
        p.inputs['Emission Color'].default_value=(*col,1)
        p.inputs['Emission Strength'].default_value=emit
    if alpha<1:
        m.surface_render_method='BLENDED'
        m.use_transparency_overlap=False
    m.diffuse_color=(*col,alpha)
    return m
al=mat('Warm anodized graphite','636562',.68,.29)
edge=mat('Machined edge','9A9B95',.7,.23)
dark=mat('Graphite polymer','20231F',.15,.38)
black=mat('Recesses and rubber','0C100D',0,.7)
ink=mat('Keycaps','242823',.1,.48)
legend=mat('Key legends','ACAFA5',0,.5)
panel=mat('Printer warm grey shell','686B65',.48,.34)
rail=mat('Brushed stainless rails','ACB1A9',.88,.23)
gold=mat('PEI satin build surface','8E8061',.38,.55)
glass=mat('Smoked glazing','899991',.08,.19,.11)
display=mat('Notebook_Display','17231F',.15,.27,1,.16)
touch=mat('Printer_Display','13221A',.12,.22,1,.25)
cream=mat('Warm filament','E6DBC2',0,.55)
sage=mat('Sage filament','768673',0,.55)
clay=mat('Clay filament','BD6F4A',0,.5)
char=mat('Carbon filament','474B45',0,.5)
lightmat=mat('Warm LED diffuser','F1E0BF',0,.35,1,1.6)
copper=mat('Nozzle brass','B48752',.72,.3)

def group(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o)
    if parent:o.parent=parent
    o.location=loc
    return o
def mesh(name,verts,faces,material,parent=None):
    d=bpy.data.meshes.new(name+'_Geometry');d.from_pydata(verts,[],faces);d.update()
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o)
    if parent:o.parent=parent
    if material:d.materials.append(material)
    return o
def bevel(o,r=.002,segments=3):
    mod=o.modifiers.new('Precision edge radii','BEVEL');mod.width=r;mod.segments=segments
    mod.affect='EDGES'
    for p in o.data.polygons:p.use_smooth=True
    w=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');w.keep_sharp=True;w.weight=40
    return o
def boxes(name,specs,material,parent=None,r=.002,segments=3):
    v=[];f=[]
    for loc,dim in specs:
        x,y,z=loc;a,b,c=[u/2 for u in dim];n=len(v)
        v.extend([(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),(x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)])
        f.extend([tuple(n+i for i in q) for q in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]])
    o=mesh(name,v,f,material,parent)
    return bevel(o,r,segments) if r else o
def box(name,loc,dim,material,parent=None,r=.002):return boxes(name,[(loc,dim)],material,parent,r)
def cyl(name,loc,r,depth,material,parent=None,axis='Z',n=48):
    v=[];f=[]
    for z in [-depth/2,depth/2]:
        for k in range(n):
            a=2*math.pi*k/n;co=(r*math.cos(a),r*math.sin(a),z)
            if axis=='X':co=(co[2],co[0],co[1])
            elif axis=='Y':co=(co[0],co[2],co[1])
            v.append(tuple(co[i]+loc[i] for i in range(3)))
    f.extend([tuple(reversed(range(n))),tuple(range(n,2*n))])
    for k in range(n):f.append((k,(k+1)%n,(k+1)%n+n,k+n))
    o=mesh(name,v,f,material,parent)
    return bevel(o,min(.001,r*.13,depth*.12),2)
def tube(name,points,r,material,parent=None):
    cu=bpy.data.curves.new(name+'_Curve','CURVE');cu.dimensions='3D';cu.resolution_u=8;cu.bevel_depth=r;cu.bevel_resolution=3
    sp=cu.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for q,p in zip(sp.bezier_points,points):q.co=p;q.handle_left_type='AUTO';q.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,cu);scene.collection.objects.link(o);cu.materials.append(material)
    if parent:o.parent=parent
    return o
def quad(name,width,height,center,material,parent=None):
    x,y,z=center
    o=mesh(name,[(x-width/2,y,z-height/2),(x+width/2,y,z-height/2),(x+width/2,y,z+height/2),(x-width/2,y,z+height/2)],[(0,1,2,3)],material,parent)
    uv=o.data.uv_layers.new(name='UVMap')
    for i,p in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=p
    return o
def label(name,text,loc,size,material,parent=None):
    cu=bpy.data.curves.new(name+'_Text','FONT');cu.body=text;cu.size=size;cu.extrude=.00003;cu.align_x='LEFT'
    o=bpy.data.objects.new(name,cu);scene.collection.objects.link(o);cu.materials.append(material);o.location=loc;o.rotation_euler=(math.pi/2,0,0)
    if parent:o.parent=parent
    return o

# Notebook: crisp thin body, detailed keyboard, hinge-driven display.
nb=group('Notebook',(-.365,-.045,0));nb['asset_role']='notebook';nb['front']='+Z in glTF'
box('Notebook_Base',(0,0,.012),(.342,.23,.02),al,nb,.008)
box('Notebook_Deck',(0,0,.0222),(.338,.225,.0028),edge,nb,.0012)
box('Notebook_KeyboardWell',(0,.029,.024),(.296,.117,.002),black,nb,.007)
keys=[]
for row in range(5):
    for col in range(14):
        keys.append(((-.137+col*.0209,-.011+row*.0212,.026),(.0179,.0173,.0035)))
keys.extend([((0,-.0325,.026),(.11,.014,.0035)),((-.116,-.0325,.026),(.05,.014,.0035)),((.116,-.0325,.026),(.05,.014,.0035))])
boxes('Notebook_Keycaps',keys,ink,nb,.0018,3)
marks=[]
for row in range(5):
    for col in range(14):marks.append(((-.14+col*.0209,-.013+row*.0212,.0279),(.0032,.0008,.00025)))
boxes('Notebook_KeyLegends',marks,legend,nb,0)
box('Notebook_TrackpadRim',(0,-.072,.0241),(.12,.057,.001),black,nb,.00045)
box('Notebook_Trackpad',(0,-.072,.0248),(.1175,.0545,.001),al,nb,.00045)
grills=[]
for side in [-1,1]:
    for k in range(19):grills.append(((side*.158,.073-k*.0045,.0242),(.006,.0015,.0003)))
boxes('Notebook_SpeakerGrilles',grills,black,nb,0)
box('Notebook_FingerRecess',(0,-.1142,.019),(.056,.0022,.0045),dark,nb,.001)
boxes('Notebook_USBPorts',[((-.1713,.021,.014),(.001,.012,.0034)),((-.1713,.052,.014),(.001,.012,.0034)),((.1713,.05,.014),(.001,.018,.0034))],black,nb,.0004)
boxes('Notebook_Feet',[((x,y,.0018),(.035,.010,.0035)) for x in [-.123,.123] for y in [-.085,.087]],black,nb,.001)
cyl('Notebook_Hinge',(0,.099,.025),.007,.285,dark,nb,'X')
lid=group('Notebook_Lid',(0,.099,.025),nb);lid.rotation_euler[0]=math.radians(-12)
lid['hinge_axis']='local X';lid['closed_rotation_x_rad']=math.pi/2;lid['rest_rotation_x_rad']=math.radians(-12)
box('Notebook_LidShell',(0,.001,.112),(.342,.007,.226),al,lid,.006)
box('Notebook_DisplayBezel',(0,-.0032,.114),(.332,.0015,.214),black,lid,.0007)
scr=quad('Notebook_Screen',.311,.194,(0,-.0041,.115),display,lid)
for v in scr.data.vertices: v.co-=Vector((0,-.0041,.115))
scr.location=(0,-.0041,.115)
scr['purpose']='Replace material with dynamic screen CanvasTexture; UV 0..1; front local -Y Blender'
cyl('Notebook_Webcam',(0,-.0044,.215),.00165,.0005,dark,lid,'Y',24)
cyl('Notebook_WebcamLens',(0,-.0048,.215),.00065,.0002,rail,lid,'Y',20)
# Subtle abstract maker badge on the back, no unrelated computer brand.
boxes('Notebook_BackEmblem',[((-.004,.005,.12),(.002,.0005,.012)),((.004,.005,.12),(.002,.0005,.012))],edge,lid,.0002)

# P2S-inspired product geometry; dimensions drawn from Bambu documentation.
pr=group('Printer_P2S',(.25,.045,0));pr['asset_role']='printer';pr['nominal_body_m']='0.392 x 0.406 x 0.458';pr['build_volume_m']=.256
box('Printer_Base',(0,0,.027),(.392,.406,.036),dark,pr,.01)
boxes('Printer_Feet',[((x,y,.008),(.052,.06,.016)) for x in [-.15,.15] for y in [-.145,.145]],black,pr,.004)
boxes('Printer_Cabinet',[((-.184,0,.249),(.024,.398,.414)),((.184,0,.249),(.024,.398,.414)),((0,.19,.249),(.345,.021,.414)),((0,0,.447),(.392,.406,.024)),((0,-.195,.059),(.346,.023,.034)),((0,-.194,.423),(.346,.024,.048))],panel,pr,.004)
box('Printer_InteriorRear',(0,.175,.259),(.342,.008,.337),dark,pr,.002)
box('Printer_InteriorFloor',(0,.003,.052),(.343,.346,.012),black,pr,.003)
box('Printer_TopGlass',(0,0,.460),(.342,.35,.003),glass,pr,.001)
boxes('Printer_FrameEdges',[((x,-.202,.24),(.015,.009,.346)) for x in [-.168,.168]],dark,pr,.0018)
vent=[]
for k in range(12):vent.append(((.181,-.124+k*.012,.112),(.005,.006,.066)))
boxes('Printer_SideVent',vent,black,pr,.001)
boxes('Printer_FrontHinges',[((-.166,-.211,z),(.012,.015,.032)) for z in [.11,.358]],dark,pr,.003)
door=group('Printer_Door',(-.16,-.211,.235),pr);door['hinge_axis']='Y in glTF';door['closed_rotation_y_rad']=0;door['open_rotation_y_rad']=-1.919862
box('Printer_DoorGlass',(.161,0,0),(.321,.003,.328),glass,door,.001)
boxes('Printer_DoorBorder',[((.161,-.001,z),(.323,.005,.01)) for z in [-.165,.165]]+[((x,-.001,0),(.008,.005,.326)) for x in [.003,.319]],black,door,.001)
box('Printer_DoorHandle',(.317,-.009,.01),(.04,.014,.01),edge,door,.004)
# Z motion and bed are separate from the chassis.
for i,x in enumerate([-.14,.14]):
    cyl('Printer_ZLeadScrew_'+str(i+1),(x,.12,.228),.0035,.348,rail,pr,'Z',24)
    cyl('Printer_ZGuide_'+str(i+1),(x,-.113,.229),.004,.344,rail,pr,'Z',24)
bed=group('Printer_Bed',(0,0,.122),pr);bed['travel_m']='Y 0.10..0.37 in glTF';bed['surface_local_y_m']=.011
box('Printer_BedCarriage',(0,.015,-.007),(.309,.29,.018),dark,bed,.004)
box('Printer_BedPlate',(0,0,.007),(.272,.27,.008),gold,bed,.002)
box('Printer_BedTab',(0,-.142,.007),(.074,.021,.007),gold,bed,.003)
label('Printer_PlateLabel','TEXTURED PEI',(-.052,-.15,.011),.006,black,bed)
gan=group('Printer_Gantry',(0,0,.389),pr)
for i,y in enumerate([-.02,.02]):cyl('Printer_XRail_'+str(i+1),(0,y,0),.0042,.342,rail,gan,'X',32)
boxes('Printer_GantryEnds',[((x,0,0),(.019,.075,.03)) for x in [-.157,.157]],dark,gan,.004)
boxes('Printer_YTracks',[((x,0,.379),(.013,.329,.019)) for x in [-.162,.162]],black,pr,.002)
head=group('Printer_Nozzle',(0,-.031,-.014),gan);head['motion']='animate local X and parent gantry Z in glTF';head['tip_local_y_m']=-.05
box('Printer_Toolhead',(0,0,0),(.07,.055,.054),dark,head,.008)
box('Printer_ToolheadFace',(0,-.029,-.001),(.062,.009,.046),panel,head,.004)
cyl('Printer_ToolheadFan',(0,-.035,-.002),.018,.004,black,head,'Y',40)
cyl('Printer_ToolheadFanHub',(0,-.038,-.002),.006,.003,dark,head,'Y',24)
for i in range(5):
    a=i*math.tau/5
    tube('Printer_FanBlade_'+str(i),[(.006*math.cos(a),-.039,.006*math.sin(a)),(.013*math.cos(a+.4),-.039,.013*math.sin(a+.4))],.0013,rail,head)
cyl('Printer_Hotend',(0,0,-.031),.007,.014,copper,head,'Z',24)
bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.0012,radius2=.0055,depth=.012)
tip=bpy.context.object;tip.name='Printer_NozzleTip';tip.parent=head;tip.location=(0,0,-.044);tip.data.materials.append(copper)
tube('Printer_PTFE',[(0,.02,-.005),(.014,.03,.075),(.08,.075,.058),(.147,.11,.019)],.002,cream,gan)
box('Printer_ChamberLED',(-.15,-.10,.394),(.005,.14,.009),lightmat,pr,.001)
label('Printer_Nameplate','P2S',(.075,-.208,.423),.015,black,pr)
label('Printer_Brand','Bambu Lab',(-.148,-.209,.425),.008,black,pr)
control=group('Printer_ControlPanel',(-.119,-.211,.461),pr);control.rotation_euler[0]=math.radians(-12)
box('Printer_ControlHousing',(0,0,0),(.119,.009,.072),dark,control,.006)
quad('Printer_ControlScreen',.108,.062,(0,-.0051,0),touch,control)
boxes('Printer_ControlUI',[((-.038,-.0056,z),(.017,.0003,.003)) for z in [-.019,-.007,.005,.017]]+[((.016,-.0056,.005),(.051,.0003,.021))],sage,control,0)

# AMS 2 Pro: four reels and a transparent barrel-shaped lid.
ams=group('AMS',(0,.01,.466),pr)
box('AMS_Base',(0,0,.022),(.372,.278,.044),dark,ams,.008)
boxes('AMS_SidePanels',[((x,0,.055),(.013,.279,.10)) for x in [-.181,.181]],panel,ams,.003)
box('AMS_FrontBand',(0,-.135,.083),(.36,.008,.025),dark,ams,.003)
label('AMS_Nameplate','AMS 2 Pro',(.071,-.140,.076),.008,legend,ams)
boxes('AMS_Feeders',[((x,-.106,.052),(.06,.04,.054)) for x in [-.134,-.045,.045,.134]],black,ams,.007)
boxes('AMS_FeedWindows',[((x,-.128,.052),(.025,.002,.024)) for x in [-.134,-.045,.045,.134]],copper,ams,.0005)
boxes('AMS_StatusLights',[((x,-.13,.074),(.012,.001,.0015)) for x in [-.134,-.045,.045,.134]],lightmat,ams,0)
def ring(name,xc,thickness,outer,inner,material,parent):
    v=[];f=[];N=64
    for x in [xc-thickness/2,xc+thickness/2]:
        for r in [outer,inner]:
            for k in range(N):
                a=k*math.tau/N;v.append((x,r*math.cos(a),r*math.sin(a)))
    for k in range(N):
        j=(k+1)%N
        f.extend([(k,j,2*N+j,2*N+k),(N+k,3*N+k,3*N+j,N+j),(k,N+k,N+j,j),(2*N+k,2*N+j,3*N+j,3*N+k)])
    return bevel(mesh(name,v,f,material,parent),.0006,2)
for i,(x,ma) in enumerate(zip([-.134,-.045,.045,.134],[cream,sage,clay,char])):
    spool=group('AMS_Spool_'+str(i+1).zfill(2),(x,.018,.116),ams);spool['rotation_axis']='local X'
    cyl('AMS_Filament_'+str(i+1),(0,0,0),.091,.058,ma,spool,'X',64)
    ring('AMS_Rim_'+str(i+1)+'A',-.032,.004,.100,.026,dark,spool)
    ring('AMS_Rim_'+str(i+1)+'B',.032,.004,.100,.026,dark,spool)
    ring('AMS_Hub_'+str(i+1),0,.065,.029,.019,rail,spool)
lidams=group('AMS_Lid',(0,.135,.089),ams);lidams['hinge_axis']='local X'
v=[];f=[]
for x in [-.181,.181]:
    for k in range(33):
        a=math.pi*k/32;v.append((x,.139*math.cos(a)-.135,.118*math.sin(a)))
for k in range(32):f.append((k,k+1,k+34,k+33))
hood=mesh('AMS_LidGlass',v,f,glass,lidams)
for p in hood.data.polygons:p.use_smooth=True
for x in [-.182,.182]:
    pts=[(x,.14*math.cos(math.pi*k/8)-.135,.119*math.sin(math.pi*k/8)) for k in range(9)]
    tube('AMS_LidEdge_'+str(x),pts,.0028,dark,lidams)
tube('AMS_PTFEFeed',[(.16,.12,.51),(.20,.22,.50),(.20,.23,.37),(.10,.20,.32)],.002,cream,pr)

# Collection-friendly preview set. It can be excluded by root name in GLB consumers.
env=group('Preview_Set')
box('Preview_Ground',(0,0,-.017),(200,200,.02),mat('Preview floor','292C26',.1,.55),env,.002)
world=scene.world or bpy.data.worlds.new('Atelier ambient');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.24,.26,.22,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.38
def light(name,loc,power,color,radius):
    d=bpy.data.lights.new(name,'POINT');d.energy=power;d.color=color;d.shadow_soft_size=radius
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.parent=env
light('Preview_Key',(-.5,-.65,1.4),110,(1,.88,.72),.6)
light('Preview_Fill',(.8,-.4,.75),55,(.72,.82,1),.5)
light('Preview_Rim',(.2,.7,1.1),150,(1,.94,.82),.45)
light('Preview_ChamberFill',(.25,-.085,.33),.6,(1,.91,.77),.04)
d=bpy.data.cameras.new('Atelier_Camera');cam=bpy.data.objects.new('Atelier_Camera',d);scene.collection.objects.link(cam);cam.parent=env
cam.location=(1.12,-1.85,1.08);target=Vector((-.05,0,.29));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=1.29;d.lens=55;scene.camera=cam
scene.render.resolution_x=1000;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.render.image_settings.media_type='IMAGE';scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='Khronos PBR Neutral'
bpy.context.view_layer.update()
result={'roots': [{'name':o.name,'location_blender':list(o.location)} for o in [nb,pr]],'object_count':len(bpy.data.objects),'mesh_count':sum(o.type=='MESH' for o in bpy.data.objects),'screen':{'name':scr.name,'width_m':.311,'height_m':.194},'rest':{'bed_top_blender_z':.133,'nozzle_tip_blender_z':.325,'printer_height_m':.682,'lid_rotation_x_rad':lid.rotation_euler.x},'coordinate_system':'Blender X horizontal, -Y front, Z up. GLB X horizontal, Y up, Z front.'}
