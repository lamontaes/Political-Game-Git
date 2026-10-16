---
id: gov-needs-opus-gov-209
title: "Needs from other sessions listed in OPUS-GOV.md (line 209): 6 lines"
area: gov
kind: wiring
priority: 2
status: in-pr
claimed-by: claude/gov-needs-opus-gov-209
pr: #4530
blocked-on:
milestone:
source: 'docs/coordination/OPUS-GOV.md "Needs from other sessions" (line 209)'
claimed-at: 2026-10-15T23:38:28.429Z
---

**What.** Six justice and corruption wiring requests remain: background bodies proposing bills with money at stake so bribes have a cause, skipping people in custody when the jobs engine decides who looks for work (SG-GOV-justice-prison-hiring), a core call to take a person's own choices away in custody (SG-GOV-justice-custody-core-call), the health engine reading `inCustody`, mined words for `hearing`, `verdict` and `justice.*`, and the polling visit and voter eligibility reading custody (a player in prison was taken to the polls, seed a454f3569122862e, place in the source line). The player would notice a prisoner not being offered a job or a ballot where the state's law forbids it. Each line should be checked against main before any code is written.

**Rules.** One rule, all 56 places: whether a prisoner may vote is each state's felony-disenfranchisement law in data, with no state named in code; An effect is a read, not a record: jobs, health, the polling visit and voter eligibility each read `inCustody` at the moment they decide; No dice: custody and the law decide, never a roll; Ask why: a blocked ballot or job application keeps the custody record that blocked it; Replace, never layer: the direct write in `justice-custody.ts` is replaced by the core call, not kept beside it; Placeholders: SG-GOV-justice-prison-hiring and SG-GOV-justice-custody-core-call close only when the reads exist.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body) plus a replay of the recorded repro seed a454f3569122862e: a person in custody is not offered a job, is not taken to the polls where the state's law bars it, and health reads the custody record; name the person and custody record ids. Tests beside `src/core2/justice-player.test.ts` and `src/director/polling-place.test.ts`. The owner plays it: serves a sentence and finds no ballot or job offer waiting.

**Files.** src/core2/modules/justice.ts, src/core2/justice-custody.ts, src/core2/modules/jobs.ts, src/core2/modules/health.ts, src/director/polling-place.ts, src/core2/data/stopgaps.json

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
