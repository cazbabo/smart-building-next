"""The whole city in Blender, rebuilt from scripts/dump-city.mjs.

    node scripts/dump-city.mjs overview /tmp/city && python3 scripts/blender/city.py /tmp/city ground-ao
    node scripts/dump-city.mjs iot /tmp/city      && python3 scripts/blender/city.py /tmp/city poster

ground-ao  renders ambient occlusion straight down onto the ground surfaces the
           page tags (base slab, road, platforms, lawns, paths, lane paint) and
           writes public/city/ground-ao.jpg with its world bounds. Everything
           else is invisible to the camera but still occludes, so the ground
           under a tree or beside a wall comes out dark while the tree and the
           wall themselves are not in the picture.
poster     renders the static preview with Cycles - global illumination, soft
           sun, the dashboard lit on the video wall - from the same isometric
           direction and framing the old software rasteriser used.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np  # noqa: E402
import bpy  # noqa: E402
from common import V, reset, srgb  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
LANDMARKS = os.path.join(ROOT, 'public', 'landmarks')


def load(prefix, roles):
    header = json.load(open(prefix + '.json'))
    raw = np.fromfile(prefix + '.bin', dtype=np.float32)
    objects = []
    for g in header['groups']:
        if g['role'] not in roles:
            continue
        n = g['vertices']
        start = g['offset'] // 4
        d = raw[start:start + n * 11].reshape(n, 11)
        pos = np.stack([d[:, 0], -d[:, 2], d[:, 1]], axis=1)
        nor = np.stack([d[:, 3], -d[:, 5], d[:, 4]], axis=1)
        me = bpy.data.meshes.new(g['name'])
        me.vertices.add(n)
        me.vertices.foreach_set('co', pos.astype(np.float32).ravel())
        me.loops.add(n)
        me.loops.foreach_set('vertex_index', np.arange(n, dtype=np.int32))
        tris = n // 3
        me.polygons.add(tris)
        me.polygons.foreach_set('loop_start', np.arange(0, n, 3, dtype=np.int32))
        me.polygons.foreach_set('loop_total', np.full(tris, 3, dtype=np.int32))
        me.update(calc_edges=True)
        me.polygons.foreach_set('use_smooth', np.ones(tris, dtype=bool))
        me.normals_split_custom_set(nor.tolist())
        colour = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        colour.data.foreach_set('color', np.concatenate([d[:, 6:9], np.ones((n, 1))], axis=1).astype(np.float32).ravel())
        uv = me.uv_layers.new(name='uv')
        # three's glTF UVs have v running down the image; Blender's run up.
        uv.data.foreach_set('uv', np.stack([d[:, 9], 1 - d[:, 10]], axis=1).astype(np.float32).ravel())
        obj = bpy.data.objects.new(g['name'], me)
        bpy.context.scene.collection.objects.link(obj)
        obj['role'] = g['role']
        obj.data.materials.append(material(g))
        objects.append((obj, g))
    return objects


def material(g):
    m = bpy.data.materials.new(g['name'])
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Col'
    bsdf.inputs['Roughness'].default_value = min(1, max(0, g['roughness']))
    bsdf.inputs['Metallic'].default_value = g['metalness']
    emissive = g['emissive']
    if g.get('texture'):
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(os.path.join(LANDMARKS, g['texture']))
        if g['textureRole'] == 'emissive':
            nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
            bsdf.inputs['Emission Strength'].default_value = 1.0
            bsdf.inputs['Base Color'].default_value = (0, 0, 0, 1)
        else:
            mix = nt.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1
            nt.links.new(vc.outputs['Color'], mix.inputs[6])
            nt.links.new(tex.outputs['Color'], mix.inputs[7])
            nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
    else:
        nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
        if max(emissive) > 0:
            bsdf.inputs['Emission Color'].default_value = (*emissive, 1)
            bsdf.inputs['Emission Strength'].default_value = 1.0
    if g['opacity'] < 1:
        bsdf.inputs['Alpha'].default_value = g['opacity']
    return m


def camera(location, target, ortho_scale):
    data = bpy.data.cameras.new('camera')
    data.type = 'ORTHO'
    data.ortho_scale = ortho_scale
    data.clip_end = 1000
    cam = bpy.data.objects.new('camera', data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = location
    cam.rotation_euler = (target - location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam
    return cam


def save_grey_jpeg(src, dst, blur=1, quality=86):
    img = bpy.data.images.load(src)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    v = px.reshape(h, w, 4)[..., 0]
    for _ in range(blur):
        p = np.pad(v, 1, mode='edge')
        v = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:] + 4 * p[1:-1, 1:-1]) / 8
    img.pixels.foreach_set(np.stack([v, v, v, np.ones_like(v)], axis=-1).ravel())
    s = bpy.context.scene.render.image_settings
    s.file_format, s.color_mode, s.quality = 'JPEG', 'BW', quality
    img.save_render(dst, scene=bpy.context.scene)
    return v


def ground_ao(prefix):
    scene = reset()
    objects = load(prefix, {'ground', 'solid'})
    ao = bpy.data.materials.new('ao')
    ao.use_nodes = True
    nt = ao.node_tree
    node = nt.nodes.new('ShaderNodeAmbientOcclusion')
    node.samples = 16
    node.inputs['Distance'].default_value = 3.2
    emit = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(node.outputs['AO'], emit.inputs['Color'])
    nt.links.new(emit.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface'])
    lo, hi = np.array([1e9, 1e9]), np.array([-1e9, -1e9])
    for obj, g in objects:
        if g['role'] == 'ground':
            obj.data.materials[0] = ao
            co = np.empty(len(obj.data.vertices) * 3, dtype=np.float32)
            obj.data.vertices.foreach_get('co', co)
            co = co.reshape(-1, 3)
            lo = np.minimum(lo, [co[:, 0].min(), -co[:, 1].max()])
            hi = np.maximum(hi, [co[:, 0].max(), -co[:, 1].min()])
        else:
            obj.visible_camera = False
    size = hi - lo
    width = 2048
    height = int(round(width * size[1] / size[0]))
    centre = (lo + hi) / 2
    camera(V(centre[0], 200, centre[1]), V(centre[0], 0, centre[1]), float(size[0]))
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.cycles.samples = 24
    scene.cycles.use_denoising = False
    scene.view_settings.view_transform = 'Raw'
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
    tmp = prefix + '-ground-ao.png'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    out_dir = os.path.join(ROOT, 'public', 'city')
    os.makedirs(out_dir, exist_ok=True)
    save_grey_jpeg(tmp, os.path.join(out_dir, 'ground-ao.jpg'))
    with open(os.path.join(out_dir, 'ground-ao.json'), 'w') as f:
        json.dump({'min': [round(float(lo[0]), 3), round(float(lo[1]), 3)],
                   'size': [round(float(size[0]), 3), round(float(size[1]), 3)]}, f)
    print(f'ground ao: {width}x{height} over {size[0]:.1f} x {size[1]:.1f} units')


# Framed on the content rather than inherited from the old rasteriser, which
# left a quarter of the image empty above the command center.
def poster(prefix, out, width=1600, height=1200, span=126, target=(-9.8, 0.9, -2.1), samples=192):
    scene = reset()
    load(prefix, {'ground', 'solid', 'overlay'})
    t = V(*target)
    camera(t + V(102, 100, 102).normalized() * 200, t, span)
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 3.6
    sun_data.angle = math.radians(2.2)
    sun = bpy.data.objects.new('sun', sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (V(-45, 85, 35) * -1).to_track_quat('-Z', 'Y').to_euler()
    bg = scene.world.node_tree.nodes['Background']
    bg.inputs[0].default_value = srgb('#e9ecf8')
    bg.inputs[1].default_value = 0.95
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    tmp = prefix + '-poster.png'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    # Composited onto the page's own ground, #FAF8FC, in display space. On a
    # phone nothing sits under the image inside its layer, so a multiply blend
    # cannot hide a white ground there; matching the page colour does.
    img = bpy.data.images.load(tmp)
    px = np.empty(width * height * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(height, width, 4)
    a = px[..., 3:4]
    page = np.array([250, 248, 252], dtype=np.float32) / 255
    rgb = px[..., :3] * a + page * (1 - a)
    img.pixels.foreach_set(np.concatenate([rgb, np.ones_like(a)], axis=-1).ravel())
    # Saving goes through the scene's colour management; with the sRGB image and
    # the Standard view that is an identity, so the AgX grade is applied once.
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    s = scene.render.image_settings
    s.file_format, s.color_mode, s.quality = 'JPEG', 'RGB', 90
    img.save_render(out, scene=scene)
    print(f'poster -> {out}')


if __name__ == '__main__':
    prefix, mode = sys.argv[1], sys.argv[2]
    if mode == 'ground-ao':
        ground_ao(prefix)
    else:
        poster(prefix, sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, 'public', 'city-intelligence-civic.jpg'))
