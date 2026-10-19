---
id: play-politics-division-filter
title: Politics screen keeps every legislator behind a division filter (federal, state, local) with a city and state switch
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/politics-division-filter
pr: #4849
after:
blocked-on: gov-other-state-legislatures
milestone:
source: owner ruling Oct 16
claimed-at: 2026-10-17T00:52:58.058Z
---

**What.** The Politics screen keeps every legislator instead of trimming the list to leaders and the player's own. The list sits behind a division filter with three divisions: federal, state and local. The player can switch which city and which state the screen shows; it defaults to the player's own city and state. Owner, Oct 16: "have a good division filter thing, like city, state, local, being able to change cities and states."

**Rules.** One rule, all 56 places: the filter reads each place's bodies from data, naming no state or city in logic. No hand-written player text: control names come from the English engine.

**Done when.** In a played world drawn at a real place (for example Robbins, Illinois, or Lake Ridge, Virginia), the Politics screen filtered to state lists every sitting state legislator of that state, and switching the state to another lists that state's legislators instead; a screenshot of the screen filtered to state and then switched to another state is in the PR, and the browser spec for the screen passes.

**Files.** `src/bench/politics.browser.mjs` (the Politics screen spec), `src/bench/play.mjs` and `src/bench/data/controls.json` (find the Politics hub screen), `src/core2/opening-key-people.ts` (the list it currently reads).

**Notes.** From the owner's answer to the Oct 15 question in OWNER-DECISIONS.md ("say if it should list only the leaders and the player's own"): keep everyone, filter by division.

Checked Oct 17 (claude): the filter by city and by federal level can be built now, but switching to another state lists nothing, because the world seats only the player's own state's legislature (one state's offices and 150 serving terms in a drawn Indiana world). Filed gov-other-state-legislatures for the missing data. This item waits on it for the state switch.
