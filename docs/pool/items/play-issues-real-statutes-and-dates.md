---
id: play-issues-real-statutes-and-dates
title: "Issues shows real statute citations and real effective dates on the laws in force when the game began"
lead: play-first
area: play
kind: bug
priority: 2
size: S
status: dropped
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

Nov 10, Fable audit: still shows, and the two readings above are still not reconciled. The audit (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Not fixed (measured)") found on Nov 9 that a law's page still prints "STATUTE 19 U.S.C. 1862; 19 U.S.C. 2411(c)(1)". The audit's line names no place or seed; its browser life was in Blodgett Landing, New Hampshire, a random world. In the Nov 8 playtest (docs/coordination/playtest/2026-11-08-1.md, point C19, a point the CTO caught in the owner's screenshots, not the owner's own words) the page read "Adopt income tax / Federal law Yes / statute 26 U.S.C. 1(a)-(d), (j)" and was noted as "unreadable for a player". Read on main, Nov 10: `lawPage` inside `issues()` in `src/bench/play.mjs` builds the rows at lines 5068 to 5070 (`row(labels.statute, l.row.terms.cite)`) and puts them in the In force section at line 5113; the label is `politics.statute` in `src/bench/data/controls.json`. How the two readings can meet, for whoever claims this through the CTO: the Oct 27 look-first audit keeps citations on starting laws, and the owner's ruling on bills says "Citations open the game's own display of that law, never a web page" (OWNER-DECISIONS, bills on paper), so a citation printed as a bare capital-letter row with nothing to click is the defect the audit and C19 saw, whether or not the citation itself stays. The approved law page (docs/mocks/2026-11-08-play, `pl-issues_p.subj_housing_p.issue_multifamily`) is the layout to check against, by screenshot in a drawn place. Related: play-issues-law-page-and-what-shows (open), play-issues-shows-twelve-subjects-each-with-a-1 (filed Nov 10).

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: merge into play-issues-law-page-and-what-shows. It is the same page and the same fix (the statute row of `lawPage` in src/bench/play.mjs, lines 5068 to 5070). Keep the law-page item; it should take this item's reconciliation: the Oct 27 look-first audit keeps citations and enactment dates on starting laws and strips only real statistics, while the Nov 10 note says a bare citation with nothing to click is the defect, and the owner's bill ruling says citations open the game's own display of that law. The pool redo has already folded that into part 4 of the kept item.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): merged into `play-issues-law-page-and-what-shows`, which carries this item's remaining work.
