---
id: people-estates-will-trust-rates
title: "Making a will and setting up a trust follow researched rates by age and wealth, so temperament can tip them"
area: people
kind: research
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Weighed for every adult 55 or older in Haledon, New Jersey (place key 3429070, seed fc8bf1311d0f) as if at death, the will's age term (src/core2/estates.ts, willOf) puts all 858 over the line with temperament off, against 37.4% with a will among Swiss adults 55+ (Ryser et al. 2026) and about half of older Americans. The trust's wealth term (trustOf, a 5 million dollar midpoint) keeps 98% of the 832 with savings far below it. With the rates this far from life, the trait weights cannot reach the studies' odds (1.42 and 1.34 between the thirds).

**Rules.** Research before building: rates by age and by wealth from fetched surveys (for example Caring.com or AARP will surveys, the Federal Reserve's SCF on trusts), quoted. Estimate, never UNKNOWN. No dice: a will stays a weighed choice. One rule, all 56 places.

**Done when.** willAgeMidpointYears, willAgeWeight, trustWealthMidpointMinor and trustWealthWeight are SOURCED or ESTIMATED with their surveys; over a drawn town's adults 55+ the shares with a will and a trust are within the surveys' bands; and estates.will and estates.trust are fitted with weights reaching net odds from 1.2 to 3 between the thirds, or keep gap rows with the numbers.

**Files.** src/core2/estates.ts, src/core2/data/parameters.json, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 25 by the traits lead from traits-research-weights-21. Wills and trusts now read their weight through the shared yes-or-no rule (claude/traits-research-weights).
