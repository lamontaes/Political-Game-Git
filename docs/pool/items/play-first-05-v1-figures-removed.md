---
id: play-first-05-v1-figures-removed
title: "The v1 whole figures leave every manifest and renderer"
area: play
kind: bug
priority: 1
size: M
status: in-pr
claimed-by:
pr: #5898
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** The owner's read of the playtest screenshots: the v1 figures ("the ones with the airplane") are completely removed; the Codex v2 set may be used, else people stand generated-in. The game still draws the 81 whole figures in art/people-whole through src/bench/whole-figures.ts. This item removes art/people-whole from every manifest and renderer the game reads, adopting PR #5898, which stands people from the v2 set (art/people-engine/v2, the Oct 15 layered set from draft PR #4283).

**Rules.** Serves LAW.md §2, People in rooms and figures; LAW.md §10, The owner's read of the Oct 24 screenshots. Replace, never layer: the whole-figure manifest, rules and loader are deleted, not left beside the v2 set. Wire to the world: each person drawn is read from their own record (sex, build, role, place).

**Done when.** In a drawn place, the opening, the first evening, the filing office and door knocking show no art/people-whole image, and a test fails if any file in src/bench or scripts names art/people-whole, shown by a screenshot of each.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** No person with arms out like an airplane anywhere in the game; every person stands from the v2 figure set or is drawn by the appearance engine.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/whole-figures.ts, src/bench/appearance.ts, src/bench/scene.ts, src/bench/handler.ts, src/bench/data/whole-figures.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Adopt PR #5898 (branch art/people-whole-out-of-play). Its body says every v2 figure is bald with one skin tone; if the owner rejects that on its screenshot, people stand generated-in from the appearance engine instead. #4283 is the source of the set; nothing in it is merged. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

CTO, Oct 25 18:20 UTC: #5898 is merged (the v2 set stands in every room; src/bench/whole-figures.test.ts fails on any art/people-whole load). The owner's installed-build check of the four screens closes it; nothing for the lane to build unless that check stops.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (merged #5898; owner installed-build check per OD:105).
