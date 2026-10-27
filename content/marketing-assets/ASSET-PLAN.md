# VoidMech Marketing Asset Plan

This plan is tailored to your requested mix:
- in-flight activity (combat + maneuvering near stations)
- mining
- editor assets
- title-screen art with centered game name (meta image + thumbnails)
- informational assets for feature explanations

## Brand text treatment (required)

Apply this consistently across every marketing asset:
- **Logo/title treatment:** `voidmech` (lowercase), rendered as small caps
- **Body text and copy:** `VoidMech` (CamelCase)
- Avoid all-caps `VOIDMECH` in new marketing exports.

## 1) Asset pack checklist

## A. Gameplay stills (core)
- [ ] 6x combat stills (projectiles, impacts, evasive movement)
- [ ] 4x station-adjacent maneuvering stills (docking approach, close passes, traffic density)
- [ ] 3x mining stills (harvesting, cargo/readout, return route)
- [ ] 3x editor stills (ship builder, parameter tuning, before/after configuration)

## B. Title/cover assets
- [ ] 1x title hero (game name centered)
- [ ] 2x title variants (clean + with subtle HUD accents)

## C. Informational assets
- [ ] 4x feature callout cards (Combat, Build, Mining, Flight Model)
- [ ] 2x loop/explainer cards (Design -> Fly -> Improve, Gather -> Upgrade -> Engage)

## D. Store and guide assets
- [ ] itch.io page capsule/header variants
- [ ] Steam page capsule/library variants
- [ ] 6-8 tutorial/guide step images (controls, building, mining loop, combat loop)

## 2) Recommended export sizes

Use these as defaults unless a target platform requires a different size:

| Use | Size | Aspect |
|---|---:|---:|
| Social/meta image (Open Graph) | 1200x630 | 1.91:1 |
| Wide thumbnail / video cover | 1280x720 | 16:9 |
| Press screenshot (HD) | 1920x1080 | 16:9 |
| Square info post | 1080x1080 | 1:1 |
| Vertical short cover | 1080x1920 | 9:16 |

Keep all master compositions at 3840x2160 and downscale per target.

## 2.1 Platform target matrix (itch.io + Steam + guide)

Use this matrix when preparing platform-specific exports:

| Platform/use | Asset | Size |
|---|---|---:|
| itch.io | Cover image | 630x500 |
| itch.io | Screenshot set | 1920x1080 |
| itch.io | Promotional thumbnail | 315x250 |
| Steam | Header capsule | 460x215 |
| Steam | Small capsule | 231x87 |
| Steam | Main capsule | 616x353 |
| Steam | Library capsule | 600x900 |
| Steam | Library hero | 3840x1240 |
| Steam | Library logo (transparent) | 1280x720 |
| Tutorial/guide | Step card (wide) | 1280x720 |
| Tutorial/guide | Step card (square) | 1080x1080 |

## 3) Capture direction by asset type

## Combat (in-flight)
- Favor diagonal movement vectors (ship traveling corner-to-corner) to imply speed.
- Include at least one projectile trail and one impact event in frame.
- Keep horizon/grid lines slightly off-center; avoid dead-center action unless it is a boss/hero beat.
- UI policy: keep minimal tactical HUD visible (speed/shield/target) for authenticity.

## Station maneuvering
- Frame station structure as foreground or midground silhouette to sell scale.
- Capture one near-miss turn and one controlled docking approach.
- Prioritize readability: bright ship accents over darker station geometry.

## Mining
- Show tool beam/contact point and extracted resource feedback in same frame.
- Include one shot with inventory/cargo feedback visible (supports progression narrative).
- Capture one â€œquietâ€ wide frame and one tight operational frame.

## Editor
- Frame the editor with active changes visible (selected module, stat differences).
- Capture one before/after pair showing performance deltas.
- Keep typography and readouts legible; avoid over-zooming the 3D preview.

## 4) Title-screen composition rules (centered game name)

Use these constraints for the meta image and thumbnail title:
- Game name centered both horizontally and vertically.
- Write title as `voidmech` (small caps, lowercase text source).
- Safe area for title: center 60% width x 35% height.
- Background should include subtle motion context (stars/station silhouette), but no busy combat behind title.
- Accent treatment:
  - primary title color: `#E1E6E8`
  - glow/edge accent: `#22E0F0` at low opacity
  - warning accent sparingly: `#F58A1F`

## 5) Informational card structure

Each info asset should follow this simple pattern:
1. **Headline** (2-4 words, uppercase, tactical tone)
2. **Subhead** (single sentence, concrete benefit)
3. **Visual evidence** (screenshot with one highlighted region)
4. **Data chip** (one metric/readout: speed, power, cargo, integrity, etc.)

Example headlines:
- `MODULAR SHIP BUILDING`
- `PRECISION FLIGHT MODEL`
- `HIGH-RISK RESOURCE RUNS`
- `TACTICAL STATION ENGAGEMENTS`

## 6) Shot sequencing (fast production pass)

Run captures in this order to reduce setup churn:
1. Combat session (capture all combat + station maneuver variants)
2. Mining session (capture mining progression frames)
3. Editor session (capture UI states + before/after)
4. Title composition session (capture clean background plates + title overlays)
5. Info card pass (reuse best stills, add annotations/callouts)

## 7) Naming convention

Use deterministic names so assets stay sortable:

`vm_<category>_<subject>_<nn>.png`

Examples:
- `vm_fight_03.png`
- `vm_station_nearmiss_01.png`
- `vm_mining_belt_01.png`
- `vm_editor_scout_01.png`
- `vm_title_menu_01.png`
- `vm_ui_controls_01.png`

## 8) Quality gate before publish

Approve an asset only if all are true:
- silhouette clarity at thumbnail size (320px wide)
- no clipped UI text
- focal subject readable in under 1 second
- brand colors consistent with guide (`#0A1420`, `#2E4A55`, `#22E0F0`, `#F58A1F`, `#E1E6E8`)
- no placeholder/debug UI visible
- title/copy casing follows rule (`voidmech` logo style, `VoidMech` body copy)

## 9) Current site placement map

Approved screenshot placements for the live site shell:

- Home hero: `vm_fight_16.png`
- Home systems support strip: `vm_fight_03.png`, `vm_mining_sweep_01.png`, `vm_station_traffic_01.png`
- About visuals: `vm_editor_scout_01.png` plus `vm_fight_04.png`
- Roadmap context strip: `vm_ui_station_tweaks_01.png`, `vm_ui_catalog_01.png`, `vm_ui_sweep_01.png`
- Download hero: `vm_title_menu_01.png`
- Download highlights gallery: `vm_mining_belt_01.png`, `vm_station_nearmiss_01.png`, `vm_fight_06.png`

Do not use `raw/_superseded-generic/` assets for final page placement.

