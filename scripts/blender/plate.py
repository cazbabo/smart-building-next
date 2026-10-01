"""The film's 3D plate: one large Cycles still of the city.

    node scripts/dump-city.mjs overview /tmp/city
    node scripts/video/timeline.mjs /tmp/master.json
    python3 scripts/blender/plate.py /tmp/city /tmp/master.json out.png [samples=64] [day|dusk]

The film's camera only pans and zooms along the page's own isometric view, so
with an orthographic camera every frame is an exact crop of this image; the
frames are cut from it in scripts/video/frames.mjs. The data layer - routes,
pins, sensors, the forecast - is drawn there too, so only the city is rendered.
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
import bpy  # noqa: E402
from common import V, reset, srgb  # noqa: E402
from city import load  # noqa: E402


# Two lights over the same city, so the film can go from one to the other with
# a cross-fade that is exact, pixel for pixel.
#
# day   the page's own light - a soft white sun in a pale lavender world - with a
#       catcher under the city so it stands on the film's page, not above it.
# dusk  the sun low and warm on the left, just a rim; a deep indigo sky for the
#       fill; windows, lamps and screens lit. The data drawn over it is lime and
#       orchid, and it glows against the dark the way it cannot against white.
LOOKS = {
    'day': {'sun': (-45, 85, 35), 'sun_colour': '#FFF6EC', 'sun_energy': 3.6, 'sun_angle': 2.2,
            'sky': '#E9ECF8', 'sky_strength': 0.95, 'lit': 0, 'shadow': True},
    'dusk': {'sun': (-80, 14, 30), 'sun_colour': '#FF9C6B', 'sun_energy': 2.2, 'sun_angle': 4,
             'sky': '#4A4390', 'sky_strength': 0.62, 'lit': 1, 'shadow': False},
}
WINDOW = '#FFC98A'


def lamp_pools(objects, amount):
    """An emissive lamp head is a bright dot that lights nothing near it. Each
    head - a loose cluster of the lamp mesh - gets a small warm light just under
    it, so the streets have pools of light."""
    import numpy as np
    heads = []
    for obj, g in objects:
        if g['name'] != 'light-lamp':
            continue
        co = np.array([obj.matrix_world @ v.co for v in obj.data.vertices])
        left = list(range(len(co)))
        while left:
            seed = co[left[0]]
            near = [i for i in left if np.linalg.norm(co[i] - seed) < 0.9]
            heads.append(co[near].mean(axis=0))
            left = [i for i in left if i not in set(near)]
    for i, p in enumerate(heads):
        data = bpy.data.lights.new(f'lamp{i}', 'POINT')
        data.energy = 60 * amount
        data.shadow_soft_size = 0.25
        data.color = srgb('#FFD29A')[:3]
        light = bpy.data.objects.new(f'lamp{i}', data)
        light.location = (p[0], p[1], p[2] - 0.35)
        bpy.context.scene.collection.objects.link(light)
    return len(heads)


def light_up(objects, amount):
    """Windows and lamps on. Landmark glass has its own materials; the kit
    buildings are one vertex-coloured material, where the windows are the dark,
    faintly blue greys - so those light, a warm cell at a time, and the black
    tyres and asphalt do not."""
    warm = srgb(WINDOW)
    for obj, g in objects:
        m = obj.data.materials[0]
        nt = m.node_tree
        bsdf = nt.nodes['Principled BSDF']
        name = g['name']
        if name.startswith('light-') or name.startswith('screen-'):
            bsdf.inputs['Emission Strength'].default_value = 1 + 3 * amount
        elif name.endswith('glass') and 'canopy' not in name and 'command' not in name:
            bsdf.inputs['Emission Color'].default_value = warm
            bsdf.inputs['Emission Strength'].default_value = (2.2 if name.startswith('ind') else 4) * amount
        elif name == 'colormap':
            vc = next(n for n in nt.nodes if n.type == 'VERTEX_COLOR')
            sep = nt.nodes.new('ShaderNodeSeparateColor')
            nt.links.new(vc.outputs['Color'], sep.inputs['Color'])
            def op(kind, a, b):
                n = nt.nodes.new('ShaderNodeMath')
                n.operation = kind
                for i, v in enumerate((a, b)):
                    if isinstance(v, (int, float)):
                        n.inputs[i].default_value = v
                    else:
                        nt.links.new(v, n.inputs[i])
                return n.outputs[0]
            # dark: under ~#4A in sRGB; blue: blue over red by a hair.
            dark = op('LESS_THAN', sep.outputs['Blue'], 0.085)
            blue = op('GREATER_THAN', op('SUBTRACT', sep.outputs['Blue'], sep.outputs['Red']), 0.006)
            # Not every window: cells of the building's own space, some off.
            vor = nt.nodes.new('ShaderNodeTexVoronoi')
            vor.inputs['Scale'].default_value = 1.6
            cell = vor.outputs['Color']
            cs = nt.nodes.new('ShaderNodeSeparateColor')
            nt.links.new(cell, cs.inputs['Color'])
            on = op('GREATER_THAN', cs.outputs['Red'], 0.3)
            mask = op('MULTIPLY', op('MULTIPLY', dark, blue), on)
            level = op('MULTIPLY', mask, op('MULTIPLY', op('ADD', cs.outputs['Green'], 0.6), 4 * amount))
            nt.links.new(level, bsdf.inputs['Emission Strength'])
            tint = nt.nodes.new('ShaderNodeMix')
            tint.data_type = 'RGBA'
            tint.inputs[6].default_value = warm
            tint.inputs[7].default_value = srgb('#FFE7C4')
            nt.links.new(cs.outputs['Blue'], tint.inputs['Factor'])
            nt.links.new(tint.outputs[2], bsdf.inputs['Emission Color'])


def stage(scene, m, look, ground_z=None):
    """Sun, sky, the catcher under the city and the film's camera: everything
    about a plate except the city in it. scripts/blender/metropolis.py shares
    it, so both cities are shot through exactly the same lens."""
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = look['sun_energy']
    sun_data.angle = math.radians(look['sun_angle'])
    sun_data.color = srgb(look['sun_colour'])[:3]
    sun = bpy.data.objects.new('sun', sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (V(*look['sun']) * -1).to_track_quat('-Z', 'Y').to_euler()
    bg = scene.world.node_tree.nodes['Background']
    bg.inputs[0].default_value = srgb(look['sky'])
    bg.inputs[1].default_value = look['sky_strength']
    if look['shadow'] and ground_z is not None:
        # The city stands on the film's page rather than floating over it: a
        # catcher just under the lowest ground keeps only the shadow, over a
        # transparent film.
        bpy.ops.mesh.primitive_plane_add(size=1000, location=(0, 0, ground_z - 0.02))
        bpy.context.object.is_shadow_catcher = True
    cam_data = bpy.data.cameras.new('camera')
    cam_data.type = 'ORTHO'
    cam_data.sensor_fit = 'HORIZONTAL'
    cam_data.ortho_scale = m['scale']
    cam_data.clip_end = 2000
    cam = bpy.data.objects.new('camera', cam_data)
    scene.collection.objects.link(cam)
    target = V(*m['target'])
    cam.location = target + V(*m['offset']).normalized() * 400
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam


def shoot(scene, m, out, samples):
    r = scene.render
    r.resolution_x, r.resolution_y = m['width'], m['height']
    # PLATE_REGION=x0,y0,x1,y1 (fractions, y up) renders just that part, and
    # PLATE_PERCENT a smaller whole, for trying a light without waiting for
    # the full still.
    r.use_border = r.use_crop_to_border = False
    if os.environ.get('PLATE_REGION'):
        r.border_min_x, r.border_min_y, r.border_max_x, r.border_max_y = map(float, os.environ['PLATE_REGION'].split(','))
        r.use_border, r.use_crop_to_border = True, True
    r.resolution_percentage = int(os.environ.get('PLATE_PERCENT', 100))
    r.film_transparent = True
    r.image_settings.file_format = 'PNG'
    r.image_settings.color_mode = 'RGBA'
    r.filepath = out
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.view_settings.view_transform = 'AgX'
    scene.view_settings.look = 'AgX - Medium High Contrast'
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f'plate {r.resolution_x}x{r.resolution_y} at {r.resolution_percentage}% in {time.time() - t:.0f}s -> {out}', flush=True)


def main():
    prefix, master_path, out = sys.argv[1:4]
    samples = int(sys.argv[4]) if len(sys.argv) > 4 else 64
    name = sys.argv[5] if len(sys.argv) > 5 else 'day'
    look = {**LOOKS[name], **json.loads(os.environ.get('PLATE_LOOK', '{}'))}
    m = json.load(open(master_path))
    scene = reset()
    objects = load(prefix, {'ground', 'solid'})
    if look['lit']:
        light_up(objects, look['lit'])
        print('lamps', lamp_pools(objects, look['lit']), flush=True)
    low = min((o.matrix_world @ v.co).z for o, g in objects if g['role'] == 'ground' for v in o.data.vertices)
    stage(scene, m, look, low)
    shoot(scene, m, out, samples)


if __name__ == '__main__':
    main()
