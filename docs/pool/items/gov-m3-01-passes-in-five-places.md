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
lead: governing
standard: 2
model: sonnet
effort: medium
root: rc2-done-from-records
source: governing lead, Nov 1 (phase B map)
checked: fable 2026-11-10
---

**What.** M3-01's six test files each hash GOLDEN_PATH_SEED into a place by their own draw and none reads GOLDEN_PATH_PLACE_KEY, so the golden-path runner's summary names a place the tests never played. Three of them (legislature-bill-form, legislature-sections, policy-authority) print nothing about the place, and several loop over up to ten draws until a place has what they need. To flip M3-01 to passing, every file must run in the runner's place first, redraw only with a printed reason, and print the place, seed and record ids it played. Guards: the bill screens (writing, committee, floor, desk) working in the place the player is actually in, which the golden-path runner's M3-01 check keeps true.

**Cause.** Found in code: docs/roadmap/features.json entry M3-01 (line 397) has passes false and names its test files, while src/core2/campaigns.test.ts (line 103) shows the pattern of reading GOLDEN_PATH_PLACE_KEY first; src/core2/legislature-bill-form.test.ts, src/core2/legislature-sections.test.ts and src/core2/policy-authority.test.ts print nothing about the place they played and none reads GOLDEN_PATH_PLACE_KEY.

**Fix.** Make each M3-01 test file run in the place GOLDEN_PATH_PLACE_KEY names first (redraw only with a printed reason), print the place, seed and record ids, table each clause of M3-01 against the assertion that proves it in the PR body, and set passes to true in docs/roadmap/features.json.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: read GOLDEN_PATH_PLACE_KEY first, the way 54 other tests already do (campaigns.test.ts:102), and name every skipped place with its reason. The flip precedent (roadmap-m0-flip-proven-five) applies: every clause of the spec is proven by the command, shown in a table from clause to assertion, and the spec is played in the bench with a screenshot.

**Done when.** A second session finds every M3-01 test file passing under five GOLDEN_PATH_SEED values with BILL_PAPER_SEED unset, the printed lines naming five different places each with its seed and record ids, the PR body's table of each M3-01 clause against its assertion with a bench screenshot of a bill drafted in a drawn place, docs/roadmap/features.json showing M3-01 passes true, and the CTO's answer on whether M3-01 runs in the quick job or the long one.

**Waits on.** gov-m3-01-ban-blocks-the-seats-bill; the CTO's answer whether M3-01 runs in the quick or the long job.

**Files.** src/core2/legislature.test.ts, src/core2/legislature-bill-form.test.ts, src/core2/legislature-sections.test.ts, src/core2/policy-authority.test.ts, src/bench/bill-paper.test.ts, src/bench/bill-paper-authority.test.ts, docs/roadmap/features.json

**Notes.** Phase B map (Nov 1, 14:18 UTC) unit 3. Ask the CTO before flipping: the quick job already overruns its 450 s (tests-golden-path-quick-budget-spent-before-m3-09).
