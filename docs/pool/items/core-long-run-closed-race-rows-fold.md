---
id: core-long-run-closed-race-rows-fold
title: "Fold a decided race's door rows and pledges, and campaign word nobody can still hear of"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: speed/fold-doors
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T20:23:55.983Z
---

**What.** Door rows, paid campaign messages, word of rivals and door pledges are kept forever, one row per knock, message, word or voter's yes, and they grow with every election. In a four-year Ringgold, Louisiana run doors reached 49,661 rows, messages 2,129 and rival word 752, nearly a tenth of all records kept. In Chamblee, Georgia's 2026 election year doors grew from 36,676 to 151,524 and pledges from 7,044 to 51,519, part of what runs the nightly out of memory. Nothing in play reads a decided race's doors or pledges, and nothing reads a message or word once it leaves rival word's one-week window, except each candidate's newest word in a race still under way.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): old records fold once play no longer reads them, and a save's year 100 runs as fast as year 1. A fold may differ from main only in its own tables, with each reader's window agreed with the owner: the governing lead agreed doors and pledges go at race close, pledges after foldCauses and keyed by contest, and impressions stay. Replace, never layer: the fold runs inside the campaigns engine's own close step and turn.

**Done when.** A four-year run of the played world (npm run speed:year -- --seed long-1 --years 4, Ringgold, Louisiana) on main and the branch, one process each, keeps dev mode's records proof identical in every table except campaigns doors, pledges, messages, rivalWord and foldedCauses, with row counts in the PR body; src/core2/campaign-doors-fold.test.ts in a drawn place, named with its seed, shows a closed race's doors and pledges gone, an open race's door rows and pledges unchanged, no closed race's pledged visit kept in foldedCauses unless a fact names it, causeSummaries still counting those contacts, and a race the player filed in keeping every pledge.

**Files.** src/core2/modules/campaigns.ts,src/core2/campaign-doors-fold.test.ts,.agents/skills/governing-measurement/SKILL.md

**Notes.** lead: speed. Readers agreed with the governing lead on Nov 1 (door rows, messages and rival word, then pledges after foldCauses); built on speed/fold-doors. A closed race's messages and word stay one window past the close, because filings stay on the ballot after the count and rivalWordPassedOn reads them.

Nov 2, 00:30 UTC (speed lead): the Done when now matches what the owners agreed after it was written. The governing lead lifted the pledge keep reason at 21:22 UTC Nov 1 (foldCauses no longer keeps a cause because a pledge names it, so foldedCauses differs too), and the CTO's amendment to the Oct 30 08:15 ruling keeps every pledge of a contest the player filed in.
