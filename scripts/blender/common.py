"""Shared helpers for the landmark models.

Everything here is written in the page's own frame - three.js, Y up, the camera
looking in from +X +Z - so dimensions can be read straight across from
civic-model.js. The glTF exporter turns Blender's Z-up into Y-up on the way out:
three (X, Y, Z) is Blender (X, -Z, Y), and `V` does that conversion in one place.
"""
import math
import bpy
import bmesh
from mathutils import Vector, Matrix


def V(x, y, z):
    return Vector((x, -z, y))


def srgb(hex_colour):
    """Hex sRGB to the linear RGBA Blender and glTF both store."""
    h = hex_colour.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    world = bpy.data.worlds.new('world')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
    return scene


_materials = {}


def material(name, colour, rough=0.65, metal=0.0, emit=None, emit_strength=0.0, alpha=1.0):
    """One material per name. Names carry meaning to the page's loader: anything
    starting `screen` or `light` is self-lit and never takes the AO map."""
    if name in _materials:
        return _materials[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = srgb(colour)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = srgb(emit)
        bsdf.inputs['Emission Strength'].default_value = emit_strength
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    _materials[name] = m
    return m


def clear_materials():
    _materials.clear()


def _finish(obj, mat, bevel=0.0, segments=2, smooth_angle=None):
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40)
        mod.harden_normals = False
    if smooth_angle is not None:
        # Smooth shading split at hard edges. Blender 4.2's "Smooth by Angle" is
        # an asset-library node group; an edge split is the dependable equivalent.
        for poly in obj.data.polygons:
            poly.use_smooth = True
        split = obj.modifiers.new('split', 'EDGE_SPLIT')
        split.split_angle = math.radians(smooth_angle)
    return obj


def link(obj, collection=None):
    (collection or bpy.context.scene.collection).objects.link(obj)
    return obj


def box(name, w, h, d, x, y, z, mat, bevel=0.0, segments=2, rot_y=0.0, collection=None):
    """Axis-aligned box in page units: w along X, h up, d along Z, centred."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((w, d, h)), verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me), collection)
    obj.location = V(x, y, z)
    obj.rotation_euler = (0, 0, rot_y)
    return _finish(obj, mat, bevel, segments)


def cylinder(name, r, h, x, y, z, mat, n=24, r_top=None, bevel=0.0, axis='y', collection=None, smooth=True, cap=True):
    """Cylinder or cone frustum centred at (x, y, z). `axis` is the page axis it
    runs along."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=n,
                          radius1=r, radius2=r if r_top is None else r_top, depth=h)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me), collection)
    obj.location = V(x, y, z)
    if axis == 'x':
        obj.rotation_euler = (0, math.pi / 2, 0)
    elif axis == 'z':
        obj.rotation_euler = (math.pi / 2, 0, 0)
    _finish(obj, mat, bevel, 2, 35 if smooth else None)
    return obj


def sphere(name, r, x, y, z, mat, scale=(1, 1, 1), segments=24, rings=12, hemi=False, collection=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=r)
    if hemi:
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me), collection)
    obj.location = V(x, y, z)
    obj.scale = (scale[0], scale[2], scale[1])
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.data.materials.append(mat)
    return obj


def mesh_from(name, verts, faces, mat, collection=None, smooth=False):
    """Raw mesh from page-space vertices."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(V(*v)) for v in verts], [], faces)
    me.update()
    obj = link(bpy.data.objects.new(name, me), collection)
    if smooth:
        for poly in obj.data.polygons:
            poly.use_smooth = True
    obj.data.materials.append(mat)
    return obj


def apply_all(objects):
    """Bake modifiers into the meshes so joining keeps them."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.convert(target='MESH')


def join(name, objects):
    apply_all(objects)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = name
    body.data.name = name
    # Transforms into the vertices, so the exported node is identity and the
    # page can place it by the district origin alone.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return body


def triangles(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def prism(name, outline, y0, y1, mat, bevel=0.0, segments=2, collection=None):
    """Extrude a plan outline - page (x, z) points, counter-clockwise from above -
    straight up from y0 to y1."""
    n = len(outline)
    verts = [(x, y0, z) for x, z in outline] + [(x, y1, z) for x, z in outline]
    faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    obj = mesh_from(name, verts, faces, mat, collection)
    _fix_normals(obj)
    if bevel:
        mod = obj.modifiers.new('bevel', 'BEVEL')
        mod.width, mod.segments = bevel, segments
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(40)
    return obj


def extrude_x(name, profile, x0, x1, mat, collection=None):
    """Extrude a section - page (z, y) points - along X from x0 to x1. Pediments,
    vaults and anything else that is one shape run lengthways."""
    n = len(profile)
    verts = [(x0, y, z) for z, y in profile] + [(x1, y, z) for z, y in profile]
    faces = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))]
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, n + i, n + j, j))
    obj = mesh_from(name, verts, faces, mat, collection)
    _fix_normals(obj)
    return obj


def _fix_normals(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()


def tube(name, points, r, mat, resolution=6, cyclic=False, collection=None):
    """A round section swept along page-space points - pipes, rails, handrails."""
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = r
    curve.bevel_resolution = max(1, resolution // 4)
    curve.use_fill_caps = True
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for p, (x, y, z) in zip(spline.points, points):
        p.co = (*V(x, y, z), 1)
    spline.use_cyclic_u = cyclic
    obj = link(bpy.data.objects.new(name, curve), collection)
    obj.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    obj = bpy.context.view_layer.objects.active
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def arc(cx, cz, radius, a0, a1, y, steps):
    """Points on a horizontal arc; angles in radians, 0 along +X, turning to +Z."""
    return [(cx + radius * math.cos(a0 + (a1 - a0) * i / steps), y,
             cz + radius * math.sin(a0 + (a1 - a0) * i / steps)) for i in range(steps + 1)]


def ring_tube(name, cx, y, cz, radius, r, mat, steps=48, collection=None):
    pts = arc(cx, cz, radius, 0, 2 * math.pi, y, steps)[:-1]
    return tube(name, pts, r, mat, cyclic=True, collection=collection)


def railing(name, points, mat, height=0.9, post_every=1.2, r=0.035, collection=None):
    """Top rail, mid rail and posts along a polyline at ground level."""
    parts = [tube(name + '-top', [(x, y + height, z) for x, y, z in points], r, mat, collection=collection),
             tube(name + '-mid', [(x, y + height * 0.5, z) for x, y, z in points], r * 0.7, mat, collection=collection)]
    for i in range(len(points) - 1):
        (x0, y0, z0), (x1, y1, z1) = points[i], points[i + 1]
        length = math.dist((x0, z0), (x1, z1))
        count = max(1, round(length / post_every))
        for k in range(count + (1 if i == len(points) - 2 else 0)):
            t = k / count
            px, py, pz = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t
            parts.append(cylinder(f'{name}-post', r * 0.9, height, px, py + height / 2, pz, mat, n=6, collection=collection))
    return parts


def quads(name, quad_list, mat, collection=None):
    """Flat quads, each ((4 page-space corners), (u0, v0, u1, v1)), with a UV map
    laid out from the second tuple. Corners run bottom-left, bottom-right,
    top-right, top-left as seen from the front."""
    verts, faces, uvs = [], [], []
    for corners, (u0, v0, u1, v1) in quad_list:
        base = len(verts)
        verts.extend(corners)
        faces.append((base, base + 1, base + 2, base + 3))
        uvs.append(((u0, v0), (u1, v0), (u1, v1), (u0, v1)))
    obj = mesh_from(name, verts, faces, mat, collection)
    layer = obj.data.uv_layers.new(name='content')
    for poly, face_uv in zip(obj.data.polygons, uvs):
        for loop_index, uv in zip(poly.loop_indices, face_uv):
            layer.data[loop_index].uv = uv
    return obj
