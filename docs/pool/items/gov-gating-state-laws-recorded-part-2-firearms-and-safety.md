---
id: gov-gating-state-laws-recorded-part-2-firearms-and-safety
title: "Gating state laws: firearms and public safety questions"
area: gov
kind: research
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: split from gov-gating-state-laws-recorded in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Record each place's gating state law for firearms and public safety questions in the opening law table, each row cited by statute with its retrieval date, so `policyAuthority` finds the gating law instead of writing a disputed missing grant. The law table is read before introduction and executive orders. Feeds: gov-gating-state-laws-recorded.

**Cause.** Found in code: `src/core2/policy-authority.ts` (line 96) writes a disputed missing grant when a local question's gating state law is not on record (stopgap `SG-GOV-policy-power-unresolved`).

**Fix.** Add a cited gating row per place for these questions in the opening law table, and record the gating law id as the allow or refuse reason on introduction.

**Time box.** 6 hours for one sonnet session.

**Rules.** One rule, all 56 places: gating laws are per place in data. Research before building: each row cites the statute and retrieval date. The chain is the acceptance: a refused or allowed ordinance cites the law record by id. Estimate, never UNKNOWN.

**Done when.** A second session plays a one-year world in a drawn place (named with its seed), introduces a firearms and public safety questions question and sees the gating law's id as the reason it was allowed or refused; `src/core2/policy-authority.test.ts` covers one preempted and one permitted question.

**Waits on.** Network access to the state statute sites.

**Files.** src/core2/policy-authority.ts, src/core2/policy-authority.test.ts, src/core2/data/stopgaps/gov.json
