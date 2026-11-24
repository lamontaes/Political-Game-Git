---
id: core-long-run-tables-grow-with-history-part-1-campaign-tables
title: "Fold the campaign tables that grow with every race"
area: core
kind: bug
priority: 1
size: M
status: dropped
claimed-by:
pr:
after:
blocked-on:
lead: speed
source: split from core-long-run-tables-grow-with-history in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: high
root: rc5-full-detail-every-day
checked: fable 2026-11-10
---

**What.** In Ringgold, Louisiana's 100-year save the campaign tables grow fastest: causes 889 to 721,144 rows, doors 2,037 to 54,355, money 333 to 20,288 and gifts 310 to 10,494 between years 1 and 6. Play reads the campaign's own rows only while the race is open or for the player's own race. Fold each table into a summary once its readers' window has passed, with the player's contests kept whole.

**Cause.** Measured: `npm run speed:year -- --seed long-1 --years 100` (Ringgold, Louisiana) table counts at the end of years 1 and 6; the tables are in src/core2/modules/campaigns.ts.

**Fix.** For causes, money and impressions, fold each closed race's rows into the campaign row's summary after the race closes, keeping every row of any contest the player filed in. The doors drop is already done and the gifts, endorsements, polls and stepped-up rows are in core-long-run-race-close-campaign-rows, so build on them. Name each table's readers and what they read now.

**Time box.** 6 hours for an Opus session.

**Rules.** Speed and the Oct 29 22:45 ruling (a country's year, for hundreds of years). Replace, never layer: a fold replaces the rows it summarizes. Whatever play reads (a screen, a decision, the director, the journal, the trace) still reads the same answer from the summary. Ask why: the player's own records and the people they deal with keep their reasons.

**Done when.** A second session runs `npm run speed:year -- --seed long-1 --years 6` in Ringgold, Louisiana (a drawn place) and sees the campaign causes and money tables flat across years instead of growing to 721,144 and 20,288 rows, the player's own race whole, and dev mode's records proof identical outside the folded tables for the first year.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, scripts/speed-years/run.ts

**Notes (Fable's check, Nov 10).** Proposed drop (Fable's check): this part asks for work that exists or is owned elsewhere. Campaign causes already fold at a race's close (`foldClosedRaceCauses`, src/core2/modules/campaigns.ts line 5486, and `foldOldCauses`, line 5527; item core-long-run-campaign-causes-fold is done). Money rows are core-long-run-campaign-money-rows, in a pull request. Gifts, endorsements, polls and stepped-up rows are core-long-run-race-close-campaign-rows. Impressions are one row per voter and person carried across races, so they never fold at a race's close (skill speed-work). Do not build this item; whatever still grows is named by core-long-run-tables-grow-with-history-part-4-whole-save-check.

**Notes (CTO, Nov 10).** Dropped on Fable's full check (`docs/pool/redo-2026-11-10/checked.md`): Mostly built already: the campaign causes fold is on main (foldClosedRaceCauses, campaigns.ts 5486; item core-long-run-campaign-causes-fold is done), the money rows are in a pull request (core-long-run-campaign-money-rows), the rest is core-long-run-race-close-campaign-rows, and impressions must not.
