---
id: play-issues-real-statutes-and-dates
title: "Issues shows real statute citations and real effective dates on the laws in force when the game began"
lead: play-first
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The Issues sheet (src/bench/play.mjs, fed by governmentView in src/bench/government.ts) shows each starting yes-or-no law with its real statute citation (terms.cite) and each starting amount with its real effective date. In Colwich, Kansas (2015100, drawPlace seed realdata-1, scope real-data-check), 21 of its level rows show a citation such as Kan. Stat. Ann. § 16a-2-401 or K.S.A. 72-2220, and 13 show a date before the opening, such as the federal minimum wage effective July 24, 2009 and the food-assistance maximum effective October 1, 2024. The owner ruled on Oct 27 that real data only calibrates and the world is alternate history from Start, so no real statistic, date or name appears as itself in play (OWNER-DECISIONS, the President's address; look-first skill).

**Rules.** Ask why: the citation and the date are research that calibrated the starting law, not something the player's world remembers, so a starting row shows its level and its value only. One rule, all 56 places: every starting row in every place loses both, and a law passed in play keeps its own in-game date.

**Done when.** In a buildBenchWorld drawn place with a seed named in the PR body, no Issues row for a law in force at the opening shows a statute citation or a date before the opening, a test reads every row of the sheet's data and fails on one that does, and a bench screenshot at 1440x900 shows the sheet; a law passed in play still shows the day it took effect.

**Files.** src/bench/government.ts, src/bench/play.mjs

**Notes.** Found Oct 27 by the laws-and-effects lead at the CTO's request to check law rows for real figures. The office-incompatibility rows on Who you are show the law's real citation too (src/bench/legislature.ts, law.citation) and belong to this item. Bill sections quoting the research source of the law they amend are laws-bill-section-cites-research-source (laws-effects); whether the starting amounts themselves may equal the real ones is a question for the CTO in the leads channel.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: keep citations and enactment dates on starting laws; re-scope to real statistics only (OD:12). Do not strip law rows.
