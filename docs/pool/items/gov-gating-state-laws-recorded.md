---
id: gov-gating-state-laws-recorded
title: "Each place's gating state laws are recorded so local questions can be introduced where state law allows them"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/policy-authority.ts refuses a local question whose gating state law is not on record and records a disputed missing grant. All 59 policy questions are mapped; what remains is the gating state laws themselves (preemption of local minimum wage, rent control, firearms and similar). Record each place's gating law for each local question in the opening law table with a citation, read before introduction and executive orders, so the player's proposed ordinance is allowed or refused by the real law. Closes SG-GOV-policy-power-unresolved.

**Rules.** One rule, all 56 places: gating laws are per place in data, never named in logic. Research before building: each row cites the statute. The chain is the acceptance: a refused or allowed ordinance cites the law record by id.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed named), introducing a local question records the gating law's id as the reason it was allowed or refused, a test in src/core2/policy-authority.test.ts covers a preempted and a permitted question, and no question returns a disputed missing grant in the drawn place.

**Files.** src/core2/policy-authority.ts, src/core2/policy-authority.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): the row SG-GOV-policy-power-unresolved stays open while its pool item is done.
