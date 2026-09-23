"""AO lightmaps and GLB export for the landmarks."""
import json
import math
import os
import bpy
from common import V, material, box


def lightmap_uv(obj, margin=0.004):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    # The lightmap must be the only UV set. Swept tubes carry a UV map of their
    # own out of the curve conversion; left in place it becomes TEXCOORD_0 and
    # the lightmap TEXCOORD_1, and the page's aoMap - which reads the first set -
    # samples the wrong coordinates and blacks out every wall.
    while obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers[0])
    uv = obj.data.uv_layers.new(name='lightmap')
    obj.data.uv_layers.active = uv
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=margin, area_weight=0.0,
                             correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(rotate=True, margin=margin)
    bpy.ops.object.mode_set(mode='OBJECT')


def ground(y=0.44, size=60):
    """The district platform, so undersides and feet bake dark where they meet it.
    Occluder only: it is never selected for the bake or the export."""
    g = box('ground-occluder', size, 0.1, size, 0, y - 0.05, 0, material('occluder', '#ffffff'))
    return g


def bake_ao(obj, path, size=1024, distance=2.4, samples=160):
    """Ambient occlusion into a lightmap, with the whole scene as occluders."""
    scene = bpy.context.scene
    scene.world.light_settings.distance = distance
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False
    lightmap_uv(obj)
    image = bpy.data.images.new(os.path.basename(path), size, size, alpha=False)
    for mat in obj.data.materials:
        nodes = mat.node_tree.nodes
        node = nodes.new('ShaderNodeTexImage')
        node.image = image
        node.name = 'bake-target'
        nodes.active = node
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    scene.render.bake.margin = 8
    scene.render.bake.margin_type = 'EXTEND'
    bpy.ops.object.bake(type='AO', margin=8, use_clear=True)
    save_ao(image, path, scene)
    # The bake target must not be mistaken for a colour texture on export.
    for mat in obj.data.materials:
        nodes = mat.node_tree.nodes
        if 'bake-target' in nodes:
            nodes.remove(nodes['bake-target'])
    return image


def save_ao(image, path, scene):
    """AO is smooth and single-channel. Straight out of the bake it is also noisy,
    and noise is what made the PNGs 2 MB each: a light blur removes the grain
    (the 8 px bake margin keeps it from bleeding across UV islands) and a
    greyscale JPEG stores what is left in a tenth of the space."""
    import numpy as np
    w, h = image.size
    px = np.empty(w * h * 4, dtype=np.float32)
    image.pixels.foreach_get(px)
    ao = px.reshape(h, w, 4)[..., 0]
    for _ in range(2):
        pad = np.pad(ao, 1, mode='edge')
        ao = (pad[:-2, 1:-1] + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:] + 4 * pad[1:-1, 1:-1]) / 8
    # Baked at twice the size it ships at: halving is a 2 x 2 average, which is
    # anti-aliasing and denoising in one step.
    if w >= 2048:
        ao = ao.reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3))
        h, w = ao.shape
        image = bpy.data.images.new(image.name + '-half', w, h, alpha=False)
    out = np.stack([ao, ao, ao, np.ones_like(ao)], axis=-1)
    image.pixels.foreach_set(out.ravel())
    settings = scene.render.image_settings
    settings.file_format = 'JPEG'
    settings.color_mode = 'BW'
    settings.quality = 85
    image.save_render(path, scene=scene)


def export(path, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_apply=True, export_texcoords=True, export_normals=True,
                              export_materials='EXPORT', export_yup=True, export_animations=False,
                              export_extras=False, export_cameras=False, export_lights=False)


def write_manifest(out_dir, name, entry):
    path = os.path.join(out_dir, 'manifest.json')
    manifest = {}
    if os.path.exists(path):
        with open(path) as f:
            manifest = json.load(f)
    manifest[name] = entry
    with open(path, 'w') as f:
        json.dump(manifest, f, indent=1, sort_keys=True)


def preview(path, target, span, size=(900, 700), samples=48, rotate_parts=None):
    """A quick Cycles render from the page's own isometric direction, for checking
    a model while it is being built. Not shipped."""
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new('preview')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = span
    cam = bpy.data.objects.new('preview', cam_data)
    scene.collection.objects.link(cam)
    t = V(*target)
    cam.location = t + V(102, 100, 102).normalized() * 120
    direction = t - cam.location
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 3.2
    sun_data.angle = math.radians(3)
    sun = bpy.data.objects.new('sun', sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (V(-45, 85, 35) * -1).to_track_quat('-Z', 'Y').to_euler()
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.78, 0.78, 0.82, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = 'AgX'
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)
    bpy.data.objects.remove(sun)
