---
id: play-person-history-fill-in-writes-the-coarse-past
title: "A person filled in when opened carries a past: school, jobs, moves, offices before the start, not only a birth year"
area: play
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The card now reads every record there is for anyone opened (birth, school started, jobs held, offices reached, family). A U.S. senator or a counted neighbor still shows only two to four lines because the engines write few records for them: office holders carry only their current term, and adults outside the officials and the player's circle have no school or work record. When the player opens such a person, fill-in must write a coarse past from the world's own rules (the school calendar and the place they lived, the town's businesses and the jobs engine for work spells, the earlier terms of the same seat), matching what the books already say, so the card tells four or more dated lines. Each line stays on a record id.

**Rules.** Two-level population: a filled-in person matches the records already kept (a business's books, an office's holders). No dice: the past follows traits, the economy and the law then, never a roll. Estimate, never UNKNOWN: values start from real averages with a spread and a source. No hand-written player text: lines come from data/english/parts/person-history.json.

**Done when.** In the played world (buildBenchWorld) of a drawn place (place and seed named), card-history.test.ts opens a sitting state legislator, a counted neighbor and a counted coworker with no tie to the player and finds at least four dated lines each, every one on a record id in the pre-start history or the durable log; screenshots of two cards at 1440x900 land in docs/play-first/shots.

**Files.** src/core2/pre-start.ts, src/core2/state.ts, src/core2/past-work.ts, src/core2/past-moves.ts, src/bench/card.ts, src/bench/card-history.test.ts

**Notes.** Filed by the play-first lane, Oct 29, from play-person-history-for-everyone-you-open (the card side landed there). Read: OWNER-DECISIONS (Oct 29), LAW section 5; searched: person history, pre-start, fill-in.
