"""The plan of a Bangkok-like city for the presentation film.

    python3 scripts/city/plan.py plan.json [preview.png]

Pure geometry, no Blender: the river, the roads and sois, the khlongs, the
blocks left between them, and what stands on each block - shophouse rows
along the frontages, towers in the business district, warehouses at the
port, houses down the sois, trees in what is left - plus the landmarks the
film's story needs, the skytrain, the expressway, the lamps and the traffic
lanes. scripts/blender/bangkok.py builds it; the preview draws it from the
film's own camera so the plan can be judged without a render.

Page units, three.js axes: x and z on the ground, y up. The film's camera
looks in from +x +z, so "screen right" is x - z and "down the screen" is
x + z; the plan is laid out in those screen terms (s, d) where composition
matters and converted.
"""
import json
import math
import random
import sys

from shapely.geometry import LineString, Point, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely import affinity
from shapely.prepared import prep

R2 = math.sqrt(2)
rng = random.Random(23)


def xz(s, d):
    """Screen terms to ground: s across the screen, d down it."""
    return ((s + d) / R2, (d - s) / R2)


def sd(x, z):
    return ((x - z) / R2, (x + z) / R2)


# The city fades out at an ellipse in screen terms.
RS, RD = 150.0, 132.0


def fade(x, z):
    s, d = sd(x, z)
    return math.hypot(s / RS, d / RD)


def catmull(points, n=10):
    out = []
    for i in range(len(points) - 1):
        p0 = points[max(0, i - 1)]
        p1, p2 = points[i], points[i + 1]
        p3 = points[min(len(points) - 1, i + 2)]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2)))
    out.append(tuple(points[-1]))
    return out


DOMAIN = Polygon([xz(RS * 1.12 * math.cos(a), RD * 1.12 * math.sin(a)) for a in [2 * math.pi * i / 96 for i in range(96)]])

# ---- the river ---------------------------------------------------------------------
RIVER_W = 15.0
river_line = LineString(catmull([xz(s, d) for s, d in [
    (-6, -210), (-18, -150), (-30, -100), (-16, -62), (16, -40), (34, -8), (24, 28), (-8, 52), (-32, 82),
    (-28, 122), (-12, 170), (0, 230)]], 12))
river = river_line.buffer(RIVER_W / 2, quad_segs=12)


def river_side(x, z):
    """+1 on the east bank (screen right), -1 on the west."""
    p = river_line.interpolate(river_line.project(Point(x, z)))
    s0, _ = sd(p.x, p.y)
    s1, _ = sd(x, z)
    return 1 if s1 > s0 else -1


# ---- zones and landmarks (screen terms, converted) ----------------------------------------
Z = {
    'cbd': xz(78, -18), 'oldtown': xz(8, -96), 'port': xz(8, 92), 'park': xz(104, 48),
    'thonburi': xz(-70, 10), 'riverside-west': xz(4, 2),
}


def near(x, z, key, r):
    cx, cz = Z[key]
    return max(0.0, 1 - math.hypot(x - cx, z - cz) / r)


# ---- roads -----------------------------------------------------------------------------
roads = []          # {'pts': [[x, z]...], 'w': width, 'kind': ...}
bridges = []        # spans of roads over the river


def add_road(pts, w, kind, bridge=False):
    line = LineString(pts)
    line = line.intersection(DOMAIN)
    if line.is_empty:
        return
    parts = [line] if line.geom_type == 'LineString' else list(line.geoms)
    for part in parts:
        if bridge:
            roads.append({'pts': [list(c) for c in part.coords], 'w': w, 'kind': kind})
            span = part.intersection(river.buffer(1.5))
            spans = [span] if span.geom_type == 'LineString' else list(getattr(span, 'geoms', []))
            for sp in spans:
                if sp.length > 3:
                    bridges.append({'pts': [list(c) for c in sp.coords], 'w': w, 'kind': kind})
        else:
            dry = part.difference(river.buffer(w / 2 + 1.5))
            segs = [dry] if dry.geom_type == 'LineString' else list(getattr(dry, 'geoms', []))
            for sg in segs:
                if sg.length > 8:
                    roads.append({'pts': [list(c) for c in sg.coords], 'w': w, 'kind': kind})


def jog(points_axis, axis, at, jogs):
    """An arterial along `axis` ('x' runs along x at fixed z) with 45-degree
    jogs: [(position along, shift)]. Bangkok's main roads are never quite
    straight."""
    pts = []
    pos, off = points_axis[0], at
    for along, shift in jogs:
        pts.append((along, off))
        pts.append((along + abs(shift), off + shift))
        off += shift
    pts.append((points_axis[1], off))
    pts = [(points_axis[0], at)] + pts
    return [(a, b) if axis == 'x' else (b, a) for a, b in pts]


# Arterials. Along x (fixed z) and along z (fixed x), jogged, some ending at
# others, around superblocks of fifty to seventy units - the sois fill them.
# Three cross the river on bridges.
ART = 6.0
for z0, jogs, span, bridge in [(-122, [(-40, 6)], (-200, 160), False), (-64, [(30, -5)], (-200, 200), True),
                               (-8, [(70, 6)], (-200, 200), False), (50, [(0, 7)], (-140, 200), True), (108, [], (-60, 200), False)]:
    add_road(jog(span, 'x', z0, jogs), ART, 'arterial', bridge=bridge)
for x0, jogs, span, bridge in [(-104, [(-30, 5)], (-200, 140), False), (-44, [(20, -6)], (-200, 200), False),
                               (16, [(-50, 5)], (-200, 200), True), (76, [(-40, 6)], (-200, 170), False), (132, [], (-160, 110), False)]:
    add_road(jog(span, 'z', x0, jogs), ART, 'arterial', bridge=bridge)
# Secondary roads split a few superblocks.
SEC = 4.2
for pts in [[(-150, -36), (-46, -36)], [(18, -36), (78, -36)], [(-104, 22), (-46, 22)], [(78, 22), (160, 22)],
            [(46, -150), (46, -66)], [(-74, 50), (-74, 150)], [(104, -60), (104, 50)], [(18, 80), (76, 80)]]:
    add_road(pts, SEC, 'secondary')
# The riverside road, Charoen Krung style, following the east bank.
east = river_line.offset_curve(-(RIVER_W / 2 + 5))
add_road(list(east.coords) if east.geom_type == 'LineString' else list(max(east.geoms, key=lambda g: g.length).coords), SEC, 'riverside')
# A diagonal avenue across the business district.
add_road([xz(46, -66), xz(126, 14)], ART, 'arterial')

# ---- khlongs -----------------------------------------------------------------------------
khlongs = []
KW = 3.2
for pts in [[xz(-150, -20), xz(-90, -26), xz(-40, -14)], [xz(-130, 40), xz(-80, 46), xz(-36, 70)],
            [xz(160, 40), xz(110, 30), xz(60, 34), (river_line.interpolate(river_line.project(Point(*xz(30, 34)))).coords[0])]]:
    line = LineString(catmull(pts, 8)).intersection(DOMAIN)
    if not line.is_empty:
        khlongs.append({'pts': [list(c) for c in line.coords], 'w': KW})
khlong_poly = unary_union([LineString(k['pts']).buffer(k['w'] / 2) for k in khlongs])

# ---- the expressway and the skytrain ------------------------------------------------------
expressway = catmull([xz(-160, 60), xz(-90, 64), xz(-40, 70), xz(10, 66), xz(46, 50), xz(70, 18), xz(80, -30), xz(96, -80), xz(110, -160)], 14)
EXP_W, EXP_Y = 6.5, 10.5
# The skytrain: from the river east along the z = -64 arterial, then south
# down the x = 76 one - two lines meeting at an interchange.
bts = [(-6, -64), (30, -64), (35, -69), (76, -69), (76, -40), (82, -34), (82, 70)]
bts_stations = [(12, -64), (54, -69), (76, -60), (82, -6), (82, 44)]
BTS_Y = 7.0

# Blocks before the sois, for the landmarks: they need whole superblocks.
roads_poly = unary_union([LineString(r['pts']).buffer(r['w'] / 2, cap_style='flat' if r['kind'] == 'soi' else 'round') for r in roads])
water = unary_union([river, khlong_poly])
blocks_poly = DOMAIN.difference(unary_union([roads_poly, water]).buffer(0.6))
blocks = [g for g in (blocks_poly.geoms if blocks_poly.geom_type == 'MultiPolygon' else [blocks_poly]) if g.area > 12]
blocks_p = prep(blocks_poly)

# ---- what stands on the blocks ------------------------------------------------------------------
occupied = []          # shapely footprints already taken
grid = {}              # coarse spatial hash over `occupied`
CELL = 12


def _cells(poly):
    x0, z0, x1, z1 = poly.bounds
    for i in range(int(math.floor(x0 / CELL)), int(math.floor(x1 / CELL)) + 1):
        for j in range(int(math.floor(z0 / CELL)), int(math.floor(z1 / CELL)) + 1):
            yield i, j


def free(poly, pad=0.4):
    if not blocks_p.contains(poly):
        return False
    probe = poly.buffer(pad)
    for c in _cells(probe):
        for other in grid.get(c, ()):
            if probe.intersects(other):
                return False
    return True


def take(poly):
    occupied.append(poly)
    for c in _cells(poly):
        grid.setdefault(c, []).append(poly)


def rect(cx, cz, w, d, rot=0.0):
    p = Polygon([(-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2)])
    p = affinity.rotate(p, rot, origin=(0, 0), use_radians=True)
    return affinity.translate(p, cx, cz)


buildings = []
landmarks = {}
anchors = {}


def reserve(name, cx, cz, w, d, rot=0.0, **extra):
    poly = rect(cx, cz, w, d, rot)
    take(poly)
    landmarks[name] = {'x': cx, 'z': cz, 'w': w, 'd': d, 'rot': rot, **extra}
    return poly


def nearest_block_point(x, z):
    """Moves a landmark's centre onto dry land if the plan put it on a road."""
    p = Point(x, z)
    if blocks_poly.contains(p):
        return x, z
    best = min(blocks, key=lambda b: b.distance(p))
    q = best.representative_point() if best.distance(p) > 30 else best.exterior.interpolate(best.exterior.project(p))
    c = best.centroid
    return q.x + (c.x - q.x) * 0.15, q.y + (c.y - q.y) * 0.15


def place_landmark(name, s, d, w, dep, **extra):
    """Nearest spot to the plan's point where the footprint fits on dry land,
    searching outward ring by ring and giving up a little size each ring."""
    x0, z0 = xz(s, d)
    for ring in range(0, 60):
        k = max(0.6, 1 - ring * 0.012)
        for i in range(max(1, ring * 6)):
            a = 2 * math.pi * i / max(1, ring * 6)
            x, z = x0 + math.cos(a) * ring * 1.5, z0 + math.sin(a) * ring * 1.5
            poly = rect(x, z, w * k, dep * k)
            if free(poly, 0.3):
                reserve(name, x, z, w * k, dep * k, **extra)
                return x, z
    raise RuntimeError(f'no room for {name}')


# The story's places: the control centre and the seven systems, kept inside
# the middle of the frame. Then the city's own landmarks.
place_landmark('hub', 40, -22, 20, 15)
place_landmark('civic', 6, -76, 18, 13)
place_landmark('hospital', 88, -62, 16, 14)
place_landmark('school', 112, 8, 26, 20)
place_landmark('water', 28, 44, 12, 10)
place_landmark('industry', 4, 74, 20, 15)
place_landmark('energy', 44, 88, 20, 15)
place_landmark('transit', *sd(68, -78), 13, 10)
place_landmark('temple', 22, -112, 20, 20)
place_landmark('wat-arun', -46, -66, 18, 18)
place_landmark('iconsiam', -2, 4, 22, 18)
place_landmark('stadium', 118, 64, 26, 20)
place_landmark('park', 92, 44, 30, 24)
place_landmark('port', -14, 118, 30, 16)


LANDMARKS_POLY = unary_union(occupied)

# ---- sois: dead-end lanes off every arterial and secondary -------------------------------------
SOI = 2.2
main_poly = unary_union([LineString(r['pts']).buffer(r['w'] / 2) for r in roads])
for r in list(roads):
    if r['kind'] not in ('arterial', 'secondary'):
        continue
    line = LineString(r['pts'])
    others = unary_union([main_poly.difference(line.buffer(r['w'] / 2 + 0.2)), river.buffer(3), khlong_poly.buffer(1), LANDMARKS_POLY]).buffer(SOI + 3)
    others_p = prep(others)
    pos = rng.uniform(5, 12)
    while pos < line.length - 5:
        p = line.interpolate(pos)
        q = line.interpolate(min(line.length, pos + 0.5))
        dx, dz = q.x - p.x, q.y - p.y
        n = math.hypot(dx, dz) or 1
        nx, nz = -dz / n, dx / n
        for side in (-1, 1):
            if rng.random() < 0.6:
                length = rng.uniform(14, 34)
                start = (p.x + side * nx * (r['w'] / 2), p.y + side * nz * (r['w'] / 2))
                end = (start[0] + side * nx * length, start[1] + side * nz * length)
                soi = LineString([start, end])
                if others_p.intersects(soi):
                    cut = soi.difference(others)
                    pieces = [cut] if cut.geom_type == 'LineString' else list(getattr(cut, 'geoms', []))
                    pieces = [g for g in pieces if g.distance(Point(start)) < 0.5]
                    soi = pieces[0] if pieces else None
                if soi is not None and soi.length > 8:
                    roads.append({'pts': [list(c) for c in soi.coords], 'w': SOI, 'kind': 'soi'})
        pos += rng.uniform(13, 22)

# The blocks again, now cut by the sois.
roads_poly = unary_union([LineString(r['pts']).buffer(r['w'] / 2, cap_style='flat' if r['kind'] == 'soi' else 'round') for r in roads])
water = unary_union([river, khlong_poly])
blocks_poly = DOMAIN.difference(unary_union([roads_poly, water]).buffer(0.6))
blocks = [g for g in (blocks_poly.geoms if blocks_poly.geom_type == 'MultiPolygon' else [blocks_poly]) if g.area > 12]
blocks_p = prep(blocks_poly)


# Frontage: rows of buildings along every arterial and secondary road.
SHOP_COLOURS = ['#F2D9B3', '#E9CFA6', '#F4EEE4', '#D9E8C9', '#F3E3A6', '#EBC9C2', '#CFE0EA', '#E3D3EE', '#DCC9B6', '#F1E2D0', '#CDE3DA', '#F0D4C0']
TOWER_COLOURS = ['#EEF0F5', '#E4DDEF', '#F2EEE8', '#DCE3EC', '#E9E4F2']


def zone(x, z):
    if fade(x, z) > 0.9:
        return 'edge'
    if near(x, z, 'port', 42) > 0:
        return 'port'
    if near(x, z, 'cbd', 70) > 0 and river_side(x, z) > 0:
        return 'cbd'
    if near(x, z, 'oldtown', 46) > 0:
        return 'oldtown'
    if near(x, z, 'riverside-west', 26) > 0:
        return 'cbd'
    return 'residential'


def frontage(road):
    """Buildings shoulder to shoulder along one road, both sides, facing it."""
    line = LineString(road['pts'])
    soi = road['kind'] == 'soi'
    for side in (-1, 1):
        off = line.offset_curve(side * (road['w'] / 2 + (0.8 if soi else 0.9)))
        parts = [off] if off.geom_type == 'LineString' else list(getattr(off, 'geoms', []))
        for part in parts:
            pos = rng.uniform(0, 2)
            while pos < part.length - 1.5:
                p = part.interpolate(pos)
                q = part.interpolate(min(part.length, pos + 1))
                ang = math.atan2(q.y - p.y, q.x - p.x)
                # offset_curve keeps the road's direction, so away from the
                # road is the left normal on the left side, the right on the right.
                nx, nz = -math.sin(ang) * side, math.cos(ang) * side
                zn = zone(p.x, p.y)
                if zn == 'cbd' and not soi and rng.random() < 0.55:
                    w, dep, kind = rng.uniform(10, 15), rng.uniform(9, 13), 'tower'
                elif zn == 'cbd' and soi and rng.random() < 0.5:
                    w, dep, kind = rng.uniform(8, 11), rng.uniform(7, 10), 'midrise'
                elif zn == 'port':
                    w, dep, kind = rng.uniform(12, 18), rng.uniform(8, 11), 'warehouse'
                elif soi:
                    r = rng.random()
                    if r < 0.5:
                        units = rng.randint(3, 6)
                        w, dep, kind = units * 1.8, rng.uniform(5.5, 7), 'townhouse'
                    elif r < 0.85:
                        w, dep, kind = rng.uniform(4.5, 6.5), rng.uniform(4.5, 6.5), 'house'
                    else:
                        w, dep, kind = rng.uniform(8, 11), rng.uniform(7, 10), 'midrise'
                elif zn == 'residential' and rng.random() < 0.08:
                    # Condos stand along every main road in Bangkok.
                    w, dep, kind = rng.uniform(9, 12), rng.uniform(8, 10), 'tower'
                else:
                    units = rng.randint(3, 8)
                    w, dep, kind = units * 1.9, rng.uniform(7, 9), 'shophouse'
                # Narrower until it fits the gap before the next soi.
                unit = 1.9 if kind == 'shophouse' else 1.8 if kind == 'townhouse' else None
                placed = False
                for k in (1.0, 0.75, 0.5, 0.34):
                    ww = max(unit, round(w * k / unit) * unit) if unit else w * max(k, 0.6)
                    cx = p.x + math.cos(ang) * ww / 2 + nx * dep / 2
                    cz = p.y + math.sin(ang) * ww / 2 + nz * dep / 2
                    poly = rect(cx, cz, ww, dep, ang)
                    if free(poly, 0.2):
                        take(poly)
                        buildings.append(make(kind, cx, cz, ww, dep, ang, zn, front=-side))
                        pos += ww + (rng.uniform(0.1, 0.5) if unit else rng.uniform(0.8, 2.5))
                        placed = True
                        break
                if not placed:
                    pos += 1.0


def make(kind, cx, cz, w, dep, ang, zn, front=None):
    b = {'front': front if front is not None else rng.choice((-1, 1)), 'zone': zn, 'kind': kind, 'x': round(cx, 3), 'z': round(cz, 3), 'w': round(w, 3), 'd': round(dep, 3), 'rot': round(ang, 4)}
    if kind == 'shophouse':
        b['floors'] = rng.choice([3, 4, 4, 4, 5]) if zn != 'oldtown' else rng.choice([2, 3, 3, 4])
        b['units'] = max(1, round(w / 1.9))
        b['colour'] = rng.choice(SHOP_COLOURS)
    elif kind == 'tower':
        c = near(cx, cz, 'cbd', 70) + near(cx, cz, 'riverside-west', 26)
        b['floors'] = int(14 + 34 * c * rng.uniform(0.5, 1.1) + rng.uniform(0, 8))
        b['colour'] = rng.choice(TOWER_COLOURS)
        b['style'] = rng.choice(['grid', 'grid', 'ribbon', 'glass'])
        b['podium'] = rng.random() < 0.6
    elif kind == 'townhouse':
        b['floors'] = rng.choice([2, 3, 3])
        b['units'] = max(1, round(w / 1.8))
        b['colour'] = rng.choice(SHOP_COLOURS)
    elif kind == 'midrise':
        b['floors'] = rng.randint(7, 16)
        b['colour'] = rng.choice(TOWER_COLOURS + SHOP_COLOURS[:3])
        b['style'] = rng.choice(['grid', 'ribbon'])
    elif kind == 'warehouse':
        b['h'] = round(rng.uniform(3.5, 5.5), 2)
        b['colour'] = rng.choice(['#D9DCE4', '#E6E3EC', '#CFD6DE', '#DED6CC'])
        b['solar'] = rng.random() < 0.35
    elif kind == 'house':
        b['floors'] = rng.choice([1, 2, 2])
        b['colour'] = rng.choice(SHOP_COLOURS)
        b['roof'] = rng.choice(['#8B5A4A', '#7C6A9B', '#A86B4F', '#6D7F8C'])
    return b


for r in sorted(roads, key=lambda r: {'arterial': 0, 'riverside': 1, 'secondary': 2, 'soi': 3}[r['kind']]):
    frontage(r)

# Interior: whatever the frontage left, filled by zone.
for block in blocks:
    area = block.area
    x0, z0, x1, z1 = block.bounds
    tries = int(area / 2) + 10
    for _ in range(tries):
        x, z = rng.uniform(x0, x1), rng.uniform(z0, z1)
        if not block.contains(Point(x, z)):
            continue
        zn = zone(x, z)
        if zn == 'cbd':
            kind = rng.choice(['tower', 'tower', 'midrise'])
            w, dep = rng.uniform(8, 13), rng.uniform(8, 12)
        elif zn == 'port':
            kind, w, dep = 'warehouse', rng.uniform(10, 18), rng.uniform(8, 12)
        elif zn == 'oldtown':
            kind, w, dep = rng.choice(['shophouse', 'house']), rng.uniform(4, 9), rng.uniform(5, 7)
        elif zn == 'edge':
            kind, w, dep = 'house', rng.uniform(4, 6.5), rng.uniform(4, 6)
        else:
            kind = rng.choice(['house', 'house', 'midrise', 'midrise', 'townhouse'])
            w, dep = (rng.uniform(8, 13), rng.uniform(8, 11)) if kind == 'midrise' else (rng.uniform(4.5, 8), rng.uniform(4.5, 6.5))
        poly = rect(x, z, w, dep, 0)
        if free(poly, 0.8):
            take(poly)
            if kind in ('shophouse', 'townhouse'):
                w = max(1.8, round(w / 1.8) * 1.8)
            buildings.append(make(kind, x, z, w, dep, 0.0, zn))

# A second pass of small houses into the gaps the first left.
for block in blocks:
    x0, z0, x1, z1 = block.bounds
    for _ in range(int(block.area / 3)):
        x, z = rng.uniform(x0, x1), rng.uniform(z0, z1)
        zn = zone(x, z)
        if zn in ('cbd', 'port') or not block.contains(Point(x, z)):
            continue
        w, dep = rng.uniform(3.5, 5.5), rng.uniform(3.5, 5)
        poly = rect(x, z, w, dep, 0)
        if free(poly, 0.7):
            take(poly)
            buildings.append(make('house', x, z, w, dep, 0.0, zn))

# Trees: in the gaps, thicker in the residential edge and the park.
trees = []
for block in blocks:
    x0, z0, x1, z1 = block.bounds
    n = int(block.area / 4)
    for _ in range(n):
        x, z = rng.uniform(x0, x1), rng.uniform(z0, z1)
        if not block.contains(Point(x, z)):
            continue
        if zone(x, z) in ('cbd', 'port') and rng.random() < 0.7:
            continue
        poly = Point(x, z).buffer(0.9)
        if free(poly, 0.1):
            take(poly)
            trees.append([round(x, 2), round(z, 2), round(rng.uniform(0.8, 1.25), 2), rng.choice(['round', 'round', 'round', 'palm', 'blossom', 'dark'])])

# Lamps along arterials and the riverside, both sides.
lamps = []
for r in roads:
    if r['kind'] not in ('arterial', 'riverside'):
        continue
    line = LineString(r['pts'])
    pos = 4.0
    while pos < line.length:
        p = line.interpolate(pos)
        q = line.interpolate(min(line.length, pos + 0.5))
        dx, dz = q.x - p.x, q.y - p.y
        n = math.hypot(dx, dz) or 1
        for side in (-1, 1):
            lx, lz = p.x - dz / n * side * (r['w'] / 2 + 0.5), p.y + dx / n * side * (r['w'] / 2 + 0.5)
            if fade(lx, lz) < 1 and not water.contains(Point(lx, lz)):
                lamps.append([round(lx, 2), round(lz, 2)])
        pos += 11

# Traffic lanes for the film: both directions on every arterial, and the
# expressway on its deck.
lanes = []
for r in roads:
    if r['kind'] in ('arterial', 'riverside'):
        line = LineString(r['pts'])
        for side in (-1, 1):
            off = line.offset_curve(side * r['w'] * 0.22)
            if off.geom_type != 'LineString' or off.length < 20:
                continue
            pts = [[round(x, 2), 0.25, round(z, 2)] for x, z in off.coords]
            lanes.append({'points': pts if side > 0 else pts})
exp_line = LineString(expressway).intersection(DOMAIN)
for side in (-1, 1):
    off = exp_line.offset_curve(side * 1.6)
    if off.geom_type == 'LineString':
        lanes.append({'points': [[round(x, 2), EXP_Y + 0.6, round(z, 2)] for x, z in off.coords]})

plan = {
    'river': {'centre': [list(c) for c in river_line.coords], 'width': RIVER_W},
    'roads': roads, 'bridges': bridges, 'khlongs': khlongs,
    'blocks': [[list(c) for c in b.exterior.coords] for b in blocks],
    'buildings': buildings, 'trees': trees, 'lamps': lamps, 'landmarks': landmarks,
    'expressway': {'pts': [list(p) for p in expressway], 'w': EXP_W, 'y': EXP_Y},
    'bts': {'pts': [list(p) for p in bts], 'y': BTS_Y, 'stations': [list(p) for p in bts_stations]},
    'lanes': lanes, 'fade': {'rs': RS, 'rd': RD}, 'domain': [list(c) for c in DOMAIN.exterior.coords],
}

if __name__ == '__main__':
    out = sys.argv[1]
    with open(out, 'w') as f:
        json.dump(plan, f)
    kinds = {}
    for b in buildings:
        kinds[b['kind']] = kinds.get(b['kind'], 0) + 1
    print(f'plan: {len(roads)} roads, {len(bridges)} bridge spans, {len(blocks)} blocks, {len(buildings)} buildings {kinds}, '
          f'{len(trees)} trees, {len(lamps)} lamps, {len(lanes)} lanes -> {out}')
    if len(sys.argv) > 2:
        from preview import draw
        draw(plan, sys.argv[2])
