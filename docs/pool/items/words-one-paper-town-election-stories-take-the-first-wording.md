---
id: words-one-paper-town-election-stories-take-the-first-wording
title: "A one-paper town's election stories do not all take the first wording"
area: words
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9560
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: acting CTO, fault 6 on the frozen Train 892427ec, Nov 15
checked: m3 2026-11-15
---

**What.** In a town with one paper every race result story reads in the same words: Excursion Inlet, Alaska has five unopposed seats, and all five say "faced no opposition and was elected". Seen: News, the town's election night, in that town.

**Cause.** Found in code: `raceTurn` in src/bench/printed-words.ts returns 0 when one outlet printed the race, and `composeNewsStory` in src/english/english-newscast.ts (the `turned` helper) then picks the first sayable sentence in key order for every story; the outlet turn was meant (rule 37) to give several outlets different wordings, and with one outlet it removes the variety the composer's own pick by story would give.

**Fix.** `raceTurn` returns no turn when fewer than two outlets printed the race, so the composer picks as it does for any story with no turn.

**Time box.** 1 hour.

**Rules.** No dice; one rule picks the wording.

**Done when.** In a drawn place and seed the builder did not choose, a second session reads News in a one-paper town on election night and finds its unopposed race stories do not all read the same, and the pinned test at Excursion Inlet, Alaska (concession-reported draw de4ef0f8ff6efdfb:agree:19) shows more than one shape.

**Waits on.** Nothing.

**Files.** src/bench/printed-words.ts,src/bench/race-result-one-paper.test.ts (new)
