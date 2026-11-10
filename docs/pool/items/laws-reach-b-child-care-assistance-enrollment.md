---
id: laws-reach-b-child-care-assistance-enrollment
title: "Child care assistance enrolls an eligible child with a provider and lowers the family's child-care bill by the subsidy"
area: laws
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: stand-in triage Nov 10 (SG-GOV-REACH-B-child-care-enrollment)
after: laws-reach-b-preschool-childcare
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** The child care assistance law pays the household of each eligible child the expected CCDF subsidy a month (stopgap SG-GOV-REACH-B-child-care-enrollment). No child is enrolled with a provider and no child-care bill falls. Once the household child-care bill exists, enroll each eligible child and subtract the subsidy from the family's bill.

**Cause.** Found in code: `payChildCare` in src/core2/law-reach/group-b-money.ts (line 1108, marker in its comment) pays expected spending; the policy row is at src/core2/data/laws/reach-group-b.json line 320 with the same stopgap id. There is no child-care bill or enrollment record in src/core2 until laws-reach-b-preschool-childcare lands.

**Fix.** After laws-reach-b-preschool-childcare adds the monthly child-care flow and an enrollment record, change `payChildCare` to (1) mark an eligible child (income under the state limit, a working resident adult) as enrolled in a subsidized slot, and (2) cut the family's child-care flow by the subsidy, with the family copay at most 7 percent of income. Counted households follow the same rule times their weight. The 20 percent receipt share stays only as the check on total enrolled; who is enrolled follows the records (no dice). Cheap: run monthly, by household counts and the existing eligibility pass, nothing scans history.

**Time box.** 5 hours for one Sonnet session at medium effort.

**Rules.** An effect is a read: the child-care flow reads the enrollment record when it pays. No dice. One model, two tiers. Estimate, never UNKNOWN: the copay cap and limit carry their sources. One rule, all 56 places.

**Done when.** A second session, not the builder, checks this in the running game. In a one-year run of the played world (`buildBenchWorld`) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), a named child under 13 in an eligible working family holds an enrollment record and the family's child-care payment is lower than a same-income unenrolled neighbor's by journal record id, a counted group shows the same, the journal balances, and SG-GOV-REACH-B-child-care-enrollment is closed.

**Waits on.** laws-reach-b-preschool-childcare (the child-care bill and enrollment record).

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/data/laws/reach-group-b.json, src/core2/data/stopgaps/gov.json, src/core2/law-reach-group-b.test.ts

**Notes.** Not a new engine: one mechanic inside the law-reach payments and the household spending engine.
