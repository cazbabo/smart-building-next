"""A new city for the film, modelled from nothing in Blender.

    node scripts/video/timeline.mjs /tmp/master.json
    python3 scripts/blender/metropolis.py /tmp/master.json out.png [samples=64] [day|dusk] [layout.json]

The page's city is built from a kit of low-poly toy models. This one keeps its
plan - the same nine blocks, the same four streets, the control centre on its
own island to the west, so the film's camera path and story carry over - and
replaces everything standing on it with an architect's model: white towers
with real window grids, a civic centre with a glass rotunda, a hospital with
a helipad, a campus with a running track, a canal with its flood barrier, a
station under a vaulted canopy, turbines, a solar field, a park with a wheel.

Windows are not modelled one by one. The facade shader reads each surface's
world position and draws the grid - mullions, sills, floors - and at dusk
lights a random share of the panes, warm and cool, so the towers come on a
window at a time. Lamps line every street and light pools on the asphalt.

The film overlay needs to know where things are, so the script also writes the
anchors - the top of each district's landmark, the sensors, the gauge, the
flood area, the traffic lanes - to layout.json, in page units.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402
from common import V, reset, srgb, box, cylinder, sphere, extrude_x, prism, tube, link, quads  # noqa: E402
from plate import LOOKS, stage, shoot  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
rng = random.Random(11)
LIT = 0.0            # 0 by day, 1 at dusk: every emissive reads it
ANCHORS = {}
LAMPS = []
TOP = 0.4            # the district platforms' top

# The plan, from the page's own city (src/intelligence/civic-model.js):
# centre x, centre z, width, depth.
BLOCKS = {
    'tourism': (-30, -23, 22, 18), 'industry': (-2, -23, 25, 18), 'energy': (29, -23, 24, 18),
    'transit': (-30, 1, 22, 18), 'civic': (-2, 1, 25, 18), 'hospital': (29, 1, 24, 18),
    'housing': (-30, 24, 22, 17), 'water': (-2, 24, 25, 17), 'school': (29, 24, 24, 17),
}
# Street centre lines, halfway between the blocks.
STREET_X = (-16.75, 13.75)
STREET_Z = (-11.0, 12.75)

PALETTE = {
    'slab': '#EEEAF3', 'slab-edge': '#DCD5E4', 'asphalt': '#58536A', 'paint': '#F2EFF6',
    'paving': '#E6E1EC', 'plaza': '#F1EEF4', 'lawn': '#8DBB6C', 'lawn-dark': '#6FA257',
    'white': '#F5F3F7', 'stone': '#E9E3DA', 'lavender': '#DCD3EA', 'graphite': '#3A3746',
    'steel': '#9A98A8', 'glass': '#44617E', 'water': '#3C93BD', 'track': '#C9765C',
    'leaf': '#3F9460', 'leaf-2': '#6DB06A', 'leaf-3': '#2F7A55', 'blossom': '#E3A6DA', 'trunk': '#8A6A55',
    'lime': '#C7FF3D', 'orchid': '#C044D9', 'solar': '#1F3353',
}


# ---- materials ---------------------------------------------------------------
_mats = {}


def mat(name, colour, rough=0.6, metal=0.0, emit=None, lit=0.0, day=0.0, alpha=1.0):
    """A plain material. `emit` glows with strength `day` by day and `lit` at
    dusk."""
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(colour)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = srgb(emit)
        b.inputs['Emission Strength'].default_value = day + (lit - day) * LIT
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    _mats[name] = m
    return m


def P(name, **kw):
    return mat(name, PALETTE[name], **kw)


def facade(name, wall, glass='#44617E', floor=3.2, bay=1.8, pane=0.72, sill=0.28, head=0.86,
           ribbon=False, share=0.42, roof=None, strength=1.8):
    """Walls with a window grid drawn from world position: floors every `floor`
    units up, bays every `bay` units along the wall, a pane `pane` of the bay
    wide between sill and head. `ribbon` runs the glass the whole way round.
    At dusk `share` of the panes are lit."""
    key = name
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        if n.type == 'BSDF_PRINCIPLED':
            nodes.remove(n)
    out = nodes['Material Output']

    def math_node(op, a, b=None):
        n = nodes.new('ShaderNodeMath')
        n.operation = op
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                links.new(v, n.inputs[i])
        return n.outputs[0]

    geo = nodes.new('ShaderNodeNewGeometry')
    pos = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geo.outputs['Position'], pos.inputs[0])
    nor = nodes.new('ShaderNodeSeparateXYZ')
    links.new(geo.outputs['Normal'], nor.inputs[0])
    # Along the wall: x + y works on every axis-aligned face (one of the two is
    # constant across it). Up: world z, so floors line up across buildings.
    u = math_node('DIVIDE', math_node('ADD', pos.outputs['X'], pos.outputs['Y']), bay)
    v = math_node('DIVIDE', pos.outputs['Z'], floor)
    fu, fv = math_node('FRACT', u), math_node('FRACT', v)
    in_v = math_node('MULTIPLY', math_node('GREATER_THAN', fv, sill), math_node('LESS_THAN', fv, head))
    if ribbon:
        in_u = 1.0
    else:
        in_u = math_node('MULTIPLY', math_node('GREATER_THAN', fu, (1 - pane) / 2), math_node('LESS_THAN', fu, (1 + pane) / 2))
    side = math_node('LESS_THAN', math_node('ABSOLUTE', nor.outputs['Z']), 0.5)
    window = math_node('MULTIPLY', math_node('MULTIPLY', in_v, in_u), side)

    wall_b = nodes.new('ShaderNodeBsdfPrincipled')
    wall_b.inputs['Base Color'].default_value = srgb(wall)
    wall_b.inputs['Roughness'].default_value = 0.62
    glass_b = nodes.new('ShaderNodeBsdfPrincipled')
    glass_b.inputs['Base Color'].default_value = srgb(glass)
    glass_b.inputs['Roughness'].default_value = 0.1
    glass_b.inputs['Metallic'].default_value = 0.35
    # Which panes are lit: white noise over the pane's cell, and the object's
    # own random so neighbouring towers differ.
    info = nodes.new('ShaderNodeObjectInfo')
    cell = nodes.new('ShaderNodeCombineXYZ')
    links.new(math_node('FLOOR', u), cell.inputs['X'])
    links.new(math_node('FLOOR', v), cell.inputs['Y'])
    links.new(math_node('MULTIPLY', info.outputs['Random'], 97.0), cell.inputs['Z'])
    noise = nodes.new('ShaderNodeTexWhiteNoise')
    noise.noise_dimensions = '3D'
    links.new(cell.outputs[0], noise.inputs['Vector'])
    split = nodes.new('ShaderNodeSeparateColor')
    links.new(noise.outputs['Color'], split.inputs[0])
    on = math_node('LESS_THAN', noise.outputs['Value'], share)
    level = math_node('MULTIPLY', on, math_node('MULTIPLY', math_node('ADD', split.outputs['Green'], 0.35), strength * LIT))
    tint = nodes.new('ShaderNodeMix')
    tint.data_type = 'RGBA'
    tint.inputs[6].default_value = srgb('#FFAE5E')
    tint.inputs[7].default_value = srgb('#FFD9A6')
    links.new(split.outputs['Blue'], tint.inputs['Factor'])
    links.new(tint.outputs[2], glass_b.inputs['Emission Color'])
    links.new(level, glass_b.inputs['Emission Strength'])

    mix = nodes.new('ShaderNodeMixShader')
    links.new(window, mix.inputs['Fac'])
    links.new(wall_b.outputs[0], mix.inputs[1])
    links.new(glass_b.outputs[0], mix.inputs[2])
    shader = mix.outputs[0]
    if roof:
        roof_b = nodes.new('ShaderNodeBsdfPrincipled')
        roof_b.inputs['Base Color'].default_value = srgb(roof)
        roof_b.inputs['Roughness'].default_value = 0.8
        top = math_node('GREATER_THAN', nor.outputs['Z'], 0.5)
        mix2 = nodes.new('ShaderNodeMixShader')
        links.new(top, mix2.inputs['Fac'])
        links.new(shader, mix2.inputs[1])
        links.new(roof_b.outputs[0], mix2.inputs[2])
        shader = mix2.outputs[0]
    links.new(shader, out.inputs['Surface'])
    _mats[key] = m
    return m


def screen_material():
    """The control centre's video wall: the page's own dashboard render."""
    if 'screen-wall' in _mats:
        return _mats['screen-wall']
    m = bpy.data.materials.new('screen-wall')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(ROOT, 'public', 'landmarks', 'dashboard.jpg'))
    nt.links.new(tex.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Base Color'].default_value = (0, 0, 0, 1)
    b.inputs['Emission Strength'].default_value = 1.1 + 1.1 * LIT
    b.inputs['Roughness'].default_value = 0.25
    _mats['screen-wall'] = m
    return m


# ---- small parts ----------------------------------------------------------------
def tower(name, x, z, w, d, h, style, y=TOP, crown=True):
    """A block of `h` on the platform, its facade from `style`, a plant room on
    the roof."""
    body = box(name, w, h, d, x, y + h / 2, z, style, bevel=0.06)
    if crown and w > 3 and d > 3:
        box(name + '-plant', w * 0.45, 0.9, d * 0.4, x - w * 0.12, y + h + 0.45, z - d * 0.1, P('lavender'), bevel=0.04)
        box(name + '-parapet', w + 0.12, 0.25, d + 0.12, x, y + h + 0.05, z, P('white'), bevel=0.03)
    return body


def icosphere(name, r, x, y, z, m, scale=(1, 1, 1), subdiv=2):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=r)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me))
    obj.location = V(x, y, z)
    obj.scale = (scale[0], scale[2], scale[1])
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.data.materials.append(m)
    return obj


def tree(x, z, s=1.0, y=TOP, kind=None):
    kind = kind or rng.choice(['round', 'round', 'round', 'cone', 'blossom'] if rng.random() < 0.9 else ['blossom'])
    s *= 1.3 * rng.uniform(0.85, 1.15)
    cylinder('trunk', 0.09 * s, 0.9 * s, x, y + 0.45 * s, z, P('trunk'), n=6)
    leaf = {'round': rng.choice(['leaf', 'leaf-2']), 'cone': 'leaf-3', 'blossom': 'blossom'}[kind]
    if kind == 'cone':
        cylinder('crown', 0.75 * s, 2.3 * s, x, y + 1.9 * s, z, P(leaf, rough=0.8), n=10, r_top=0.02)
    else:
        icosphere('crown', 0.8 * s, x, y + 1.55 * s, z, P(leaf, rough=0.85), scale=(1, 1.08, 1))


def trees_along(x0, z0, x1, z1, every=2.6, s=0.9, y=TOP, jitter=0.25):
    n = max(1, int(math.dist((x0, z0), (x1, z1)) / every))
    for i in range(n + 1):
        t = i / n
        tree(x0 + (x1 - x0) * t + rng.uniform(-jitter, jitter), z0 + (z1 - z0) * t + rng.uniform(-jitter, jitter), s, y)


def grove(cx, cz, rx, rz, count, s=0.95, y=TOP):
    for _ in range(count):
        a, r = rng.uniform(0, 2 * math.pi), math.sqrt(rng.random())
        tree(cx + math.cos(a) * rx * r, cz + math.sin(a) * rz * r, s, y)


def lamp(x, z, y=TOP):
    cylinder('lamp-pole', 0.06, 3.1, x, y + 1.55, z, P('graphite', rough=0.4, metal=0.5), n=6)
    box('lamp-head', 0.55, 0.12, 0.22, x, y + 3.12, z, mat('lamp', '#FFF3E0', emit='#FFD29A', lit=14, day=0))
    LAMPS.append((x, y + 2.9, z))


CAR_COLOURS = ['#F4F2F6', '#F4F2F6', '#C9C6D1', '#3A3746', '#6E5A93', '#2F4E78', '#B7A6D8', '#E7E1D6']


def car(x, z, along_x=True, colour=None, y=0.06, scale=1.0, stripe=None):
    colour = colour or rng.choice(CAR_COLOURS)
    w, d = (1.9, 0.92) if along_x else (0.92, 1.9)
    w, d = w * scale, d * scale
    body = mat('car-' + colour, colour, rough=0.28, metal=0.45)
    box('car', w, 0.5, d, x, y + 0.3, z, body, bevel=0.14)
    cw, cd = (w * 0.55, d * 0.86) if along_x else (w * 0.86, d * 0.55)
    box('car-cabin', cw, 0.4, cd, x - (0.08 if along_x else 0), y + 0.72, z, P('glass', rough=0.08, metal=0.4), bevel=0.1)
    if stripe:
        box('car-stripe', w + 0.02, 0.08, d + 0.02, x, y + 0.42, z, mat('stripe-' + stripe, stripe, rough=0.4))
    head = mat('headlight', '#FFFFFF', emit='#FFF4DC', lit=12)
    tail = mat('taillight', '#6B1020', emit='#FF2A3A', lit=7)
    if along_x:
        for s in (-0.3, 0.3):
            box('head', 0.05, 0.1, 0.18, x + w / 2, y + 0.38, z + s * d, head)
            box('tail', 0.05, 0.1, 0.18, x - w / 2, y + 0.38, z + s * d, tail)
    else:
        for s in (-0.3, 0.3):
            box('head', 0.18, 0.1, 0.05, x + s * w, y + 0.38, z + d / 2, head)
            box('tail', 0.18, 0.1, 0.05, x + s * w, y + 0.38, z - d / 2, tail)


def platform(x, z, w, d, lawn=True):
    box('platform', w, TOP, d, x, TOP / 2, z, P('paving', rough=0.75), bevel=0.12)
    if lawn:
        box('lawn', w - 1.4, 0.06, d - 1.4, x, TOP + 0.02, z, P('lawn', rough=0.9), bevel=0.2)


def edge_lamps(x, z, w, d, every=6.5, skip=()):
    """Lamps round a block's kerb, facing the streets."""
    for side in ('n', 's', 'e', 'w'):
        if side in skip:
            continue
        if side in 'ns':
            zz = z + (-(d / 2) + 0.45 if side == 'n' else d / 2 - 0.45)
            n = int((w - 3) // every)
            for i in range(n + 1):
                lamp(x - (w - 3) / 2 + i * (w - 3) / max(n, 1), zz)
        else:
            xx = x + (-(w / 2) + 0.45 if side == 'w' else w / 2 - 0.45)
            n = int((d - 3) // every)
            for i in range(n + 1):
                lamp(xx, z - (d - 3) / 2 + i * (d - 3) / max(n, 1))


# ---- the ground --------------------------------------------------------------------
def ground():
    box('slab', 89, 1.6, 67, 0, -0.8, 0, P('slab', rough=0.7), bevel=0.35, segments=3)
    box('asphalt', 87.4, 0.06, 65.4, 0, 0.0, 0, P('asphalt', rough=0.82), bevel=0.3)
    paint = P('paint', rough=0.6)
    for x in STREET_X:
        for z in range(-31, 32, 3):
            if all(abs(z - sz) > 3.5 for sz in STREET_Z):
                box('dash', 0.13, 0.02, 1.3, x, 0.04, z, paint)
    for z in STREET_Z:
        for x in range(-43, 44, 3):
            if all(abs(x - sx) > 4 for sx in STREET_X):
                box('dash', 1.3, 0.02, 0.13, x, 0.04, z, paint)
    # Zebra crossings on every arm of the two big crossroads.
    for sx in STREET_X:
        for sz in STREET_Z:
            for i in range(6):
                off = -1.5 + i * 0.6
                box('zebra', 0.32, 0.02, 2.4, sx + off, 0.045, sz - 3.6, paint)
                box('zebra', 0.32, 0.02, 2.4, sx + off, 0.045, sz + 3.6, paint)
                box('zebra', 2.4, 0.02, 0.32, sx - 3.9, 0.045, sz + off, paint)
                box('zebra', 2.4, 0.02, 0.32, sx + 3.9, 0.045, sz + off, paint)


# ---- districts ----------------------------------------------------------------------
def civic():
    x, z, w, d = BLOCKS['civic']
    platform(x, z, w, d, lawn=False)
    box('plaza', w - 1.2, 0.05, d - 1.2, x, TOP + 0.02, z, P('plaza', rough=0.7), bevel=0.1)
    hall = facade('civic-hall', '#F4F1EC', floor=3.0, bay=1.2, pane=0.6, roof='#DAD4CC')
    hx, hw = x + 2, 16
    box('hall', hw, 6, 7, hx, TOP + 3, z - 3.5, hall, bevel=0.05)
    box('hall-cornice', hw + 0.8, 0.35, 7.8, hx, TOP + 6.15, z - 3.5, P('white'), bevel=0.05)
    # Brise-soleil: slim white fins along the two faces the camera sees.
    fin = P('white', rough=0.5)
    for i in range(int(hw / 0.75)):
        box('fin', 0.16, 5.4, 0.55, hx - hw / 2 + 0.4 + i * 0.75, TOP + 3, z + 0.2, fin)
    for i in range(9):
        box('fin', 0.55, 5.4, 0.16, hx + hw / 2 + 0.2, TOP + 3, z - 6.6 + i * 0.75, fin)
    # The rotunda: a glass drum on the hall, a thin disc roof, a mast.
    drum = facade('civic-drum', '#F4F1EC', glass='#4B6C8C', floor=1.6, ribbon=True, sill=0.18, head=0.9, share=0.6)
    cylinder('drum', 3.1, 3.4, hx, TOP + 6.3 + 1.7, z - 3.5, drum, n=40)
    cylinder('drum-roof', 3.7, 0.35, hx, TOP + 9.85, z - 3.5, P('white'), n=40, bevel=0.08)
    cylinder('mast', 0.07, 2.4, hx, TOP + 11.2, z - 3.5, P('steel', metal=0.6, rough=0.3), n=6)
    sphere('mast-light', 0.16, hx, TOP + 12.45, z - 3.5, mat('beacon-lime', '#C7FF3D', emit='#C7FF3D', lit=10, day=2))
    ANCHORS['civic'] = [hx, TOP + 12.6, z - 3.5]
    office = facade('office', '#EEF0F5', glass='#3F5F80', floor=3.4, bay=1.2, pane=0.82, sill=0.1, head=0.92, roof='#D6D2E0', share=0.5)
    tower('civic-office', x - 9.5, z - 4.5, 4.5, 5, 18, office)
    # Entrance steps and a reflecting pool on the plaza.
    for i in range(4):
        box('step', 6, 0.12, 0.5, x, TOP + 0.08 + i * 0.12, z + 0.9 - i * 0.35, P('stone'))
    box('pool', 13, 0.12, 3.2, x - 1, TOP + 0.08, z + 4.6, P('water', rough=0.05, metal=0.2), bevel=0.05)
    box('pool-rim', 13.6, 0.1, 3.8, x - 1, TOP + 0.03, z + 4.6, P('stone'), bevel=0.05)
    for i, fx in enumerate((x + 7.5, x + 8.6, x + 9.7)):
        cylinder('flagpole', 0.05, 5, fx, TOP + 2.5, z + 4.8, P('steel', metal=0.6, rough=0.3), n=6)
        box('flag', 1.2, 0.7, 0.03, fx + 0.62, TOP + 4.55, z + 4.8, mat(f'flag{i}', ['#52205E', '#C7FF3D', '#F4F2F6'][i], rough=0.8))
    trees_along(x - 11.5, z + 7.6, x + 5.5, z + 7.6, every=2.4, s=0.8)
    trees_along(x - 11.6, z - 7.6, x - 11.6, z + 6, every=2.6, s=0.85)
    edge_lamps(x, z, w, d)


def hospital():
    x, z, w, d = BLOCKS['hospital']
    platform(x, z, w, d)
    med = facade('hospital', '#F6F5F8', glass='#3F6F7E', floor=3.0, bay=1.5, pane=0.66, roof='#D8D4DE', share=0.5)
    box('paving', 16, 0.05, 10, x - 1, TOP + 0.03, z, P('plaza'), bevel=0.1)
    tower('hosp-tower', x - 4.5, z - 2.5, 8, 7, 21, med)
    tower('research', x + 7, z - 5.5, 5, 4.5, 13, facade('office', '#EEF0F5'))
    box('hosp-wing', 13, 7.5, 6, x + 3.5, TOP + 3.75, z + 2.8, med, bevel=0.05)
    # Helipad on the wing.
    cylinder('helipad', 2.5, 0.16, x + 5.5, TOP + 7.6, z + 2.8, P('graphite', rough=0.7), n=40)
    white = P('paint')
    box('H', 0.28, 0.03, 1.6, x + 4.95, TOP + 7.7, z + 2.8, white)
    box('H', 0.28, 0.03, 1.6, x + 6.05, TOP + 7.7, z + 2.8, white)
    box('H', 1.1, 0.03, 0.28, x + 5.5, TOP + 7.7, z + 2.8, white)
    for a in range(24):
        t = a / 24 * 2 * math.pi
        box('pad-ring', 0.35, 0.03, 0.12, x + 5.5 + math.cos(t) * 2.2, TOP + 7.7, z + 2.8 + math.sin(t) * 2.2, white,
            rot_y=-t + math.pi / 2)
    # The cross on the tower's street face.
    cross = mat('cross', '#C044D9', emit='#E07CF2', lit=6, day=0.4)
    box('cross', 2.6, 0.7, 0.1, x - 4.5, TOP + 18.6, z + 1.06, cross)
    box('cross', 0.7, 2.6, 0.1, x - 4.5, TOP + 18.6, z + 1.06, cross)
    # Emergency bay.
    box('canopy', 5.5, 0.25, 3, x + 6.5, TOP + 2.6, z - 2.2, P('white'), bevel=0.05)
    for cx in (x + 4.2, x + 8.8):
        cylinder('canopy-post', 0.08, 2.4, cx, TOP + 1.3, z - 1.0, P('steel', metal=0.6), n=6)
    car(x + 6, z - 2.3, True, '#F4F2F6', y=TOP, scale=1.15, stripe='#C044D9')
    ANCHORS['hospital'] = [x - 4.5, TOP + 22.4, z - 2.5]
    ANCHORS['sensor-hospital'] = [x + 3.5, TOP + 8.2, z + 2.8]
    grove(x - 7.5, z + 5.5, 3, 1.8, 6, s=0.85)
    trees_along(x + 10.6, z - 7, x + 10.6, z + 6.5, every=2.6, s=0.8)
    edge_lamps(x, z, w, d)


def oval(name, cx, cz, length, width, y, h, m, steps=48):
    r = width / 2
    straight = length - width
    pts = []
    for i in range(steps // 2 + 1):
        a = -math.pi / 2 + math.pi * i / (steps // 2)
        pts.append((cx + straight / 2 + r * math.cos(a), cz + r * math.sin(a)))
    for i in range(steps // 2 + 1):
        a = math.pi / 2 + math.pi * i / (steps // 2)
        pts.append((cx - straight / 2 + r * math.cos(a), cz + r * math.sin(a)))
    return prism(name, list(reversed(pts)), y, y + h, m)


def school():
    x, z, w, d = BLOCKS['school']
    platform(x, z, w, d)
    oval('track', x + 3.8, z + 2.2, 14, 8, TOP, 0.06, P('track', rough=0.9))
    oval('field', x + 3.8, z + 2.2, 11.6, 5.6, TOP, 0.1, P('lawn-dark', rough=0.9))
    box('halfway', 0.1, 0.02, 5.6, x + 3.8, TOP + 0.11, z + 2.2, P('paint'))
    edu = facade('school', '#F3EEE6', glass='#46677F', floor=3.1, bay=2.2, pane=0.78, roof='#9BC47E', share=0.45)
    box('school-a', 10, 5.2, 5, x - 5.5, TOP + 2.6, z - 4.5, edu, bevel=0.05)
    box('school-b', 5, 4, 9, x - 8.5, TOP + 2, z + 2.5, edu, bevel=0.05)
    box('school-canopy', 4, 0.2, 2.2, x - 1.4, TOP + 3.2, z - 1.5, P('white'))
    ANCHORS['school'] = [x - 5.5, TOP + 6.4, z - 4.5]
    trees_along(x - 11, z + 7.2, x + 11, z + 7.2, every=2.6, s=0.75)
    trees_along(x + 11, z - 6.8, x + 11, z + 5, every=2.8, s=0.8)
    edge_lamps(x, z, w, d)


def water():
    x, z, w, d = BLOCKS['water']
    # Two banks either side of the canal.
    zn0, zs0 = z - d / 2, z + 2.6
    platform(x, (zn0 + z - 2.6) / 2, w, (z - 2.6) - zn0)
    platform(x, (zs0 + z + d / 2) / 2, w, z + d / 2 - zs0)
    box('canal-bed', w, 0.3, 5.2, x, -0.05, z, P('graphite'))
    box('canal-water', w - 0.1, 0.12, 5.2, x, 0.12, z, P('water', rough=0.04, metal=0.25))
    # The barrier across the canal: piers, raised steel gates, a deck.
    bx = x + 3
    concrete = P('stone', rough=0.8)
    for pz in (z - 2.6, z, z + 2.6):
        box('pier', 1.8, 3.4, 0.9, bx, 1.6, pz, concrete, bevel=0.08)
    steel = mat('gate-steel', '#5D6A82', rough=0.35, metal=0.7)
    for gz in (z - 1.3, z + 1.3):
        box('gate', 0.35, 1.4, 1.7, bx, 2.3, gz, steel, bevel=0.05)
        box('gate-hazard', 0.37, 0.18, 1.72, bx, 1.55, gz, mat('hazard', '#E8B64A', rough=0.5))
    box('deck', 2.6, 0.35, 6.6, bx, 3.45, z, P('white'), bevel=0.06)
    ctrl = facade('barrier-house', '#F4F2F6', glass='#3D6A86', floor=2.6, ribbon=True, sill=0.35, head=0.85, share=1)
    box('control', 2.4, 2.3, 2.4, bx, 3.6 + 1.15, z - 2.3, ctrl, bevel=0.04)
    box('control-roof', 2.8, 0.18, 2.8, bx, 6.0, z - 2.3, P('white'))
    ANCHORS['water'] = [bx, 7.2, z - 2.3]
    # The water gauge: a graduated post on the north bank.
    gx, gz = -10.6, 19.4
    for i in range(8):
        box('gauge', 0.3, 0.55, 0.3, gx, TOP + 0.28 + i * 0.55, gz, mat('gauge-' + str(i % 2), ['#F5F3F7', '#C5344E'][i % 2], rough=0.5))
    sphere('gauge-light', 0.2, gx, TOP + 4.75, gz, mat('beacon-orchid', '#C044D9', emit='#E07CF2', lit=10, day=1.5))
    ANCHORS['gauge'] = [gx, TOP + 4.8, gz]
    ANCHORS['sensor-water'] = [gx, TOP + 4.8, gz]
    # Pump station on the south bank.
    pump = facade('pump', '#EDE8F1', glass='#46677F', floor=2.8, bay=1.6, roof='#CFC8D8')
    box('pump', 6, 3.2, 4, x - 6, TOP + 1.6, z + 5.5, pump, bevel=0.05)
    for i in range(3):
        tube('pipe', [(x - 3 + i * 0.8, TOP + 0.6, z + 3.9), (x - 3 + i * 0.8, TOP + 0.6, z + 2.9), (x - 3 + i * 0.8, 0.3, z + 2.6)], 0.16,
             mat('pipe-blue', '#3E7FB8', rough=0.35, metal=0.4))
    trees_along(x - 11, z - 3.6, x + 0.5, z - 3.6, every=2.2, s=0.7)
    trees_along(x + 5.5, z + 7.2, x + 11, z + 7.2, every=2.2, s=0.75)
    grove(x + 7.5, z - 6, 3, 1.6, 5, s=0.8)
    # The area the forecast marks, at the water.
    ANCHORS['risk'] = [[x - 11.5, 0.5, z - 5.5], [x + 11.5, 0.5, z - 5.5], [x + 11.5, 0.5, z + 5.5], [x - 11.5, 0.5, z + 5.5]]
    ANCHORS['risk-centre'] = [x, 0.5, z]
    edge_lamps(x, (zn0 + z - 2.6) / 2, w, (z - 2.6) - zn0, skip=('s',))
    edge_lamps(x, (zs0 + z + d / 2) / 2, w, z + d / 2 - zs0, skip=('n',))


def sawtooth_hall(name, x0, x1, z0, depth, y, wall_h, teeth, skin, glass):
    """A shed with a north-light roof: `teeth` ridges across its depth."""
    box(name, x1 - x0, wall_h, depth, (x0 + x1) / 2, y + wall_h / 2, z0 + depth / 2, skin, bevel=0.04)
    step = depth / teeth
    for i in range(teeth):
        za = z0 + i * step
        extrude_x(name + '-tooth', [(za, y + wall_h), (za + step, y + wall_h), (za, y + wall_h + 1.5)], x0, x1, P('lavender', rough=0.55))
        box(name + '-light', x1 - x0 - 0.3, 1.3, 0.06, (x0 + x1) / 2, y + wall_h + 0.7, za + 0.04, glass)


def industry():
    x, z, w, d = BLOCKS['industry']
    platform(x, z, w, d)
    box('yard', w - 2, 0.05, d - 2, x, TOP + 0.03, z, P('paving', rough=0.8))
    skin = facade('shed', '#DDDCE6', glass='#4A6A86', floor=4.2, bay=2.4, pane=0.5, sill=0.62, head=0.9, roof='#C9C4D6')
    glow = mat('shed-glass', '#4A6A86', rough=0.1, metal=0.3, emit='#FFE2B5', lit=4)
    sawtooth_hall('hall-a', x - 11, x + 1, z - 8, 8, TOP, 4.2, 4, skin, glow)
    sawtooth_hall('hall-b', x - 11, x - 2, z + 1.5, 5.5, TOP, 3.4, 3, skin, glow)
    tower('ind-office', x + 9.5, z - 6, 4, 4, 9, facade('office', '#EEF0F5'))
    # Chimneys with red and white bands.
    for i, cx in enumerate((x + 5, x + 7.2)):
        h = 12 - i * 1.5
        for k in range(6):
            cylinder('stack', 0.55, h / 6, cx, TOP + h / 12 + k * h / 6, z - 5.5, mat('stack-' + str(k % 2), ['#F2F0F4', '#C8413F'][k % 2], rough=0.6), n=20)
    ANCHORS['industry'] = [x + 5, TOP + 13.2, z - 5.5]
    ANCHORS['sensor-industry'] = [x + 5, TOP + 12.4, z - 5.5]
    # Tanks and a pipe rack.
    for i, (tx, tz) in enumerate(((x + 4.5, z + 2), (x + 8, z + 2), (x + 8, z + 5.5))):
        cylinder('tank', 1.5, 3.4, tx, TOP + 1.7, tz, P('white', rough=0.4), n=32, bevel=0.1)
        sphere('tank-top', 1.5, tx, TOP + 3.4, tz, P('white', rough=0.4), scale=(1, 0.3, 1), hemi=True)
    rack = mat('pipe-steel', '#8E8CA0', rough=0.35, metal=0.6)
    tube('rack', [(x + 1.6, TOP + 2.6, z - 1), (x + 4.5, TOP + 2.6, z - 1), (x + 4.5, TOP + 2.6, z + 0.6)], 0.16, rack)
    tube('rack', [(x + 1.6, TOP + 2.2, z - 1.4), (x + 8, TOP + 2.2, z - 1.4), (x + 8, TOP + 2.2, z + 0.6)], 0.16,
         mat('pipe-lime', '#9BCB3A', rough=0.4, metal=0.3))
    # Containers.
    colours = ['#6E5A93', '#E0B84C', '#3E7FB8', '#C95E4E', '#F2F0F4']
    for i in range(6):
        cx, cz, level = x - 9 + (i % 3) * 2.8, z + 8.2 - 1.2 * (i // 3) * 0, (i // 3)
        box('container', 2.6, 1.1, 1.05, cx, TOP + 0.55 + level * 1.12, z + 8.1 - level * 0.0 - (i // 3) * 0, mat('box-' + colours[i % 5], colours[i % 5], rough=0.55), bevel=0.03)
    trees_along(x + 11, z - 7, x + 11, z + 7, every=2.6, s=0.8)
    edge_lamps(x, z, w, d)


def turbine(x, z, h, y=TOP, spin=0.0):
    white = P('white', rough=0.4)
    cylinder('turbine-tower', 0.38, h, x, y + h / 2, z, white, n=20, r_top=0.2)
    box('nacelle', 0.7, 0.7, 1.6, x, y + h + 0.1, z - 0.3, white, bevel=0.2)
    sphere('hub', 0.3, x, y + h + 0.1, z + 0.55, white, scale=(1, 1, 1.4))
    hx, hy, hz = x, y + h + 0.1, z + 0.6
    for k in range(3):
        a = spin + k * 2 * math.pi / 3
        length = 6.2
        me_obj = box('blade', 0.32, length, 0.08, 0, 0, 0, white, bevel=0.05)
        # Rotate in the rotor plane (page x-y, facing +z).
        cx, cy = hx + math.sin(a) * length / 2, hy + math.cos(a) * length / 2
        me_obj.location = V(cx, cy, hz)
        me_obj.rotation_euler = (0, a, 0)
    return [x, y + h + 1.2, z]


def energy():
    x, z, w, d = BLOCKS['energy']
    platform(x, z, w, d)
    panel = mat('solar', PALETTE['solar'], rough=0.12, metal=0.35)
    frame = P('steel', metal=0.6, rough=0.3)
    for r in range(5):
        pz = z + 0.2 + r * 1.75
        p = box('panel', 11, 0.08, 1.3, x - 4, TOP + 0.75, pz, panel)
        p.rotation_euler = (math.radians(-24), 0, 0)
        box('panel-frame', 11.1, 0.05, 1.35, x - 4, TOP + 0.7, pz, frame).rotation_euler = (math.radians(-24), 0, 0)
        for px in (x - 9, x - 4, x + 1):
            cylinder('panel-leg', 0.05, 0.7, px, TOP + 0.35, pz, frame, n=6)
    tops = [turbine(x - 8, z - 6, 14, spin=0.3), turbine(x - 0.5, z - 5.5, 15, spin=1.1), turbine(x + 7, z - 6, 14, spin=2.0)]
    ANCHORS['energy'] = tops[1]
    ANCHORS['sensor-energy'] = tops[0]
    # Battery storage and a substation.
    batt = mat('battery', '#F5F3F7', rough=0.45)
    for i in range(4):
        box('battery', 3, 1.4, 1.3, x + 6.5, TOP + 0.7, z + 0.5 + i * 1.7, batt, bevel=0.05)
        box('battery-stripe', 3.02, 0.12, 1.32, x + 6.5, TOP + 1.2, z + 0.5 + i * 1.7, mat('stripe-lime', '#C7FF3D', rough=0.5, emit='#C7FF3D', lit=2))
    trees_along(x - 11, z + 7.4, x + 4, z + 7.4, every=2.4, s=0.7)
    edge_lamps(x, z, w, d)


def transit():
    x, z, w, d = BLOCKS['transit']
    platform(x, z, w, d, lawn=False)
    box('forecourt', w - 1.2, 0.05, d - 1.2, x, TOP + 0.02, z, P('plaza'), bevel=0.1)
    bed = mat('ballast', '#8E8797', rough=0.95)
    rail = P('steel', metal=0.8, rough=0.25)
    for tz in (z - 3.2, z + 0.2):
        box('track-bed', w - 0.4, 0.12, 2.2, x, TOP + 0.06, tz, bed)
        for s in (-0.55, 0.55):
            box('rail', w - 0.4, 0.08, 0.1, x, TOP + 0.16, tz + s, rail)
    box('platform-deck', w - 1, 0.5, 1.4, x, TOP + 0.25, z - 1.5, P('stone'), bevel=0.04)
    # A train: three cars, white with a lime line and a band of windows.
    body = facade('train', '#F7F6F9', glass='#2E3E55', floor=1.5, ribbon=True, sill=0.52, head=0.86, share=1, strength=2)
    for i in range(3):
        box('train-car', 6, 1.45, 1.35, x - 6.5 + i * 6.3, TOP + 0.95, z - 3.2, body, bevel=0.3, segments=3)
        box('train-line', 6.02, 0.1, 1.37, x - 6.5 + i * 6.3, TOP + 0.62, z - 3.2, mat('stripe-lime', '#C7FF3D', rough=0.5, emit='#C7FF3D', lit=2))
    # The vaulted canopy over both tracks.
    profile_out, profile_in = [], []
    for i in range(21):
        t = math.pi * i / 20
        zz = z - 1.5 + math.cos(t) * 4.6
        profile_out.append((zz, TOP + 3.2 + math.sin(t) * 2.6))
        profile_in.append((z - 1.5 + math.cos(t) * 4.4, TOP + 3.2 + math.sin(t) * 2.4))
    extrude_x('canopy', profile_out + list(reversed(profile_in)), x - 8, x + 8,
              mat('canopy', '#F7F6FA', rough=0.35, alpha=1))
    for cx in (x - 7.5, x - 2.5, x + 2.5, x + 7.5):
        for cz in (z - 6.0, z + 3.0):
            cylinder('canopy-col', 0.12, 3.2, cx, TOP + 1.6, cz, P('white'), n=8)
    ANCHORS['transit'] = [x, TOP + 6.4, z - 1.5]
    station = facade('station', '#F2EFF5', glass='#46677F', floor=3.2, bay=2.0, pane=0.8, sill=0.12, head=0.9, roof='#D9D2E6')
    box('station', 8, 3.6, 3.4, x + 5.5, TOP + 1.8, z + 5.6, station, bevel=0.05)
    for i in range(2):
        car(x - 5 - i * 3.8, z + 5.8, True, '#F4F2F6', y=TOP, scale=1.7, stripe='#6E5A93')
    trees_along(x - 10, z + 7.8, x - 1, z + 7.8, every=2.2, s=0.7)
    edge_lamps(x, z, w, d)


def ferris(cx, cz, y, r=5.2):
    white = P('white', rough=0.35)
    hub_y = y + r + 1.2
    for dz in (-0.45, 0.45):
        tube('wheel-rim', [(cx + r * math.cos(t), hub_y + r * math.sin(t), cz + dz) for t in
                           [2 * math.pi * i / 48 for i in range(48)]], 0.08, white, cyclic=True)
        for k in range(12):
            t = 2 * math.pi * k / 12
            tube('spoke', [(cx, hub_y, cz + dz), (cx + r * math.cos(t), hub_y + r * math.sin(t), cz + dz)], 0.03, white)
    colours = ['#C044D9', '#C7FF3D', '#6E5A93', '#E3A6DA']
    for k in range(12):
        t = 2 * math.pi * k / 12 + 0.13
        px, py = cx + r * math.cos(t), hub_y + r * math.sin(t)
        c = colours[k % 4]
        box('cabin', 0.55, 0.6, 0.7, px, py - 0.4, cz, mat('cabin-' + c, c, rough=0.4, emit=c, lit=2.5), bevel=0.12)
    for sx in (-1, 1):
        tube('wheel-leg', [(cx + sx * 2.6, y, cz - 1.2), (cx, hub_y, cz - 0.5)], 0.12, white)
        tube('wheel-leg', [(cx + sx * 2.6, y, cz + 1.2), (cx, hub_y, cz + 0.5)], 0.12, white)
    cylinder('wheel-hub', 0.3, 1.4, cx, hub_y, cz, white, axis='z', n=16)


def tourism():
    x, z, w, d = BLOCKS['tourism']
    platform(x, z, w, d)
    lake = cylinder('lake', 1, 0.1, x - 3, TOP + 0.05, z + 2.5, P('water', rough=0.04, metal=0.25), n=48)
    lake.scale = (6, 4, 1)
    rim = cylinder('lake-rim', 1, 0.08, x - 3, TOP + 0.02, z + 2.5, P('stone'), n=48)
    rim.scale = (6.5, 4.5, 1)
    ferris(x + 5.5, z - 3, TOP)
    ANCHORS['tourism'] = [x + 5.5, TOP + 12, z - 3]
    # Hotels behind the park: the city's skyline, on the back row where it
    # hides nothing.
    hotel = facade('hotel', '#E4DDEF', glass='#3E5A7C', floor=3.1, bay=1.3, ribbon=True, sill=0.2, head=0.88, roof='#CFC6DD', share=0.45)
    tower('hotel-a', x - 7.5, z - 5.5, 5.5, 5, 27, hotel)
    tower('hotel-b', x - 1.5, z - 6, 5, 4.5, 20, facade('office', '#EEF0F5'))
    box('pavilion', 4, 0.25, 3, x - 7.5, TOP + 2.4, z + 5.5, P('white'), bevel=0.06)
    for px in (x - 9.2, x - 5.8):
        for pz in (z + 4.3, z + 6.7):
            cylinder('pavilion-col', 0.08, 2.3, px, TOP + 1.15, pz, P('white'), n=8)
    grove(x - 1, z - 1.5, 2.5, 1.5, 5, s=0.9)
    trees_along(x + 1.5, z + 7.5, x + 10.5, z + 7.5, every=2.2, s=0.8)
    for _ in range(6):
        tree(x + rng.uniform(-10, -6), z + rng.uniform(-2, 2), 0.9, kind='blossom')
    edge_lamps(x, z, w, d)


def housing():
    x, z, w, d = BLOCKS['housing']
    platform(x, z, w, d)
    res = facade('residential', '#F6F4F8', glass='#48627F', floor=2.9, bay=1.6, pane=0.7, roof='#D9D2E6', share=0.45)
    res2 = facade('residential-lav', '#E3DCEE', glass='#48627F', floor=2.9, bay=1.4, ribbon=True, sill=0.3, head=0.82, roof='#CFC6DD', share=0.4)
    tower('res-a', x - 6.5, z - 4.5, 5, 5, 23, res)
    tower('res-b', x + 0.5, z - 5, 5.5, 4.5, 16, res2)
    tower('res-c', x + 7, z - 3.5, 4.5, 4.5, 11, res)
    # Balcony slabs on the tallest tower's two street faces.
    for k in range(1, 8):
        yy = TOP + k * 2.9
        box('balcony', 5.3, 0.1, 0.5, x - 6.5, yy, z - 1.8, P('white'))
    # Townhouses along the front, pitched roofs.
    house = facade('house', '#F4EFE8', glass='#48627F', floor=2.6, bay=1.3, pane=0.6, share=0.7)
    roof = mat('roof-lav', '#7C6A9B', rough=0.7)
    for i in range(5):
        hx = x - 8 + i * 3.6
        box('house', 3.2, 2.6, 3.4, hx, TOP + 1.3, z + 4.2, house, bevel=0.04)
        extrude_x('roof', [(z + 2.35, TOP + 2.6), (z + 6.05, TOP + 2.6), (z + 4.2, TOP + 3.9)], hx - 1.7, hx + 1.7, roof)
    grove(x - 1, z + 0.5, 4, 1.4, 6, s=0.8)
    trees_along(x - 10, z + 7.3, x + 10, z + 7.3, every=2.4, s=0.7)
    edge_lamps(x, z, w, d)


def command():
    """The control centre on its own island: a curved video wall over a low
    glass operations room, with the server pods beside it."""
    x, z = -62, 1
    box('island', 20, 1.6, 16, x, -0.8 + 0.4, z, P('slab', rough=0.7), bevel=0.35, segments=3)
    box('island-deck', 19, 0.1, 15, x, 0.45, z, P('paving', rough=0.7), bevel=0.2)
    y0 = 0.5
    ops = facade('ops', '#2C2A38', glass='#23324A', floor=3.0, ribbon=True, sill=0.12, head=0.95, share=0.9, strength=4, roof='#3A3746')
    box('ops', 12, 2.8, 5.5, x, y0 + 1.4, z + 2.6, ops, bevel=0.05)
    box('ops-roof', 12.6, 0.2, 6.1, x, y0 + 2.9, z + 2.6, P('white'), bevel=0.04)
    box('ops-line', 12.62, 0.06, 6.12, x, y0 + 2.8, z + 2.6, mat('line-lime', '#C7FF3D', emit='#C7FF3D', lit=5, day=1.2))
    # The wall: 16 quads on a gentle curve, the dashboard across them.
    n, half, bottom, top = 16, 7.5, y0 + 6.2, y0 + 14.2
    qs = []
    for i in range(n):
        xa, xb = -half + 2 * half * i / n, -half + 2 * half * (i + 1) / n
        za, zb = -3.6 + 1.6 * (xa / half) ** 2, -3.6 + 1.6 * (xb / half) ** 2
        qs.append((((x + xa, bottom, z + za), (x + xb, bottom, z + zb), (x + xb, top, z + zb), (x + xa, top, z + za)),
                   (i / n, 0, (i + 1) / n, 1)))
    quads('screen', qs, screen_material())
    frame = mat('wall-frame', '#23212E', rough=0.45, metal=0.3)
    back = []
    for i in range(n):
        xa, xb = -half + 2 * half * i / n, -half + 2 * half * (i + 1) / n
        za, zb = -3.6 + 1.6 * (xa / half) ** 2 - 0.2, -3.6 + 1.6 * (xb / half) ** 2 - 0.2
        back.append((((x + xb, bottom - 0.3, z + zb), (x + xa, bottom - 0.3, z + za), (x + xa, top + 0.3, z + za), (x + xb, top + 0.3, z + zb)), (0, 0, 1, 1)))
    quads('screen-back', back, frame)
    for px in (-5, -1.7, 1.7, 5):
        cylinder('wall-leg', 0.22, bottom - y0, x + px, y0 + (bottom - y0) / 2, z - 3.9 + 1.6 * (px / half) ** 2, frame, n=12)
    ANCHORS['hub'] = [x, y0 + 10.2, z - 3.2]
    # Server pods.
    pod = mat('pod', '#2A2835', rough=0.4, metal=0.3)
    for i in range(6):
        px, pz = x - 7.5 + (i % 3) * 1.6, z - 1.2 + (i // 3) * 1.9
        box('pod', 1, 1.8, 1, px, y0 + 0.9, pz, pod, bevel=0.06)
        box('pod-light', 0.08, 1.3, 0.06, px + 0.3, y0 + 1, pz + 0.51, mat('pod-lime', '#C7FF3D', emit='#C7FF3D', lit=6, day=1.5))
    for i in range(4):
        lamp(x - 9 + i * 6, z + 7.2, y=y0)
    grove(x + 7, z - 5, 1.6, 1.2, 3, s=0.8, y=y0)


def street_life():
    """Parked and moving cars on the four streets; the lanes for the film's
    traffic go into the layout."""
    lanes = []
    for sx in STREET_X:
        for off, sign in ((-1.0, -1), (1.0, 1)):
            lanes.append({'points': [[sx + off, 0.35, -32.5 * sign], [sx + off, 0.35, 32.5 * sign]]})
    for sz in STREET_Z:
        for off, sign in ((-1.0, 1), (1.0, -1)):
            lanes.append({'points': [[-43.5 * sign, 0.35, sz + off], [43.5 * sign, 0.35, sz + off]]})
    ANCHORS['lanes'] = lanes
    for sx in STREET_X:
        for _ in range(7):
            zz = rng.uniform(-31, 31)
            if all(abs(zz - sz) > 4.5 for sz in STREET_Z):
                car(sx + rng.choice((-1.0, 1.0)), zz, along_x=False)
    for sz in STREET_Z:
        for _ in range(9):
            xx = rng.uniform(-42, 42)
            if all(abs(xx - sx) > 4.5 for sx in STREET_X):
                car(xx, sz + rng.choice((-1.0, 1.0)), along_x=True)


def lamp_lights():
    for i, (x, y, z) in enumerate(LAMPS):
        data = bpy.data.lights.new(f'lamp{i}', 'POINT')
        data.energy = 75
        data.shadow_soft_size = 0.2
        data.color = srgb('#FFD29A')[:3]
        light = bpy.data.objects.new(f'lamp{i}', data)
        light.location = V(x, y - 0.15, z)
        bpy.context.scene.collection.objects.link(light)


def build():
    ground()
    for fn in (civic, hospital, school, water, industry, energy, transit, tourism, housing, command, street_life):
        fn()
    if LIT:
        lamp_lights()


def main():
    global LIT
    master_path, out = sys.argv[1:3]
    samples = int(sys.argv[3]) if len(sys.argv) > 3 else 64
    name = sys.argv[4] if len(sys.argv) > 4 else 'day'
    layout_path = sys.argv[5] if len(sys.argv) > 5 else None
    look = {**LOOKS[name], **json.loads(os.environ.get('PLATE_LOOK', '{}'))}
    LIT = look['lit']
    m = json.load(open(master_path))
    scene = reset()
    build()
    print(f'city: {len(bpy.data.objects)} objects, {len(LAMPS)} lamps', flush=True)
    if layout_path:
        with open(layout_path, 'w') as f:
            json.dump(ANCHORS, f, indent=1)
    stage(scene, m, look, ground_z=-1.6)
    shoot(scene, m, out, samples)


if __name__ == '__main__':
    main()
