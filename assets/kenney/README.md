# Kenney source assets

Raw model kits used to build the City Intelligence scene. This folder is **not**
under `public/`, so Vite does not copy it into `dist/`. Only the models the scene
actually loads get copied to `public/models/` — that keeps the deployed bundle
small while the full kits stay available here for reuse.

## Kits

| Folder | Kit | Models | Triangles (min-max / avg) |
| --- | --- | ---: | --- |
| `commercial/` | City Kit Commercial 2.1 | 41 | 40-5,246 / 1,089 |
| `suburban/` | City Kit Suburban 2.0 | 40 | 12-2,062 / 750 |
| `roads/` | City Kit Roads | 95 | 12-1,636 / 180 |
| `cars/` | Car Kit | 50 | 28-3,124 / 1,304 |
| `starter-city/` | Starter Kit City Builder | 15 | 20-834 / 280 |

## Licensing

The four City/Car kits are **CC0 1.0** (see each `License.txt`): usable for
commercial work with no attribution required. Crediting Kenney is optional and
we do it anyway in `docs/city-intelligence.md`.

`starter-city/` comes from the KenneyNL/Starter-Kit-City-Builder repository,
whose `LICENSE.md` is MIT for the project code; its README states separately
that the included 3D models are CC0. Only the models are used here.

## Texture convention

Every model carries a single material named `colormap` that samples one shared
atlas, referenced by the relative URI `Textures/colormap.png`. Each kit ships its
own atlas, so the four kits do **not** share one texture.

- `starter-city/` uses an 8x8 grid of flat 64px swatches.
- The four newer kits use a 16-column strip palette (32px columns) where each
  column holds the shades of one material.

Because colour lives in the atlas rather than in per-mesh materials, a model is
recoloured by repainting atlas columns, and one model is given a colour distinct
from another of the same type by offsetting its UVs horizontally by whole
columns. Both keep the single-material, instanceable structure intact.
