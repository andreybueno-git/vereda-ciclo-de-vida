"""
A PEÇA ACENDENDO
Luminária vereda impressa em 3D, no escuro, acendendo.

O perfil é o MESMO que o objeto do deck usa, e a superfície leva as
estrias horizontais da impressão: é a peça de verdade, não um vaso
genérico. A luz nasce dentro e vaza entre as camadas, que é exatamente o
que uma peça de parede fina em PLA faz quando acende.

Uso:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P render_acende.py
"""
import bpy
import math
import os
import sys

FRAMES = 120           # 5 s a 24 fps
FPS = 24
W, H = 1600, 900
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "quadros")

# O mesmo perfil do objeto do deck (altura relativa, raio relativo)
PERFIL = [(0.00, 0.30), (0.08, 0.40), (0.20, 0.36), (0.34, 0.26),
          (0.46, 0.24), (0.60, 0.34), (0.74, 0.48), (0.88, 0.56),
          (0.96, 0.55), (1.00, 0.50)]

ALTURA = 2.6
RAIO = 1.5
CAMADA = 0.008         # altura de uma camada impressa, na escala da cena
ESTRIA = 0.006         # o quanto cada camada salta para fora

# ---------------------------------------------------------------- limpeza
bpy.ops.wm.read_factory_settings(use_empty=True)
cena = bpy.context.scene
cena.frame_start, cena.frame_end = 1, FRAMES
cena.render.fps = FPS
cena.render.resolution_x, cena.render.resolution_y = W, H
bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"


def raio(t):
    t = max(0.0, min(1.0, t))
    for i in range(len(PERFIL) - 1):
        a, b = PERFIL[i], PERFIL[i + 1]
        if a[0] <= t <= b[0]:
            f = (t - a[0]) / (b[0] - a[0] or 1)
            s = (1 - math.cos(f * math.pi)) / 2      # cosseno: silhueta sem bico
            return a[1] + (b[1] - a[1]) * s
    return PERFIL[-1][1]


# ---------------------------------------------------------------- a peça
# Construída camada a camada: cada anel salta um pouco para fora e volta,
# e é esse degrau que produz a estria horizontal da impressão. Um lathe
# liso daria um vaso de cerâmica, não uma peça impressa.
n_camadas = int(ALTURA / CAMADA)
verts, faces = [], []
VOLTA = 96
TORCAO = 0.55

for a in range(n_camadas + 1):
    t = a / n_camadas
    # o degrau da camada: sobe, mantém, desce — serrilha fina
    degrau = ESTRIA * (0.5 + 0.5 * math.cos(a * math.pi))
    r = (raio(t) * RAIO) + degrau
    z = t * ALTURA
    for v in range(VOLTA):
        ang = (v / VOLTA) * math.tau + t * TORCAO
        verts.append((math.cos(ang) * r, math.sin(ang) * r, z))

for a in range(n_camadas):
    for v in range(VOLTA):
        i0 = a * VOLTA + v
        i1 = a * VOLTA + (v + 1) % VOLTA
        i2 = (a + 1) * VOLTA + (v + 1) % VOLTA
        i3 = (a + 1) * VOLTA + v
        faces.append((i0, i1, i2, i3))

malha = bpy.data.meshes.new("luminaria")
malha.from_pydata(verts, [], faces)
malha.update()
peca = bpy.data.objects.new("luminaria", malha)
bpy.context.collection.objects.link(peca)

# parede fina: é ela que deixa a luz atravessar
mod = peca.modifiers.new("parede", "SOLIDIFY")
mod.thickness = 0.018
mod.offset = -1

peca.data.polygons.foreach_set("use_smooth", [False] * len(peca.data.polygons))

# ---------------------------------------------------------------- material
mat = bpy.data.materials.new("PLA")
mat.use_nodes = True
nos = mat.node_tree.nodes
links = mat.node_tree.links
nos.clear()

principled = nos.new("ShaderNodeBsdfPrincipled")
principled.inputs["Base Color"].default_value = (0.92, 0.88, 0.80, 1.0)
principled.inputs["Roughness"].default_value = 0.62
# A translucidez é o ponto: PLA de parede fina acende por dentro.
for nome, valor in (("Transmission Weight", 0.34), ("IOR", 1.46),
                    ("Metallic", 0.0), ("Specular IOR Level", 0.35)):
    if nome in principled.inputs:
        principled.inputs[nome].default_value = valor

saida_mat = nos.new("ShaderNodeOutputMaterial")
links.new(principled.outputs[0], saida_mat.inputs["Surface"])
peca.data.materials.append(mat)

# ---------------------------------------------------------------- a mesa
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0))
mesa = bpy.context.object
mat_mesa = bpy.data.materials.new("concreto")
mat_mesa.use_nodes = True
pm = next(n for n in mat_mesa.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
pm.inputs["Base Color"].default_value = (0.055, 0.05, 0.045, 1.0)
pm.inputs["Roughness"].default_value = 0.92
mesa.data.materials.append(mat_mesa)

# ---------------------------------------------------------------- a lâmpada
bpy.ops.object.light_add(type="POINT", location=(0, 0, ALTURA * 0.62))
lampada = bpy.context.object
lampada.data.color = (1.0, 0.72, 0.36)      # Dourado luz da marca
lampada.data.shadow_soft_size = 0.16

# luz de recorte fraca, só para a peça existir antes de acender
bpy.ops.object.light_add(type="AREA", location=(-3.4, -2.2, 3.2))
recorte = bpy.context.object
recorte.data.energy = 26
recorte.data.size = 3.5
recorte.data.color = (0.75, 0.80, 0.95)
recorte.rotation_euler = (math.radians(58), 0, math.radians(-52))

# ---------------------------------------------------------------- a animação
# Acende como filamento de verdade: demora a pegar, dá um salto, e assenta.
CHAVES = [(1, 0.0), (26, 0.0), (40, 12.0), (52, 6.0),
          (66, 90.0), (86, 150.0), (FRAMES, 165.0)]
for f, energia in CHAVES:
    lampada.data.energy = energia
    lampada.data.keyframe_insert("energy", frame=f)

# a emissão da própria parede acompanha: a peça inteira vira a luminária
emis = nos.new("ShaderNodeEmission")
emis.inputs["Color"].default_value = (1.0, 0.70, 0.32, 1.0)
mistura = nos.new("ShaderNodeMixShader")
links.new(principled.outputs[0], mistura.inputs[1])
links.new(emis.outputs[0], mistura.inputs[2])
links.new(mistura.outputs[0], saida_mat.inputs["Surface"])
for f, v in ((1, 0.0), (26, 0.0), (40, 0.05), (52, 0.02),
             (66, 0.20), (86, 0.33), (FRAMES, 0.36)):
    mistura.inputs[0].default_value = v
    mistura.inputs[0].keyframe_insert("default_value", frame=f)

# ---------------------------------------------------------------- câmera
# Distância medida: a peça tem 2,6 de altura e a 74mm a 8,5 de distância
# cabiam só 2,3 no quadro. A 50mm a 11 de distância cabem 4,5, que dá a
# folga de respiro que uma foto de produto pede.
bpy.ops.object.camera_add(location=(5.6, -8.6, 2.35))
cam = bpy.context.object
cam.data.lens = 50
cam.data.dof.use_dof = True
cam.data.dof.aperture_fstop = 2.8
cena.camera = cam

alvo = bpy.data.objects.new("alvo", None)
alvo.location = (0, 0, ALTURA * 0.46)
bpy.context.collection.objects.link(alvo)
cam.data.dof.focus_object = alvo
seguir = cam.constraints.new("TRACK_TO")
seguir.target = alvo
seguir.track_axis = "TRACK_NEGATIVE_Z"
seguir.up_axis = "UP_Y"

# A peça fica no TERÇO DIREITO: o deck põe tipografia gigante na esquerda.
alvo.location.x = -1.45

# ---------------------------------------------------------------- mundo
mundo = bpy.data.worlds.new("mundo")
cena.world = mundo
mundo.use_nodes = True
fundo = mundo.node_tree.nodes["Background"]
fundo.inputs["Color"].default_value = (0.012, 0.011, 0.010, 1.0)
fundo.inputs["Strength"].default_value = 1.0

# ---------------------------------------------------------------- render
cena.render.engine = "BLENDER_EEVEE"
ee = cena.eevee
ee.taa_render_samples = 32
for atributo, valor in (("use_gtao", True), ("use_ssr", True),
                        ("use_ssr_refraction", True), ("use_raytracing", True)):
    if hasattr(ee, atributo):
        try:
            setattr(ee, atributo, valor)
        except (TypeError, AttributeError):
            pass
mat.use_screen_refraction = True

cena.view_settings.view_transform = "AgX"
cena.view_settings.look = "AgX - Medium High Contrast"

os.makedirs(SAIDA, exist_ok=True)
cena.render.image_settings.file_format = "PNG"
cena.render.filepath = os.path.join(SAIDA, "a")

print(f"[acende] {FRAMES} quadros, {n_camadas} camadas impressas", file=sys.stderr)
bpy.ops.render.render(animation=True)
print("[acende] concluido", file=sys.stderr)
