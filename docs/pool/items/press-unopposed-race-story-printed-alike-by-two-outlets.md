---
id: press-unopposed-race-story-printed-alike-by-two-outlets
title: "Two outlets print the same sentence for an unopposed mayor's race"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "The carry thread's gate of #9299, Nov 14, 2026 (red on the train head 9ed4bf9c and on this branch alike)"
checked:
claimed-at:
---

**What.** At Poultney, Vermont (5056800), place seed 861316dd23ed216e:agree:0, the race for mayor (contest:seat:gus2025:176559:mayor:0:2025-03-04, one name on the ballot) is printed by the newspaper (outlet:newspaper:0) and by a television outlet (outlet:television:3) with the same words, "Ronald Wood faced no opposition and was elected mayor on Tuesday." `src/bench/race-result-stories.test.ts` (the drawn place, run with GOLDEN_PATH_SEED=861316dd23ed216e) fails on "No two outlets print the same story of one race". Seen: the printed result stories of an unopposed race in two outlets.

**Cause.** Needs cause. The test reads `byRace` told text per outlet; two outlets compose the same text for a race with no count. Find whether the result builder in src/bench/printed-words.ts varies an unopposed story by outlet at all, and how many pieces the bank holds for it.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** No hand-written player text in code. A builder never judges its own lines. One rule, all 56 places.

**Done when.** A second session replays the test at Poultney, Vermont with seed 861316dd23ed216e on main and the two outlets' stories for the unopposed race differ; run the same test at two other drawn places and it stays green.

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts, src/bench/race-result-stories.test.ts
