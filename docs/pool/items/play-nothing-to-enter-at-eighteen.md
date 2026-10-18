---
id: play-nothing-to-enter-at-eighteen
title: "In some places an 18-year-old has no contest they can enter, so the golden path's filing step has nothing to do (Manley Hot Springs, Alaska and Yona, Guam)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The headless path check walks the 18-year-old into the office that takes filings and finds no contest they can enter in two places drawn: Manley Hot Springs, Alaska (seed pc6) and Yona, Guam (seed pc39). In Alaska the town has no local government in the Census listing, and the state and federal offices ask for 21 to 30; in Guam the offices on the ballot ask for more than 18. The path then goes on with a sitting member's bill, so it still reaches step 7 to 10, but the player's own step 3 to 5 (file, campaign, win or lose) has no door. Decide what the golden path offers there: a later first contest the player waits for, a smaller office the place really has, or the town's government if the listing is missing it.

**Rules.** The Political Process is the baseline and the golden path is the owner's: nothing is invented because real life has it. One rule, all 56 places: the offer follows the place's records, never a named place. Look before you ask: read the decision register for how a player with nothing to enter should be told.

**Done when.** For a drawn place and seed where no contest is open to the 18-year-old (the two above), the bench's government screen shows what the player can do instead, from the place's records, and a test in src/bench names the place and seed and checks it; the path check reports the step the player reaches.

**Files.** src/bench/government.ts, src/bench/path-check.ts

**Notes.** Found Oct 18 (claude/pool-notes-path-sweep) in two sweeps of the path check, 44 seeds. Manley Hot Springs is an incorporated Alaska city, but the Census government listing the game reads carries no unit for it (149 Alaska municipalities, none named Manley), so its town has no council seats; that data gap is its own question. Territories fall under the same rule: Guam's filing ages are above 18.

Narrowed Oct 18 (same branch). The filing overlay in `src/bench/play.mjs` (`renderFilingOverlay`) already lists each unmet rule with the player's value against the required one (for example the minimum age, 18 against 25) and marks the row unmet, so a player in these places can see why no office is open. What is missing is a date: nothing says when the player becomes old enough, which would be `becomesMetOn` on the minimum-age check (birth date plus the required years) in `checkEligibility`, shown on that row. The Alaska half is a data question: Manley Hot Springs is not in the Census government listing the game reads.
