---
id: play-government-screen-capitals
title: "The Government screen prints a local government in capitals (COUNTY OF PIKE)"
area: play
kind: bug
priority: 3
size: S
status: in-pr
claimed-by:
pr: #4945
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The Government screen prints each seat's government as the Census lists it (`government: office.governmentName` in `src/bench/government.ts`, shown as `government-place` in `src/bench/play.mjs`), so a county reads "COUNTY OF PIKE" and a village "VILLAGE OF EOLIA". Print it the way people write it: `countyDisplayName` for a county, parish or township and `governmentTitleName` (src/core2/offices-local.ts) for a city, town or village. Leave `governmentName` itself alone in the records, because `past-elections.ts` uses it as a lookup key.

**Rules.** Replace, never layer: the screen reads one label function, not two. No hand-written player text: a name is record data, formatted, not authored. One rule, all 56 places.

**Done when.** In a drawn place with a county and a municipal government (name and seed in the PR body), the Government screen shows each seat's government in ordinary capitalization, and a test in src/bench states it for the seats of a place drawn from all 56. The owner plays it: opens the Government screen and reads "Pike County", not capitals.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/core2/offices-local.ts

**Notes.** Found while fixing gov-body-named-by-member-title, which names the bodies (bodyName) but not the screen's government label. That item left the Play-owned files alone.

Sent back 2026-10-18 from PR #4945 (branch claude/government-screen-capitals): Merging current main (35745bc5b7) conflicts in docs/pool/items/play-government-screen-capitals.md, docs/release/changes/play-government-screen-capitals.md, src/core2/offices-local-names.test.ts, src/core2/offices-local.ts. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.
