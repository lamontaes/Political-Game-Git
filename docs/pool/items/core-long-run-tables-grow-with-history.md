---
id: core-long-run-tables-grow-with-history
title: "A long save keeps a row per event forever, so year 4 runs four times slower than year 1 (Ringgold, Louisiana, seed long-1)"
area: core
kind: bug
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** One save of the played world (npm run speed:year -- --seed long-1 --years 100, Ringgold, Louisiana, about 1,300 people, main 923bfbf3) runs years 1 to 6 in 42, 60, 135, 168, 162 and 161 s; the heap after a collection grows 530 MB, 654 MB, 1.2 GB, 1.5 GB, 1.8 GB, 2.0 GB, and the records kept 110 thousand to 1.39 million. Rows at the end of years 1 and 6, by table: core2-campaigns-v1.causes 889 to 721,144; core.durableLog 10,438 to 149,782; speech.retellings 1,088 to 95,783; core2-campaigns-v1.doors 2,037 to 54,355; campaigns.money 333 to 20,288; voting.places 154 to 16,923; employer-taxes.shares 3,563 to 20,241; press.adBuys 2,473 to 15,918; candidacy.decisions 917 to 13,839; campaigns.impressions 5,745 to 18,553; core.relationships 8,590 to 20,221; campaigns.gifts 310 to 10,494; budgets.yearToDate 3,347 to 11,800; views.stances 1,428 to 9,865; news.heard 4,916 to 12,549; budgets.spendingPayments 1,396 to 8,430; legislature.votes 1,983 to 8,778. The owner, Oct 29 22:45: year 100 and year 300 of one save must run as fast as year 1; old records fold into summaries, the dead and long-gone leave the daily indexes, memory and save size stay flat. Research (speed lead, Oct 29): Football Manager's 100-season save keeps a flat player count; Crusader Kings 3 stops creating throwaway characters and prunes the untied; RimWorld garbage-collects world pawns by keep reasons; LIAM2 removes the dead from the live set.

**Rules.** Speed and the Oct 29 22:45 ruling (a country's year, for hundreds of years). Replace, never layer: a fold replaces the rows it summarizes. Whatever play reads (a screen, a decision, the director, the journal, the trace) still reads the same answer from the summary. Ask why: the player's own records and the people they deal with keep their reasons.

**Done when.** npm run speed:year -- --seed long-1 --years 20 on main code shows the average of years 17 to 20 at most 1.2 times the average of years 1 to 4, in seconds, heap after a collection and records kept, and the same in a second drawn place; each engine's fold is its own PR naming the table, its readers and the summary they read now, with dev mode's records proof identical for the first year.

**Files.** src/core2/modules/campaigns.ts, src/core2/state.ts, src/core2/modules/speeches.ts, src/core2/modules/budgets.ts, scripts/speed-years/run.ts

**Notes.** TODO
