---
id: people-partnerships-counted-and-rates
title: "Counted people partner, separate and leave home by the same rule as full people, and a played year's totals fall within the CDC and ACS rates"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-partnerships-full-people-form,people-partnerships-full-people-end,people-leave-parents-home
source: added with npm run pool -- add
---

**What.** Counted people partner, separate and leave their parents' home by the same rule as full people, applied times their count. A played year's totals then fall within the CDC marriage and divorce rates and the ACS rates for moving out. Today counted households change only by births, deaths and moves, so a counted group never forms a couple. Read the same causes the full-people items use, namely age, closeness, traits, money, housing and the law in force, over each counted group, and move counts between households from those causes.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person, times its count, and a rule that applies only to full people is an unregistered placeholder. No dice: real rates check the year's totals and never pick one household's outcome. Estimate, never UNKNOWN: a value a player can see starts from the real average with a per-world spread. One rule, all 56 places: rates and laws are data.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, counted partnering, separating and leaving home change counted households by record id, and a test in src/core2 shows the year's totals inside the CDC and ACS bands for that place. The owner plays it: the town's couples and households change over a year.

**Files.** src/core2/modules/renewal.ts, src/core2/counted-groups.ts, src/core2/data/renewal/

**Notes.** Written from the title on Oct 19 so the item meets the quality gate. Waits on the full-people partnership items and people-leave-parents-home.
