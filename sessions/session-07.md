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
- The CTO adds the investigator's root cause here; re-read before M2.
- CTO FINDING (verified 10:20 a.m.): `scheduleNationwideStateLegislatureOpenings` (src/simulation/nationwide-world/state-legislature-opening.ts:178) has NO callers — state legislatures are never opened, so no member can file. Call it from world opening/new-game and the year boundary (one schedule per legislature's recorded session dates), then prove filing.
- CTO FINDING: a member with no reason votes "present" (member-vote decision) and a 0–0 vote counts as passing (legislature-rules.ts ~226, legislation.ts ~1294). A bill must need real yes votes from seated members; no-reason members decide from beliefs/party/traits instead of 'present'.
- CTO FINDING: a law's effects are applied only on the day it is enacted (enacted-law-effects.ts ~285 and ~895); a law with a later effective date never lands. Schedule the effect for its effective date.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
