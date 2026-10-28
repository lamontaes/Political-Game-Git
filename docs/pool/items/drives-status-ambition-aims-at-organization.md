---
id: drives-status-ambition-aims-at-organization
title: "M1-11 red on main in Washington, D.C.: a status-ambition drive aims at an organization where the event names a person"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On main at d57af90e89 (Oct 28, 21:10 UTC), the M1-11 check (src/bench/m1-11-check.ts, 'Drives answer the economy') fails with GOLDEN_PATH_SEED=84cc9f787137bda7b952632609d7c03e728899b3693a08d03c8642082e251645 GOLDEN_PATH_PLACE_KEY=1150000 (Washington, District of Columbia): '1 drives aim at someone other than the party the event names (status-ambition:status-ambition:organization_9f3dcd933692fd43 of person_177597894a65492b aims at organization_9f3dcd933692fd43, the event names person_fa43b1c894f8283a)'. drives-layoff-drives-aim-at-decider (done) settled the layoff case; this is a status-ambition drive formed from an event that names a person while the drive targets an organization. Found by the laws session on PR 6676's golden-path-year job and reproduced on clean main.

**Rules.** Ask why: name by record whether the drive's target or the check's reading is wrong before changing either. Never weaken the check to get green. One rule, all 56 places.

**Done when.** With the pinned place and seed above, M1-11 passes, and the PR body names, by drive id and event id, why the status-ambition drive's target is the event's party or why the check now reads an organization target as the event's party; it passes on two fresh drawn places named with their seeds.

**Files.** src/bench/m1-11-check.ts,src/core2/modules/drives.ts

**Notes.** TODO
