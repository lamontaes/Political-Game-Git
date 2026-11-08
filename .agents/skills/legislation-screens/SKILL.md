---
name: legislation-screens
description: How to build and prove a bill screen (writing, committee, floor, desk, override, following) for Our Civic Duty: read the one stage view, never count in a screen, prove it in the running game with dev mode's hold-vote route. Use when adding or changing anything under src/bench/ui/bill-*.mjs or the bill paper in play.mjs; not for the legislature engine's rules (lead-session) or for scenes around a bill (scene-producers).
---

# Legislation screens

- **One read per bill.** `billStage(core, billId, asId?)` in `src/bench/bill-stage.ts` (`GET /api/bill/stage`) returns the stage code, each committee's record by name, what members have told the player (`learnedStakesOf`) and each chamber's floor and override result with names. A screen formats it; it never counts, ranks or writes a sentence. A fact a screen needs that this view lacks is added to the view, from the legislature's rows.
- **Labels** are bare control names in `src/bench/data/controls.json` under `billStage`; sentences come from the English engine.
- **Names open cards.** Each member row carries `personId` (null for a counted official); use `nameLink` from `ui/strips.mjs` and `showPerson({ personId })`.
- **Prove it in the running game.** Start `node --import tsx src/bench/server.ts`, then run a browser script like `src/bench/bill-stage.browser.mjs` (`BENCH_BROWSER=/opt/pw-browsers/chromium`, `SHOTS_DIR` for a screenshot). It drafts a bill from Your office, takes the bill's id from the paper's request and posts to dev mode's `/api/dev/hold-vote` (also `vote`, `sign`) to run the floor. Name the place and seed it prints.
- **A told stake is kept only for the player and who they deal with** (`keepsWhy`); in a unit test pass the sponsor as `asId`.
- A world build takes about five seconds; a test that draws places until one fits needs a long timeout (`it(..., 300_000)`).
