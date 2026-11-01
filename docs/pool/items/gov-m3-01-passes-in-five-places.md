---
id: gov-m3-01-passes-in-five-places
title: "M3-01 passes in five drawn places, each test naming the place it actually played"
area: gov
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: gov-m3-01-ban-blocks-the-seats-bill
source: added with npm run pool -- add
---

**What.** M3-01's six test files each hash GOLDEN_PATH_SEED into a place by their own draw and none reads GOLDEN_PATH_PLACE_KEY, so the golden-path runner's summary names a place the tests never played. Three of them (legislature-bill-form, legislature-sections, policy-authority) print nothing about the place, and several loop over up to ten draws until a place has what they need. To flip M3-01 to passing, every file must run in the runner's place first, redraw only with a printed reason, and print the place, seed and record ids it played.

**Rules.** One rule, all 56 places: read GOLDEN_PATH_PLACE_KEY first, the way 54 other tests already do (campaigns.test.ts:102), and name every skipped place with its reason. The flip precedent (roadmap-m0-flip-proven-five) applies: every clause of the spec is proven by the command, shown in a table from clause to assertion, and the spec is played in the bench with a screenshot.

**Done when.** Every M3-01 test file passes under five GOLDEN_PATH_SEED values with BILL_PAPER_SEED unset; the printed lines name five different places, each with its seed and record ids; the PR body tables each M3-01 clause against the assertion that proves it and links a bench screenshot of a bill drafted in a drawn place; docs/roadmap/features.json sets M3-01 passes to true; the CTO has answered whether M3-01 runs in the quick job or the long one.

**Files.** src/core2/legislature.test.ts, src/core2/legislature-bill-form.test.ts, src/core2/legislature-sections.test.ts, src/core2/policy-authority.test.ts, src/bench/bill-paper.test.ts, src/bench/bill-paper-authority.test.ts, docs/roadmap/features.json

**Notes.** Phase B map (Nov 1, 14:18 UTC) unit 3. Ask the CTO before flipping: the quick job already overruns its 450 s (tests-golden-path-quick-budget-spent-before-m3-09).
