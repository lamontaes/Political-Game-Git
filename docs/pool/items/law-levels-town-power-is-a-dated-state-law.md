---
id: law-levels-town-power-is-a-dated-state-law
title: "Law levels: a state's bar on towns is a dated state law a bill can enact or repeal (one list, every policy question)"
area: laws
kind: feature
priority: 2
size: L
status: claimed
claimed-by: law-levels-bar-catalog
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-06T16:44:59.846Z
---

**What.** Done-when 2 of the law-levels job: policyAuthority and resolveLawInForce read the research's static preempts flag (POLICY_QUESTIONS[q].answers[state].preempts), so no state bill can grant or take away a town's power on a policy question; only minimum wage, local income tax and home rule are dated state laws today (local-minimum-wage-authority, local-income-tax-authority, broaden-local-authority).

**Rules.** One engine, the level is a parameter, the list is data; no dice; sourced flags only; replace the static read in the same change.

**Done when.** A generic state-level authority series per policy question is loaded at the start from the corrected research flags; the bill catalog lets a state bill enact or repeal it; policyAuthority and resolveLawInForce read the row in force on the date, not the file; a drawn-place test shows a state bar ending a town's law on its date and a repeal bringing it back; the static reads are deleted.

**Files.** src/core2/policy-authority.ts,src/core2/laws-in-force.ts,src/core2/modules/laws.ts,src/core2/data/legislature/bill-catalog.json,scripts/research/build-bill-catalog.py

**Notes.** State Sessions Nov 6. Merged so far toward the job: gun flags (#7308), OR and WA rent (#7309), local income tax ends with the state grant (#7310), a town's policy row set aside where the static flag bars it (#7311), wage-floor test (#7312). Design: reuse the income-tax pattern (a state row at 1 grants, at 0 withdraws, read for the date) for every policy question, seeded from the same preempts flags; then statePreempts in laws.ts reads the row instead of POLICY_QUESTIONS.
