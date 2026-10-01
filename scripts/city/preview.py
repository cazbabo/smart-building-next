"""A quick look at scripts/city/plan.py's plan from the film's own camera:
ground, roads and water flat, every building a box, sorted far to near. For
judging the plan in seconds instead of a render in minutes."""
import math

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import Polygon as Poly  # noqa: E402
from shapely.geometry import LineString  # noqa: E402

N = [102, 100, 102]
_n = math.sqrt(sum(v * v for v in N))
N = [v / _n for v in N]
RIGHT = [1 / math.sqrt(2), 0, -1 / math.sqrt(2)]
_up = [-N[0] * N[1], 1 - N[1] * N[1], -N[2] * N[1]]
_u = math.sqrt(sum(v * v for v in _up))
UP = [v / _u for v in _up]
R2 = math.sqrt(2)


def proj(x, y, z):
    return (x * RIGHT[0] + z * RIGHT[2], x * UP[0] + y * UP[1] + z * UP[2])


def fade(plan, x, z):
    s, d = (x - z) / R2, (x + z) / R2
    return math.hypot(s / plan['fade']['rs'], d / plan['fade']['rd'])


def alpha(plan, x, z):
    f = fade(plan, x, z)
    return max(0.0, min(1.0, (1.05 - f) / 0.25))


def height(b):
    k = b['kind']
    if k == 'shophouse':
        return b['floors'] * 1.25 + 0.4
    if k in ('tower', 'midrise'):
        return b['floors'] * 1.25
    if k == 'warehouse':
        return b['h']
    return b['floors'] * 1.5 + 1.0


def corners(cx, cz, w, d, rot):
    c, s = math.cos(rot), math.sin(rot)
    out = []
    for dx, dz in ((-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)):
        out.append((cx + dx * c - dz * s, cz + dx * s + dz * c))
    return out


def shade(hex_colour, k):
    h = hex_colour.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return (r * k, g * k, b * k)


def box(ax, plan, cx, cz, w, d, rot, h, colour, y0=0.0):
    a = alpha(plan, cx, cz)
    if a <= 0:
        return
    cs = corners(cx, cz, w, d, rot)
    for i in range(4):
        (x0, z0), (x1, z1) = cs[i], cs[(i + 1) % 4]
        nx, nz = z1 - z0, -(x1 - x0)          # outward for counter-clockwise
        if nx * N[0] + nz * N[2] > 0:
            k = 0.78 if abs(nx) > abs(nz) else 0.9
            quad = [proj(x0, y0, z0), proj(x1, y0, z1), proj(x1, y0 + h, z1), proj(x0, y0 + h, z0)]
            ax.add_patch(Poly(quad, closed=True, fc=shade(colour, k), ec=shade(colour, 0.6), lw=0.15, alpha=a))
    ax.add_patch(Poly([proj(x, y0 + h, z) for x, z in cs], closed=True, fc=shade(colour, 1.0), ec=shade(colour, 0.65), lw=0.15, alpha=a))


def ground(ax, plan, pts, colour, y=0.0, a=1.0, z=0):
    ax.add_patch(Poly([proj(x, y, zz) for x, zz in pts], closed=True, fc=colour, ec='none', alpha=a, zorder=z))


def draw(plan, out):
    fig = plt.figure(figsize=(19.2, 10.8), dpi=100)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_facecolor('#FAF8FC')
    rs, rd = plan['fade']['rs'], plan['fade']['rd']
    ell = [((s + d) / R2, (d - s) / R2) for s, d in [(rs * math.cos(t), rd * math.sin(t)) for t in [2 * math.pi * i / 90 for i in range(90)]]]
    ground(ax, plan, ell, '#ECE8F0')
    for b in plan['blocks']:
        ground(ax, plan, b, '#E3DEE8')
    for r in plan['roads']:
        poly = LineString(r['pts']).buffer(r['w'] / 2)
        colour = {'arterial': '#59546A', 'secondary': '#6B6680', 'riverside': '#5E596F', 'soi': '#8E8A9C'}[r['kind']]
        ground(ax, plan, list(poly.exterior.coords), colour)
    river = LineString(plan['river']['centre']).buffer(plan['river']['width'] / 2)
    ground(ax, plan, list(river.exterior.coords), '#3C93BD')
    for k in plan['khlongs']:
        ground(ax, plan, list(LineString(k['pts']).buffer(k['w'] / 2).exterior.coords), '#4A9CC2')
    for bspan in plan['bridges']:
        poly = LineString(bspan['pts']).buffer(bspan['w'] / 2 + 0.4)
        ground(ax, plan, list(poly.exterior.coords), '#B9B4C6', y=1.2)

    items = []
    for b in plan['buildings']:
        colour = b.get('colour', '#EEEEEE')
        if b['kind'] == 'tower' and b.get('style') == 'glass':
            colour = '#9FB4CC'
        items.append((b['x'] + b['z'], 'box', (b['x'], b['z'], b['w'], b['d'], b['rot'], height(b), colour)))
    lm_col = {'hub': '#3A3746', 'civic': '#F4EFE6', 'hospital': '#F6F5F8', 'school': '#E9E2D6', 'water': '#DCE6F0',
              'industry': '#C9C4D6', 'energy': '#CFCFD8', 'transit': '#E0E6C8', 'temple': '#E8A25A', 'wat-arun': '#F2EEE4',
              'iconsiam': '#BFD0E2', 'stadium': '#E7E3EE', 'park': '#7FB069', 'port': '#C95E4E'}
    lm_h = {'hub': 6, 'civic': 10, 'hospital': 30, 'school': 7, 'water': 5, 'industry': 8, 'energy': 9, 'transit': 9,
            'temple': 8, 'wat-arun': 22, 'iconsiam': 48, 'stadium': 7, 'park': 0.3, 'port': 3}
    for name, l in plan['landmarks'].items():
        items.append((l['x'] + l['z'], 'box', (l['x'], l['z'], l['w'], l['d'], l['rot'], lm_h.get(name, 6), lm_col.get(name, '#C044D9'))))
        items.append((l['x'] + l['z'] + 0.01, 'label', (l['x'], lm_h.get(name, 6) + 2, l['z'], name)))
    for x, z, s, kind in plan['trees']:
        items.append((x + z, 'tree', (x, z, s, kind)))
    items.sort(key=lambda it: it[0])
    for _, kind, data in items:
        if kind == 'box':
            box(ax, plan, *data)
        elif kind == 'tree':
            x, z, s, k = data
            a = alpha(plan, x, z)
            if a > 0:
                u, v = proj(x, 1.6 * s, z)
                ax.add_patch(plt.Circle((u, v), 0.95 * s, fc={'blossom': '#E3A6DA', 'dark': '#2F7A55', 'palm': '#5FA05C'}.get(k, '#4E9A62'), ec='none', alpha=a))
        else:
            x, y, z, name = data
            u, v = proj(x, y, z)
            ax.text(u, v, name, fontsize=9, ha='center', color='#C044D9', weight='bold')
    ex = plan['expressway']
    pts = [proj(x, ex['y'], z) for x, z in ex['pts']]
    ax.plot([p[0] for p in pts], [p[1] for p in pts], color='#9C98AC', lw=4, solid_capstyle='round')
    bt = plan['bts']
    pts = [proj(x, bt['y'], z) for x, z in bt['pts']]
    ax.plot([p[0] for p in pts], [p[1] for p in pts], color='#9BCB3A', lw=2.5)
    us = [proj(x, 0, z)[0] for x, z in ell]
    vs = [proj(x, 0, z)[1] for x, z in ell]
    ax.set_xlim(min(us) - 5, max(us) + 5)
    ax.set_ylim(min(vs) - 5, max(vs) + 60)
    ax.set_aspect('equal')
    ax.axis('off')
    fig.savefig(out)
    plt.close(fig)
