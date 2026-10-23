---
id: gov-u1-the-rest
title: "U1, the rest:"
area: gov
kind: feature
priority: 2
status: done
claimed-by: claude/gov-justice-workload
pr: #4567
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OPUS-GOV.md line 200 (unchecked checklist line)"
claimed-at: 2026-10-16T02:29:47.584Z
---

**What.** Two parts of the justice build (U1) remain: a target who turns witness, trading cooperating testimony for a plea from the target's own reads of the case, and the prosecutor's workload as a read on opening and charging cases. Today every bribery case is charged on the evidence alone, with no deal and no capacity limit. Build both in the justice engine from the people's records. The player would notice a caught official naming others for a lighter sentence, and a busy prosecutor declining a small case.

**Rules.** No dice: a target's deal and a prosecutor's charge follow their traits, the evidence, workload and the law in force, never a percentage; An effect is a read, not a record: the prosecutor's workload is read by the charging decision at the moment it is made; Ask why: a plea or a declined case keeps the reasons by record id; The chain is the acceptance: follow one witness from the target's decision to the plea, the new case it opened and the sentence; One model, two tiers: counted prosecutors' workload is read by the same rule as a named prosecutor; One rule, all 56 places: caseload and plea law are place data for all 56 places; Speed: workload is an index updated when cases open and close, not a daily scan.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a case in the year ends with a target turning witness (target, plea and new case ids named) and a charge declined or delayed for workload with the reason; tests in `src/core2/justice-player.test.ts` and a new `src/core2/justice-witness.test.ts`. The owner plays it: catches an official and sees them offer a name for a lighter sentence.

**Files.** src/core2/modules/justice.ts, src/core2/justice-chain.ts, src/core2/justice-law.ts, src/core2/data/justice/parameters.json

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.
