---
id: roadmap-m1-11-flip
title: "Roadmap M1-11 reads passes: true, with its played-year run and a bench screenshot"
area: people
kind: feature
priority: 2
size: S
status: done
claimed-by:
pr: #5972
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** M1-11 reads 'Over a year, job losses, evictions and closures form drives at a researched rate, and a drive's target is a real person or institution involved in the event.' Its command now runs drives-economy.test.ts and the played-year check (src/bench/m1-11-check.ts, merged with #5959). On main 24b7349573 the runner draws Steamboat Springs, Colorado, where all three kinds of event happened in the year and the check passes.

**Rules.** Wire to the world: the flag flips only on its command passing in the runner's drawn place and the spec played in the bench. Never edit a spec's test text; only passes changes.

**Done when.** docs/roadmap/features.json reads passes: true for M1-11; the PR body names the command's place, full seed and output (events of each kind, responses, the displaced-worker shares, aimed drives) and a committed bench screenshot of a drive formed from a played job loss, aimed at the employer, by record id.

**Files.** docs/roadmap/features.json, docs/reports/m0-m2-lead-2026-10-24/

**Notes.** TODO

Sent back 2026-10-24 from PR #5972 (branch claude/quirky-ride-vrwwz4-m1-11-flag): m1-11-check.ts reconstructs event occurrence from drive answers and marks a missing kind not exercised, so an occurring eviction or closure whose response path disappears can pass; count producer events independently and add a missing-response break-it regression while another kind still answers, then finish on that branch, merge main into it first. The small-sample bound and verified screenshot are not this objection.

Fixer pushed the occurrence fix to PR 5972 Oct 25, 2026 and handed it back: the check now reads events from the producers and fails 11 counted job losses no drive answered in the acceptance place; blocked on drives-counted-job-loss-unanswered.

Sent back 2026-10-25 from PR #5972 (branch claude/quirky-ride-vrwwz4-m1-11-flag): the body and Done-when table omit carried engine fixes, and jobs-layoff-worked-today.test.ts asserts only M0-03 completion rather than today’s job staying open and the next review laying the worker off, with no drawn-place companion; finish on that branch, merge main into it first. The previous producer-occurrence objection is fixed and all five changed tests pass locally.
