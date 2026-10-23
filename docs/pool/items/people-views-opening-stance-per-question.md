---
id: people-views-opening-stance-per-question
title: "Views form an opening stance per question; campaigning reads it instead of the lean stand-in"
area: people
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
after: research-opening-stance-loadings,people-opening-stance-formation,elections-counted-voters-read-group-stances
source: added with npm run pool -- add
claimed-at:
---

**What.** This is the roll-up for per-question opening stances. viewOn in src/core2/modules/views.ts still reads a person's lean times the question's axis (personStance in src/core2/campaign-views.ts) plus what they have heard, and the one remaining platformAgreement caller outside tests is countedAppeal in electorate.ts. It is built by three items in order: the sourced loadings of traits, faith and education on each question (research-opening-stance-loadings), the stance formed once per person and question from them (people-opening-stance-formation), and the counted voter groups reading the same rule times their count (elections-counted-voters-read-group-stances). This item closes when stand-in SG-GOV-views-stand-in is resolved and no platformAgreement call is left in src/core2.

**Rules.** No dice: a stance follows traits, faith, education and the loadings, never a roll. One model, two tiers: a counted voter group takes the same formation rule as a full person, times its count. An effect is a read: the voting, meetings and election-ties engines read the stored stance, and the proof names the tally that read it. Replace, never layer: the lean-times-axis opening is deleted when the formed stance lands. Estimate, never UNKNOWN: a question the survey has no item for keeps the lean axis alone, marked ESTIMATED with its spread.

**Done when.** After the three children are done, a one-year run of the played world (buildBenchWorld, a drawn place from all 56, a seed the builder did not choose) shows two neighbors of different traits holding different stored stances on the same question before any campaign, and a vote tally reads them by person and stance record ids. The test in src/core2/views.test.ts also shows platformAgreement has no caller left in src/core2, and SG-GOV-views-stand-in is marked resolved in stopgaps.json.

**Files.** src/core2/modules/views.ts, src/core2/campaign-views.ts, src/core2/electorate.ts, src/core2/data/stopgaps.json

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Oct 20 (claude, claude/views-opening-stance), released unbuilt. Findings: only one `platformAgreement(lean, …)` call remains outside tests (`countedAppeal` in `electorate.ts`, line 333: the counted voter's recognition term); `meetings.ts`, `office-day-federal-president.ts` and `election-ties.ts` already call `agreementWith`. The stand-in is `personStance(lean, question)` = lean × the question's measured axis (`campaign-views.ts`), so two neighbors differ today only through their one-dimensional lean. A per-question opening stance needs per-question dependence on education, faith and traits that no file in the repository holds: `src/core2/data/views/ces-2024-views.json` is the CES 2024 ideology (ideo5) distribution by age, education, faith and urbanicity, not issue items. The source is reachable from a cloud session (Harvard Dataverse doi:10.7910/DVN/X11EP6, file 12050325, `CCES24_Common_OUTPUT_vv_topost_final.csv`, 184 MB, CC0), but mapping the catalog's policy questions to CES issue items (abortion, guns, immigration, health care, taxes, climate and the rest of the common content) needs the questionnaire (`CCES24_Common_pre.docx` and `_post.docx`) and a research pass: write `data/research/views/derive-ces-2024-issue-stances.py` that, per mapped question, gives the weighted support share by ideo5, education, faith and state, then read that in `viewOn` in place of `personStance`; questions with no CES item keep lean × axis and are marked ESTIMATED. Not started; M becomes L.

Follow-up the same day: the CES microdata is reachable (Harvard Dataverse doi:10.7910/DVN/X11EP6, file id 12050325, a 184 MB csv, plus the pre and post questionnaires as docx), so tabulating policy items by cell is possible. But the game's 54 questions (`data/research/campaigns/issue-axes-2026.json`: groundwater limits, bottle deposits, farmland protection, universal preschool and so on) are mostly state-law questions the CES does not ask; only a handful (abortion, guns, immigration, health care, minimum wage, marijuana and a few more) have a CES item. So a sourced per-question spread covers a small part of the list. The rest would keep lean times the axis, or need a stated rule for questions with no survey item. That coverage rule is a design call for the CTO before any research is done.

Oct 20 (pool feeder): spec written as a roll-up; the three children already exist. CTO call made: only a handful of the 54 questions have a CES item, so the recommended coverage rule is that a question with no survey item keeps lean times axis, marked ESTIMATED with a spread (the research item already says so); no owner question is needed.

Split Oct 20 (claude, claude/political-game-pool-yucp92-ii): this L item is now three, in order: research-opening-stance-loadings (survey loadings of traits, faith and education on each question), people-opening-stance-formation (the formation rule in views.ts, after the loadings) and elections-counted-voters-read-group-stances (countedAppeal reads group stances, after the formation). The call-site replacement the item lists is done except that last one: meetings.ts, office-day-federal-president.ts and election-ties.ts already call agreementWith, and countedAppeal in electorate.ts is the only caller of platformAgreement left. This item is done when those three are.
