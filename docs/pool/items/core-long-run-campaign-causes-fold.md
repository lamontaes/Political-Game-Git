---
id: core-long-run-campaign-causes-fold
title: "A closed race's campaign causes fold into one summary per voter and candidate (52 percent of a long save's records)"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** One save of Ringgold, Louisiana (speed:year seed long-1) keeps 889 campaign cause rows at the end of year 1 and 721,144 at the end of year 6, 52 percent of every record the world keeps. keepCause in src/core2/modules/campaigns.ts keeps a cause whenever its voter or its candidate is in the player's circle, so every voter a known rival reaches keeps a row per contact, forever. The governing lead, who owns campaigns, agreed the fold (Oct 30, 02:03 UTC): fold a closed race's causes into a per-voter summary that the readers still read, keeping the player's circle and the causes a known fact names; not current-race-only, which would change what players see. Part of core-long-run-tables-grow-with-history.

**Rules.** Speed and the Oct 29 22:45 ruling (a save runs as fast in year 100 as in year 1; old records fold into summaries). Replace, never layer: the summary replaces the rows it folds. Ask why: the player's own causes and those of the people they deal with keep their rows.

**Done when.** When a contest's count is in, its candidates' causes for voters outside the player's circle fold into causeSummaries rows; contestStanding and the door scene's return-visit check read the same numbers before and after (src/core2/campaign-causes-fold.test.ts in a drawn place); a 4-year speed:year run of seed long-1 on main and on the branch differs in dev mode's records proof only in the campaigns causes, causeSummaries and foldedCauses tables, with the cause rows and the year-4 seconds before and after in the PR body.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/director/doors.ts

**Notes.** TODO
