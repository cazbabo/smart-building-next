"""The Bangkok-like city of scripts/city/plan.py, built in Blender for the film.

    python3 scripts/city/plan.py /tmp/plan.json
    node scripts/video/timeline.mjs /tmp/master.json scripts/city/camera.json
    python3 scripts/blender/bangkok.py /tmp/plan.json /tmp/master.json out.png [samples] [day|dusk] [layout.json]

Thousands of buildings, each with its own parts, would be tens of thousands of
Blender objects. Instead everything is written straight into one mesh per
material, and what tells one building from another travels with its
vertices: `col`, its wall colour; `seed`, its own random number, which picks
the lit windows at dusk; `fu`, the distance along the wall, so the facade
shader draws a window grid that follows the building even where the street
turns it off the axes. Floors are read from height, so they line up.

The city fades out at the plan's ellipse: every material is mixed towards
transparent by world position, over a film with no background.
"""
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
from common import reset, srgb  # noqa: E402
from plate import LOOKS, stage, shoot  # noqa: E402
import shapely  # noqa: E402
from shapely.geometry import LineString, Point, Polygon  # noqa: E402
from shapely.ops import unary_union  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
LIT = 0.0
rng = random.Random(5)
R2 = math.sqrt(2)
FLOOR = 1.25


def lin(h):
    return srgb(h)[:3]


# ---- geometry accumulated per material -----------------------------------------
class Layer:
    def __init__(self, name):
        self.name = name
        self.verts, self.faces, self.fu, self.seed, self.col, self.smooth = [], [], [], [], [], []

    def face(self, pts, col, seed=0.0, fu=None, smooth=False):
        base = len(self.verts)
        self.verts.extend(pts)
        self.fu.extend(fu if fu is not None else [0.0] * len(pts))
        self.seed.extend([seed] * len(pts))
        c = lin(col) if isinstance(col, str) else col
        self.col.extend([c] * len(pts))
        self.faces.append(tuple(range(base, base + len(pts))))
        self.smooth.append(smooth)


LAYERS = {}


def L(name):
    if name not in LAYERS:
        LAYERS[name] = Layer(name)
    return LAYERS[name]


class Frame:
    """A building's own axes: origin at its footprint centre on the ground,
    local x along the street, local z across it."""

    def __init__(self, cx, cz, ang=0.0, y0=0.0):
        self.cx, self.cz, self.y0 = cx, cz, y0
        self.c, self.s = math.cos(ang), math.sin(ang)

    def __call__(self, x, y, z):
        return (self.cx + x * self.c - z * self.s, self.y0 + y, self.cz + x * self.s + z * self.c)


WORLD = Frame(0, 0)


def box(layer, F, x, y, z, w, h, d, col, seed=0.0, top=True, tilt=0.0, sides=True):
    """Box in frame F: centred on (x, z), standing on y. `tilt` leans it about
    its own x axis (solar panels)."""
    hw, hd = w / 2, d / 2
    ct, st = math.cos(tilt), math.sin(tilt)

    def P(px, py, pz):
        # Tilt about the box's centre line, then into the frame.
        yy, zz = py - h / 2, pz
        yy, zz = yy * ct - zz * st, yy * st + zz * ct
        return F(x + px, y + h / 2 + yy, z + zz)

    y0, y1 = 0.0, h
    lay = L(layer)
    if sides:
        lay.face([P(-hw, y0, hd), P(hw, y0, hd), P(hw, y1, hd), P(-hw, y1, hd)], col, seed, [x - hw, x + hw, x + hw, x - hw])
        lay.face([P(hw, y0, -hd), P(-hw, y0, -hd), P(-hw, y1, -hd), P(hw, y1, -hd)], col, seed, [x + hw, x - hw, x - hw, x + hw])
        lay.face([P(hw, y0, hd), P(hw, y0, -hd), P(hw, y1, -hd), P(hw, y1, hd)], col, seed, [z + hd, z - hd, z - hd, z + hd])
        lay.face([P(-hw, y0, -hd), P(-hw, y0, hd), P(-hw, y1, hd), P(-hw, y1, -hd)], col, seed, [z - hd, z + hd, z + hd, z - hd])
    if top:
        lay.face([P(-hw, y1, hd), P(hw, y1, hd), P(hw, y1, -hd), P(-hw, y1, -hd)], col, seed)


def cyl(layer, F, x, y, z, r, h, col, n=12, seed=0.0, r_top=None, cap=True, smooth=True):
    rt = r if r_top is None else r_top
    lay = L(layer)
    ring0 = [F(x + r * math.cos(2 * math.pi * i / n), y, z + r * math.sin(2 * math.pi * i / n)) for i in range(n)]
    ring1 = [F(x + rt * math.cos(2 * math.pi * i / n), y + h, z + rt * math.sin(2 * math.pi * i / n)) for i in range(n)]
    circ = 2 * math.pi * r
    for i in range(n):
        j = (i + 1) % n
        lay.face([ring0[j], ring0[i], ring1[i], ring1[j]], col, seed,
                 [circ * (i + 1) / n, circ * i / n, circ * i / n, circ * (i + 1) / n], smooth)
    if cap and rt > 0.01:
        lay.face(list(ring1), col, seed)


def ico(layer, F, x, y, z, r, col, sub=1, sy=1.0, seed=0.0):
    # An icosphere, unit radius, subdivided `sub` times.
    t = (1 + 5 ** 0.5) / 2
    vs = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t),
          (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    vs = [tuple(c / math.sqrt(1 + t * t) for c in v) for v in vs]
    fs = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
          (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    for _ in range(sub):
        cache, nf = {}, []

        def mid(a, b):
            key = (min(a, b), max(a, b))
            if key not in cache:
                m = [(vs[a][k] + vs[b][k]) / 2 for k in range(3)]
                l = math.sqrt(sum(c * c for c in m))
                vs.append(tuple(c / l for c in m))
                cache[key] = len(vs) - 1
            return cache[key]
        for a, b, c in fs:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            nf += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        fs = nf
    lay = L(layer)
    for a, b, c in fs:
        lay.face([F(x + vs[i][0] * r, y + vs[i][1] * r * sy, z + vs[i][2] * r) for i in (a, b, c)], col, seed, smooth=True)


def gable(layer, F, x, y, z, w, d, rise, col, over=0.25, seed=0.0):
    """Pitched roof, ridge along local x, eaves overhanging by `over`."""
    hw, hd = w / 2 + over, d / 2 + over
    lay = L(layer)
    a, b = F(x - hw, y, z + hd), F(x + hw, y, z + hd)
    c, e = F(x + hw, y, z - hd), F(x - hw, y, z - hd)
    r0, r1 = F(x - hw, y + rise, z), F(x + hw, y + rise, z)
    lay.face([a, b, r1, r0], col, seed)
    lay.face([c, e, r0, r1], col, seed)
    lay.face([e, a, r0], col, seed)
    lay.face([b, c, r1], col, seed)


def hip(layer, F, x, y, z, w, d, rise, col, over=0.25, seed=0.0):
    hw, hd = w / 2 + over, d / 2 + over
    ridge = max(0.0, hw - hd)
    lay = L(layer)
    a, b, c, e = F(x - hw, y, z + hd), F(x + hw, y, z + hd), F(x + hw, y, z - hd), F(x - hw, y, z - hd)
    r0, r1 = F(x - ridge, y + rise, z), F(x + ridge, y + rise, z)
    lay.face([a, b, r1, r0], col, seed)
    lay.face([c, e, r0, r1], col, seed)
    lay.face([e, a, r0], col, seed)
    lay.face([b, c, r1], col, seed)


def seg(layer, a, b, r, col, n=6, seed=0.0):
    """A round bar from world point a to b - cables, rails, crane members."""
    ax, ay, az = a
    dx, dy, dz = b[0] - ax, b[1] - ay, b[2] - az
    length = math.sqrt(dx * dx + dy * dy + dz * dz) or 1e-6
    t = (dx / length, dy / length, dz / length)
    ref = (0, 1, 0) if abs(t[1]) < 0.9 else (1, 0, 0)
    u = (t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0])
    ul = math.sqrt(sum(c * c for c in u))
    u = tuple(c / ul for c in u)
    v = (t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0])
    lay = L(layer)
    ring = [(math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n)) for i in range(n)]
    p0 = [(ax + r * (cu * u[0] + sv * v[0]), ay + r * (cu * u[1] + sv * v[1]), az + r * (cu * u[2] + sv * v[2])) for cu, sv in ring]
    p1 = [(x + dx, y + dy, z + dz) for x, y, z in p0]
    for i in range(n):
        j = (i + 1) % n
        lay.face([p0[i], p0[j], p1[j], p1[i]], col, seed, smooth=True)


def polyline(layer, pts, r, col, n=6):
    for a, b in zip(pts, pts[1:]):
        seg(layer, a, b, r, col, n)


def flat(layer, poly, y, col):
    """A flat polygon (shapely), triangulated so holes and concave edges hold."""
    lay = L(layer)
    tris = shapely.constrained_delaunay_triangles(poly)
    for t in getattr(tris, 'geoms', [tris]):
        cs = list(t.exterior.coords)[:3]
        # Counter-clockwise from above in page terms (x, z): z grows toward
        # the viewer, so "from above" flips the usual sign.
        area = (cs[1][0] - cs[0][0]) * (cs[2][1] - cs[0][1]) - (cs[2][0] - cs[0][0]) * (cs[1][1] - cs[0][1])
        if area > 0:
            cs = [cs[0], cs[2], cs[1]]
        lay.face([(cx, y, cz) for cx, cz in cs], col)


def wall_ring(layer, ring, y0, y1, col):
    lay = L(layer)
    pts = list(ring)
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        lay.face([(x0, y0, z0), (x1, y0, z1), (x1, y1, z1), (x0, y1, z0)], col)


# ---- materials ---------------------------------------------------------------------
def attr(nt, name, kind='GEOMETRY'):
    n = nt.nodes.new('ShaderNodeAttribute')
    n.attribute_type = kind
    n.attribute_name = name
    return n


def node_math(nt, op, a, b=None):
    n = nt.nodes.new('ShaderNodeMath')
    n.operation = op
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def plain(name, colour=None, rough=0.6, metal=0.0, emit=None, day=0.0, lit=0.0, from_attr=False, emit_attr=False, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if from_attr:
        nt.links.new(attr(nt, 'col').outputs['Color'], b.inputs['Base Color'])
    elif colour:
        b.inputs['Base Color'].default_value = srgb(colour)
    if emit_attr:
        nt.links.new(attr(nt, 'col').outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = day + (lit - day) * LIT
    elif emit:
        b.inputs['Emission Color'].default_value = srgb(emit)
        b.inputs['Emission Strength'].default_value = day + (lit - day) * LIT
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    return m


def facade(name, floor=FLOOR, bay=1.0, pane=0.62, sill=0.3, head=0.82, glass='#3E5873', roof='#CFC9D6', share=0.42,
           strength=1.6, ribbon=False, mullion=False):
    """Walls coloured by the vertex `col`, windows drawn from `fu` and height."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type == 'BSDF_PRINCIPLED':
            nt.nodes.remove(n)
    out = nt.nodes['Material Output']
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    pos = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], pos.inputs[0])
    nor = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Normal'], nor.inputs[0])
    fu = attr(nt, 'fu').outputs['Fac']
    seed = attr(nt, 'seed').outputs['Fac']
    col = attr(nt, 'col').outputs['Color']
    u = node_math(nt, 'DIVIDE', fu, bay)
    v = node_math(nt, 'DIVIDE', pos.outputs['Z'], floor)
    fu_, fv = node_math(nt, 'FRACT', u), node_math(nt, 'FRACT', v)
    in_v = node_math(nt, 'MULTIPLY', node_math(nt, 'GREATER_THAN', fv, sill), node_math(nt, 'LESS_THAN', fv, head))
    in_u = 1.0 if ribbon else node_math(nt, 'MULTIPLY', node_math(nt, 'GREATER_THAN', fu_, (1 - pane) / 2), node_math(nt, 'LESS_THAN', fu_, (1 + pane) / 2))
    side = node_math(nt, 'LESS_THAN', node_math(nt, 'ABSOLUTE', nor.outputs['Z']), 0.5)
    window = node_math(nt, 'MULTIPLY', node_math(nt, 'MULTIPLY', in_v, in_u), side)
    wall = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(col, wall.inputs['Base Color'])
    wall.inputs['Roughness'].default_value = 0.66
    gl = nt.nodes.new('ShaderNodeBsdfPrincipled')
    gl.inputs['Base Color'].default_value = srgb(glass)
    gl.inputs['Roughness'].default_value = 0.08
    gl.inputs['Metallic'].default_value = 0.4
    cell = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(node_math(nt, 'FLOOR', u), cell.inputs['X'])
    nt.links.new(node_math(nt, 'FLOOR', v), cell.inputs['Y'])
    nt.links.new(node_math(nt, 'MULTIPLY', seed, 173.0), cell.inputs['Z'])
    noise = nt.nodes.new('ShaderNodeTexWhiteNoise')
    noise.noise_dimensions = '3D'
    nt.links.new(cell.outputs[0], noise.inputs['Vector'])
    split = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(noise.outputs['Color'], split.inputs[0])
    on = node_math(nt, 'LESS_THAN', noise.outputs['Value'], share)
    level = node_math(nt, 'MULTIPLY', on, node_math(nt, 'MULTIPLY', node_math(nt, 'ADD', split.outputs['Green'], 0.35), strength * LIT))
    tint = nt.nodes.new('ShaderNodeMix')
    tint.data_type = 'RGBA'
    tint.inputs[6].default_value = srgb('#FFAE5E')
    tint.inputs[7].default_value = srgb('#FFE2B8')
    nt.links.new(split.outputs['Blue'], tint.inputs['Factor'])
    nt.links.new(tint.outputs[2], gl.inputs['Emission Color'])
    nt.links.new(level, gl.inputs['Emission Strength'])
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(window, mix.inputs['Fac'])
    nt.links.new(wall.outputs[0], mix.inputs[1])
    nt.links.new(gl.outputs[0], mix.inputs[2])
    shader = mix.outputs[0]
    if mullion:
        # Curtain wall: thin bright mullions between big panes.
        pass
    rb = nt.nodes.new('ShaderNodeBsdfPrincipled')
    rb.inputs['Base Color'].default_value = srgb(roof)
    rb.inputs['Roughness'].default_value = 0.8
    top = node_math(nt, 'GREATER_THAN', nor.outputs['Z'], 0.5)
    mix2 = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(top, mix2.inputs['Fac'])
    nt.links.new(shader, mix2.inputs[1])
    nt.links.new(rb.outputs[0], mix2.inputs[2])
    nt.links.new(mix2.outputs[0], out.inputs['Surface'])
    return m


def screen_material():
    m = bpy.data.materials.new('screen-wall')
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(ROOT, 'public', 'landmarks', 'dashboard.jpg'))
    uv = nt.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'uv'
    nt.links.new(uv.outputs['UV'], tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], b.inputs['Emission Color'])
    b.inputs['Base Color'].default_value = (0, 0, 0, 1)
    b.inputs['Emission Strength'].default_value = 1.1 + 1.2 * LIT
    return m


def materials():
    M = {
        'land': plain('land', '#E9E5EE', rough=0.85),
        'paving': plain('paving', '#EEEAF1', rough=0.8),
        'asphalt': plain('asphalt', '#5D5870', rough=0.85),
        'mark': plain('mark', '#F3F1F6', rough=0.6),
        'water': plain('water', '#3D8FB8', rough=0.05, metal=0.2),
        'bank': plain('bank', '#CFC8D6', rough=0.8),
        'lawn': plain('lawn', '#8DB86A', rough=0.9),
        'paint': plain('paint', rough=0.6, from_attr=True),
        'gloss': plain('gloss', rough=0.25, metal=0.4, from_attr=True),
        'metal': plain('metal', '#C9CBD3', rough=0.3, metal=0.75),
        'gold': plain('gold', '#E3B04B', rough=0.28, metal=1.0),
        'glass': plain('glass', '#3B556F', rough=0.06, metal=0.45),
        'leaf': plain('leaf', rough=0.85, from_attr=True),
        'trunk': plain('trunk', '#8A6A55', rough=0.85),
        'glow': plain('glow', rough=0.5, from_attr=True, emit_attr=True, day=0.25, lit=4.5),
        'neon': plain('neon', rough=0.5, from_attr=True, emit_attr=True, day=0.6, lit=7),
        'lamp': plain('lamp', '#FFF3E0', emit='#FFD29A', day=0, lit=16),
        'head': plain('head', '#F6F6F8', emit='#FFF4DC', day=0, lit=12),
        'tail': plain('tail', '#6B1020', emit='#FF2A3A', day=0, lit=7),
        'shopfront': plain('shopfront', '#2B2A33', rough=0.2, metal=0.2, emit_attr=True, day=0, lit=2.6),
        'f-shop': facade('f-shop', bay=0.95, pane=0.55, sill=0.32, head=0.8, roof='#CBC3C9', share=0.45),
        'f-house': facade('f-house', floor=1.5, bay=1.25, pane=0.5, sill=0.35, head=0.78, roof='#CBC3C9', share=0.5),
        'f-condo': facade('f-condo', bay=1.4, pane=0.72, sill=0.18, head=0.86, roof='#CFC9D6', share=0.4),
        'f-grid': facade('f-grid', bay=1.1, pane=0.66, sill=0.2, head=0.86, roof='#CFC9D6', share=0.38),
        'f-ribbon': facade('f-ribbon', ribbon=True, sill=0.22, head=0.88, roof='#CFC9D6', share=0.36),
        'f-glass': facade('f-glass', bay=1.5, pane=0.92, sill=0.04, head=0.97, glass='#4A6C8E', roof='#BFC5D2', share=0.34),
        'f-ware': facade('f-ware', floor=4.0, bay=2.4, pane=0.6, sill=0.66, head=0.88, roof='#C4C7D0', share=0.25, strength=1.0),
        'f-podium': facade('f-podium', floor=2.5, bay=1.6, pane=0.86, sill=0.08, head=0.85, glass='#3F5C7A', share=0.8, strength=2.4),
        'screen': screen_material(),
    }
    return M


def add_fade(m, rs, rd):
    """Mix the material towards transparent past the plan's ellipse."""
    nt = m.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    link = next((l for l in nt.links if l.to_node == out and l.to_socket.name == 'Surface'), None)
    if link is None:
        return
    src = link.from_socket
    nt.links.remove(link)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    p = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], p.inputs[0])
    # Blender X = page x, Y = -page z: s = (x - z)/sqrt2 = (X + Y)/sqrt2, d = (X - Y)/sqrt2.
    s = node_math(nt, 'DIVIDE', node_math(nt, 'ADD', p.outputs['X'], p.outputs['Y']), R2 * rs)
    d = node_math(nt, 'DIVIDE', node_math(nt, 'SUBTRACT', p.outputs['X'], p.outputs['Y']), R2 * rd)
    r = node_math(nt, 'SQRT', node_math(nt, 'ADD', node_math(nt, 'MULTIPLY', s, s), node_math(nt, 'MULTIPLY', d, d)))
    a = node_math(nt, 'DIVIDE', node_math(nt, 'SUBTRACT', 1.02, r), 0.2)
    clamp = nt.nodes.new('ShaderNodeClamp')
    nt.links.new(a, clamp.inputs['Value'])
    sm = nt.nodes.new('ShaderNodeMapRange')
    sm.interpolation_type = 'SMOOTHSTEP'
    nt.links.new(clamp.outputs[0], sm.inputs['Value'])
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(sm.outputs['Result'], mix.inputs['Fac'])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(src, mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])


def emit_layers(M, uv_layers=None):
    """Turn every accumulated layer into one mesh object."""
    for name, lay in LAYERS.items():
        if not lay.faces:
            continue
        me = bpy.data.meshes.new(name)
        me.from_pydata([(x, -z, y) for x, y, z in lay.verts], [], lay.faces)
        me.update()
        fa = me.attributes.new('fu', 'FLOAT', 'POINT')
        fa.data.foreach_set('value', lay.fu)
        sa = me.attributes.new('seed', 'FLOAT', 'POINT')
        sa.data.foreach_set('value', lay.seed)
        ca = me.attributes.new('col', 'FLOAT_COLOR', 'POINT')
        flat_c = []
        for c in lay.col:
            flat_c.extend((c[0], c[1], c[2], 1.0))
        ca.data.foreach_set('color', flat_c)
        me.polygons.foreach_set('use_smooth', lay.smooth)
        if uv_layers and name in uv_layers:
            uv = me.uv_layers.new(name='uv')
            uvs = uv_layers[name]
            for poly in me.polygons:
                for li in poly.loop_indices:
                    uv.data[li].uv = uvs[me.loops[li].vertex_index]
        obj = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(obj)
        base = name.split(':')[0]
        me.materials.append(M[base])


# ---- the city ------------------------------------------------------------------------
SIGN = ['#E8414F', '#F2B134', '#2F8FD8', '#3BB273', '#C044D9', '#FF7A3D', '#F4F2F6', '#7A5CFA']
AWNING = ['#C8413F', '#E0B84C', '#3E7FB8', '#5FA05C', '#7C6A9B', '#F2F0F4', '#D9763E']
ROOF = ['#9A5A45', '#7C6A9B', '#B0704F', '#6D7F8C', '#8E5050']
LEAF = ['#3F9460', '#5DA866', '#2F7A55', '#4F8F4A', '#6DB06A']


def shophouse(b, seed):
    F = Frame(b['x'], b['z'], b['rot'])
    units, w, d = b['units'], b['w'], b['d']
    uw = w / units
    front = b['front']
    zf = front * d / 2
    row_colour = b['colour']
    for i in range(units):
        ux = -w / 2 + uw * (i + 0.5)
        floors = b['floors'] + (rng.choice((-1, 1)) if rng.random() < 0.22 else 0)
        floors = max(2, floors)
        h = floors * FLOOR + 0.35
        col = row_colour if rng.random() < 0.5 else rng.choice(['#F2D9B3', '#E9CFA6', '#F4EEE4', '#D9E8C9', '#F3E3A6', '#EBC9C2', '#CFE0EA', '#E3D3EE', '#F1E2D0', '#CDE3DA'])
        s = seed + i * 0.013
        box('f-shop', F, ux, 0, 0, uw - 0.05, h, d, col, s, top=False)
        box('paint', F, ux, h - 0.02, 0, uw - 0.05, 0.02, d, '#CFC8CF')                       # roof deck
        for sgn in (-1, 1):                                                                    # parapet
            box('paint', F, ux, h, sgn * (d / 2 - 0.05), uw - 0.05, 0.35, 0.1, col)
        # Ground floor: a lit shop, or a roller shutter pulled down.
        if rng.random() < 0.18:
            box('paint', F, ux, 0.05, zf - front * 0.03, uw * 0.84, 1.05, 0.1, '#A7A3B2')
        else:
            box('shopfront', F, ux, 0.05, zf - front * 0.03, uw * 0.84, 1.05, 0.1, rng.choice(['#FFD9A0', '#FFF1D6', '#FFE7C2']), s)
        # Upper floors: a band at each floor and a sunshade over each window row.
        band = '#E4DDD6' if col != '#F4EEE4' else '#E6E1EA'
        for fl in range(1, floors):
            y = fl * FLOOR
            box('paint', F, ux, y - 0.03, zf + front * 0.03, uw - 0.05, 0.08, 0.08, band)
            box('paint', F, ux, y + 1.0, zf + front * 0.14, uw * 0.84, 0.06, 0.3, '#F2EFF4')
        if rng.random() < 0.7:
            # A sloping awning over the pavement.
            ac = rng.choice(AWNING)
            lay = L('paint')
            x0, x1 = ux - uw * 0.46, ux + uw * 0.46
            lay.face([F(x0, 1.38, zf), F(x1, 1.38, zf), F(x1, 1.12, zf + front * 0.75), F(x0, 1.12, zf + front * 0.75)][::(1 if front > 0 else -1)], ac)
        if rng.random() < 0.7:
            box('neon' if rng.random() < 0.4 else 'glow', F, ux, 1.45, zf + front * 0.05, uw * 0.86, 0.45, 0.07, rng.choice(SIGN), s)
        if rng.random() < 0.18:
            # A vertical blade sign standing out over the pavement.
            box('neon', F, ux + uw * 0.4, 1.9, zf + front * 0.32, 0.1, 1.7, 0.55, rng.choice(SIGN), s)
        if rng.random() < 0.45:
            for fl in range(2, floors + 1):
                y = (fl - 1) * FLOOR + 0.02
                box('paint', F, ux, y, zf + front * 0.2, uw * 0.8, 0.06, 0.4, '#E9E6EE')
                box('paint', F, ux, y + 0.06, zf + front * 0.39, uw * 0.8, 0.42, 0.03, '#BDB8C9')
        # Pilaster between units.
        box('paint', F, -w / 2 + uw * i, 0, zf + front * 0.03, 0.1, h, 0.08, '#E2DDE6')
        # Roof clutter: tanks, air conditioners, a stair room, a tin canopy.
        if rng.random() < 0.45:
            cyl('metal', F, ux + rng.uniform(-0.3, 0.3), h, -front * d * 0.25, 0.3, 0.75, '#C9CBD3', n=10)
            cyl('paint', F, ux + rng.uniform(-0.3, 0.3), h, -front * d * 0.05, 0.05, 0.8, '#9C98AC', n=5) if rng.random() < 0.3 else None
        for _ in range(rng.choice((0, 1, 1, 2, 3))):
            box('paint', F, ux + rng.uniform(-0.45, 0.45), h, rng.uniform(-d * 0.35, d * 0.35), 0.36, 0.28, 0.3, '#D5D2DA')
        if rng.random() < 0.22:
            box('paint', F, ux, h, -front * d * 0.3, uw * 0.6, 1.0, d * 0.25, col)
        if rng.random() < 0.15:
            box('metal', F, ux, h + 1.0, front * d * 0.1, uw * 0.9, 0.05, d * 0.45, '#B9BDC8', tilt=0.12)
            for sx in (-0.4, 0.4):
                box('paint', F, ux + sx * uw, h, front * d * 0.1, 0.06, 1.0, 0.06, '#8E8A9C')


def townhouse(b, seed):
    F = Frame(b['x'], b['z'], b['rot'])
    units, w, d, front = b['units'], b['w'], b['d'], b['front']
    uw = w / units
    zf = front * d / 2
    pitched = rng.random() < 0.5
    roof = rng.choice(ROOF)
    for i in range(units):
        ux = -w / 2 + uw * (i + 0.5)
        h = b['floors'] * 1.35
        box('f-house', F, ux, 0, 0, uw - 0.06, h, d * 0.86, b['colour'], seed + i * 0.01)
        if pitched:
            gable('paint', F, ux, h, 0, uw - 0.06, d * 0.86, 0.9, roof, over=0.15)
        box('paint', F, ux, 1.3, zf - front * 0.2, uw * 0.9, 0.08, 1.2, '#E4E0E9')       # car port
        box('paint', F, ux + uw * 0.25, 0, zf - front * 0.05, uw * 0.45, 0.6, 0.08, '#D9D4DE')   # gate wall


def house(b, seed):
    F = Frame(b['x'], b['z'], b['rot'])
    h = b['floors'] * 1.45
    box('f-house', F, 0, 0, 0, b['w'], h, b['d'], b['colour'], seed)
    roof = b.get('roof') or rng.choice(ROOF)
    if b['w'] >= b['d']:
        (hip if rng.random() < 0.5 else gable)('paint', F, 0, h, 0, b['w'], b['d'], min(b['d'], 4) * 0.32, roof, over=0.3)
    else:
        F2 = Frame(b['x'], b['z'], b['rot'] + math.pi / 2)
        (hip if rng.random() < 0.5 else gable)('paint', F2, 0, h, 0, b['d'], b['w'], min(b['w'], 4) * 0.32, roof, over=0.3)


def midrise(b, seed, balconies=True):
    F = Frame(b['x'], b['z'], b['rot'])
    w, d = b['w'], b['d']
    h = b['floors'] * FLOOR
    box('f-condo', F, 0, 0, 0, w, h, d, b['colour'], seed)
    if balconies:
        for fl in range(1, b['floors']):
            y = fl * FLOOR - 0.04
            for sgn in (-1, 1):
                box('paint', F, 0, y, sgn * (d / 2 + 0.22), w * 0.92, 0.07, 0.44, '#F2F0F5')
                box('paint', F, 0, y + 0.07, sgn * (d / 2 + 0.43), w * 0.92, 0.36, 0.03, '#C4CBD6')
                box('paint', F, sgn * (w / 2 + 0.04), y, 0, 0.08, 0.07, d, '#F2F0F5')
        accent = rng.choice(['#C044D9', '#6E5A93', '#3E7FB8', '#E0B84C', '#5FA05C', '#D9763E'])
        box('paint', F, -w / 2 - 0.05, 0, 0, 0.1, h, d * 0.3, accent)
    box('paint', F, -w * 0.15, h, 0, w * 0.26, 1.6, d * 0.32, '#D9D4E2')
    cyl('metal', F, w * 0.25, h, d * 0.15, 0.45, 1.0, '#C9CBD3', n=10)
    cyl('metal', F, w * 0.25, h, -d * 0.15, 0.45, 1.0, '#C9CBD3', n=10)
    box('paint', F, 0, h, 0, w + 0.1, 0.3, d + 0.1, '#EDEAF1', top=False)


def tower(b, seed):
    F = Frame(b['x'], b['z'], b['rot'])
    w, d = b['w'], b['d']
    floors = b['floors']
    h = floors * FLOOR
    style = {'grid': 'f-grid', 'ribbon': 'f-ribbon', 'glass': 'f-glass'}[b['style']]
    y = 0.0
    if b.get('podium'):
        ph = 2.5 * rng.choice((1, 2))
        box('f-podium', F, 0, 0, 0, w + 3, ph, d + 3, '#E9E6EE', seed)
        box('paint', F, 0, ph, 0, w + 3.2, 0.25, d + 3.2, '#F4F2F7')
        box('paint', F, 0, 2.4, b['front'] * (d / 2 + 1.5 + 0.9), w * 0.6, 0.15, 1.8, '#F4F2F7')    # canopy
        y = ph + 0.25
    residential = b.get('zone') == 'residential' or rng.random() < 0.3
    if not b.get('podium'):
        box('f-podium', F, 0, 0, 0, w + 0.3, 2.5, d + 0.3, '#E9E6EE', seed)
        y = 2.5
    if floors > 26 and rng.random() < 0.7:
        h1 = (h - y) * rng.uniform(0.55, 0.7)
        box(style, F, 0, y, 0, w, h1, d, b['colour'], seed)
        box('paint', F, 0, y + h1, 0, w + 0.15, 0.25, d + 0.15, '#F4F2F7')
        k = rng.uniform(0.72, 0.86)
        box(style, F, 0, y + h1 + 0.25, 0, w * k, h - y - h1, d * k, b['colour'], seed + 0.5)
        tw, td = w * k, d * k
    else:
        box(style, F, 0, y, 0, w, h - y, d, b['colour'], seed)
        tw, td = w, d
    if style == 'f-glass':
        n = max(2, int(tw / 1.5))
        for i in range(n + 1):
            box('paint', F, -tw / 2 + i * tw / n, y, td / 2 + 0.05, 0.12, h - y, 0.12, '#E8EBF2')
            box('paint', F, tw / 2 + 0.05, y, -td / 2 + i * td / n, 0.12, h - y, 0.12, '#E8EBF2')
    elif style == 'f-ribbon':
        for fl in range(int(y / FLOOR) + 1, floors):
            yy = fl * FLOOR - 0.05
            box('paint', F, 0, yy, 0, tw + 0.5, 0.1, td + 0.5, '#F4F2F7', top=False)
    elif style == 'f-grid' and rng.random() < 0.6:
        n = max(2, int(tw / 2.2))
        for i in range(1, n):
            box('paint', F, -tw / 2 + i * tw / n, y, td / 2 + 0.12, 0.16, h - y, 0.25, b['colour'])
            box('paint', F, tw / 2 + 0.12, y, -td / 2 + i * td / n, 0.25, h - y, 0.16, b['colour'])
    elif residential and style != 'f-glass':
        for fl in range(int(y / FLOOR) + 2, floors, 2):
            box('paint', F, 0, fl * FLOOR - 0.04, td / 2 + 0.2, tw * 0.9, 0.07, 0.4, '#F2F0F5')
    crown = rng.choice(['plant', 'plant', 'spire', 'lit', 'slant', 'heli'])
    if crown == 'plant':
        box('paint', F, -tw * 0.1, h, 0, tw * 0.45, 1.3, td * 0.5, '#D9D4E2')
        box('paint', F, tw * 0.25, h, td * 0.2, tw * 0.2, 0.8, td * 0.2, '#CCC8D6')
    elif crown == 'spire':
        box('paint', F, 0, h, 0, tw * 0.4, 1.2, td * 0.4, '#D9D4E2')
        cyl('metal', F, 0, h + 1.2, 0, 0.12, 6.5, '#D9DCE4', n=6, r_top=0.03)
        ico('neon', F, 0, h + 7.6, 0, 0.18, '#FF4A5C', sub=1)
    elif crown == 'lit':
        box('neon', F, 0, h - 0.6, 0, tw + 0.08, 0.35, td + 0.08, rng.choice(['#C7FF3D', '#F4F2F6', '#E07CF2', '#7FD3FF']), seed, top=False)
        box('paint', F, 0, h, 0, tw * 0.6, 1.6, td * 0.6, '#D9D4E2')
    elif crown == 'slant':
        gable('paint', F, 0, h, 0, tw, td, min(tw, td) * 0.45, '#BFC8D6', over=0.0)
    else:
        box('paint', F, 0, h, 0, tw * 0.75, 0.5, td * 0.75, '#D9D4E2')
        cyl('paint', F, 0, h + 0.5, 0, min(tw, td) * 0.33, 0.12, '#3A3746', n=20)
    return h


def warehouse(b, seed):
    F = Frame(b['x'], b['z'], b['rot'])
    w, d, h = b['w'], b['d'], b['h']
    box('f-ware', F, 0, 0, 0, w, h, d, b['colour'], seed)
    zf = b['front'] * d / 2
    n = max(2, int(w / 4))
    for i in range(n):
        box('paint', F, -w / 2 + (i + 0.5) * w / n, 0, zf, 2.2, 2.6, 0.12, '#6E7180')
    if b.get('solar'):
        box('paint', F, 0, h, 0, w + 0.1, 0.2, d + 0.1, '#E2E4EA')
        rows = int(d / 1.6)
        for r in range(rows):
            box('gloss', F, 0, h + 0.35, -d / 2 + 0.9 + r * 1.6, w - 1.0, 0.06, 1.1, '#22355A', tilt=-0.35)
    else:
        gable('metal', F, 0, h, 0, w, d, 1.1, None or '#C9CBD3', over=0.2)


def tree(x, z, s, kind, y=0.12):
    F = WORLD
    if kind == 'palm':
        top = (x + rng.uniform(-0.3, 0.3), y + 3.2 * s, z + rng.uniform(-0.3, 0.3))
        seg('trunk', (x, y, z), top, 0.09 * s, '#8A6A55', n=5)
        for k in range(7):
            a = 2 * math.pi * k / 7 + rng.uniform(0, 0.4)
            tip = (top[0] + math.cos(a) * 1.4 * s, top[1] - 0.5 * s, top[2] + math.sin(a) * 1.4 * s)
            mid = (top[0] + math.cos(a) * 0.8 * s, top[1] + 0.15 * s, top[2] + math.sin(a) * 0.8 * s)
            lay = L('leaf')
            off = (-math.sin(a) * 0.22 * s, 0, math.cos(a) * 0.22 * s)
            c = '#4F9A57'
            lay.face([top, (mid[0] + off[0], mid[1], mid[2] + off[2]), tip], c)
            lay.face([top, tip, (mid[0] - off[0], mid[1], mid[2] - off[2])], c)
        return
    seg('trunk', (x, y, z), (x, y + 0.9 * s, z), 0.1 * s, '#8A6A55', n=5)
    colour = '#E3A6DA' if kind == 'blossom' else '#2F7A55' if kind == 'dark' else rng.choice(LEAF)
    ico('leaf', F, x, y + 1.6 * s, z, 0.95 * s, colour, sub=1, sy=0.9)
    if s > 1.0 and kind != 'blossom':
        ico('leaf', F, x + 0.45 * s, y + 1.25 * s, z + 0.3 * s, 0.6 * s, colour, sub=1)


def car(x, z, ang, y=0.02, colour=None):
    F = Frame(x, z, ang, y)
    colour = colour or rng.choice(['#F4F2F6', '#F4F2F6', '#C9C6D1', '#3A3746', '#6E5A93', '#2F4E78', '#B7A6D8', '#D94B4B', '#E7E1D6'])
    box('gloss', F, 0, 0.12, 0, 1.9, 0.42, 0.9, colour)
    box('glass', F, -0.1, 0.54, 0, 1.0, 0.32, 0.8, '#3B556F')
    box('head', F, 0.96, 0.3, 0, 0.04, 0.1, 0.7, '#FFFFFF')
    box('tail', F, -0.96, 0.3, 0, 0.04, 0.1, 0.7, '#FF2A3A')


# ---- landmarks ----------------------------------------------------------------------------
ANCHORS = {}
LAMP_LIGHTS = []


def plaza(l, colour='#F1EEF4'):
    F = Frame(l['x'], l['z'], l['rot'])
    box('paint', F, 0, 0, 0, l['w'], 0.16, l['d'], colour)
    return F


def thai_roof(F, x, y, z, w, d, tiers=3, col='#D8702F', trim='#2F7A55'):
    """Stacked steep gables, each tier shorter and higher, green-edged."""
    for t in range(tiers):
        k = 1 - t * 0.18
        rise = d * 0.55
        gable('paint', F, x, y + t * rise * 0.45, z, w * k, d * k * 0.95, rise, col, over=0.35)
        box('paint', F, x, y + t * rise * 0.45 - 0.08, z, w * k + 0.8, 0.1, d * k * 0.95 + 0.8, trim)
    # Gilded finials at the ridge ends.
    for sx in (-1, 1):
        cyl('gold', F, x + sx * (w / 2 + 0.2), y + rise + (tiers - 1) * rise * 0.45 - 0.2, z, 0.09, 1.0, '#E3B04B', n=6, r_top=0.02)


def chedi(F, x, y, z, s, col='#E3B04B', layer='gold'):
    """A bell-shaped stupa: stepped base, bell, rings, spire."""
    box(layer, F, x, y, z, 3.0 * s, 0.6 * s, 3.0 * s, col)
    box(layer, F, x, y + 0.6 * s, z, 2.3 * s, 0.5 * s, 2.3 * s, col)
    ico(layer, F, x, y + 1.6 * s, z, 1.15 * s, col, sub=2, sy=1.0)
    for i in range(5):
        cyl(layer, F, x, y + 2.6 * s + i * 0.35 * s, z, (0.45 - i * 0.06) * s, 0.3 * s, col, n=14)
    cyl(layer, F, x, y + 4.35 * s, z, 0.16 * s, 3.2 * s, col, n=10, r_top=0.01)
    return y + 7.6 * s


def prang(F, x, y, z, s, col='#EFE8DA'):
    """A Khmer-style tower - the Wat Arun shape: a tall corn cob on terraces."""
    h = y
    for i, (r, th) in enumerate([(3.0, 1.2), (2.6, 1.2), (2.2, 1.6), (1.9, 2.2), (1.65, 2.4), (1.4, 2.2), (1.15, 2.0),
                                  (0.9, 1.8), (0.65, 1.6), (0.42, 1.4)]):
        cyl('paint', F, x, h, z, r * s, th * s, col, n=8, r_top=r * s * 0.92, smooth=False)
        if i % 2 == 1:
            box('paint', F, x, h + th * s - 0.12 * s, z, r * s * 2.1, 0.12 * s, r * s * 2.1, '#D9C9A8')
        h += th * s
    cyl('gold', F, x, h, z, 0.16 * s, 2.4 * s, '#E3B04B', n=6, r_top=0.01)
    return h + 2.4 * s


def build_landmarks(plan, M):
    lm = plan['landmarks']
    lamp_glow = '#FFD29A'

    # Control centre: a dark glass operations hall on a plaza, the curved
    # video wall in front of it.
    l = lm['hub']
    F = plaza(l)
    box('f-glass', F, 0, 0.16, -l['d'] * 0.2, l['w'] * 0.7, 3.4, l['d'] * 0.45, '#2C2A38', 0.31)
    box('neon', F, 0, 3.4, -l['d'] * 0.2, l['w'] * 0.7 + 0.1, 0.12, l['d'] * 0.45 + 0.1, '#C7FF3D', top=False)
    half, bottom, top = l['w'] * 0.42, 5.6, 12.6
    uv = []
    lay = L('screen')
    n = 16
    for i in range(n):
        xa, xb = -half + 2 * half * i / n, -half + 2 * half * (i + 1) / n
        za, zb = l['d'] * 0.1 + 1.4 * (xa / half) ** 2, l['d'] * 0.1 + 1.4 * (xb / half) ** 2
        lay.face([F(xa, bottom, za), F(xb, bottom, zb), F(xb, top, zb), F(xa, top, za)], '#000000')
        uv += [(i / n, 0), ((i + 1) / n, 0), ((i + 1) / n, 1), (i / n, 1)]
        box('paint', F, (xa + xb) / 2, bottom - 0.2, (za + zb) / 2 - 0.25, (xb - xa) + 0.05, top - bottom + 0.4, 0.3, '#23212E')
    for px in (-half * 0.7, -half * 0.25, half * 0.25, half * 0.7):
        cyl('paint', F, px, 0.16, l['d'] * 0.1 - 0.3 + 1.4 * (px / half) ** 2, 0.22, bottom - 0.16, '#23212E', n=10)
    hx, hy, hz = F(0, (bottom + top) / 2, l['d'] * 0.1 + 0.4)
    ANCHORS['hub'] = [hx, hy, hz]
    SCREEN_UV.update({'screen': uv})

    # City hall: a modern civic block crowned with a Thai roof, a flag line.
    l = lm['civic']
    F = plaza(l)
    w, d = l['w'] * 0.72, l['d'] * 0.55
    box('f-grid', F, 0, 0.16, -l['d'] * 0.1, w, 6.2, d, '#F3EEE6', 0.21)
    for i in range(int(w / 0.8)):
        box('paint', F, -w / 2 + 0.4 + i * 0.8, 0.16, -l['d'] * 0.1 + d / 2 + 0.15, 0.14, 6.0, 0.3, '#FBF9F6')
    thai_roof(F, 0, 6.36, -l['d'] * 0.1, w * 0.7, d * 0.8, tiers=3)
    for i in range(5):
        fx = -w * 0.4 + i * w * 0.2
        cyl('metal', F, fx, 0.16, l['d'] * 0.38, 0.05, 4.5, '#D9DCE4', n=6)
        box('paint', F, fx + 0.5, 3.8, l['d'] * 0.38, 1.0, 0.6, 0.03, ['#C8413F', '#F4F2F6', '#2F4E78', '#F4F2F6', '#C8413F'][i])
    x, y, z = F(0, 6.36 + d * 0.8 * 0.55 * 1.9 + 1.2, -l['d'] * 0.1)
    ANCHORS['civic'] = [x, y, z]

    # Hospital: a tower with a lit cross, a wing with a helipad.
    l = lm['hospital']
    F = plaza(l)
    tw, td = l['w'] * 0.45, l['d'] * 0.5
    box('f-grid', F, -l['w'] * 0.2, 0.16, -l['d'] * 0.15, tw, 24, td, '#F6F5F8', 0.41)
    box('f-grid', F, l['w'] * 0.18, 0.16, l['d'] * 0.18, l['w'] * 0.55, 8.5, l['d'] * 0.5, '#F6F5F8', 0.42)
    cyl('paint', F, l['w'] * 0.22, 8.66, l['d'] * 0.18, 2.1, 0.15, '#3A3746', n=28)
    for dx, dz, ww, dd in ((-0.45, 0, 0.22, 1.4), (0.45, 0, 0.22, 1.4), (0, 0, 0.9, 0.22)):
        box('mark', F, l['w'] * 0.22 + dx, 8.82, l['d'] * 0.18 + dz, ww, 0.02, dd, '#F3F1F6')
    cz = -l['d'] * 0.15 + td / 2 + 0.06
    box('neon', F, -l['w'] * 0.2, 20.0, cz, 2.4, 0.7, 0.1, '#E07CF2')
    box('neon', F, -l['w'] * 0.2, 19.15, cz, 0.7, 2.4, 0.1, '#E07CF2')
    x, y, z = F(-l['w'] * 0.2, 25.6, -l['d'] * 0.15)
    ANCHORS['hospital'] = [x, y, z]
    x, y, z = F(l['w'] * 0.3, 9.4, l['d'] * 0.18)
    ANCHORS['sensor-hospital'] = [x, y, z]

    # University: Thai-roofed halls round a field with a running track.
    l = lm['school']
    F = plaza(l, '#E9E5EE')
    lay = L('paint')
    for scale, colour, y in ((1.0, '#C9765C', 0.17), (0.78, '#7FAE5E', 0.19)):
        rx, rz = l['w'] * 0.3 * scale, l['d'] * 0.32 * scale
        pts = [F(l['w'] * 0.12 + rx * math.cos(a), y, l['d'] * 0.08 + rz * math.sin(a)) for a in [2 * math.pi * i / 40 for i in range(40)]]
        lay.face(pts[::-1], colour)
    for i, (bx, bz) in enumerate(((-l['w'] * 0.32, -l['d'] * 0.3), (-l['w'] * 0.32, l['d'] * 0.2))):
        box('f-house', F, bx, 0.16, bz, l['w'] * 0.3, 4.4, l['d'] * 0.22, '#F3EEE6', 0.5 + i * 0.01)
        thai_roof(F, bx, 4.56, bz, l['w'] * 0.28, l['d'] * 0.2, tiers=2, col='#B85A3C')
    x, y, z = F(-l['w'] * 0.32, 8.5, -l['d'] * 0.3)
    ANCHORS['school'] = [x, y, z]

    # Industry: sheds with north-light roofs, two banded chimneys, tanks.
    l = lm['industry']
    F = plaza(l, '#E2DEE6')
    for i in range(2):
        bx = -l['w'] * 0.22
        bz = -l['d'] * 0.25 + i * l['d'] * 0.4
        box('f-ware', F, bx, 0.16, bz, l['w'] * 0.5, 4, l['d'] * 0.32, '#D9DCE4', 0.6 + i * 0.01)
        teeth = 4
        for t in range(teeth):
            zz = bz - l['d'] * 0.16 + (t + 0.5) * l['d'] * 0.32 / teeth
            gable('metal', F, bx, 4.16, zz, l['w'] * 0.5, l['d'] * 0.32 / teeth, 0.9, '#C9CBD3', over=0.02)
    for i, cx in enumerate((l['w'] * 0.18, l['w'] * 0.32)):
        h = 15 - i * 2
        for k in range(6):
            cyl('paint', F, cx, 0.16 + k * h / 6, -l['d'] * 0.3, 0.6, h / 6, ['#F2F0F4', '#C8413F'][k % 2], n=14)
    for i in range(3):
        tx, tz = l['w'] * (0.12 + 0.17 * i), l['d'] * 0.22
        cyl('paint', F, tx, 0.16, tz, 1.4, 3.6, '#F2F0F4', n=20)
        ico('paint', F, tx, 3.76, tz, 1.4, '#F2F0F4', sub=1, sy=0.35)
    x, y, z = F(l['w'] * 0.18, 16.4, -l['d'] * 0.3)
    ANCHORS['industry'] = [x, y, z]
    ANCHORS['sensor-industry'] = [x, y - 0.8, z]

    # Power station by the river: turbine hall, two stacks, a switchyard and
    # solar on the roof.
    l = lm['energy']
    F = plaza(l, '#E2DEE6')
    box('f-ware', F, -l['w'] * 0.15, 0.16, -l['d'] * 0.15, l['w'] * 0.55, 7, l['d'] * 0.45, '#E3E6EC', 0.7)
    rows = 5
    for r in range(rows):
        box('gloss', F, -l['w'] * 0.15, 7.5, -l['d'] * 0.35 + r * l['d'] * 0.09, l['w'] * 0.5, 0.06, l['d'] * 0.06, '#22355A', tilt=-0.35)
    for i, cx in enumerate((l['w'] * 0.2, l['w'] * 0.34)):
        for k in range(8):
            cyl('paint', F, cx, 0.16 + k * 2.4, -l['d'] * 0.25, 0.75 - k * 0.03, 2.4, ['#F2F0F4', '#C8413F'][k % 2], n=14, r_top=0.72 - k * 0.03)
    # Switchyard: frames of bars.
    for gx in range(3):
        for gz in range(2):
            px, pz = l['w'] * (0.05 + gx * 0.14), l['d'] * (0.15 + gz * 0.2)
            for sx in (-0.5, 0.5):
                seg('metal', F(px + sx, 0.16, pz), F(px + sx, 3.6, pz), 0.07, '#C9CBD3', n=5)
            seg('metal', F(px - 0.5, 3.6, pz), F(px + 0.5, 3.6, pz), 0.06, '#C9CBD3', n=5)
    x, y, z = F(l['w'] * 0.2, 20.4, -l['d'] * 0.25)
    ANCHORS['energy'] = [x, y, z]
    x, y, z = F(l['w'] * 0.34, 15.0, -l['d'] * 0.25)
    ANCHORS['sensor-energy'] = [x, y, z]

    # Transit: the interchange building beside the skytrain.
    l = lm['transit']
    F = plaza(l)
    box('f-podium', F, 0, 0.16, 0, l['w'] * 0.8, 5, l['d'] * 0.7, '#ECEFF3', 0.8)
    gable('metal', F, 0, 5.16, 0, l['w'] * 0.85, l['d'] * 0.75, 1.2, '#D9DCE4', over=0.3)
    x, y, z = F(0, 8.2, 0)
    ANCHORS['transit'] = [x, y, z]

    # A temple in the old town: walled compound, ordination hall, chedi.
    l = lm['temple']
    F = plaza(l, '#EFE9DE')
    for sx, sz, ww, dd in ((0, -0.5, 1, 0.03), (0, 0.5, 1, 0.03), (-0.5, 0, 0.03, 1), (0.5, 0, 0.03, 1)):
        box('paint', F, sx * l['w'], 0.16, sz * l['d'], ww * l['w'] + 0.3, 1.1, dd * l['d'] + 0.3, '#F6F3EC')
    box('f-house', F, -l['w'] * 0.12, 0.16, 0, l['w'] * 0.42, 2.6, l['d'] * 0.3, '#F6F3EC', 0.9)
    thai_roof(F, -l['w'] * 0.12, 2.76, 0, l['w'] * 0.42, l['d'] * 0.3, tiers=3)
    chedi(F, l['w'] * 0.25, 0.16, -l['d'] * 0.18, 1.2)
    for i in range(4):
        tree(*F(l['w'] * (-0.38 + 0.25 * i), 0, l['d'] * 0.36)[::2], 1.0, 'round')

    # Wat Arun on the west bank: a central prang and four small ones on a terrace.
    l = lm['wat-arun']
    F = plaza(l, '#EFE9DE')
    box('paint', F, 0, 0.16, 0, l['w'] * 0.7, 1.2, l['d'] * 0.7, '#E9E0CE')
    box('paint', F, 0, 1.36, 0, l['w'] * 0.5, 1.0, l['d'] * 0.5, '#E9E0CE')
    top = prang(F, 0, 2.36, 0, 1.15)
    for sx in (-1, 1):
        for sz in (-1, 1):
            prang(F, sx * l['w'] * 0.3, 1.36, sz * l['d'] * 0.3, 0.42)
    x, y, z = F(0, top + 1, 0)
    ANCHORS['tourism'] = [x, y, z]

    # ICONSIAM: a glass podium on the river, two towers.
    l = lm['iconsiam']
    F = plaza(l)
    box('f-podium', F, 0, 0.16, l['d'] * 0.12, l['w'] * 0.95, 7.5, l['d'] * 0.6, '#E7ECF2', 0.95)
    box('neon', F, 0, 7.3, l['d'] * 0.12, l['w'] * 0.96, 0.22, l['d'] * 0.61, '#7FD3FF', top=False)
    box('f-glass', F, -l['w'] * 0.22, 7.66, -l['d'] * 0.2, l['w'] * 0.3, 44, l['d'] * 0.32, '#C9D6E4', 0.96)
    box('f-glass', F, l['w'] * 0.2, 7.66, -l['d'] * 0.22, l['w'] * 0.26, 36, l['d'] * 0.3, '#D4DDE8', 0.97)
    box('neon', F, -l['w'] * 0.22, 51.0, -l['d'] * 0.2, l['w'] * 0.31, 0.4, l['d'] * 0.33, '#F4F2F6', top=False)

    # Stadium: a ring of raked seating, a pitch, four floodlight masts.
    l = lm['stadium']
    F = plaza(l, '#E9E5EE')
    rx, rz = l['w'] * 0.45, l['d'] * 0.45
    lay = L('paint')
    n = 40
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        pi0 = F(rx * 0.62 * math.cos(a0), 1.2, rz * 0.62 * math.sin(a0))
        pi1 = F(rx * 0.62 * math.cos(a1), 1.2, rz * 0.62 * math.sin(a1))
        po0 = F(rx * math.cos(a0), 6.0, rz * math.sin(a0))
        po1 = F(rx * math.cos(a1), 6.0, rz * math.sin(a1))
        lay.face([pi1, pi0, po0, po1], '#E3DDEA' if i % 2 else '#D8D1E3')
        b0, b1 = F(rx * math.cos(a0), 0.16, rz * math.sin(a0)), F(rx * math.cos(a1), 0.16, rz * math.sin(a1))
        lay.face([b0, b1, po1, po0], '#EEEAF2')
    lay.face([F(rx * 0.62 * math.cos(a), 1.0, rz * 0.62 * math.sin(a)) for a in [-2 * math.pi * i / n for i in range(n)]], '#7FAE5E')
    for sx in (-1, 1):
        for sz in (-1, 1):
            p = F(sx * rx * 0.9, 0.16, sz * rz * 0.9)
            seg('metal', p, (p[0], 9.5, p[2]), 0.12, '#C9CBD3')
            box('neon', Frame(p[0], p[2]), 0, 9.5, 0, 1.2, 0.6, 0.3, '#F4F2F6')

    # The park: a lake, paths, a bandstand; the trees come from the plan.
    l = lm['park']
    F = plaza(l, '#8DB86A')
    lay = L('water')
    lay.face([F(l['w'] * 0.25 * math.cos(a) - l['w'] * 0.1, 0.18, l['d'] * 0.22 * math.sin(a) + 0.07 * l['d'] * math.sin(3 * a)) for a in [-2 * math.pi * i / 36 for i in range(36)]], '#3D8FB8')
    for i in range(int(l['w'] / 4)):
        for sz in (-0.42, 0.42):
            tree(*F(-l['w'] * 0.45 + i * 4 + 2, 0, sz * l['d'])[::2], 1.1, rng.choice(['round', 'dark', 'blossom']))
    cyl('paint', F, l['w'] * 0.25, 0.16, l['d'] * 0.1, 1.6, 2.2, '#F4F2F6', n=8)
    hip('paint', F, l['w'] * 0.25, 2.36, l['d'] * 0.1, 3.6, 3.6, 1.2, '#B85A3C')

    # The port: containers stacked by the berth, gantry cranes over the water.
    l = lm['port']
    F = plaza(l, '#DDD8E2')
    cols = ['#C95E4E', '#3E7FB8', '#E0B84C', '#6E5A93', '#5FA05C', '#F2F0F4', '#D9763E']
    for gx in range(int(l['w'] / 2.9)):
        for gz in range(3):
            stack = rng.randint(1, 4)
            for k in range(stack):
                box('paint', F, -l['w'] / 2 + 1.6 + gx * 2.9, 0.16 + k * 1.0, -l['d'] * 0.3 + gz * 1.25, 2.7, 0.98, 1.15, rng.choice(cols))
    # Cranes stand on the river side of the berth.
    river = LineString(plan['river']['centre'])
    centre = river.interpolate(river.project(Point(l['x'], l['z'])))
    dx, dz = centre.x - l['x'], centre.y - l['z']
    dl = math.hypot(dx, dz) or 1
    for k in range(3):
        along = (-0.3 + 0.3 * k) * l['w']
        bx = l['x'] + dx / dl * (l['d'] * 0.45) + (-dz / dl) * along
        bz = l['z'] + dz / dl * (l['d'] * 0.45) + (dx / dl) * along
        Fc = Frame(bx, bz, math.atan2(dz, dx))
        red = '#C8413F' if k % 2 else '#E0B84C'
        for sx in (-1.2, 1.2):
            for sz in (-1.2, 1.2):
                seg('paint', Fc(sx, 0.1, sz), Fc(sx, 9.5, sz), 0.15, red, n=5)
        box('paint', Fc, 3.0, 9.5, 0, 14, 0.6, 1.4, red)
        box('paint', Fc, -1.2, 10.1, 0, 2.4, 1.2, 2.4, '#F2F0F4')
    # Water management: a floodgate where the eastern khlong meets the river,
    # a pump house and a gauge on the bank.
    kl = LineString(plan['khlongs'][-1]['pts'])
    wet = LineString(plan['river']['centre']).buffer(plan['river']['width'] / 2 + 2.5)
    t = kl.length
    while t > 0 and wet.contains(kl.interpolate(t)):
        t -= 0.5
    g, gp = kl.interpolate(t), kl.interpolate(max(0, t - 1))
    gx, gz = g.x, g.y
    ang = math.atan2(gz - gp.y, gx - gp.x)
    Fg = Frame(gx, gz, ang)
    for sz in (-2.4, 0, 2.4):
        box('paint', Fg, 0, -0.4, sz, 1.6, 4.0, 0.8, '#E3DED5')
    for sz in (-1.2, 1.2):
        box('gloss', Fg, 0, 1.0, sz, 0.35, 1.6, 1.6, '#5D6A82')
        box('paint', Fg, 0, 0.8, sz, 0.37, 0.2, 1.62, '#E8B64A')
    box('paint', Fg, 0, 3.6, 0, 2.4, 0.3, 5.8, '#F4F2F6')
    box('f-house', Fg, 0, 3.9, -2.2, 2.2, 1.8, 1.8, '#F4F2F6', 0.33)
    x, y, z = Fg(0, 7.0, -2.2)
    ANCHORS['water'] = [x, y, z]
    l = lm['water']
    F = plaza(l)
    box('f-ware', F, 0, 0.16, 0, l['w'] * 0.6, 3.6, l['d'] * 0.55, '#EDE8F1', 0.34)
    # The gauge sits on the river bank by the floodgate.
    p = river.interpolate(river.project(Point(gx, gz)))
    ex, ez = gx - p.x, gz - p.y
    el = math.hypot(ex, ez) or 1
    gpx, gpz = p.x + ex / el * (plan['river']['width'] / 2 + 1.2), p.y + ez / el * (plan['river']['width'] / 2 + 1.2)
    gpx += -ez / el * 5
    gpz += ex / el * 5
    for i in range(9):
        box('paint', Frame(gpx, gpz), 0, 0.1 + i * 0.55, 0, 0.32, 0.55, 0.32, ['#F5F3F7', '#C5344E'][i % 2])
    ico('neon', WORLD, gpx, 5.2, gpz, 0.22, '#E07CF2')
    ANCHORS['gauge'] = [gpx, 5.3, gpz]
    ANCHORS['sensor-water'] = [gpx, 5.3, gpz]
    # The forecast's area: the low riverside blocks around the gate.
    ring = Point(gx, gz).buffer(16).intersection(Polygon(plan['domain'])).difference(LineString(plan['river']['centre']).buffer(plan['river']['width'] / 2))
    if ring.geom_type == 'MultiPolygon':
        ring = max(ring.geoms, key=lambda g: g.area)
    ring = ring.simplify(1.0)
    ANCHORS['risk'] = [[round(x, 2), 0.4, round(z, 2)] for x, z in list(ring.exterior.coords)[:-1]]
    c = ring.centroid
    ANCHORS['risk-centre'] = [c.x, 0.4, c.y]


SCREEN_UV = {}


def build_ground(plan):
    domain = Polygon(plan['domain'])
    river = LineString(plan['river']['centre']).buffer(plan['river']['width'] / 2, quad_segs=12)
    khl = unary_union([LineString(k['pts']).buffer(k['w'] / 2) for k in plan['khlongs']])
    water = unary_union([river, khl]).intersection(domain)
    land = domain.difference(water)
    for g in getattr(land, 'geoms', [land]):
        flat('land', g, -0.02, '#E9E5EE')
    for b in plan['blocks']:
        poly = Polygon(b)
        if poly.is_valid and poly.area > 1:
            flat('paving', poly, 0.12, '#EEEAF1')
            wall_ring('paving', list(poly.exterior.coords), -0.02, 0.12, '#E2DDE7')
    roads = unary_union([LineString(r['pts']).buffer(r['w'] / 2, cap_style='flat' if r['kind'] == 'soi' else 'round') for r in plan['roads']])
    roads = roads.difference(water).intersection(domain)
    for g in getattr(roads, 'geoms', [roads]):
        flat('asphalt', g, 0.02, '#5D5870')
    for g in getattr(water, 'geoms', [water]):
        flat('water', g, -0.45, '#3D8FB8')
        for ring in [g.exterior] + list(g.interiors):
            wall_ring('bank', list(ring.coords), -0.6, 0.12, '#CFC8D6')
    # Lane markings: a yellow double centre line on the arterials, white
    # dashes between lanes; a white dashed centre on the smaller roads.
    for r in plan['roads']:
        if r['kind'] not in ('arterial', 'riverside', 'secondary'):
            continue
        line = LineString(r['pts']).difference(water.buffer(1))
        for part in getattr(line, 'geoms', [line]):
            if part.length < 4:
                continue
            if r['kind'] == 'arterial':
                marks = [(-0.12, 1.2, 1.2, '#F2C94C'), (0.12, 1.2, 1.2, '#F2C94C'),
                         (-r['w'] * 0.25, 1.3, 3.2, '#F3F1F6'), (r['w'] * 0.25, 1.3, 3.2, '#F3F1F6')]
            else:
                marks = [(0.0, 1.2, 3.0, '#F3F1F6')]
            for off, dash, step, col in marks:
                o = part.offset_curve(off)
                if o.geom_type != 'LineString':
                    continue
                pos = 0.3
                while pos < o.length - dash:
                    strip(o.interpolate(pos), o.interpolate(pos + dash), 0.1, col)
                    pos += step
    # Zebra crossings where arterials meet.
    arts = [LineString(r['pts']) for r in plan['roads'] if r['kind'] == 'arterial']
    for i, a in enumerate(arts):
        for b in arts[i + 1:]:
            x = a.intersection(b)
            for p in getattr(x, 'geoms', [x]) if not x.is_empty else []:
                if p.geom_type != 'Point' or water.distance(p) < 6:
                    continue
                for line in (a, b):
                    t = line.project(p)
                    for sgn in (-1, 1):
                        q = line.interpolate(t + sgn * 5.2)
                        q2 = line.interpolate(t + sgn * 5.2 + 0.01)
                        ang = math.atan2(q2.y - q.y, q2.x - q.x) + (0 if sgn > 0 else math.pi)
                        F = Frame(q.x, q.y, ang)
                        for k in range(7):
                            box('mark', F, 0, 0.03, -2.4 + k * 0.8, 1.6, 0.012, 0.36, '#F3F1F6', top=True, sides=False)


def strip(a, b, w, col):
    dx, dz = b.x - a.x, b.y - a.y
    l = math.hypot(dx, dz) or 1
    nx, nz = -dz / l * w / 2, dx / l * w / 2
    L('mark').face([(a.x - nx, 0.035, a.y - nz), (b.x - nx, 0.035, b.y - nz), (b.x + nx, 0.035, b.y + nz), (a.x + nx, 0.035, a.y + nz)][::-1], col)


def build_bridges(plan):
    river = LineString(plan['river']['centre'])
    for i, b in enumerate(plan['bridges']):
        line = LineString(b['pts'])
        if line.length < 3:
            continue
        # Extend a little onto each bank and arch the deck slightly.
        a, z = line.coords[0], line.coords[-1]
        dx, dz = z[0] - a[0], z[1] - a[1]
        l = math.hypot(dx, dz)
        ang = math.atan2(dz, dx)
        cx, cz = (a[0] + z[0]) / 2, (a[1] + z[1]) / 2
        F = Frame(cx, cz, ang)
        span = l + 6
        box('paint', F, 0, 0.1, 0, span, 0.7, b['w'] + 1.2, '#E4E0EA')
        box('asphalt', F, 0, 0.8, 0, span, 0.05, b['w'], '#5D5870')
        for sgn in (-1, 1):
            box('paint', F, 0, 0.8, sgn * (b['w'] / 2 + 0.4), span, 0.5, 0.25, '#F2F0F5')
        for k in range(1, 4):
            px = -span / 2 + k * span / 4
            box('paint', F, px, -0.6, 0, 1.2, 0.8, b['w'] + 0.6, '#D9D4DE')
        if i == 0:
            # Rama VIII style: one tall pylon on the bank, a fan of stays.
            tx = -span / 2 + 2
            box('paint', F, tx, 0.8, 0, 1.4, 16, 1.4, '#F4F2F6')
            top = F(tx, 16.5, 0)
            for k in range(8):
                for sgn in (-1, 1):
                    seg('metal', top, F(tx + 3 + k * (span - 6) / 8, 1.4, sgn * (b['w'] / 2 + 0.3)), 0.05, '#D9DCE4', n=4)
                seg('metal', F(tx, 15.5 - k * 0.6, 0), F(tx - 3 - k * 1.2, 0.8, 0), 0.05, '#D9DCE4', n=4)


def build_expressway(plan):
    ex = plan['expressway']
    line = LineString(ex['pts']).intersection(Polygon(plan['domain']))
    river = LineString(plan['river']['centre']).buffer(plan['river']['width'] / 2)
    y, w = ex['y'], ex['w']
    pts = list(line.coords)
    lay = L('paint')
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        F = Frame((x0 + x1) / 2, (z0 + z1) / 2, math.atan2(z1 - z0, x1 - x0))
        length = math.hypot(x1 - x0, z1 - z0) + 0.15
        box('paint', F, 0, y - 0.9, 0, length, 0.9, w, '#E9E5EE')
        box('asphalt', F, 0, y, 0, length, 0.05, w - 0.6, '#5D5870')
        for sgn in (-1, 1):
            box('paint', F, 0, y, sgn * (w / 2 - 0.15), length, 0.55, 0.3, '#F4F2F7')
    pos = 0.0
    while pos < line.length:
        p = line.interpolate(pos)
        if not river.contains(p):
            cyl('paint', WORLD, p.x, -0.1, p.y, 0.7, y - 0.8, '#E2DDE7', n=10)
            box('paint', Frame(p.x, p.y, 0), 0, y - 1.4, 0, 1.8, 0.6, 1.8, '#E2DDE7')
        pos += 9
    # The river crossing: a cable-stayed span between two pylons.
    cross = line.intersection(river)
    for c in getattr(cross, 'geoms', [cross]):
        if c.is_empty or c.length < 4:
            continue
        a, b = c.coords[0], c.coords[-1]
        ang = math.atan2(b[1] - a[1], b[0] - a[0])
        for p in (a, b):
            F = Frame(p[0], p[1], ang)
            for sgn in (-1, 1):
                seg('paint', F(0, -0.4, sgn * (w / 2 + 0.6)), F(0, y + 14, 0), 0.45, '#F4F2F6', n=6)
            top = F(0, y + 13.5, 0)
            for k in range(1, 7):
                for dirn in (-1, 1):
                    for sgn in (-1, 1):
                        seg('metal', top, F(dirn * k * 2.4, y + 0.4, sgn * (w / 2 - 0.2)), 0.04, '#D9DCE4', n=4)


def build_bts(plan):
    bt = plan['bts']
    y = bt['y']
    pts = bt['pts']
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        F = Frame((x0 + x1) / 2, (z0 + z1) / 2, math.atan2(z1 - z0, x1 - x0))
        length = math.hypot(x1 - x0, z1 - z0) + 0.2
        box('paint', F, 0, y - 0.8, 0, length, 0.8, 3.0, '#ECE9F0')
        for sgn in (-0.7, 0.7):
            box('metal', F, 0, y, sgn, length, 0.12, 0.12, '#C9CBD3')
    line = LineString(pts)
    pos = 3.0
    while pos < line.length:
        p = line.interpolate(pos)
        cyl('paint', WORLD, p.x, -0.1, p.y, 0.45, y - 0.7, '#E2DDE7', n=10)
        pos += 7.5
    for sx, sz in bt['stations']:
        p = line.interpolate(line.project(Point(sx, sz)))
        q = line.interpolate(line.project(Point(sx, sz)) + 0.5)
        ang = math.atan2(q.y - p.y, q.x - p.x)
        F = Frame(p.x, p.y, ang)
        box('paint', F, 0, y - 1.6, 0, 14, 0.8, 7.5, '#E9E6EE')
        box('f-podium', F, 0, y - 0.8, 0, 14, 2.6, 7.0, '#EEF0F4', 0.77)
        gable('metal', F, 0, y + 1.8, 0, 14.4, 7.6, 1.0, '#D9DCE4', over=0.2)
        for sgn in (-1, 1):
            box('paint', F, sgn * 5, 0, sgn * 3.6, 1.4, y - 1.6, 1.0, '#E2DDE7')   # stairs tower
    # Trains: two sets on the line.
    for at in (0.3, 0.72):
        t = line.length * at
        for k in range(4):
            p = line.interpolate(t + k * 3.3)
            q = line.interpolate(t + k * 3.3 + 0.5)
            F = Frame(p.x, p.y, math.atan2(q.y - p.y, q.x - p.x))
            box('f-ribbon', F, 0, y + 0.15, -0.7, 3.1, 1.2, 1.1, '#F2F4F6', 0.88 + k * 0.001)
            box('neon', F, 0, y + 0.42, -0.7, 3.12, 0.12, 1.12, '#9BCB3A')


def build_boats(plan):
    river = LineString(plan['river']['centre'])
    domain = Polygon(plan['domain'])
    pos = 20.0
    i = 0
    while pos < river.length:
        p = river.interpolate(pos)
        q = river.interpolate(pos + 1)
        if domain.contains(p):
            ang = math.atan2(q.y - p.y, q.x - p.x)
            off = rng.choice((-1, 1)) * rng.uniform(1.5, 5)
            F0 = Frame(p.x, p.y, ang)
            bx, _, bz = F0(0, 0, off)
            F = Frame(bx, bz, ang + rng.choice((0, math.pi)), -0.3)
            kind = i % 3
            if kind == 0:     # river express ferry
                box('paint', F, 0, 0, 0, 5.0, 0.6, 1.3, '#F4F2F6')
                box('paint', F, -0.3, 0.6, 0, 3.4, 0.7, 1.1, '#E7DDCB')
                box('paint', F, -0.3, 1.3, 0, 3.6, 0.12, 1.2, '#D9763E')
                box('head', F, 2.5, 0.35, 0, 0.05, 0.12, 0.5, '#FFFFFF')
            elif kind == 1:   # long-tail
                box('paint', F, 0, 0, 0, 3.2, 0.35, 0.7, '#8A5A3C')
                box('paint', F, -0.4, 0.35, 0, 1.4, 0.4, 0.62, '#2F4E78')
            else:             # barge train
                for k in range(3):
                    box('paint', F, -k * 4.2, 0, 0, 4.0, 0.7, 1.8, '#5B4A44')
                    box('paint', F, -k * 4.2, 0.7, 0, 3.6, 0.3, 1.5, '#9C8A6E')
            i += 1
        pos += rng.uniform(16, 30)


def build(plan):
    for b in plan['buildings']:
        seed = rng.random()
        k = b['kind']
        if k == 'shophouse':
            shophouse(b, seed)
        elif k == 'townhouse':
            townhouse(b, seed)
        elif k == 'house':
            house(b, seed)
        elif k == 'midrise':
            midrise(b, seed)
        elif k == 'tower':
            tower(b, seed)
        elif k == 'warehouse':
            warehouse(b, seed)
    for x, z, s, kind in plan['trees']:
        tree(x, z, s, kind)
    for x, z in plan['lamps']:
        seg('paint', (x, 0.1, z), (x, 3.3, z), 0.06, '#4A4757', n=5)
        box('lamp', Frame(x, z), 0, 3.25, 0, 0.5, 0.12, 0.5, '#FFF3E0')
        LAMP_LIGHTS.append((x, 3.0, z))
    # Power poles and their cables, Bangkok's other skyline, along the roads.
    wet = unary_union([LineString(plan['river']['centre']).buffer(plan['river']['width'] / 2 + 2.5)] +
                      [LineString(k['pts']).buffer(k['w'] / 2 + 1.5) for k in plan['khlongs']])
    for r in plan['roads']:
        if r['kind'] not in ('arterial', 'secondary', 'riverside'):
            continue
        line = LineString(r['pts'])
        for side in (-1, 1):
            off = line.offset_curve(side * (r['w'] / 2 + 0.95))
            if off.geom_type != 'LineString' or off.length < 12:
                continue
            prev = None
            pos = rng.uniform(1, 6)
            while pos < off.length:
                p = off.interpolate(pos)
                if fade_r(plan, p.x, p.y) > 1.0 or wet.contains(p):
                    prev = None
                    pos += 10
                    continue
                seg('paint', (p.x, 0.1, p.y), (p.x, 4.6, p.y), 0.08, '#B9B4C2', n=5)
                seg('paint', (p.x - 0.4, 4.2, p.y), (p.x + 0.4, 4.2, p.y), 0.04, '#8E8A9C', n=4)
                if prev is not None:
                    for k, hgt in enumerate((4.45, 4.15, 3.9)):
                        a, b2 = (prev.x, hgt, prev.y), (p.x, hgt, p.y)
                        mid = ((a[0] + b2[0]) / 2, hgt - 0.35, (a[2] + b2[2]) / 2)
                        seg('paint', a, mid, 0.022, '#3A3746', n=3)
                        seg('paint', mid, b2, 0.022, '#3A3746', n=3)
                prev = p
                pos += 10
    # Parked and moving cars along the arterials, by day.
    for r in plan['roads']:
        if r['kind'] not in ('arterial', 'riverside'):
            continue
        line = LineString(r['pts'])
        pos = rng.uniform(2, 8)
        while pos < line.length - 2:
            p, q = line.interpolate(pos), line.interpolate(pos + 0.5)
            ang = math.atan2(q.y - p.y, q.x - p.x)
            side = rng.choice((-1, 1))
            off = side * r['w'] * rng.choice((0.12, 0.36))
            if wet.contains(p):
                pos += 6
                continue
            car(p.x - math.sin(ang) * off, p.y + math.cos(ang) * off, ang + (0 if side < 0 else math.pi))
            pos += rng.uniform(5, 14)


def fade_r(plan, x, z):
    s, d = (x - z) / R2, (x + z) / R2
    return math.hypot(s / plan['fade']['rs'], d / plan['fade']['rd'])


def lamp_lights():
    for i, (x, y, z) in enumerate(LAMP_LIGHTS):
        data = bpy.data.lights.new(f'lamp{i}', 'POINT')
        data.energy = 55
        data.shadow_soft_size = 0.25
        data.color = lin('#FFD29A')
        o = bpy.data.objects.new(f'lamp{i}', data)
        o.location = (x, -z, y)
        bpy.context.scene.collection.objects.link(o)


def main():
    global LIT
    plan_path, master_path, out = sys.argv[1:4]
    samples = int(sys.argv[4]) if len(sys.argv) > 4 else 64
    look_name = sys.argv[5] if len(sys.argv) > 5 else 'day'
    layout_path = sys.argv[6] if len(sys.argv) > 6 else None
    look = {**LOOKS[look_name], **json.loads(os.environ.get('PLATE_LOOK', '{}'))}
    LIT = look['lit']
    plan = json.load(open(plan_path))
    m = json.load(open(master_path))
    scene = reset()
    M = materials()
    build_ground(plan)
    build_landmarks(plan, M)
    build_bridges(plan)
    build_expressway(plan)
    build_bts(plan)
    build_boats(plan)
    build(plan)
    emit_layers(M, SCREEN_UV)
    if LIT:
        lamp_lights()
    faces = sum(len(l.faces) for l in LAYERS.values())
    print(f'bangkok: {len(plan["buildings"])} buildings, {faces} faces in {len(LAYERS)} meshes, {len(LAMP_LIGHTS)} lamps', flush=True)
    if layout_path:
        layout = dict(ANCHORS)
        layout['lanes'] = plan['lanes']
        layout['arcs'] = True
        layout['fade'] = plan['fade']
        with open(layout_path, 'w') as f:
            json.dump(layout, f)
    look = {**look, 'shadow': False}
    stage(scene, m, look)
    scene.cycles.transparent_max_bounces = 16
    shoot(scene, m, out, samples)
    fade_edges(out, m, plan['fade']['rs'], plan['fade']['rd'])


def fade_edges(path, m, rs, rd):
    """The city dissolves at an ellipse on the ground. Done on the finished
    still rather than in the shaders: a transparent shader mix renders as
    noise at the samples a still this size can afford."""
    import numpy as np
    from PIL import Image
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    k = w / m['width'] * m['density']           # pixels per unit at this size
    u = m['u0'] + (np.arange(w) + 0.5) / k
    v = m['v1'] - (np.arange(h) + 0.5) / k
    n = np.array(m['offset'], dtype=float)
    n /= np.linalg.norm(n)
    up = np.array([-n[0] * n[1], 1 - n[1] * n[1], -n[2] * n[1]])
    up /= np.linalg.norm(up)
    # On the ground, s is exactly u and v = up_x * (x + z) = up_x * sqrt2 * d.
    s = u[None, :]
    d = v[:, None] / (up[0] * R2)
    r = np.sqrt((s / rs) ** 2 + (d / rd) ** 2)
    t = np.clip((1.0 - r) / 0.16, 0, 1)
    t = t * t * (3 - 2 * t)
    a[..., 3] *= t
    Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA').save(path)


if __name__ == '__main__':
    main()
