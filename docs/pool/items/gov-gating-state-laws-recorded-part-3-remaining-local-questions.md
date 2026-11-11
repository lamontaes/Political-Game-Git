---
id: gov-gating-state-laws-recorded-part-3-remaining-local-questions
title: "Gating state laws: the remaining local questions"
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

**What.** Record each place's gating state law for every remaining local question in the opening law table, each row cited by statute with its retrieval date, so `policyAuthority` finds the gating law instead of writing a disputed missing grant. The law table is read before introduction and executive orders. Feeds: gov-gating-state-laws-recorded.

**Cause.** Found in code: `src/core2/policy-authority.ts` (line 96) writes a disputed missing grant when a local question's gating state law is not on record (stopgap `SG-GOV-policy-power-unresolved`).

**Fix.** Add a cited gating row per place for these questions in the opening law table, and record the gating law id as the allow or refuse reason on introduction.

**Time box.** 6 hours for one sonnet session.

**Rules.** One rule, all 56 places: gating laws are per place in data. Research before building: each row cites the statute and retrieval date. The chain is the acceptance: a refused or allowed ordinance cites the law record by id. Estimate, never UNKNOWN.

**Done when.** A second session plays a one-year world in a drawn place (named with its seed), introduces a every remaining local question question and sees the gating law's id as the reason it was allowed or refused; `src/core2/policy-authority.test.ts` covers one preempted and one permitted question. No question returns a disputed missing grant in the drawn place and `SG-GOV-policy-power-unresolved` is resolved in `src/core2/data/stopgaps/gov.json`.

**Waits on.** Network access to the state statute sites. Also parts 1 and 2.

**Files.** src/core2/policy-authority.ts, src/core2/policy-authority.test.ts, src/core2/data/stopgaps/gov.json
