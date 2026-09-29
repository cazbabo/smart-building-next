"""The film's 3D plate: one large Cycles still of the city.

    node scripts/dump-city.mjs overview /tmp/city
    node scripts/video/timeline.mjs /tmp/master.json
    python3 scripts/blender/plate.py /tmp/city /tmp/master.json out.png [samples]

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


def main():
    prefix, master_path, out = sys.argv[1:4]
    samples = int(sys.argv[4]) if len(sys.argv) > 4 else 48
    m = json.load(open(master_path))
    scene = reset()
    load(prefix, {'ground', 'solid'})
    sun_data = bpy.data.lights.new('sun', 'SUN')
    sun_data.energy = 3.6
    sun_data.angle = math.radians(2.2)
    sun = bpy.data.objects.new('sun', sun_data)
    scene.collection.objects.link(sun)
    sun.rotation_euler = (V(-45, 85, 35) * -1).to_track_quat('-Z', 'Y').to_euler()
    bg = scene.world.node_tree.nodes['Background']
    bg.inputs[0].default_value = srgb('#e9ecf8')
    bg.inputs[1].default_value = 0.95
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
    r = scene.render
    r.resolution_x, r.resolution_y = m['width'], m['height']
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
    print(f'plate {m["width"]}x{m["height"]} in {time.time() - t:.0f}s -> {out}', flush=True)


if __name__ == '__main__':
    main()
