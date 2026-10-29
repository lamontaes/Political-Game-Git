---
id: words-governors-ranked-asks
title: "The opening address can put a second and a third state law to the governors, in both voices"
area: words
kind: feature
priority: 2
size: S
status: done
claimed-by: words/governors-asks
pr: #6316
blocked-on:
source: "director engineer, Oct 27 (director-president-asks-within-powers): one governors ask piece per voice and stance; pieces for rank-second and rank-third let the address pass up to three"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** Since the President asks Congress only what federal law can answer, the address leans on the governors, and it has words for one state ask only. The director passes up to three state laws once the bank can say a second and a third. This item writes those asks in both of the address's voices, for a law the President wants and one they want changed.

**Rules.** No hand-written player text in code: each ask is a bank piece with its facts in slots. Serves `scene-standard`: the asks vary by voice and stance and say only what the stand's facts carry. One rule, all 56 places: the state is a slot, never a name in a line.

**Done when.** `opening-speech.json` has governors asks requiring `rank-second` and `rank-third`, each with a for and an against stance, in the polished and plain voices. `english-parts-banks`, `opening-address.test.ts` and `opening-asks.test.ts` pass in a buildBenchWorld drawn place.

**Time box.** 1 hour.

**You will see.** Once the director passes the ranks: after the first law put to the governors, "I'd also ask you to look at whether your state should" and the second law, said plainly.

**Screenshot.** None until the director passes the ranks.

**Files.** data/english/parts/opening-speech.json

**Notes.** The director engineer passes the ranks after this lands, with a test that a second governors ask appears.
