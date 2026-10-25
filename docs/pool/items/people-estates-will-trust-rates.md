---
id: people-estates-will-trust-rates
title: "Making a will and setting up a trust follow researched rates by age and wealth, so temperament can tip them"
area: people
kind: research
priority: 2
size: S
status: claimed
claimed-by: claude/traits-estates-rates
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T16:25:36.046Z
---

**What.** Weighed for every adult 55 or older in Haledon, New Jersey (place key 3429070, seed fc8bf1311d0f) as if at death, the will's age term (src/core2/estates.ts, willOf) puts all 858 over the line with temperament off, against 37.4% with a will among Swiss adults 55+ (Ryser et al. 2026) and about half of older Americans. The trust's wealth term (trustOf, a 5 million dollar midpoint) keeps 98% of the 832 with savings far below it. With the rates this far from life, the trait weights cannot reach the studies' odds (1.42 and 1.34 between the thirds).

**Rules.** Research before building: rates by age and by wealth from fetched surveys (for example Caring.com or AARP will surveys, the Federal Reserve's SCF on trusts), quoted. Estimate, never UNKNOWN. No dice: a will stays a weighed choice. One rule, all 56 places.

**Done when.** willAgeMidpointYears, willAgeWeight, trustWealthMidpointMinor and trustWealthWeight are SOURCED or ESTIMATED with their surveys; over a drawn town's adults 55+ the shares with a will and a trust are within the surveys' bands; and estates.will and estates.trust are fitted with weights reaching net odds from 1.2 to 3 between the thirds, or keep gap rows with the numbers.

**Files.** src/core2/estates.ts, src/core2/data/parameters.json, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 25 by the traits lead from traits-research-weights-21. Wills and trusts now read their weight through the shared yes-or-no rule (claude/traits-research-weights).

Oct 25 (traits lead, research gathered; not built). Wills by age, Pew Research Center 2025 (American Trends Panel, n = 8,750, U.S. adults): 18-39 15%, 40-49 20%, 50-59 32%, 60-69 46%, 70-79 66%, 80+ 81% (Gallup 2021, AARP 2024 and Caring.com 2024 agree in shape). By wealth, the Center for Retirement Research from the Health and Retirement Study: households 70+ with a will by wealth quarter 36%, 58%, 74%, 87% (50+: 22%, 38%, 53%, 70%). Trusts: polls give 11 to 14% of adults (Trust & Will 2026, Caring.com 2025); the 2025 Survey of Consumer Finances (the lead's helper's weighted tabulation, 4,360 families) gives any legal trust at 0.4% under $250k net worth, 2.2% at $250k-$1M, 9.8% at $1M-$5M and 15.7% above, 3.2% overall: its question undercounts, so use its shape scaled to the polls' level. Sources, samples and URLs: docs/reports/trait-wiring-2026-10-25.md on the branch claude/traits-lead-report.

Why it is not built: wills and trusts need the person's wealth, and the estate the game hands them is their liquid balance, which a quarter of adults hold at exactly $29,838 (Haledon, New Jersey, seed fc8bf1311d0f, and Kenvir, Kentucky, seed 32bb83941552). Fitted on age, liquid savings and the lean together, the model gives nobody under 50 a will and ties the top two wealth quarters at 100%. A builder needs net worth on record: the liquid balance plus home equity (housing's owned dwelling value less what is owed). With it, fit the age term, a wealth term and the trait weight together to Pew's age bands, the CRR wealth quarters and Ryser et al.'s odds ratio of 1.42 for wills among adults 55+ (1.34 for trusts). Wills and trusts already read their own weight through the shared yes-or-no rule (#6009).
