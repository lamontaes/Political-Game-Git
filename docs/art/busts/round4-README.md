# Bust kit, round 4 (November 18, 2026)

These are the source pieces for the cloud bust builder. They live on this branch only and are not in the game yet.

- `art/busts/round4/men/front/` and `art/busts/round4/women/front/` hold the round 4 layers:
  - heads (`head-<shape>-<shade>-<age>.png`);
  - tops (`top-*.png`);
  - hair, painted in black, dark brown, blond and gray (`hair-<style>-<color>.png`);
  - bare arms (`arms-bare-<shade>.png`).
- `art/busts/round4/masters/` holds the bald masters the hair is painted on.
- `art/busts/round4/manifest.json` lists head and shade options, arm dependencies, top and hair colors, and pairs that must not be combined.
- The earlier kit is on main in `art/busts/v1/`.

**Every piece** is 1254 × 1254 at (0, 0).

**Stack order:** head, bare arms when the top has short sleeves, top, tie, jacket, face, hair.

**Arms:** pick the bare arms by the head's sex and shade.

**Skin:** painted, never tinted.

`people-art-checks.md` beside this file is every complaint the owner has made about people art. Each one is a check.
