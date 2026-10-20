---
id: laws-convictions-counted-reach
title: "Felony disenfranchisement of counted adults reads conviction records, not a state share"
area: laws
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/convictions-counted-reach
pr:
blocked-on:
source: "split from laws-stopgap-reach-group-a-missing-record, Oct 16"
claimed-at: 2026-10-19T18:51:07.746Z
---

**What.** Felony disenfranchisement takes each state's share of the voting-eligible population (The Sentencing Project, Locked Out 2024) and half of it back where a restoration law is in force, instead of people's own records (SG-GOV-REACH-A-convictions). Named people are now barred from their own conviction and sentence on the justice record. Give counted adults the same rule: the justice engine keeps counted convictions by group, and the counted electorate loses exactly the barred adults of each group, so the state share becomes a check on the total and no longer decides it.

**Rules.** One model, two tiers: the same bar, applied to a group's convicted count, as to a full person. Real rates check totals and never pick one person's outcome. One rule, all 56 places.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) the counted electorate's barred count comes from the groups' conviction counts and the restoration law in force, shown by group ids, and its total lands within the state's real share's spread; SG-GOV-REACH-A-convictions is resolved and the test in src/core2/law-reach-group-a.test.ts passes.

**Files.** src/core2/law-reach/group-a-voting.ts, src/core2/modules/justice.ts, src/core2/counted-groups.ts, src/core2/data/elections/felony-disenfranchisement.json

**Notes.** Split from laws-stopgap-reach-group-a-missing-record. The named-person half is in the group A voting PR (barredFromVoting).

Looked at Oct 19 (claude/convictions-counted-reach), not built: the justice engine (`src/core2/modules/justice.ts`) has no counted-level cases at all. `convictionsOf` and `sentenceUnfinished` read only full people's `cases` and `sentences` rows, and nothing in justice mentions counted groups, so there are no counted convictions for the electorate to subtract. `felonyDisenfranchisedShare` (`src/core2/law-reach/group-a-voting.ts`) is read in two places in `src/core2/electorate-inputs.ts` (lines 238 and 256). This item therefore needs a counted crime and sentencing model first (what moves a counted adult to a charge, from needs, drives and the town's conditions, with no roll). Split it before building: one item for counted cases by group in justice, then this one to read them. Size L.
