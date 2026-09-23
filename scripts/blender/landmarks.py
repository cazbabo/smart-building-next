"""Landmark models for City Intelligence.

    pip install bpy==4.2.0          # Blender as a Python module, once
    python3 scripts/blender/landmarks.py            # every landmark
    python3 scripts/blender/landmarks.py turbine    # just one

Each landmark is modelled in its district's own frame (the district group's
origin, page units, Y up), baked for ambient occlusion with Cycles and written to
public/landmarks as a GLB plus its AO lightmap. Parts the page animates - the
turbine rotor, the flood gates - are separate nodes built around their pivot, so
civic-motion.js can keep driving them exactly as it drove the procedural ones.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
from common import (V, reset, material, clear_materials, box, cylinder, sphere,  # noqa: E402
                    mesh_from, join, apply_all, triangles, prism, extrude_x, tube, arc,
                    ring_tube, railing, quads)
from bake import bake_ao, export, ground, write_manifest, preview  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'landmarks')
GROUND = 0.44   # top of a district's lawn in civic-model.js
BUILDERS = {}
# LANDMARK_PREVIEW=<dir> renders each model from the page's angle while building.
PREVIEW = os.environ.get('LANDMARK_PREVIEW')


def landmark(fn):
    BUILDERS[fn.__name__] = fn
    return fn


def rotate_z(x, y, angle):
    c, s = math.cos(angle), math.sin(angle)
    return x * c - y * s, x * s + y * c


# --------------------------------------------------------------------- turbine
def blade_mesh(name, body_mat, tip_mat):
    """Three twisted, tapering blades in the page's XY plane around the origin.
    Real blades are an aerofoil that thins and untwists toward the tip; a flat
    paddle is what made the old rotor read as a toy windmill."""
    radii = [0.26, 0.45, 0.8, 1.3, 2.0, 2.8, 3.45, 3.62, 4.05]
    chord = [0.30, 0.46, 0.54, 0.47, 0.37, 0.27, 0.19, 0.17, 0.07]
    thick = [0.80, 0.42, 0.28, 0.22, 0.19, 0.17, 0.15, 0.15, 0.14]
    twist = [18, 16, 12, 8, 5, 3, 1.6, 1.3, 0.4]
    tip_from = 7                       # sections past this are the red tip band
    upper = [0.0, 0.04, 0.15, 0.35, 0.6, 0.82, 1.0]
    lower = [0.82, 0.6, 0.35, 0.15, 0.04]

    def profile(c, t, tw):
        pts = []
        for u in upper:
            pts.append((u, t * 1.35 * math.sqrt(u) * (1 - u) + 0.004))
        for u in lower:
            pts.append((u, -t * 0.35 * math.sqrt(u) * (1 - u) - 0.004))
        out = []
        a = math.radians(tw)
        for u, w in pts:
            x, z = (u - 0.3) * c, w * c
            out.append((x * math.cos(a) - z * math.sin(a), x * math.sin(a) + z * math.cos(a)))
        return out

    verts, faces, mats = [], [], []
    ring = len(upper) + len(lower)
    for b in range(3):
        phi = b * 2 * math.pi / 3
        start = len(verts)
        for i, r in enumerate(radii):
            for x, z in profile(chord[i], thick[i], twist[i]):
                px, py = rotate_z(x, r, phi)
                verts.append((px, py, z))
        for i in range(len(radii) - 1):
            for k in range(ring):
                a = start + i * ring + k
                b2 = start + i * ring + (k + 1) % ring
                faces.append((a, b2, b2 + ring, a + ring))
                mats.append(1 if i >= tip_from else 0)
        faces.append(tuple(start + (len(radii) - 1) * ring + k for k in range(ring)))
        mats.append(1)
    obj = mesh_from(name, verts, faces, body_mat)
    obj.data.materials.append(tip_mat)
    for poly, m in zip(obj.data.polygons, mats):
        poly.material_index = m
        poly.use_smooth = True
    return obj


@landmark
def turbine():
    """One turbine: a tower node and a rotor node pivoting on its hub."""
    white = material('turbine-white', '#eeece6', rough=0.42)
    concrete = material('concrete', '#cfcac0', rough=0.85)
    deep = material('steel-dark', '#3b4148', rough=0.5, metal=0.3)
    tip = material('blade-tip', '#c4493e', rough=0.45)
    blade = material('blade', '#f3f2ee', rough=0.38)

    parts = [
        cylinder('foundation', 0.95, 0.16, 0, GROUND + 0.08, 0, concrete, n=32, bevel=0.03),
        cylinder('tower', 0.34, 8.8, 0, GROUND + 0.16 + 4.4, 0, white, n=36, r_top=0.17),
        box('door', 0.28, 0.62, 0.08, 0, GROUND + 0.55, 0.31, deep, bevel=0.02),
        # A streamlined nacelle rather than a block: a long, heavily rounded pod.
        box('nacelle', 0.62, 0.62, 1.7, 0, 9.55, -0.25, white, bevel=0.24, segments=4),
        box('cooler', 0.34, 0.12, 0.5, 0, 9.9, -0.75, white, bevel=0.04),
    ]
    tower = join('turbine-tower', parts)

    rotor_parts = [
        cylinder('hub', 0.3, 0.42, 0, 0, -0.05, white, n=28, axis='z'),
        cylinder('spinner', 0.31, 0.62, 0, 0, 0.47, white, n=28, r_top=0.03, axis='z'),
        blade_mesh('blades', blade, tip),
    ]
    rotor = join('turbine-rotor', rotor_parts)
    # The rotor sits at the nacelle's nose while the tower bakes, so the tower
    # picks up the rotor's occlusion; it goes back to its pivot for export.
    rotor.location = V(0, 9.55, 0.72)
    ground()
    bake_ao(tower, os.path.join(OUT, 'turbine-tower-ao.jpg'), size=512, distance=1.6)
    if PREVIEW:
        preview(os.path.join(PREVIEW, 'turbine.png'), (0, 5.5, 0), 13)
    rotor.location = (0, 0, 0)
    export(os.path.join(OUT, 'turbine.glb'), [tower, rotor])
    return {'file': 'turbine.glb', 'hub': [0, 9.55, 0.72],
            'nodes': {'turbine-tower': {'ao': 'turbine-tower-ao.jpg'}, 'turbine-rotor': {}},
            'triangles': triangles(tower) + triangles(rotor)}


# --------------------------------------------------------------------- command
@landmark
def command():
    """The operations center: plinth, a curved 7 x 3 video wall, two tiers of
    consoles facing it, and the six data-source pods in front."""
    white = material('command-white', '#f2efe9', rough=0.5)
    stone = material('command-stone', '#d9d5cc', rough=0.8)
    floor = material('command-floor', '#262a31', rough=0.22, metal=0.2)
    frame = material('command-frame', '#1f2328', rough=0.4, metal=0.5)
    steel = material('command-steel', '#3b4148', rough=0.45, metal=0.6)
    desk = material('command-desk', '#e8e5de', rough=0.35)
    chair = material('command-chair', '#2d3136', rough=0.6)
    glass = material('command-glass', '#d8ecf0', rough=0.05, metal=0.0, alpha=0.28)
    console = material('screen-console', '#0d1522', emit='#8fc3ff', emit_strength=1.4)
    ticker = material('light-ticker', '#C7FF3D', emit='#C7FF3D', emit_strength=2.2)
    lamp = material('light-lamp', '#fff4dc', emit='#fff1d0', emit_strength=3.0)
    data = material('light-data', '#C7FF3D', emit='#C7FF3D', emit_strength=2.4)
    wall_mat = material('screen-dashboard', '#000000', emit='#ffffff', emit_strength=1.0)

    parts = []
    # Two-tier plinth, dark control-room floor, and a flight of steps in front.
    parts.append(box('plinth-low', 19, 0.7, 15, 0, 0.35, 0, stone, bevel=0.06))
    parts.append(box('plinth-high', 18, 0.5, 14, 0, 0.95, -0.2, white, bevel=0.05))
    parts.append(box('floor', 16.4, 0.04, 11.2, 0, 1.215, 0.6, floor))
    for i in range(4):
        parts.append(box(f'step-{i}', 6.4, 0.3, 0.36, 0, 0.15 + i * 0.3 - 0.0, 8.95 - i * 0.36 - 0.18 + 0.0, stone, bevel=0.02))

    # The wall is a 76-degree arc of seven columns, centred on a point near the
    # front of the plinth so every screen faces the operators square-on.
    cz, R = 6.5, 10.8
    cols, rows = 7, 3
    a0, a1 = math.radians(-38), math.radians(38)
    y0, y1 = 7.4, 16.2
    tiles = []
    for i in range(cols):
        ta = a0 + (a1 - a0) * i / cols
        tb = a0 + (a1 - a0) * (i + 1) / cols
        pa = (R * math.sin(ta), cz - R * math.cos(ta))
        pb = (R * math.sin(tb), cz - R * math.cos(tb))
        mid = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
        tm = (ta + tb) / 2
        chord = math.dist(pa, pb)
        # Bezel body behind the screens, and a structural fin at each joint.
        out = (math.sin(tm), -math.cos(tm))
        parts.append(box(f'bezel-{i}', chord + 0.02, y1 - y0 + 0.2, 0.5, mid[0] + out[0] * 0.27, (y0 + y1) / 2,
                         mid[1] + out[1] * 0.27, frame, rot_y=-tm))
        parts.append(box(f'cap-{i}', chord + 0.1, 0.34, 1.1, mid[0] + out[0] * 0.45, y1 + 0.27,
                         mid[1] + out[1] * 0.45, white, bevel=0.04, rot_y=-tm))
        parts.append(box(f'sill-{i}', chord + 0.1, 0.26, 1.0, mid[0] + out[0] * 0.4, y0 - 0.2,
                         mid[1] + out[1] * 0.4, white, bevel=0.03, rot_y=-tm))
        fin = (R + 0.55) * math.sin(ta), cz - (R + 0.55) * math.cos(ta)
        parts.append(box(f'fin-{i}', 0.14, y1 - y0 + 1.2, 1.0, fin[0], (y0 + y1) / 2, fin[1], steel, rot_y=-ta))
        # Screen tiles sit just proud of the bezel, with a hairline gap.
        g = 0.035
        for r in range(rows):
            ya = y0 + (y1 - y0) * r / rows + g
            yb = y0 + (y1 - y0) * (r + 1) / rows - g
            inset = lambda p, q, t: (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
            la, lb = inset(pa, pb, g / chord), inset(pa, pb, 1 - g / chord)
            n = (-math.sin(tm) * 0.03, math.cos(tm) * 0.03)
            corners = [(la[0] + n[0], ya, la[1] + n[1]), (lb[0] + n[0], ya, lb[1] + n[1]),
                       (lb[0] + n[0], yb, lb[1] + n[1]), (la[0] + n[0], yb, la[1] + n[1])]
            tiles.append((corners, (i / cols, r / rows, (i + 1) / cols, (r + 1) / rows)))
    fin = (R + 0.55) * math.sin(a1), cz - (R + 0.55) * math.cos(a1)
    parts.append(box('fin-end', 0.14, y1 - y0 + 1.2, 1.0, fin[0], (y0 + y1) / 2, fin[1], steel, rot_y=-a1))
    # The wall stands on four raked steel legs, with a lime status line along its
    # foot - the one piece of brand colour on the building, and it is a display.
    for t in (-30, -10, 10, 30):
        a = math.radians(t)
        x, z = (R + 0.3) * math.sin(a), cz - (R + 0.3) * math.cos(a)
        parts.append(cylinder(f'leg-{t}', 0.3, y0 - 1.2, x, (y0 + 1.2) / 2, z, steel, n=16, r_top=0.22))
    parts.append(tube('ticker', arc(0, cz, R - 0.05, math.radians(-128), math.radians(-52), y0 - 0.42, 40), 0.07, ticker))

    # Two tiers of consoles on the same centre as the wall.
    for radius, span in ((7.7, 34), (5.3, 30)):
        steps = 8
        for k in range(steps):
            ta = math.radians(-span + 2 * span * k / steps)
            tb = math.radians(-span + 2 * span * (k + 1) / steps)
            tm = (ta + tb) / 2
            chord = 2 * radius * math.sin((tb - ta) / 2)
            x, z = radius * math.sin(tm), cz - radius * math.cos(tm)
            parts.append(box(f'desk-{radius}-{k}', chord + 0.02, 0.07, 0.95, x, 1.98, z, desk, rot_y=-tm))
            parts.append(box(f'desk-body-{radius}-{k}', chord + 0.02, 0.74, 0.12,
                             x + math.sin(tm) * 0.4, 1.58, z - math.cos(tm) * 0.4, chair, rot_y=-tm))
            # Monitor pair on the far edge, facing back toward the operator.
            mx, mz = x + math.sin(tm) * 0.3, z - math.cos(tm) * 0.3
            parts.append(box(f'mon-{radius}-{k}', chord * 0.78, 0.5, 0.05, mx, 2.42, mz, chair, rot_y=-tm))
            fx, fz = mx - math.sin(tm) * 0.03, mz + math.cos(tm) * 0.03
            parts.append(box(f'mon-face-{radius}-{k}', chord * 0.72, 0.42, 0.01, fx, 2.43, fz, console, rot_y=-tm))
            # Chair on the operator's side.
            chx, chz = (radius - 0.95) * math.sin(tm), cz - (radius - 0.95) * math.cos(tm)
            parts.append(box(f'seat-{radius}-{k}', 0.55, 0.1, 0.52, chx, 1.66, chz, chair, bevel=0.03, rot_y=-tm))
            parts.append(box(f'back-{radius}-{k}', 0.52, 0.62, 0.08, chx - math.sin(tm) * 0.26, 2.0,
                             chz + math.cos(tm) * 0.26, chair, bevel=0.03, rot_y=-tm))
            parts.append(cylinder(f'stem-{radius}-{k}', 0.04, 0.42, chx, 1.42, chz, steel, n=6))
    # Glass balustrade round the upper tier, open at the steps.
    for side in (-1, 1):
        parts += [box(f'rail-side-{side}', 0.06, 0.95, 12.5, side * 8.95, 1.68, 0.1, glass),
                  box(f'rail-front-{side}', 5.6, 0.95, 0.06, side * 6.05, 1.68, 6.75, glass)]
        parts += railing(f'handrail-{side}', [(side * 8.95, 1.2, -6.2), (side * 8.95, 1.2, 6.75), (side * 3.25, 1.2, 6.75)],
                         steel, height=1.18, post_every=3.0, r=0.03)
        # Light masts at the front corners.
        parts.append(cylinder(f'mast-{side}', 0.09, 5.2, side * 8.5, 3.8, 6.4, steel, n=10))
        parts.append(box(f'lamp-{side}', 0.7, 0.14, 0.34, side * 8.3, 6.38, 6.4, steel, bevel=0.03))
        parts.append(box(f'lamp-lens-{side}', 0.6, 0.02, 0.26, side * 8.3, 6.3, 6.4, lamp))

    # Data-source pods: server cabinets on hex plinths, each with a lime status
    # strip and a conduit running back to the platform.
    for i in range(6):
        px, pz = -7 + (i % 3) * 6, 13 + (i // 3) * 5
        parts.append(cylinder(f'pod-base-{i}', 2.1, 0.35, px, 0.175, pz, white, n=6, bevel=0.05, smooth=False))
        parts.append(box(f'pod-{i}', 1.2, 2.3, 0.95, px, 0.35 + 1.15, pz, frame, bevel=0.05))
        parts.append(box(f'pod-roof-{i}', 1.36, 0.12, 1.1, px, 2.72, pz, white, bevel=0.03))
        parts.append(box(f'pod-led-{i}', 0.08, 1.7, 0.02, px - 0.35, 1.5, pz + 0.49, data))
        for k in range(4):
            parts.append(box(f'pod-vent-{i}-{k}', 0.6, 0.04, 0.02, px + 0.15, 0.9 + k * 0.4, pz + 0.48, steel))
        parts.append(cylinder(f'pod-ant-{i}', 0.035, 1.1, px + 0.35, 3.3, pz - 0.2, steel, n=6))
        parts.append(sphere(f'pod-ant-tip-{i}', 0.09, px + 0.35, 3.88, pz - 0.2, data, segments=10, rings=6))
        parts.append(tube(f'conduit-{i}', [(px, 0.12, pz - 0.6), (px, 0.12, 9.6), (px * 0.4, 0.12, 9.6)], 0.09, steel))

    body = join('command-body', parts)
    screens = quads('command-screens', tiles, wall_mat)
    ground()
    bake_ao(body, os.path.join(OUT, 'command-body-ao.jpg'), size=2048, distance=2.2, samples=128)
    if PREVIEW:
        # The page puts the dashboard on as an emissive map; do the same here so
        # the preview shows the wall as it will look, then take it off again.
        nodes, links = wall_mat.node_tree.nodes, wall_mat.node_tree.links
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(os.path.join(OUT, 'dashboard.jpg'))
        link = links.new(tex.outputs['Color'], nodes['Principled BSDF'].inputs['Emission Color'])
        preview(os.path.join(PREVIEW, 'command.png'), (0, 6, 3), 34)
        links.remove(link)
        nodes.remove(tex)
    export(os.path.join(OUT, 'command.glb'), [body, screens])
    return {'file': 'command.glb',
            'nodes': {'command-body': {'ao': 'command-body-ao.jpg'},
                      'command-screens': {'maps': {'screen-dashboard': {'file': 'dashboard.jpg', 'emissive': True}}}},
            'triangles': triangles(body) + triangles(screens)}


# ----------------------------------------------------------------------- civic
def gable(name, half, base_y, apex_y, z0, z1, mat):
    """A triangular pediment facing +Z."""
    verts = [(-half, base_y, z1), (half, base_y, z1), (0, apex_y, z1),
             (-half, base_y, z0), (half, base_y, z0), (0, apex_y, z0)]
    faces = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    obj = mesh_from(name, verts, faces, mat)
    mod = obj.modifiers.new('bevel', 'BEVEL')
    mod.width, mod.segments = 0.06, 2
    return obj


def flag(name, x, y, z, mats, width=1.9, height=1.15, direction=1):
    """A cloth flag with a standing wave in it, in three horizontal bands."""
    nx, ny = 10, 6
    verts, faces, band = [], [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            u = i / nx
            verts.append((x + direction * u * width, y - height * j / ny, z + math.sin(u * 5.2 + 0.4) * 0.16 * u))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1) if direction > 0 else (a, a + nx + 1, a + nx + 2, a + 1))
            band.append(1 if 2 <= j <= 3 else 0)
    obj = mesh_from(name, verts, faces, mats[0], smooth=True)
    obj.data.materials.append(mats[1])
    for poly, m in zip(obj.data.polygons, band):
        poly.material_index = m
    mod = obj.modifiers.new('solid', 'SOLIDIFY')
    mod.thickness = 0.02
    return obj


@landmark
def civic():
    """City hall: podium and grand stair, a two-storey block, a hexastyle portico
    under a pediment with a clock, and a copper dome on a colonnaded drum."""
    white = material('civic-white', '#f2efe9', rough=0.55)
    stone = material('civic-stone', '#d9d5cc', rough=0.8)
    trim = material('civic-trim', '#c9c2b4', rough=0.7)
    glass = material('civic-glass', '#3f5f70', rough=0.12, metal=0.4)
    roof = material('civic-roof', '#8d9196', rough=0.7)
    copper = material('civic-copper', '#6f9e8c', rough=0.5, metal=0.35)
    rib = material('civic-rib', '#a8c8bb', rough=0.45, metal=0.3)
    gilt = material('civic-gilt', '#c9a24a', rough=0.3, metal=0.85)
    dark = material('civic-dark', '#2f3338', rough=0.5)
    clock = material('civic-clock', '#f7f4ec', rough=0.4)
    navy = material('flag-navy', '#2c4675', rough=0.8)
    band = material('flag-white', '#f3f1ea', rough=0.8)
    steel = material('civic-steel', '#4a5058', rough=0.4, metal=0.6)
    lamp = material('light-lamp', '#fff4dc', emit='#fff1d0', emit_strength=3.0)

    G = 0.565                         # top of the forecourt paving
    PT = G + 1.1                      # podium top
    parts = [
        box('podium-foot', 18.4, 0.28, 11.6, 0, G + 0.14, -1.0, trim, bevel=0.03),
        box('podium', 18, 1.1, 11.2, 0, G + 0.55, -1.0, stone, bevel=0.04),
        box('podium-cap', 18.3, 0.14, 11.5, 0, PT - 0.04, -1.0, white, bevel=0.03),
    ]
    for i in range(8):
        h = (i + 1) * 1.1 / 8
        d = (8 - i) * 0.36
        parts.append(box(f'stair-{i}', 9, h, d, 0, G + h / 2, 4.6 + d / 2, white))
    for side in (-1, 1):
        parts.append(box(f'cheek-{side}', 0.7, 1.25, 2.95, side * 4.85, G + 0.62, 6.05, stone, bevel=0.04))
        parts.append(cylinder(f'lamp-post-{side}', 0.07, 2.2, side * 4.85, G + 1.25 + 1.1, 7.2, steel, n=8))
        parts.append(sphere(f'lamp-globe-{side}', 0.26, side * 4.85, G + 1.25 + 2.35, 7.2, lamp, segments=14, rings=8))

    # Main block, two storeys, with a string course, frieze, cornice and parapet.
    top = PT + 6.4
    parts += [
        box('block', 15, 6.4, 8, 0, PT + 3.2, -2, white),
        box('string', 15.3, 0.22, 8.3, 0, PT + 3.15, -2, trim),
        box('frieze', 15.25, 0.55, 8.25, 0, top - 0.3, -2, white),
        box('cornice', 15.9, 0.32, 8.9, 0, top + 0.12, -2, trim, bevel=0.05),
        box('parapet', 15.5, 0.55, 8.5, 0, top + 0.55, -2, white, bevel=0.03),
        box('roof', 14.7, 0.08, 7.7, 0, top + 0.72, -2, roof),
    ]
    bays = [-6.3, -4.5, -2.7, -0.9, 0.9, 2.7, 4.5, 6.3]
    for x in bays:
        for y, h in ((PT + 1.55, 2.3), (PT + 4.75, 1.9)):
            parts.append(box(f'surround-{x}-{y}', 1.3, h + 0.3, 0.1, x, y, 2.03, trim))
            parts.append(box(f'win-{x}-{y}', 1.0, h, 0.08, x, y, 2.07, glass))
            parts.append(box(f'sill-{x}-{y}', 1.45, 0.12, 0.25, x, y - h / 2 - 0.18, 2.12, white))
        if x < 6:
            parts.append(box(f'pilaster-{x}', 0.3, 6.1, 0.14, x + 0.9, PT + 3.1, 2.06, white))
    for z in (-5.1, -3.3, -1.5, 0.3):
        for y, h in ((PT + 1.55, 2.3), (PT + 4.75, 1.9)):
            parts.append(box(f'side-surround-{z}-{y}', 0.1, h + 0.3, 1.3, 7.53, y, z, trim))
            parts.append(box(f'side-win-{z}-{y}', 0.08, h, 1.0, 7.57, y, z, glass))

    # Hexastyle portico: bases, tapering shafts, capitals, entablature, pediment.
    cap_top = PT + 6.03
    for x in (-5, -3, -1, 1, 3, 5):
        parts += [
            box(f'col-base-{x}', 0.8, 0.26, 0.8, x, PT + 0.13, 3.7, trim, bevel=0.03),
            cylinder(f'col-{x}', 0.33, 5.4, x, PT + 0.26 + 2.7, 3.7, white, n=20, r_top=0.27),
            cylinder(f'col-echinus-{x}', 0.4, 0.2, x, PT + 5.76, 3.7, white, n=20, r_top=0.33),
            box(f'col-abacus-{x}', 0.84, 0.18, 0.84, x, cap_top - 0.09, 3.7, trim),
        ]
    ent_top = cap_top + 0.8
    parts += [
        box('architrave', 12.6, 0.4, 2.9, 0, cap_top + 0.2, 3.25, white),
        box('entab-frieze', 12.5, 0.34, 2.85, 0, cap_top + 0.57, 3.25, trim),
        box('entab-cornice', 13.2, 0.18, 3.2, 0, ent_top - 0.03, 3.3, white, bevel=0.04),
        box('portico-ceiling', 12.2, 0.1, 2.6, 0, cap_top + 0.02, 3.2, trim),
        gable('pediment', 6.7, ent_top, ent_top + 2.1, 1.9, 4.85, white),
        cylinder('clock', 0.72, 0.14, 0, ent_top + 0.85, 4.9, clock, n=32, axis='z'),
        cylinder('clock-rim', 0.8, 0.1, 0, ent_top + 0.85, 4.86, dark, n=32, axis='z'),
        tube('hand-hour', [(0, ent_top + 0.85, 4.99), (-0.3, ent_top + 1.12, 4.99)], 0.04, dark),
        tube('hand-min', [(0, ent_top + 0.85, 5.0), (0.46, ent_top + 1.2, 5.0)], 0.03, dark),
    ]
    # A roofline in the gable so the portico reads as roofed, not a cut-out.
    parts.append(gable('portico-roof', 6.5, ent_top - 0.02, ent_top + 1.95, -1.5, 1.9, roof))

    # Drum, dome, ribs and lantern over the centre of the block.
    cx, cz = 0, -2
    base = top + 0.76
    parts += [
        cylinder('drum-plinth', 3.8, 0.5, cx, base + 0.25, cz, trim, n=40),
        cylinder('drum', 3.3, 2.2, cx, base + 0.5 + 1.1, cz, white, n=40),
        cylinder('drum-cornice', 3.62, 0.32, cx, base + 2.86, cz, trim, n=40),
    ]
    for k in range(16):
        a = k * 2 * math.pi / 16
        parts.append(cylinder(f'drum-col-{k}', 0.14, 2.05, cx + 3.46 * math.cos(a), base + 1.6, cz + 3.46 * math.sin(a), white, n=10))
        if k % 2 == 0:
            parts.append(box(f'drum-win-{k}', 0.62, 1.25, 0.1, cx + 3.3 * math.cos(a + math.pi / 16), base + 1.55,
                             cz + 3.3 * math.sin(a + math.pi / 16), glass, rot_y=math.pi / 2 - (a + math.pi / 16)))
    dome_y = base + 3.0
    parts.append(sphere('dome', 3.36, cx, dome_y, cz, copper, scale=(1, 0.95, 1), segments=48, rings=24, hemi=True))
    for k in range(12):
        a = k * 2 * math.pi / 12
        pts = []
        for i in range(17):
            t = i / 16 * math.radians(84)
            rr = 3.4 * math.cos(t)
            pts.append((cx + rr * math.cos(a), dome_y + 3.4 * 0.95 * math.sin(t), cz + rr * math.sin(a)))
        parts.append(tube(f'rib-{k}', pts, 0.075, rib))
    lan = dome_y + 3.2
    parts += [
        cylinder('lantern-base', 0.8, 0.25, cx, lan + 0.1, cz, rib, n=24),
        cylinder('lantern', 0.5, 1.1, cx, lan + 0.8, cz, glass, n=24),
    ]
    for k in range(8):
        a = k * math.pi / 4
        parts.append(cylinder(f'lantern-col-{k}', 0.06, 1.1, cx + 0.62 * math.cos(a), lan + 0.8, cz + 0.62 * math.sin(a), white, n=6))
    parts += [
        cylinder('lantern-cap', 0.78, 0.14, cx, lan + 1.42, cz, rib, n=24),
        sphere('lantern-dome', 0.66, cx, lan + 1.48, cz, copper, scale=(1, 0.85, 1), segments=24, rings=10, hemi=True),
        cylinder('finial', 0.05, 0.8, cx, lan + 2.4, cz, gilt, n=8),
        sphere('finial-ball', 0.16, cx, lan + 2.85, cz, gilt, segments=14, rings=8),
    ]
    # Two flagpoles on the forecourt.
    for side in (-1, 1):
        parts.append(cylinder(f'pole-{side}', 0.07, 7.4, side * 6.2, G + 3.7, 8.1, steel, n=10))
        parts.append(sphere(f'pole-top-{side}', 0.12, side * 6.2, G + 7.45, 8.1, gilt, segments=10, rings=6))
        parts.append(flag(f'flag-{side}', side * 6.2, G + 7.2, 8.1, (navy, band), direction=-side))

    body = join('civic-body', parts)
    ground(G)
    bake_ao(body, os.path.join(OUT, 'civic-body-ao.jpg'), size=2048, distance=2.0, samples=128)
    if PREVIEW:
        preview(os.path.join(PREVIEW, 'civic.png'), (0, 6.5, 0), 28)
    export(os.path.join(OUT, 'civic.glb'), [body])
    return {'file': 'civic.glb', 'nodes': {'civic-body': {'ao': 'civic-body-ao.jpg'}}, 'triangles': triangles(body)}


# --------------------------------------------------------------------- barrier
def shell(name, cx, base_y, z0, z1, r, mat, n=18):
    """Half-cylinder hood along Z - the stainless machine housings that make a
    flood barrier recognisable from a distance."""
    verts, faces = [], []
    for z in (z0, z1):
        for i in range(n + 1):
            a = math.pi * i / n
            verts.append((cx + r * math.cos(a), base_y + r * math.sin(a), z))
    k = n + 1
    for i in range(n):
        faces.append((i, i + 1, k + i + 1, k + i))
    faces.append(tuple(range(n + 1)))
    faces.append(tuple(k + i for i in reversed(range(n + 1))))
    obj = mesh_from(name, verts, faces, mat, smooth=True)
    from common import _fix_normals
    _fix_normals(obj)
    return obj


@landmark
def barrier():
    """Flood barrier across the waterway: quay walls, six streamlined piers with
    gate guides, a service deck with stainless hoods, a control house, a staff
    gauge in the water and five gate leaves the page lifts."""
    concrete = material('barrier-concrete', '#c9c4ba', rough=0.85)
    coping = material('barrier-coping', '#ebe8e1', rough=0.6)
    deck_m = material('barrier-deck', '#b3aea5', rough=0.75)
    shell_m = material('barrier-shell', '#d3d9de', rough=0.22, metal=0.85)
    steel = material('barrier-steel', '#3d434a', rough=0.45, metal=0.6)
    gate_m = material('gate-steel', '#4b5e73', rough=0.42, metal=0.5)
    hazard = material('gate-hazard', '#e2b13c', rough=0.5)
    white = material('barrier-white', '#f2efe9', rough=0.5)
    glass = material('barrier-glass', '#4d6f80', rough=0.1, metal=0.4)
    green = material('gauge-green', '#4f9a62', rough=0.6)
    amber = material('gauge-amber', '#e0a53c', rough=0.6)
    red = material('gauge-red', '#c9483c', rough=0.6)
    lamp = material('light-lamp', '#fff4dc', emit='#fff1d0', emit_strength=3.0)

    parts = []
    # Quay walls round the basin. They stand only a little above the water at
    # rest, so the rise the flood chapter shows is read against them.
    for side in (-1, 1):
        parts.append(box(f'quay-x-{side}', 0.7, 0.75, 15.4, side * 11.35, 0.62, 0, concrete))
        parts.append(box(f'coping-x-{side}', 0.86, 0.14, 15.56, side * 11.35, 1.05, 0, coping, bevel=0.03))
        # The end walls stop at the side walls' inner faces: overlapping, their
        # coplanar tops rendered as black squares at the corners.
        parts.append(box(f'quay-z-{side}', 22.0, 0.75, 0.7, 0, 0.62, side * 7.35, concrete))
        parts.append(box(f'coping-z-{side}', 21.84, 0.14, 0.86, 0, 1.05, side * 7.35, coping, bevel=0.03))
        for k in range(-3, 4):
            parts.append(cylinder(f'bollard-{side}-{k}', 0.13, 0.3, k * 3.2, 1.27, side * 7.35, steel, n=10))

    piers = [-10, -6, -2, 2, 6, 10]
    for px in piers:
        outline = []
        for i in range(9):                 # downstream nose (+Z)
            a = math.pi * i / 8
            outline.append((px + 0.5 * math.cos(a), 2.9 + 0.5 * math.sin(a)))
        for i in range(9):                 # upstream cutwater (-Z)
            a = math.pi + math.pi * i / 8
            outline.append((px + 0.5 * math.cos(a), -0.9 + 0.5 * math.sin(a)))
        parts.append(prism(f'pier-{px}', list(reversed(outline)), 0.3, 4.4, concrete))
        for s in (-1, 1):
            if abs(px + s * 0.5) < 10.4:
                parts.append(box(f'guide-{px}-{s}', 0.12, 3.9, 0.55, px + s * 0.53, 2.35, 1, steel))
    deck_top = 4.73
    parts.append(box('deck', 23.2, 0.36, 2.4, 0, deck_top - 0.18, 1, deck_m, bevel=0.03))
    parts.append(box('deck-edge', 23.3, 0.12, 2.5, 0, deck_top - 0.4, 1, coping))
    for px in piers[:-1]:
        parts.append(box(f'house-{px}', 1.8, 0.42, 1.95, px, deck_top + 0.21, 1, white, bevel=0.04))
        parts.append(shell(f'hood-{px}', px, deck_top + 0.42, 1 - 0.95, 1 + 0.95, 0.92, shell_m))
        for k in (-0.6, 0, 0.6):
            pts = [(px + 0.95 * math.cos(math.pi * i / 12), deck_top + 0.42 + 0.95 * math.sin(math.pi * i / 12), 1 + k)
                   for i in range(13)]
            parts.append(tube(f'hood-rib-{px}-{k}', pts, 0.03, steel))
    # Control house on the far pier, with its own mast.
    cx = 10.2
    parts += [
        box('ctrl-base', 2.3, 0.3, 2.3, cx, deck_top + 0.15, 1, white, bevel=0.03),
        box('ctrl-glass', 2.0, 1.9, 2.0, cx, deck_top + 1.25, 1, glass),
        box('ctrl-roof', 2.6, 0.22, 2.6, cx, deck_top + 2.31, 1, white, bevel=0.04),
        cylinder('ctrl-mast', 0.05, 1.6, cx + 0.8, deck_top + 3.2, 0.4, steel, n=8),
    ]
    for x0, x1 in ((-11.5, 9.0),):
        for z in (1 - 1.14, 1 + 1.14):
            parts += railing(f'deck-rail-{z}', [(x0, deck_top, z), (x1, deck_top, z)], steel, height=0.95, post_every=1.6)
    for x in (-8, 0, 8):
        parts.append(cylinder(f'lamp-post-{x}', 0.05, 1.9, x, deck_top + 0.95, 2.05, steel, n=8))
        parts.append(box(f'lamp-head-{x}', 0.46, 0.1, 0.22, x, deck_top + 1.93, 1.95, steel))
        parts.append(box(f'lamp-lens-{x}', 0.4, 0.02, 0.16, x, deck_top + 1.87, 1.95, lamp))

    # Staff gauge upstream: green to the warning line, amber to 1.60 m, red above.
    # The water's top sits at 0.73 + (level - 1.2) * 3.5 in civic-motion.js, so the
    # bands mark the same thresholds the readout reports.
    gx, gz = -8.6, -4.6
    level = lambda m: 0.73 + (m - 1.2) * 3.5
    parts += [
        cylinder('gauge-post', 0.08, 3.8, gx, 2.1, gz - 0.08, steel, n=8),
        box('gauge-green', 0.4, level(1.4) - 0.35, 0.05, gx, (0.35 + level(1.4)) / 2, gz, green),
        box('gauge-amber', 0.4, level(1.6) - level(1.4), 0.05, gx, (level(1.4) + level(1.6)) / 2, gz, amber),
        box('gauge-red', 0.4, 3.75 - level(1.6), 0.05, gx, (level(1.6) + 3.75) / 2, gz, red),
    ]
    y = 0.73
    while y < 3.7:
        parts.append(box(f'tick-{y:.2f}', 0.2, 0.035, 0.02, gx - 0.1, y, gz + 0.035, steel))
        y += 0.35

    body = join('barrier-body', parts)

    # Gate leaves, each built round its own centre: the page sets their height.
    gates = []
    for i, gxc in enumerate((-8, -4, 0, 4, 8)):
        leaf = [
            box(f'leaf-{i}', 2.92, 1.7, 0.36, 0, 0, 0, gate_m, bevel=0.03),
            box(f'leaf-top-{i}', 2.94, 0.14, 0.42, 0, 0.9, 0, hazard),
        ]
        for y in (-0.5, 0, 0.5):
            leaf.append(box(f'leaf-rib-{i}-{y}', 2.9, 0.09, 0.1, 0, y, 0.22, gate_m))
        for s in (-1, 1):
            leaf.append(box(f'leaf-seal-{i}-{s}', 0.06, 1.7, 0.3, s * 1.49, 0, 0, steel))
        gate = join(f'gate-{i}', leaf)
        gate.location = V(gxc, 1.5, 1)     # closed, for the bake only
        gates.append(gate)

    ground(0.44)
    water = box('water-occluder', 22, 0.2, 14, 0, 0.63, 0, material('occluder', '#ffffff'))
    bake_ao(body, os.path.join(OUT, 'barrier-body-ao.jpg'), size=2048, distance=1.8, samples=128)
    if PREVIEW:
        water.data.materials[0] = material('preview-water', '#3f8fa8', rough=0.2)
        preview(os.path.join(PREVIEW, 'barrier.png'), (0, 2.5, 0), 28)
    for g in gates:
        g.location = (0, 0, 0)
    export(os.path.join(OUT, 'barrier.glb'), [body] + gates)
    return {'file': 'barrier.glb', 'gates': [-8, -4, 0, 4, 8],
            'nodes': {'barrier-body': {'ao': 'barrier-body-ao.jpg'}, **{f'gate-{i}': {} for i in range(5)}},
            'triangles': triangles(body) + sum(triangles(g) for g in gates)}


# -------------------------------------------------------------------- industry
def extrude_z(name, profile, z0, z1, mat):
    """Extrude a section - page (x, y) points - along Z."""
    n = len(profile)
    verts = [(x, y, z0) for x, y in profile] + [(x, y, z1) for x, y in profile]
    faces = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    obj = mesh_from(name, verts, faces, mat)
    from common import _fix_normals
    _fix_normals(obj)
    return obj


def stack(name, x, z, height, G, parts, concrete, red, white, rim, steel):
    """A tapering chimney with aviation bands, a rim and a service gallery."""
    r0, r1 = 0.64, 0.46
    radius = lambda y: r0 + (r1 - r0) * (y / height)
    parts.append(box(name + '-plinth', 1.7, 0.6, 1.7, x, G + 0.3, z, concrete, bevel=0.04))
    parts.append(cylinder(name, r0, height, x, G + 0.6 + height / 2, z, concrete, n=28, r_top=r1))
    for k in range(3):
        y0 = height - 0.55 * (k + 1)
        parts.append(cylinder(f'{name}-band-{k}', radius(y0 + 0.275) + 0.015, 0.55, x, G + 0.6 + y0 + 0.275, z,
                              red if k % 2 == 0 else white, n=28))
    parts.append(cylinder(name + '-rim', r1 + 0.06, 0.22, x, G + 0.6 + height + 0.05, z, rim, n=28))
    gy = G + 0.6 + height * 0.62
    parts.append(cylinder(name + '-gallery', radius(height * 0.62) + 0.45, 0.07, x, gy, z, steel, n=28))
    parts.append(ring_tube(name + '-gallery-rail', x, gy + 0.85, z, radius(height * 0.62) + 0.42, 0.03, steel, steps=32))
    parts.append(box(name + '-ladder', 0.3, height * 0.62, 0.04, x, G + 0.6 + height * 0.31, z + r0 + 0.02, steel))


@landmark
def industry():
    """Sawtooth-roofed works hall, two storage tanks with spiral stairs, three
    banded chimneys and a colour-coded pipe rack."""
    G = 0.565
    brick = material('ind-brick', '#9c5b45', rough=0.9)
    clad = material('ind-cladding', '#8d99a6', rough=0.55, metal=0.25)
    rib_m = material('ind-rib', '#7e8a97', rough=0.5, metal=0.3)
    roof = material('ind-roof', '#5b6168', rough=0.6, metal=0.3)
    glass = material('ind-glass', '#9cc3d2', rough=0.08, metal=0.3)
    door = material('ind-door', '#b9bec4', rough=0.5, metal=0.4)
    tank = material('ind-tank', '#ebe9e3', rough=0.4, metal=0.15)
    weld = material('ind-weld', '#cfd2d4', rough=0.5, metal=0.2)
    concrete = material('ind-concrete', '#cdc7bd', rough=0.85)
    red = material('ind-red', '#c24a3e', rough=0.6)
    white = material('ind-white', '#f2efe9', rough=0.6)
    rim = material('ind-rim', '#3b4148', rough=0.5)
    steel = material('ind-steel', '#6b737c', rough=0.45, metal=0.6)
    gas = material('pipe-gas', '#d6a93a', rough=0.45, metal=0.3)
    grey = material('pipe-grey', '#9aa3ab', rough=0.45, metal=0.4)
    water = material('pipe-water', '#5f8f6a', rough=0.45, metal=0.3)
    wood = material('ind-crate', '#a8834f', rough=0.8)
    hazard = material('ind-hazard', '#e2b13c', rough=0.5)

    parts = []
    x0, x1, z0, z1 = -9.5, 1.5, -2.5, 4.5
    wall_top = G + 4.4
    parts.append(box('hall-brick', x1 - x0, 1.2, z1 - z0, (x0 + x1) / 2, G + 0.6, (z0 + z1) / 2, brick))
    parts.append(box('hall-clad', x1 - x0 - 0.1, 3.2, z1 - z0 - 0.1, (x0 + x1) / 2, G + 2.8, (z0 + z1) / 2, clad))
    parts.append(box('hall-eave', x1 - x0 + 0.3, 0.18, z1 - z0 + 0.3, (x0 + x1) / 2, wall_top, (z0 + z1) / 2, roof))
    # Corrugation on the two faces the camera sees.
    x = x0 + 0.3
    while x < x1 - 0.2:
        parts.append(box(f'rib-z-{x:.2f}', 0.07, 3.1, 0.06, x, G + 2.8, z1 - 0.03, rib_m))
        x += 0.46
    z = z0 + 0.3
    while z < z1 - 0.2:
        parts.append(box(f'rib-x-{z:.2f}', 0.06, 3.1, 0.07, x1 - 0.03, G + 2.8, z, rib_m))
        z += 0.46
    # Sawtooth: four teeth rising toward +X, glazed on their steep face.
    teeth = 4
    w = (x1 - x0) / teeth
    for i in range(teeth):
        a, b = x0 + i * w, x0 + (i + 1) * w
        parts.append(extrude_z(f'tooth-{i}', [(a, wall_top + 0.09), (b, wall_top + 0.09), (b, wall_top + 1.5)], z0 - 0.1, z1 + 0.1, roof))
        parts.append(box(f'tooth-glass-{i}', 0.05, 1.15, z1 - z0, b + 0.03, wall_top + 0.8, (z0 + z1) / 2, glass))
    # Loading doors with hazard bollards, and a ribbon window on the side.
    for dx in (-8.0, -5.5, -3.0):
        parts.append(box(f'door-frame-{dx}', 2.3, 2.9, 0.1, dx, G + 1.45, z1 + 0.04, rim))
        parts.append(box(f'door-{dx}', 2.0, 2.6, 0.08, dx, G + 1.3, z1 + 0.09, door))
        for k in range(8):
            parts.append(box(f'slat-{dx}-{k}', 2.0, 0.03, 0.03, dx, G + 0.3 + k * 0.32, z1 + 0.14, rim))
        for s2 in (-1, 1):
            parts.append(cylinder(f'bollard-{dx}-{s2}', 0.1, 0.9, dx + s2 * 1.35, G + 0.45, z1 + 0.5, hazard, n=10))
    parts.append(box('ribbon-window', 0.06, 0.7, 5.8, x1 + 0.02, G + 3.4, 1.0, glass))
    for k, (cx, cz) in enumerate(((-7.2, 6.0), (-4.3, 6.1), (-1.6, 5.9))):
        for j in range(2 if k != 1 else 3):
            parts.append(box(f'crate-{k}-{j}', 0.8, 0.62, 0.8, cx + (j % 2) * 0.05, G + 0.31 + j * 0.62, cz, wood, bevel=0.03))

    # Storage tanks, stairs on the side facing the camera.
    for t, (tx, tz) in enumerate(((5.2, 2.3), (9.1, 2.3))):
        r, h = 1.45, 4.3
        parts.append(cylinder(f'tank-base-{t}', r + 0.25, 0.25, tx, G + 0.125, tz, concrete, n=36))
        parts.append(cylinder(f'tank-{t}', r, h, tx, G + 0.25 + h / 2, tz, tank, n=40))
        for y in (1.2, 2.4, 3.6):
            parts.append(cylinder(f'weld-{t}-{y}', r + 0.015, 0.05, tx, G + 0.25 + y, tz, weld, n=40))
        top = G + 0.25 + h
        parts.append(sphere(f'tank-roof-{t}', r, tx, top, tz, tank, scale=(1, 0.3, 1), segments=36, rings=10, hemi=True))
        parts.append(ring_tube(f'tank-rail-{t}', tx, top + 0.75, tz, r - 0.1, 0.03, steel, steps=36))
        for k in range(12):
            a = k * math.pi / 6
            parts.append(cylinder(f'tank-post-{t}-{k}', 0.025, 0.75, tx + (r - 0.1) * math.cos(a), top + 0.37, tz + (r - 0.1) * math.sin(a), steel, n=5))
        steps, a0, a1 = 22, math.radians(15), math.radians(175)
        rail = []
        for k in range(steps):
            f = k / (steps - 1)
            a = a0 + (a1 - a0) * f
            y = G + 0.4 + (h - 0.2) * f
            sx, sz = tx + (r + 0.33) * math.cos(a), tz + (r + 0.33) * math.sin(a)
            parts.append(box(f'tread-{t}-{k}', 0.62, 0.05, 0.3, sx, y, sz, steel, rot_y=math.pi / 2 - a))
            rail.append((tx + (r + 0.66) * math.cos(a), y + 0.9, tz + (r + 0.66) * math.sin(a)))
        parts.append(tube(f'stair-rail-{t}', rail, 0.03, steel))

    # Three chimneys behind the hall.
    for i, (sx, h) in enumerate(((-6, 10), (-2, 12), (2, 8))):
        stack(f'stack-{i}', sx, -5, h, G, parts, concrete, red, white, rim, steel)

    # Pipe rack from the hall to the tanks, pipes colour-coded by service.
    ry = G + 3.0
    for rx in (2.4, 4.6, 6.8, 9.0):
        for rz in (-1.2, -0.1):
            parts.append(box(f'rack-col-{rx}-{rz}', 0.14, 3.0, 0.14, rx, G + 1.5, rz, steel))
        parts.append(box(f'rack-beam-{rx}', 0.16, 0.16, 1.3, rx, ry, -0.65, steel))
    for pz, pr, pm in ((-1.0, 0.16, gas), (-0.65, 0.12, grey), (-0.3, 0.13, water)):
        parts.append(tube(f'pipe-{pz}', [(x1, ry + 0.2, pz), (9.5, ry + 0.2, pz)], pr, pm, resolution=10))
    for tx in (5.2, 9.1):
        parts.append(tube(f'feed-{tx}', [(tx, ry + 0.2, -0.3), (tx, ry + 0.2, 0.55), (tx, ry - 0.4, 0.95)], 0.13, water, resolution=10))

    body = join('industry-body', parts)
    ground(G)
    bake_ao(body, os.path.join(OUT, 'industry-body-ao.jpg'), size=2048, distance=2.0, samples=128)
    if PREVIEW:
        preview(os.path.join(PREVIEW, 'industry.png'), (0, 4, -1), 30)
    export(os.path.join(OUT, 'industry.glb'), [body])
    return {'file': 'industry.glb', 'nodes': {'industry-body': {'ao': 'industry-body-ao.jpg'}}, 'triangles': triangles(body)}


# --------------------------------------------------------------------- transit
def bus_model(white, blue, glass, tyre, hub, amber, lamp):
    """A low-floor city bus, nose along +X, wheels on y = 0."""
    parts = [
        box('bus-body', 5.4, 1.62, 1.75, 0, 0.3 + 0.81, 0, white, bevel=0.2, segments=3),
        box('bus-skirt', 5.36, 0.46, 1.77, 0, 0.55, 0, blue, bevel=0.12, segments=2),
        box('bus-ac', 2.3, 0.24, 1.2, -0.6, 2.02, 0, white, bevel=0.08, segments=2),
        box('bus-screen', 0.03, 1.05, 1.56, 2.71, 1.33, 0, glass),
        box('bus-rear', 0.03, 0.55, 1.3, -2.71, 1.6, 0, glass),
        box('bus-dest', 0.03, 0.2, 1.1, 2.72, 1.98, 0, amber),
    ]
    for side in (-1, 1):
        parts.append(box(f'bus-windows-{side}', 4.5, 0.74, 0.03, -0.25, 1.48, side * 0.885, glass))
        if side > 0:                       # doors on the kerb side only
            parts.append(box(f'bus-door-{side}', 0.9, 1.25, 0.03, 1.55, 1.05, side * 0.89, glass))
        for wx in (-1.75, 1.75):
            parts.append(cylinder(f'tyre-{side}-{wx}', 0.42, 0.3, wx, 0.42, side * 0.76, tyre, n=18, axis='z'))
            parts.append(cylinder(f'hub-{side}-{wx}', 0.22, 0.32, wx, 0.42, side * 0.77, hub, n=12, axis='z'))
        parts.append(box(f'bus-head-{side}', 0.03, 0.14, 0.3, 2.72, 0.78, side * 0.62, lamp))
    return join('bus', parts)


@landmark
def transit():
    """Station hall with a glazed front, a barrel-vault canopy on branching
    columns over the platform, and a city bus."""
    G = 0.565
    white = material('tr-white', '#f2efe9', rough=0.5)
    stone = material('tr-platform', '#d6d1c7', rough=0.8)
    tactile = material('tr-tactile', '#e8c547', rough=0.7)
    glass = material('tr-glass', '#4f7385', rough=0.08, metal=0.4)
    canopy = material('tr-canopy-glass', '#d3e8ee', rough=0.05, alpha=0.32)
    steel = material('tr-steel', '#e6e8eb', rough=0.35, metal=0.4)
    dark = material('tr-dark', '#2f3338', rough=0.5)
    sign = material('tr-sign', '#2d5e9e', rough=0.5)
    signlight = material('light-sign', '#ffffff', emit='#f4f8ff', emit_strength=2.0)
    wood = material('tr-bench', '#a8834f', rough=0.7)
    bus_white = material('bus-white', '#f4f3ef', rough=0.35)
    bus_blue = material('bus-blue', '#2c5ea0', rough=0.4)
    bus_glass = material('bus-glass', '#1f2c36', rough=0.1, metal=0.3)
    tyre = material('bus-tyre', '#1f2226', rough=0.85)
    hub = material('bus-hub', '#b8bec5', rough=0.35, metal=0.7)
    amber = material('light-destination', '#ffb347', emit='#ffb347', emit_strength=2.4)
    lamp = material('light-lamp', '#fff4dc', emit='#fff1d0', emit_strength=3.0)

    parts = []
    # Station hall.
    top = G + 3.4
    parts += [
        box('hall-floor', 14, 0.25, 3, 0, G + 0.125, -5.5, stone),
        box('hall-back', 14, 3.3, 0.25, 0, G + 1.65, -6.9, white),
        box('hall-roof', 14.8, 0.32, 3.8, 0, top + 0.16, -5.4, white, bevel=0.05),
        # The roof is most of what the camera sees of the hall: a membrane inset
        # inside a parapet, a strip of rooflights and the plant on top of it.
        box('roof-membrane', 14.0, 0.04, 3.1, 0, top + 0.34, -5.45, material('tr-membrane', '#c9cdd2', rough=0.8)),
        box('roof-lights', 9.0, 0.16, 0.7, -1.2, top + 0.42, -5.9, glass, bevel=0.03),
        box('plant-a', 1.2, 0.55, 0.9, 4.6, top + 0.6, -5.0, material('tr-plant', '#aeb4ba', rough=0.5, metal=0.4), bevel=0.04),
        box('plant-b', 1.2, 0.55, 0.9, 5.9, top + 0.6, -5.0, material('tr-plant', '#aeb4ba', rough=0.5, metal=0.4), bevel=0.04),
        cylinder('plant-fan-a', 0.3, 0.06, 4.6, top + 0.9, -5.0, dark, n=16),
        cylinder('plant-fan-b', 0.3, 0.06, 5.9, top + 0.9, -5.0, dark, n=16),
        box('hall-glass', 13.6, 3.05, 0.08, 0, G + 1.6, -4.05, glass),
        box('hall-transom', 13.6, 0.1, 0.14, 0, G + 2.45, -4.0, white),
        box('sign-band', 6.2, 0.55, 0.12, 0, top - 0.35, -3.62, sign),
        box('sign-light', 5.4, 0.14, 0.02, 0, top - 0.35, -3.55, signlight),
        box('hall-doors', 2.2, 2.3, 0.05, 0, G + 1.15, -3.98, dark),
    ]
    for side in (-1, 1):
        parts.append(box(f'hall-side-{side}', 0.25, 3.3, 3.0, side * 6.9, G + 1.65, -5.5, white))
    for k in range(11):
        parts.append(box(f'mullion-{k}', 0.08, 3.05, 0.14, -6.5 + k * 1.3, G + 1.6, -4.0, white))
    # Platform with a tactile edge.
    parts += [
        box('platform', 15, 0.28, 4.8, 0, G + 0.14, -1.0, stone, bevel=0.02),
        box('tactile', 15, 0.02, 0.4, 0, G + 0.29, 1.15, tactile),
        box('edge-line', 15, 0.021, 0.08, 0, G + 0.29, 1.36, white),
    ]
    pt = G + 0.28
    # Barrel vault: glass skin, arched ribs and edge beams.
    spring, rise, zc, half = G + 3.7, 1.0, -1.0, 2.35
    profile = []
    for i in range(17):
        t = math.pi * i / 16
        profile.append((zc + half * math.cos(t), spring + rise * math.sin(t)))
    inner = [(z, y - 0.04) for z, y in reversed(profile)]
    parts.append(extrude_x('vault', profile + inner, -7.4, 7.4, canopy))
    for k in range(9):
        x = -7.4 + k * 14.8 / 8
        parts.append(tube(f'arch-{k}', [(x, y, z) for z, y in profile], 0.06, steel))
    for z in (zc - half, zc + half):
        parts.append(tube(f'edge-{z}', [(-7.4, spring, z), (7.4, spring, z)], 0.09, steel))
    # Branching columns under the vault.
    for x in (-5.2, 0, 5.2):
        parts.append(cylinder(f'trunk-{x}', 0.17, 2.1, x, pt + 1.05, zc, steel, n=14))
        for dx in (-1.3, 1.3):
            for dz in (-half + 0.05, half - 0.05):
                parts.append(tube(f'branch-{x}-{dx}-{dz}', [(x, pt + 2.05, zc), (x + dx, spring, zc + dz)], 0.07, steel))
    # Benches and two information totems.
    for x in (-3.4, 2.6):
        parts.append(box(f'bench-{x}', 1.8, 0.08, 0.45, x, pt + 0.45, -2.2, wood))
        for dx in (-0.7, 0.7):
            parts.append(box(f'bench-leg-{x}-{dx}', 0.06, 0.42, 0.4, x + dx, pt + 0.21, -2.2, dark))
    for x in (-6.2, 6.2):
        parts.append(box(f'totem-{x}', 0.5, 1.9, 0.18, x, pt + 0.95, 0.3, dark, bevel=0.03))
        parts.append(box(f'totem-screen-{x}', 0.4, 1.0, 0.02, x, pt + 1.2, 0.4, signlight))

    body = join('transit-body', parts)
    bus = bus_model(bus_white, bus_blue, bus_glass, tyre, hub, amber, lamp)
    bus.location = V(-3.2, G, 2.7)
    ground(G)
    bake_ao(body, os.path.join(OUT, 'transit-body-ao.jpg'), size=2048, distance=2.0, samples=128)
    bake_ao(bus, os.path.join(OUT, 'transit-bus-ao.jpg'), size=512, distance=0.8, samples=96)
    if PREVIEW:
        preview(os.path.join(PREVIEW, 'transit.png'), (0, 2.5, -1), 22)
    bus.location = (0, 0, 0)
    export(os.path.join(OUT, 'transit.glb'), [body, bus])
    return {'file': 'transit.glb', 'buses': [[-3.2, G, 2.7], [3.6, G, 5.1]],
            'nodes': {'transit-body': {'ao': 'transit-body-ao.jpg'}, 'bus': {'ao': 'transit-bus-ao.jpg'}},
            'triangles': triangles(body) + triangles(bus)}


# ----------------------------------------------------------------------- solar
def paint_cells(path, cols=8, rows=6, px=64):
    """Monocrystalline cells: dark blue squares with clipped corners, two silver
    busbars each, white gaps between. Painted straight into the pixels."""
    import numpy as np
    w, h = cols * px, rows * px
    img = np.ones((h, w, 4), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = xx % px, yy % px
    gap = 3
    inside = (cx >= gap) & (cx < px - gap) & (cy >= gap) & (cy < px - gap)
    corner = (np.minimum(cx - gap, px - gap - 1 - cx) + np.minimum(cy - gap, px - gap - 1 - cy)) < 7
    cell = inside & ~corner
    shade = 0.9 + 0.1 * ((xx // px + yy // px) % 3) / 2
    base = np.array([0.035, 0.07, 0.17])
    for c in range(3):
        img[..., c] = np.where(cell, base[c] * shade, 0.82)
    bus = cell & ((np.abs(cx - px * 0.33) < 1.2) | (np.abs(cx - px * 0.67) < 1.2))
    for c in range(3):
        img[..., c] = np.where(bus, 0.62, img[..., c])
    finger = cell & (cy % 6 == 0)
    for c in range(3):
        img[..., c] = np.where(finger, img[..., c] * 1.6 + 0.02, img[..., c])
    image = bpy.data.images.new('solar-cells', w, h, alpha=False)
    image.pixels.foreach_set(np.flipud(img).ravel())
    image.filepath_raw = path
    image.file_format = 'PNG'
    image.save()
    return image


@landmark
def solar():
    """One photovoltaic table: a framed module tilted 15 degrees toward +Z on
    aluminium legs and concrete footings."""
    frame = material('solar-frame', '#c7ccd1', rough=0.3, metal=0.7)
    cells = material('solar-cells', '#ffffff', rough=0.28, metal=0.25)
    concrete = material('solar-footing', '#cdc7bd', rough=0.85)
    tilt = math.radians(15)
    W, D, H = 2.6, 2.0, 1.02          # module size and centre height
    # The rails run under the module and tilt with it; left level, they came up
    # through the cells at the low edge.
    parts = [
        box('module', W + 0.06, 0.06, D + 0.06, 0, 0, 0, frame, bevel=0.012),
        box('rail-a', 0.06, 0.06, D - 0.1, -1.0, -0.07, 0, frame),
        box('rail-b', 0.06, 0.06, D - 0.1, 1.0, -0.07, 0, frame),
    ]
    face = quads('cells', [(((-W / 2, 0.035, D / 2), (W / 2, 0.035, D / 2), (W / 2, 0.035, -D / 2), (-W / 2, 0.035, -D / 2)),
                            (0, 0, 1, 1))], cells)
    panel = join('panel', parts + [face])
    # Tilt about the page X axis so the module faces up and toward +Z.
    panel.rotation_euler = (tilt, 0, 0)
    panel.location = V(0, 0.44 + H, 0)
    legs = []
    for x in (-1.0, 1.0):
        for z in (0.8, -0.8):
            # Up to the underside of the tilted rail at this depth.
            top = 0.44 + H - z * math.sin(tilt) - 0.1
            h = top - (0.44 + 0.12)
            legs.append(box(f'leg-{x}-{z}', 0.07, h, 0.07, x, 0.44 + 0.12 + h / 2, z, frame))
            legs.append(box(f'footing-{x}-{z}', 0.3, 0.24, 0.3, x, 0.44 + 0.12, z, concrete, bevel=0.02))
    table = join('solar-table', [panel] + legs)
    paint_cells(os.path.join(OUT, 'solar-cells.png'))
    if PREVIEW:
        ground(0.44)
        nodes, links = cells.node_tree.nodes, cells.node_tree.links
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(os.path.join(OUT, 'solar-cells.png'))
        links.new(tex.outputs['Color'], nodes['Principled BSDF'].inputs['Base Color'])
        preview(os.path.join(PREVIEW, 'solar.png'), (0, 1, 0), 5)
        nodes.remove(tex)
        bpy.data.objects.remove(bpy.data.objects['ground-occluder'])
    export(os.path.join(OUT, 'solar.glb'), [table])
    return {'file': 'solar.glb',
            'nodes': {'solar-table': {'maps': {'solar-cells': {'file': 'solar-cells.png', 'emissive': False}}}},
            'triangles': triangles(table)}


def main():
    os.makedirs(OUT, exist_ok=True)
    names = sys.argv[1:] or list(BUILDERS)
    for name in names:
        reset()
        clear_materials()
        entry = BUILDERS[name]()
        write_manifest(OUT, name, entry)
        print(f'{name}: {entry["triangles"]} triangles')


if __name__ == '__main__':
    main()
