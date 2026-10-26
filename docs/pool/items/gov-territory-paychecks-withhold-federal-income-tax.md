---
id: gov-territory-paychecks-withhold-federal-income-tax
title: "Paychecks in the Northern Mariana Islands withhold federal income tax, which territory residents don't owe"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/territory-federal-withholding
pr: #5916
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T07:09:07.014Z
---

**What.** In a played year on main 133fbe2d1a in Gampapa, Northern Mariana Islands (place key territory:MP:gampapa, seed 0000cfebb83f2761c1110a8b4fb720f40f7e03225d64af10ff108ddc1275acf0), paychecks after January 1, 2026 withhold federal:income beside the territory's own income tax (state:income), Social Security and Medicare. Residents of the territories pay their own territorial income tax in place of the federal one (26 U.S.C. 931 to 933, cited in tests/golden-path/played-world.node-test.ts), so these workers are taxed twice. Find why the federal income-tax row reaches a territory paycheck and fix it in the law data or the withholding reader.

**Rules.** One rule, all 56 places: the territory rule comes from place data, never a named territory in code. Estimate, never UNKNOWN: the territorial rate stays the sourced row it is now.

**Done when.** In Gampapa, Northern Mariana Islands (seed above) and one drawn place in each of the other four territories, no paycheck after January 1 withholds federal:income while Social Security and Medicare still do, shown by the withholding journal postings' named taxes in a played year; a test fails when the federal row reaches a territory paycheck.

**Files.** src/core2/tax-withholding.ts, src/core2/data/laws/starting-law.json

**Notes.** Found by the M0-M2 lead while fixing play-golden-path-withholding-reads-kept-rows, Oct 24.
