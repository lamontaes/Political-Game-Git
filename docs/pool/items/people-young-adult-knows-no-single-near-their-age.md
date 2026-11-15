---
id: people-young-adult-knows-no-single-near-their-age
title: "A player who turns 18 knows no single near their age: at Pulaski, Ohio the five singles they know were born 1958 to 1993"
area: people
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
source: "Family life thread, Nov 15, 2026, src/core2/partnerships-courtship.test.ts on #9256 after Train 32a99421"
model: opus
effort: medium
root: none
---

**What.** At Pulaski, Ohio (3964906), seed family-a (`drawPlace("family-a", "family-life")`, built with `buildBenchWorld` two-level), the player born 2007-05-10 is run forward a week at a time until 18. The singles in town they then know (alive, not husks, not family, not in their household, not partnered, adult) are five: born 1958, 1960, 1966, 1977 and 1993. The closest of them by age fits the player at 121 on the partner age table against 4,317 for her best other single. Before Train 32a99421 the same build knew Samantha, born 2001. The town has singles near 18 (Isaiah, born 2006, whom the player has to be introduced to). Seen: the person card's Ask out, which a young adult has nobody near their age to press for, and People, which lists only older singles.

**Cause.** Needs cause. Where to look: who an 18-year-old knows comes from the opening's peer ties (`openOpeningPeerTies`, src/core2/life.ts about line 184: classmates and coworkers the records name) and from the shared time engine (src/core2/shared-time.ts); the monthly partnerships review may also pair off the few young singles they know. Which of these left no young single in the player's known list, and what in Train 32a99421 moved it, is not found.

**Fix.** None until the cause is found.

**Time box.** 2 hours to find the cause, Opus at medium effort. When it runs out, write what was found in Notes and stop.

**Rules.** No dice: who a person knows comes from shared school, work, home and groups in the records. One rule, all 56 places: check at least two more drawn places, named with seeds.

**Done when.** At Pulaski OH seed family-a and two more drawn places, a player who turns 18 knows singles near their age in the share a real town's classmates and coworkers give, with the cause named by line; a second session sees it on the People screen of a drawn life.

**Waits on.** Nothing.

**Files.** src/core2/life.ts, src/core2/shared-time.ts, src/core2/modules/partnerships.ts, src/core2/partnerships-courtship.test.ts
