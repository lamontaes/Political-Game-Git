---
id: core-trait-coverage-scene-talk
title: "trait-coverage fails on main: scene-talk picks an asker's answer by its own trait pulls, outside the decision table"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The trait coverage test (src/core2/trait-coverage.test.ts, 'finds every decision in code that weighs traits') fails on clean main because src/director/scene-talk.ts decides with traits but has no row in data/content/trait-decisions.json. Its pullOf sums per-move trait pulls from the purpose-arc data to pick the asker's answer and the branch the page follows first, a hand trait sum beside the shared table. Give the decision a table row whose options carry act kinds and read the lean through the shared helper, or list the site under outside with the reason, whichever the words line's design allows.

**Rules.** No dice: the answer stays chosen by the asker's traits weighing each move, never a roll. One model, two tiers: the same lean the chooser uses must reach the scene so a person answers in talk the way they decide elsewhere.

**Done when.** src/core2/trait-coverage.test.ts passes on main with src/director/scene-talk.ts either in the decision table or under outside with its reason, and src/director/scene-talk.test.ts still passes; a played-world talk in a drawn place, seed named, shows the asker's answer following their lean.

**Files.** src/director/scene-talk.ts, data/content/trait-decisions.json, src/core2/trait-coverage.test.ts

**Notes.** Found Oct 24 by the traits lead while landing the money family: red on main at 7b30a85cd, so it does not block family PRs.
