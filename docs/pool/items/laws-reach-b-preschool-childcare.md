---
id: laws-reach-b-preschool-childcare
title: "Universal preschool enrolls 3- and 4-year-olds and cuts the household's child-care cost, read by household spending"
area: laws
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: split from laws-reach-b-schools-preschool-tuition by pool feeder Oct 20
---

**What.** The `us-policy-positions:education.universal-preschool` policy in src/core2/data/laws/reach-group-b.json has mechanic "records": it marks 3- and 4-year-olds eligible and nothing reads it (stopgap SG-GOV-REACH-B-preschool-enrollment). Add the missing child-care cost: a monthly child-care flow for households with a child under school age, sized from the Consumer Expenditure child-care average by income with a per-world spread, paid to a child-care provider organization. When the preschool law is in force, an eligible child is enrolled with a pre-k record at a school or provider, and the family's child-care flow falls by the public share. Counted households follow the same rule times their weight; repeal ends the enrollment.

**Rules.** An effect is a read: the household child-care flow must read the child's pre-k enrollment record when it pays. One model, two tiers: counted households pay and enroll by the same rule as full ones, times their count. No dice: enrollment follows age, the law in force and a place being available, and the cost follows income, never a roll. Estimate, never UNKNOWN: the child-care average carries its source and spread. The chain is the acceptance: law row, eligible child, enrollment, lower flow, household cash. Replace, never layer: the "records" mechanic for this policy is replaced and the stopgap row closed.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), with the preschool law in force, a named 4-year-old holds a pre-k enrollment record and their household's monthly child-care payment is lower than an unenrolled neighbor's by journal record id, a counted group shows the same, the journal balances, and SG-GOV-REACH-B-preschool-enrollment is closed; src/core2/law-reach-group-b.test.ts proves it.

**Files.** src/core2/data/laws/reach-group-b.json, src/core2/law-reach/group-b-people.ts, src/core2/reference/living-costs-data.ts, src/core2/modules/school.ts, src/core2/data/stopgaps.json, src/core2/law-reach-group-b.test.ts

**Notes.** Part 1 of 2 of laws-reach-b-schools-preschool-tuition. There is no child-care spending in the core today (living-costs-data.ts has no child-care line); the Consumer Expenditure child-care row may need the BLS workbook, which the cloud proxy blocked for the sibling medical-spending item, so use a published average registered ESTIMATED with its citation if it cannot be fetched.
