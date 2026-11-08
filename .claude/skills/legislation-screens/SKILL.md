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
- **Control binds when the clock next advances.** A browser proof that needs the engine to treat the chosen character as the player (an override that waits on them, a floor hold) plays one day first (`#week`, then Continue); without it the engine casts the character's votes itself. Unit tests do the same with `BenchPlayer.select` and a day's advance.
- **A dev-introduced bill often dies in committee** (the chair holds it, by the game's own rule). A proof tries law series from `/api/dev/laws`, in chambers where `billStage().yours.sits` is true, until one reaches the step it needs; it prints how many it tried.
- **Dev mode's lawmaking bodies include other states' chambers**, where the player does not sit; their vetoes and overrides are results only and prove nothing about the player's seat.
- **Check the words that prove the thing.** Wait for the section's own heading (for example "The vote to override the veto") and read only its roll call; waiting for any `.stage-chamber` also matches the floor's roll call.
- **Before pushing to a PR branch, read the PR's state.** A merged PR is closed to new commits: later work goes on a new PR (the crew-messages skill).
