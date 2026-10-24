---
id: roadmap-m1-11-flip
title: "Roadmap M1-11 reads passes: true, with its played-year run and a bench screenshot"
area: people
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** M1-11 reads 'Over a year, job losses, evictions and closures form drives at a researched rate, and a drive's target is a real person or institution involved in the event.' Its command now runs drives-economy.test.ts and the played-year check (src/bench/m1-11-check.ts, merged with #5959). On main 24b7349573 the runner draws Steamboat Springs, Colorado, where all three kinds of event happened in the year and the check passes.

**Rules.** Wire to the world: the flag flips only on its command passing in the runner's drawn place and the spec played in the bench. Never edit a spec's test text; only passes changes.

**Done when.** docs/roadmap/features.json reads passes: true for M1-11; the PR body names the command's place, full seed and output (events of each kind, responses, the displaced-worker shares, aimed drives) and a committed bench screenshot of a drive formed from a played job loss, aimed at the employer, by record id.

**Files.** docs/roadmap/features.json, docs/reports/m0-m2-lead-2026-10-24/

**Notes.** TODO
