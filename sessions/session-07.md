# Session 07 — Laws must pass: state legislatures

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Recorded state lawmakers file, debate and pass real bills every session, from their own beliefs and their place's questions, in every state.

## Milestones
1. M1 (45 min): post the baseline from a 30-day watched world (scripts/world-report/run.ts runWorldReport({years:1,days:30,seed,placeKey:observerPlace(seed).key})) on 2 seeds: bills filed / committee / floor / enacted per state legislature (expected today: 0).
2. M2: name the exact step that never fires (file:line) on #2424 and in your PR.
3. M3: fix PR: 30-day watch shows bills filed in most in-session state legislatures.
4. M4: fix PR: at least 5 state bills enacted in 30 days, each changing its policy question in law-in-force.

## Endpoint
A 30-day watch on 3 random seeds shows bills filed in ≥30 in-session legislatures, ≥5 enacted laws, each enacted law answering its policy question in law-in-force and naming its sponsor; the result posted on #2424 with the counts.

## CTO instructions and findings (do these)
- ROOT CAUSES (verified by the CTO in the code and a 110-day run: 84 bills filed, 16 laws signed, all on Feb 15 and Apr 1 only):
- 1. FILING BAR OFF SCALE: members file only when a question scores ≥ 3 (FILING_THRESHOLD, src/simulation/governing/member-agenda-settings.ts:5; checked member-agenda.ts ~594), score = strength × 4 × weight (officeholder-principles.ts ~119; a second bare `strength * 4` at ~347). Since Sept 30 strength is 0–<1 (max in this world 0.578), so one principle can't reach 3: only 955 of 7,386 state legislators can ever file, all on the same 3 questions (groundwater, parks money, highway→transit). Fix: put the bar on the same scale (≈1.5 for 0–1 strength, or rescale strength) at BOTH scoring sites. Done when a forced Jan 31 probe files ≥25 distinct questions across states.
- 2. ONLY THREE BILL DAYS A YEAR: every state shares one calendar with bill days 02-15, 03-15, 04-15 (data/content/legislative-session-calendars.json:12, read by governing/governing-calendar.ts). Fix: per-state session calendars (real opening day and length from the place's record) with filing open from opening day and intake on a regular cadence (e.g. weekly) while in session. Done when a 30-day watch from Jan 5 shows ≥100 state bills in ≥30 legislatures.
- 3. YEAR-LONG LOCKOUT: once a bill on a question dies, that question is locked for that state for 365 days (automatic-legislation.ts ~492/~499, called member-agenda.ts ~713) and blocked while any bill on it moves (member-agenda.ts ~535) — Mar 15 and Apr 15 filed 0. Fix: lock only the same sponsor+question (or the same session). Done when a later bill day files in ≥20 states.
- 4. Constitutional amendments: 39 of 50 states proposed the identical amendment on Feb 1 from the same narrow views — fixes 1 and 3 should diversify it; check after.
- NOT the cause (corrects an earlier note): scheduleNationwideStateLegislatureOpenings has no callers, but filing runs through the governing calendar; leave it or delete it as dead code. The 'state-legislature intake' wake is the CANDIDATE calendar — rename it so nobody confuses it with bill intake.
- Also: a law's effects apply only on its enactment day and the 'effective' dispatch passes an empty subject list (enacted-law-effects.ts ~285, ~289, ~895) — laws with later start dates never land on anyone (Session 12 fixes the subjects; you make sure enacted laws reach law-in-force on their effective date). Proof run at the end: a 365-day watch with ≥1 law passed in ≥40 states, each with a lawInForce change.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
