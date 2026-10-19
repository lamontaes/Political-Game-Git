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

**What.** Counted people partner, separate and leave their parents' home by the same rules as full people, applied to each counted group times its count. A played year's totals then fall within the CDC marriage and divorce rates and the Census household formation rates for the place, because the rules are right, not because a rate picks who partners. Today only full people have partnerships and counted households stay as they opened.

**Rules.** One model, two tiers: a counted group follows the same partnership rule as a full person, times its count; No dice: the rule reads age, closeness, money, housing and the law in force, and real rates only check totals, never pick one actor's outcome; Estimate, never UNKNOWN: a rate the data lacks starts from the national average marked ESTIMATED with its spread; One rule, all 56 places: place facts live in data; Wire to the world: a counted partnership moves a household, rent and money in a generated world.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, named in the PR body, counted partnerships and separations happen, each naming the group id and household record id, and the year's totals fall within the CDC and ACS rates; a test in src/core2 states the bounds.

**Files.** src/core2/modules/counted-moves.ts, src/core2/modules/renewal.ts, src/core2/data/renewal/parameters.json

**Notes.** Body written Oct 19 (claude) from the title and the repo layout; the claimant should sharpen it.
