---
id: gov-gating-state-laws-recorded
title: "Each place's gating state laws are recorded so local questions can be introduced where state law allows them"
area: gov
kind: stopgap
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on: gov-gating-state-laws-recorded-part-1-wage-and-rent-preemption, gov-gating-state-laws-recorded-part-2-firearms-and-safety, gov-gating-state-laws-recorded-part-3-remaining-local-questions
source: added with npm run pool -- add
after:
lead: governing
standard: 2
model: sonnet
effort: low
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** A local question whose gating state law is not on record is refused with a disputed missing grant. All 59 policy questions are mapped; what remains is the gating state laws themselves (preemption of local minimum wage, rent control, firearms and similar). Record each place's gating law for each local question in the opening law table with a citation, read before introduction and executive orders, so the player's proposed ordinance is allowed or refused by the real law. Closes the stopgap `SG-GOV-policy-power-unresolved`. The work is three parts. Seen: the introduce screen, where the player's proposed ordinance is allowed or refused by the state law that gates it, not by a missing record.

**Cause.** Found in code: `src/core2/policy-authority.ts` (line 96) refuses a local question whose gating state law is not on record and writes a disputed missing grant under stopgap `SG-GOV-policy-power-unresolved` (row in `src/core2/data/stopgaps/gov.json`).

**Fix.** Do the three parts, each recording gating law rows with citations in the opening law table and having introduction record the gating law's id as the reason a question was allowed or refused.

**Time box.** 2 hours for one Sonnet session, the closing check after the three parts. When it runs out, write what was seen in the item and stop.

**Rules.** One rule, all 56 places: gating laws are per place in data, never named in logic. Research before building: each row cites the statute. The chain is the acceptance: a refused or allowed ordinance cites the law record by id.

**Done when.** A second session plays a one-year world (`buildBenchWorld`, a drawn place and seed named), introduces a local question and sees the gating law's id recorded as the reason it was allowed or refused; no question returns a disputed missing grant in the drawn place, and `src/core2/policy-authority.test.ts` covers a preempted and a permitted question.

**Waits on.** The three parts: gov-gating-state-laws-recorded-part-1-wage-and-rent-preemption, gov-gating-state-laws-recorded-part-2-firearms-and-safety, gov-gating-state-laws-recorded-part-3-remaining-local-questions.

**Files.** src/core2/policy-authority.ts, src/core2/policy-authority.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** Oct 20 (pool feeder): the row SG-GOV-policy-power-unresolved stays open while its pool item is done.

Deferred Oct 25: nothing on screen reads it yet.
