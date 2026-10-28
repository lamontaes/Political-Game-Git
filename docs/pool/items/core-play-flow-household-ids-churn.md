---
id: core-play-flow-household-ids-churn
title: "In the play flow a town keeps making household ids no campaign has knocked: Anson shows 2,520 by June 2026 against about 1,150 households"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On the bench's play screen in Anson, Texas with the playtest's seed, a council candidate who knocks 36 doors every week finds 36 households their campaign has never knocked every single week from February 2025 to June 2026: 2,520 distinct household ids, on main and on the fix branch alike. The same town run by the engine alone (buildBenchWorld, then advanceCore a week at a time) opens with 1,147 households and has about 1,240 by October 2026, about one new household a week. So the play flow (player-v1 with the director, scenes and fill-ins) creates or re-keys households at a rate of dozens a week. Every reader keyed by household id (a campaign's doors, rent, property tax, arrears) then sees the same families as new ones.

**Rules.** One model, two tiers: a household filled in or returned to the counts keeps its own id and records. Ask why: name the writer that makes the new ids, by record id.

**Done when.** A test plays the bench's play flow in a place drawn from all 56 (place and seed named) for 26 weeks and shows the town's distinct household ids grow by no more than its recorded move-ins and new households, with the writer that made the extra ids named in the PR; the fix keeps the ids stable.

**Files.** src/bench/player.ts, src/core2/state.ts, src/core2/modules/residents.ts, src/core2/modules/counted-demotion.ts

**Notes.** Found Oct 25 by the speed lead while proving play-stop-25 (branch claude/play-stop-25-door-count). Bench run: /api/newlife seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213, place 4803372, the player filed for council on 2025-02-04 and pressed Knock on doors then a week each week; the doors table gained exactly 36 new household ids every week through 2026-06-10. The engine-only probe of the same seed and place knocked every household by 2025-06-30 (1,136) and gained about 1.4 new households a week after.
Oct 27 (claude/flow-churn): not reproduced through the bench's own routes. I built Anson, Texas (4803372) with /api/newlife (seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213, benchRequest in src/bench/handler.ts), filed the richest eligible adult for a local seat from the records, then pressed Knock on doors (/api/campaign/day kind=canvass) and a week (/api/advance mode=week) for 20 weeks. The doors table gained 49 new household ids a week and then ran out at 1,149 distinct households, the same as the engine alone (headless BenchPlayer with the director gave the identical 1,149). Full households gained 34, 64, 26, ... falling to 6 a week (fill-ins and moves; ids like household_<id>:moved:person_<id>:<date>). So no sustained re-keying showed. The item's 36 a week for 66 weeks needs the creator-chosen player (/api/newlife?person=...), which this run did not use, or a different seed than the bench run's; the creator's person payload is not recorded. Released unbuilt. A reproduction needs the exact newlife query string of the playtest.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): close (cannot reproduce; reopen with the playtest's query).
