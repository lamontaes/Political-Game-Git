---
id: core-play-flow-household-ids-churn
title: "In the play flow a town keeps making household ids no campaign has knocked: Anson shows 2,520 by June 2026 against about 1,150 households"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: haiku
effort: low
root: none
lead: play-first
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** On the bench's play screen in Anson, Texas with the playtest's seed, a council candidate who knocks 36 doors every week found 36 households their campaign had never knocked every single week from February 2025 to June 2026: 2,520 distinct household ids against about 1,150 households. The same town run by the engine alone opens with 1,147 households and gains about one a week. The Oct 27 attempt built Anson through the bench's own routes for 20 weeks and the doors table ran out at 1,149 households, the same as the engine alone, so the churn did not reproduce. Only the playtest's exact newlife query (a creator-chosen player) is missing.

**Cause.** Measured: does not reproduce. Anson, Texas (4803372, seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213) built through the bench's own routes (`/api/newlife`, `/api/campaign/day` kind canvass, `/api/advance` mode week) for 20 weeks on Oct 27: the doors table ran out at 1,149 distinct households, the same as the engine alone (Notes). The playtest's exact newlife query, with the creator's person parameter, was never recorded, so the one difference left cannot be replayed. A related churn is now found elsewhere: in a large town's wider place, counted-move arrivals add about 13,500 new household records a month (core-memory-arcadia-medical-bills-and-loans-grow, src/core2/modules/counted-moves.ts line 1370). A door walk over a district that includes such a place would find new household ids every week, but a council race in Anson walks only the town, where the Oct 27 run found no churn.

**Fix.** Nothing to build. Proposed for the CTO: close this item as not reproduced, with the note that the playtest's query was not recorded. If doors ever again find new households every week, first check whether the race's district includes a wider place, and if it does, the fix is core-memory-arcadia-medical-bills-and-loans-grow.

**Time box.** 1 hour for one Haiku session, only to close the item once the CTO agrees. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a household filled in or returned to the counts keeps its own id and records. Ask why: name the writer that makes any new ids, by record id. Look before you ask: the playtest's newlife query comes from the playtest record or the owner through the CTO, not a guess.

**Done when.** A second session, not the builder, replays the playtest's exact newlife query (with the person parameter) in Anson, Texas (4803372, seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213) or in a place drawn from all 56, knocks doors for 26 weeks, and reads the town's distinct household ids: they grow by no more than the recorded move-ins and new households, or the writer that made the extra ids is named by record id and this item is rewritten with Found in code. If the query cannot be found, the item is closed with that note.

**Waits on.** The playtest's exact newlife query (the person parameter) from the owner or the playtest record; without it, close.

**Files.** src/bench/player.ts, src/core2/state.ts, src/core2/modules/residents.ts, src/core2/modules/counted-demotion.ts

**Notes.** Found Oct 25 by the speed lead while proving play-stop-25 (branch claude/play-stop-25-door-count). Bench run: /api/newlife seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213, place 4803372, the player filed for council on 2025-02-04 and pressed Knock on doors then a week each week; the doors table gained exactly 36 new household ids every week through 2026-06-10. The engine-only probe of the same seed and place knocked every household by 2025-06-30 (1,136) and gained about 1.4 new households a week after.
Oct 27 (claude/flow-churn): not reproduced through the bench's own routes. I built Anson, Texas (4803372) with /api/newlife (seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213, benchRequest in src/bench/handler.ts), filed the richest eligible adult for a local seat from the records, then pressed Knock on doors (/api/campaign/day kind=canvass) and a week (/api/advance mode=week) for 20 weeks. The doors table gained 49 new household ids a week and then ran out at 1,149 distinct households, the same as the engine alone (headless BenchPlayer with the director gave the identical 1,149). Full households gained 34, 64, 26, ... falling to 6 a week (fill-ins and moves; ids like household_<id>:moved:person_<id>:<date>). So no sustained re-keying showed. The item's 36 a week for 66 weeks needs the creator-chosen player (/api/newlife?person=...), which this run did not use, or a different seed than the bench run's; the creator's person payload is not recorded. Released unbuilt. A reproduction needs the exact newlife query string of the playtest.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): close (cannot reproduce; reopen with the playtest's query).

Cause finder (Nov 11, 2026, for Fable B): read the Oct 27 attempt and the look-first audit, and checked the door walk (src/core2/modules/campaigns.ts `closeDoorWalk`, one row a household per campaign). Nothing new reproduces it; the Arcadia counted-moves finding is the only known writer of new household ids at that pace, and it acts in a wider place, not in a council district. Proposed: close.
