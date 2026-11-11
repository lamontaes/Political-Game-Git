---
id: people-births-ready-couples-conceive-at-once-part-3-women-without-partner
title: "A full woman with no recorded partner can plan a birth by the one planning path"
area: people
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: people-births-ready-couples-conceive-at-once-part-1-re-measure
blocked-on:
lead: lives
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-births-ready-couples-conceive-at-once in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Only women in the renewal engine's couples table (a partner link between two living people in one household) can plan a birth, and 26 of 990 full women aged 15 to 49 are in it. Measured Oct 20 in three drawn places over one year: 990 full women, 3 births, against about 38 from the CDC 2024 age rates. Let a full woman with no recorded partner plan a birth from her own age, money, health and drives, with the other parent unrecorded, so full births by age band follow the same rule as the counted women's. Seen: the town's births in the paper, which are about a tenth of the real count today.

**Cause.** Found in code: src/core2/modules/renewal.ts keeps the couples table (table(api, "couples"), line 78) and plans only for its rows; src/core2/births-plan.ts chooseBirthPlan (line 270) scores a couple, not a woman.

**Fix.** Add a single-woman path to the one planning rule (a woman with or without a partner uses the same function), seeded from her own record, with the other parent unrecorded; give the child the household of the mother.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the plan follows the woman's own records, never a percentage; CDC rates check totals only. One model, two tiers: a full woman is a consistent member of the counted group she stands for. Replace, never layer: one planning path for a woman with or without a partner.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in three drawn places (named, with seeds) and sees full women with no partner plan and have births, with person-birth record ids, and full women's births per thousand by 5-year band reported beside the CDC band rate. A test in src/core2/births-plan.test.ts states the share of full women aged 20 to 39 who can plan a birth.

**Waits on.** people-births-ready-couples-conceive-at-once-part-1-re-measure.

**Files.** src/core2/modules/renewal.ts, src/core2/births-plan.ts, src/core2/births-plan.test.ts
