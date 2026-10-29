---
id: drives-status-ambition-aims-at-organization
title: "M1-11 red on main in Washington, D.C.: a status-ambition drive aims at an organization where the event names a person"
area: people
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T02:24:02.833Z
---

**What.** On main at d57af90e89 (Oct 28, 21:10 UTC), the M1-11 check (src/bench/m1-11-check.ts, 'Drives answer the economy') fails with GOLDEN_PATH_SEED=84cc9f787137bda7b952632609d7c03e728899b3693a08d03c8642082e251645 GOLDEN_PATH_PLACE_KEY=1150000 (Washington, District of Columbia): '1 drives aim at someone other than the party the event names (status-ambition:status-ambition:organization_9f3dcd933692fd43 of person_177597894a65492b aims at organization_9f3dcd933692fd43, the event names person_fa43b1c894f8283a)'. drives-layoff-drives-aim-at-decider (done) settled the layoff case; this is a status-ambition drive formed from an event that names a person while the drive targets an organization. Found by the laws session on PR 6676's golden-path-year job and reproduced on clean main.

**Rules.** Ask why: name by record whether the drive's target or the check's reading is wrong before changing either. Never weaken the check to get green. One rule, all 56 places.

**Done when.** With the pinned place and seed above, M1-11 passes, and the PR body names, by drive id and event id, why the status-ambition drive's target is the event's party or why the check now reads an organization target as the event's party; it passes on two fresh drawn places named with their seeds.

**Files.** src/bench/m1-11-check.ts,src/core2/modules/drives.ts

**Notes.** TODO

Red-main owner, Oct 28: also on main d9ae0ce8bb in Dededo, Guam (territory:GU:dededo, seed 6a86a6dce59e3f55fab7eeabe27d76b9a19ff18368eda204d32f48739a1dffa2): 5 drives aim at someone other than the party the event names, for example status-ambition:status-ambition:organization_c4b06f7b09a75282 of person_99f31857247f4651 aims at organization_c4b06f7b09a75282 while the event names person_7f36f71b2fc89906. With the retraining fade fix (fixer/red-main-m1-11-prove-oneself) the share clause passes there (20.9% of 441) and this clause still fails with 4.

Red-main owner, Oct 29 02:55 UTC (claimed, then set back to open): ruled out by probe on main 6855b274a5 with the pinned D.C. seed (1 misaimed: status-ambition:status-ambition:organization_9f3dcd933692fd43 formed 2025-08-01 from event:work.job-lost:2025-08-01:work-relationship_994dad8c41c3e03d, one formation). (1) Not a fill-in after the drive formed: the decider person_fa43b1c894f8283a is an opening full person (tier weekly, source asOf 2025-01-20), alive, and their household is not in the residents' filledAt. A check change reading the rule as of formation (branch fixer/red-main-ambition-aim, 5a56fc1361, not opened as a PR) leaves the counts unchanged: Dededo 4, D.C. 1; two fresh draws (Berlin Heights, Ohio, seed aim-fresh-1; Valley Grove, West Virginia, seed aim-fresh-2) pass. (2) The engine calls driveIdentity with api.state.people and the event as emitted, and the check passes responsibleId the formation trace's event facts. So the next thing to read is whether the decidedBy fact is on the work.job-lost event when the drives engine answers it, or attached to it afterward (the trace's facts object would then show it at the year's end).
Next lead (red-main owner, Oct 29 03:05 UTC): the decidedBy fact is on the work.job-lost event when it is emitted (src/core2/modules/jobs.ts, the layoff branch: `decidedBy: decidedBy ?? organizationId`), so the engine had it at formation. But the event id is `event:work.job-lost:<date>:<job id>`, and a counted job row can shed more than one worker on one day (the staff-shed branch decides by the owner, else a manager, else the organization). If two layoffs of one counted row share a day, two events share one id with different deciders, and the check's `events` map (keyed by event id) keeps the last one. Verify by counting duplicate event ids among the year's work.job-lost answers; if so, the defect is the non-unique event id in jobs.ts, not the check.
Lead ruled out (red-main owner, Oct 29 03:15 UTC): on the pinned D.C. seed none of the year's 286 answered event ids carries more than one decider, so shared event ids are not the cause. Not understood yet: the event as emitted names a living, opening full decider, the engine is called with api.state.people, and still the drive's identity names the employer. Next to read: what `responsibleId` returns inside `driveIdentity` for event:work.job-lost:2025-08-01:work-relationship_994dad8c41c3e03d (a log at that call), and whether the counted holder person_177597894a65492b forms its drive through a path that passes a different event or people map.
Resolved on main (red-main owner, Oct 29 05:20 UTC): the traits lead's 9545caca7f (a counted layoff decider is held responsible) and 47d4b44f53 (a counted decider is filled in when a grudge names them) reached main after 6855b274a5, the commit my 02:30 probes ran on. On main 1a3b0a8ecd, src/bench/m1-11-check.ts passes both pinned draws: Washington, District of Columbia (1150000, seed 84cc9f787137bda7b952632609d7c03e728899b3693a08d03c8642082e251645) and Dededo, Guam (territory:GU:dededo, seed 6a86a6dce59e3f55fab7eeabe27d76b9a19ff18368eda204d32f48739a1dffa2). CTO: set done (landed outside a `Pool item:` PR). The branch fixer/red-main-ambition-aim is superseded and was never opened.
