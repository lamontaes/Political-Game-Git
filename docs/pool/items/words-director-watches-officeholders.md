---
id: words-director-watches-officeholders
title: "An officeholder's records fire scenes: an address is a speech scene, a signing brings staff and press, and some endings open a game screen"
area: people
kind: feature
priority: 2
size: M
status: blocked
claimed-by: claude/political-game-pool-bgn78d
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:55:41.806Z
---

**What.** Over a year the president's records hold an inaugural address and a signed bill (H.R. 2, October 1, 2025, seed life-1), yet the director noted one moment and staged one journal scene ("This is a Wednesday in October. You're at home."). The officeholder's own records should fire scenes: an address is a speech scene, a signing brings staff and press, an appointment brings the nominee, and some scene endings open the matching game screen (drafting a bill, the desk).

**Rules.** Ask why: every scene names the record that caused it, by id. Scenes come from records already written by the government engines, through situation types in `src/director/data/situation-types.json`; no new engine. Each scene's context names the record that caused it. No hand-written player text.

**Done when.** The life page (`scripts/dialogue-batch/life-page.ts`) for a president and a governor on an unchosen seed shows at least one scene per signed bill and per address, each citing its record id, and one ending that names a game screen.

**Files.** `src/director/`, `src/director/data/`, `scripts/dialogue-batch/life-page.ts`.

**Notes.** Owner, Oct 19: "start as the president ... see what the simulation does for their life ... work backwards, not authoring scenes." Needs `core-officials-deep-past` for the family and staff to cast.
