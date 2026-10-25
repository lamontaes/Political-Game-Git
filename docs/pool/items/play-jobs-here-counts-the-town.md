---
id: play-jobs-here-counts-the-town
title: "News's Jobs here line counts the player's own town: its residents at work and looking, and its employers' open positions"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The implementation half of play-stop-09-jobs-here-count-too-high, so it can merge on bench evidence while the play-stop item waits for the owner's steps on the next installed build. News's Jobs here line (src/bench/economy.ts economyView, from turnoverPanel in src/core2/modules/world-panels.ts) added every open job of every full person in the country to one per counted job record, so Anson, Texas (2,570 people) showed 2,036 employed. It must count the town's residents at work and looking, each counted resident for its household's weight, and the open positions its own employers have posted.

**Rules.** One model, two tiers: counted residents and full people are each counted once, a counted resident for its household's weight. Estimate, never UNKNOWN. Read-only screens spend no game time.

**Done when.** On the bench's play screen, a new life in a town drawn from all 56 (place and seed named) shows News's Jobs here with the employed no more than the town's people aged 16 and over, and the open count equal to the open positions of the town's employers, with before and after screenshots in the PR; src/bench/economy-jobs-here.test.ts passes in a random draw from all 56 and fails on main with the same seed.

**Files.** src/core2/modules/world-panels.ts, src/bench/economy.ts, src/bench/economy-jobs-here.test.ts

**Notes.** Split from play-stop-09-jobs-here-count-too-high on Oct 25 by the speed lead, as Merger 1 suggested on PR 6037: this item carries the fix; play-stop-09 stays open for the owner's installed-build acceptance.
