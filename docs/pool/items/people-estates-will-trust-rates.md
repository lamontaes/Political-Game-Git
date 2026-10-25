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
claimed-at:
---

**What.** Weighed for every adult 55 or older in Haledon, New Jersey (place key 3429070, seed fc8bf1311d0f) as if at death, the will's age term (src/core2/estates.ts, willOf) puts all 858 over the line with temperament off, against 37.4% with a will among Swiss adults 55+ (Ryser et al. 2026) and about half of older Americans. The trust's wealth term (trustOf, a 5 million dollar midpoint) keeps 98% of the 832 with savings far below it. With the rates this far from life, the trait weights cannot reach the studies' odds (1.42 and 1.34 between the thirds).

**Rules.** Research before building: rates by age and by wealth from fetched surveys (for example Caring.com or AARP will surveys, the Federal Reserve's SCF on trusts), quoted. Estimate, never UNKNOWN. No dice: a will stays a weighed choice. One rule, all 56 places.

**Done when.** willAgeMidpointYears, willAgeWeight, trustWealthMidpointMinor and trustWealthWeight are SOURCED or ESTIMATED with their surveys; over a drawn town's adults 55+ the shares with a will and a trust are within the surveys' bands; and estates.will and estates.trust are fitted with weights reaching net odds from 1.2 to 3 between the thirds, or keep gap rows with the numbers.

**Files.** src/core2/estates.ts, src/core2/data/parameters.json, data/content/trait-decision-gaps.json

**Notes.** Filed Oct 25 by the traits lead from traits-research-weights-21. Wills and trusts now read their weight through the shared yes-or-no rule (claude/traits-research-weights).

Oct 25 (traits lead, research gathered; not built). Wills by age, Pew Research Center 2025 (American Trends Panel, n = 8,750, U.S. adults): 18-39 15%, 40-49 20%, 50-59 32%, 60-69 46%, 70-79 66%, 80+ 81% (Gallup 2021, AARP 2024 and Caring.com 2024 agree in shape). By wealth, the Center for Retirement Research from the Health and Retirement Study: households 70+ with a will by wealth quarter 36%, 58%, 74%, 87% (50+: 22%, 38%, 53%, 70%). Trusts: polls give 11 to 14% of adults (Trust & Will 2026, Caring.com 2025); the 2025 Survey of Consumer Finances (the lead's helper's weighted tabulation, 4,360 families) gives any legal trust at 0.4% under $250k net worth, 2.2% at $250k-$1M, 9.8% at $1M-$5M and 15.7% above, 3.2% overall: its question undercounts, so use its shape scaled to the polls' level. Sources, samples and URLs: docs/reports/trait-wiring-2026-10-25.md on the branch claude/traits-lead-report.

Why it is not built: wills and trusts need the person's wealth, and the estate the game hands them is their liquid balance, which a quarter of adults hold at exactly $29,838 (Haledon, New Jersey, seed fc8bf1311d0f, and Kenvir, Kentucky, seed 32bb83941552). Fitted on age, liquid savings and the lean together, the model gives nobody under 50 a will and ties the top two wealth quarters at 100%. A builder needs net worth on record: the liquid balance plus home equity (housing's owned dwelling value less what is owed). With it, fit the age term, a wealth term and the trait weight together to Pew's age bands, the CRR wealth quarters and Ryser et al.'s odds ratio of 1.42 for wills among adults 55+ (1.34 for trusts). Wills and trusts already read their own weight through the shared yes-or-no rule (#6009).

Oct 25 (traits lead): researched and measured, then set back to open; build on PR #6009's branch, which moves both decisions onto the shared rule at their own weights.
- **Wills by age (fetched):** Gallup, May 3-18, 2021 (1,016 adults): 50-64 years old 53%, 65+ 76%; by household income, under $40,000 30%, $40,000-$99,999 49%, $100,000 or more 61%. Pew, September 2-8, 2025 (8,750 adults): 32% of all adults; "Among adults in their 60s, 46% have a will"; 70s 66%; "About eight-in-ten of those in their 80s or older"; 83% of upper-income adults 70+.
- **Trusts (fetched):** Caring.com 2025 (YouGov, 2,500+ adults): "13% reported a living trust". Trust & Will 2026 (Talker Research, 5,000 adults, Jan 28 to Feb 5, 2026): "Trust ownership rose from 11% to 14%". Neither gives an age or wealth breakdown.
- **Why an age term alone cannot fit:** over the adults 55+ of three drawn towns at the opening (Tavares, Florida, 1271225, 1,533 adults; Reserve, Montana, 3062125, 1,478; Goulds, Florida, 1226950, 1,241), the best age-only case (midpoint 65, weight 1.5, trait weight 0.5) gives shares of 0.21 to 0.24 at 55-64, 0.73 to 0.78 at 65-74 and 0.98 to 0.99 at 75+, against the surveys' 0.39-0.53, 0.46-0.76 and 0.66-0.80, with crossed net odds of 9.7 to 9.9 against the study's 1.42. The surveys' gentle rise with age means most of who has a will is something other than age, and with no second circumstance temperament takes that place at many times the study's size.
- **What the second circumstance needs:** income or wealth (Gallup's 30% to 61% by income). A person's own savings at the opening are no basis yet: 78% to 83% of adults 55+ hold zero `liquidMinor`, and the rest a median of $794 to $1,302, so the household's money is not on the members who would die with it. Education and marital status are not on the person record. settleEstate weighs a will or trust only for a death with a positive balance, so the population that matters is the dead with an estate.
