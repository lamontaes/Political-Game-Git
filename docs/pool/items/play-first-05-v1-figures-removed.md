---
id: play-first-05-v1-figures-removed
title: "The v1 whole figures leave every manifest and renderer"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner's read of the playtest screenshots: the v1 figures ("the ones with the airplane") are completely removed; the Codex v2 set may be used, else people stand generated-in. The game still draws the 81 whole figures in art/people-whole through src/bench/whole-figures.ts. This item removes art/people-whole from every manifest and renderer the game reads, adopting PR #5898, which stands people from the v2 set (art/people-engine/v2, the Oct 15 layered set from draft PR #4283).

**Rules.** Replace, never layer: the whole-figure manifest, rules and loader are deleted, not left beside the v2 set. Wire to the world: each person drawn is read from their own record (sex, build, role, place).

**Done when.** In a drawn place, the opening, the first evening, the filing office and door knocking show no art/people-whole image, and a test fails if any file in src/bench or scripts names art/people-whole, shown by a screenshot of each.

**Files.** src/bench/whole-figures.ts, src/bench/appearance.ts, src/bench/scene.ts, src/bench/handler.ts, src/bench/data/whole-figures.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Adopt PR #5898 (branch art/people-whole-out-of-play). Its body says every v2 figure is bald with one skin tone; if the owner rejects that on its screenshot, people stand generated-in from the appearance engine instead. #4283 is the source of the set; nothing in it is merged. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
