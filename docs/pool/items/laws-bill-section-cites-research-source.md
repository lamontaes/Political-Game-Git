---
id: laws-bill-section-cites-research-source
title: "A bill section amending a law in force when the game began quotes the research source of that law as its statute"
lead: laws-effects
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/bill-section-no-research-source
pr: #6457
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T23:53:33.952Z
---

**What.** billSections in src/core2/modules/legislature.ts sets a section's before.statute to the law row's source, and the English engine writes it into the section as the statute amended (BILL_SECTIONS.cited in src/english/bill-sections.ts). For a law passed in play the source is the game's own vote record, but for a law in force at the opening it is the research that calibrated the row: a real code section such as K.S.A. 72-2220, or a survey title. The owner ruled on Oct 27 that real data only calibrates and no real statistic, date or name appears as itself in play (OWNER-DECISIONS, the President's address; look-first skill).

**Rules.** Ask why: a section names the law it amends by the record the player's world keeps, so a law passed in play cites its own measure and a starting law cites the statute its research recorded (terms.cite) or nothing, never a web page, survey or note. One rule, all 56 places: the same rule for every series and level, with nothing named by place.

**Done when.** In a buildBenchWorld drawn place with a seed named in the PR body, a bill drafted on a law in force at the opening cites the statute its row records (terms.cite) or nothing, and its composed text names no research source (a web page, a survey or a note), a bill on a law passed in play still cites that law's measure, and a test fails with the change removed.

**Files.** src/core2/modules/legislature.ts, src/core2/bill-sections.test.ts

**Notes.** Found Oct 27 by the laws-and-effects lead at the CTO's request to check law rows for real figures; the Issues sheet's citations and dates are play-issues-real-statutes-and-dates.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: keep real statute codes for starting law; remove only research-source/survey titles; a law passed in play cites its own record.

Corrected Oct 28 01:30 by the laws-and-effects lead to the audit's narrowing (OWNER-DECISIONS: laws in force stay the real starting law): Rules and Done when now keep a starting law's recorded statute.
