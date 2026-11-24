---
id: tests-office-bill-title-property-tax-null
title: "A city bill raising the property tax has no name in New Germany, Minnesota, so office-bill-title fails on main"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/bill-title-property-tax
pr: #6313
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T12:10:48.784Z
---

**What.** src/bench/office-bill-title.test.ts drafts a city bill for every catalog policy and operation and expects the meeting's bill item to carry the bill's real name. On clean main (41302ac661) with GOLDEN_PATH_SEED=a290e218295c1ddf4aabe9289024b8dbf1832e9b, drawn New Germany, Minnesota, it fails: 'law:property-tax raise: expected null not to be null'. The bill's title comes back null for a property-tax raise in that town, so the meeting would show a bill with no name.

**Rules.** Never loosen the test: every drafted bill has a real name. One rule, all 56 places: the cause is found in the naming route, not by skipping a place. No hand-written player text: the name comes from the English engine's bill names.

**Done when.** src/bench/office-bill-title.test.ts passes with GOLDEN_PATH_SEED=a290e218295c1ddf4aabe9289024b8dbf1832e9b and on two fresh seeds named in the PR body; the PR names why the property-tax raise had no title in New Germany, by file and line.

**Files.** src/bench/office-bill-title.test.ts, src/english/bill-names.ts, src/bench/office.ts

**Notes.** TODO
