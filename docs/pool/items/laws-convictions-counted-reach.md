---
id: laws-convictions-counted-reach
title: "Felony disenfranchisement of counted adults reads conviction records, not a state share"
area: laws
kind: stopgap
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: design-one-model-two-tiers
source: "split from laws-stopgap-reach-group-a-missing-record, Oct 16"
claimed-at:
---

**What.** Felony disenfranchisement takes each state's share of the voting-eligible population (The Sentencing Project, Locked Out 2024) and half of it back where a restoration law is in force, instead of people's own records (SG-GOV-REACH-A-convictions). Named people are now barred from their own conviction and sentence on the justice record. Give counted adults the same rule: read the justice engine's counted convictions by group, and let the counted electorate lose exactly the barred adults of each group, so the state share becomes a check on the total and no longer decides it. The Oct 19 note said the justice engine had no counted cases; it now has them (counted cases, sentences and custody are rows of the same tables), so the first step is reading them.

**Cause.** Found in code: `felonyDisenfranchisedShare` (src/core2/law-reach/group-a-voting.ts, line 507) is a state share, read twice in src/core2/electorate-inputs.ts (lines 240 and 258); src/core2/modules/justice.ts now keeps `CountedCaseRow` (line 196), `CountedSentenceRow` (line 239) and counted custody by group, but `convictionsOf` (line 1573) reads only named people, so no reader subtracts the groups' convicted adults.

**Fix.** Add a reader that returns each counted group's barred adults from its convicted counts (felony-grade cases only) and the restoration law in force, subtract them from the counted electorate by the same rule as a named person, and keep the state share as a check on the total. Resolve SG-GOV-REACH-A-convictions.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: the same bar, applied to a group's convicted count, as to a full person. Real rates check totals and never pick one person's outcome. One rule, all 56 places. An effect is a read, not a record: the electorate reads the groups' conviction counts when it counts voters.

**Done when.** A second session, not the builder, runs a one-year played world (`buildBenchWorld`) in a drawn place from all 56 and a seed the builder did not choose, both named. The counted electorate's barred count comes from the groups' conviction counts and the restoration law in force, shown by group ids, and the state's real share is reported next to the total with its spread (a figure to report, not a pass mark). SG-GOV-REACH-A-convictions is resolved and the test in src/core2/law-reach-group-a.test.ts passes. Nothing on screen reads it yet beyond the election night results.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-a-voting.ts, src/core2/modules/justice.ts, src/core2/counted-groups.ts, src/core2/electorate-inputs.ts, src/core2/data/elections/felony-disenfranchisement.json, src/core2/law-reach-group-a.test.ts

**Notes.** Split from laws-stopgap-reach-group-a-missing-record. The named-person half is in the group A voting PR (barredFromVoting). Claim released Oct 23: branch idle since Oct 19.

Looked at Oct 19 (claude/convictions-counted-reach), not built: the justice engine (`src/core2/modules/justice.ts`) has no counted-level cases at all. `convictionsOf` and `sentenceUnfinished` read only full people's `cases` and `sentences` rows, and nothing in justice mentions counted groups, so there are no counted convictions for the electorate to subtract. `felonyDisenfranchisedShare` (`src/core2/law-reach/group-a-voting.ts`) is read in two places in `src/core2/electorate-inputs.ts` (lines 238 and 256). This item therefore needs a counted crime and sentencing model first (what moves a counted adult to a charge, from needs, drives and the town's conditions, with no roll). Split it before building: one item for counted cases by group in justice, then this one to read them. Size L.
