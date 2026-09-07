# 3D and Web Design Skill Shortlist

Reviewed: 2026-09-07. This is a source review and proposed workflow, not installation or a completed rendering benchmark. No candidate has been run against this building yet.

## Requirements being served

Configurable office building, 1–10 upper floors plus Lobby/B1/B2/roof; polished cutaway architecture; realistic materials and lighting; interactive guided tour and exploration; light wizard and navy presentation.

## Recommended modeling candidate: Blender Agent Studio

Source: https://github.com/ifBars/blender-agent-studio

Reviewed the README and specialist skills:
- plugins/blender-agent-studio/skills/blender-modeling-workflow/SKILL.md
- plugins/blender-agent-studio/skills/blender-asset-validation/SKILL.md

Strengths observed in instructions: reproducible Python sources, staged proportion-to-detail modeling, polished finish criteria, semantic parts, multiview visual inspection, and fresh GLB import validation. These are well aligned with reusable floor modules and detailed equipment.

Limitations: general modeling workflow rather than an office-building asset pack; no verified result for our architectural brief. Maintainer reports a small benchmark on other objects, which does not establish architectural quality. Requires a Blender runtime. Local check found neither a blender executable on PATH nor an importable bpy module; plugin-directory search returned no Blender match. Runtime setup remains unresolved.

## Recommended UI candidate: Anthropic frontend-design

Source: https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md

Reviewed the skill itself. It addresses intentional layout, typography, subject-specific visual identity, restrained motion, and screenshot-based critique. Suitable for the wizard, customer presentation chrome, and interface around the building. It does not create 3D geometry. User-approved colors and language override default stylistic preferences in any imported skill.

## Supplementary web-3D reference: CloudAI-X Three.js Skills

Source: https://github.com/CloudAI-X/threejs-skills

Reviewed the catalog and materials, lighting, and postprocessing skills. Coverage includes PBR, glass, HDR environments, shadows, loading, interaction, animation, and effects.

Assessment: useful reference coverage, but not a finished architectural workflow or a drop-in implementation. One reviewed WebGPU snippet imports postProcessing and redeclares the same identifier as const; examples must be checked and adapted, rather than copied blindly. The root README also points an installation example at a different repository. Use current official Three.js documentation as implementation authority. No installation performed.

## Proposed asset and scene workflow

1. Establish an architectural reference and proportions using the approved brief.
2. Author reusable floor, facade, lobby, roof, basement, interior, and equipment components with named attachment points.
3. Export web-compatible assets, preserving the structure needed to show/hide systems and assemble 1–10 floors.
4. Assemble and interact with those modules in Three.js; keep presentation state separate from asset geometry.
5. Tune lighting and materials inside the browser. An offline Blender beauty render alone does not establish real-time visual quality.
6. Review the actual building from exterior, cutaway, and equipment-closeup views, including short and tall configurations, on representative laptop hardware.

Proposed art direction: contemporary premium office architecture, glass and metal facade with readable depth, landscaped entrance and terrace, warm interior light against the navy presentation scene, cyan reserved for selected system information. This is a recommendation, not yet a user-approved model design.

## Status

Q12–Q14 are recorded in design-brief.md. Skills have been researched and evaluated only. No skill package, Blender runtime, site implementation, or new Vercel resource was installed or deployed in this research step.
