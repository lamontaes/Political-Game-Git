# Session 28 — Failing tests on main

Read RULES.md (same branch) first. The CTO updates this file during the day — re-read every 10 minutes and after every PR.

## Goal
Main has no red tests that aren't on the known-reds list, and the known-reds list shrinks.

## Milestones
1. One file per PR, fix the cause, never weaken an assertion.
2. List: job-market 'hires through someone the player knows', legislation-integrity (5), public-program x2, player-wording (68 drifts), ownership (3), opening-life 'prepares Congress principles in Begin', reach-out-cadence, privacy-goal-answers, first-month-friend, local-mayor (640 s vs 120 s).
3. Remove the 'Councillor' exception #3055 added to tests/american-english.test.ts; seat word from the place's record, fallback 'council member'.

## Endpoint
Every file on the list passes on main (or is posted with a cause another session owns), and the Councillor exception is gone.

When the endpoint is reached: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
