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
source: added with npm run pool -- add
claimed-at:
---

**What.** `viewOn` is still lean times an axis plus what the person has heard. Form an opening stance per policy question from the person's own traits, faith, education and state's survey spread, then replace the remaining `platformAgreement(lean, ...)` calls (electorate.ts, meetings.ts, office-day-federal-president.ts, election-ties.ts) with `agreementWith`. Resolves SG-GOV-views-stand-in.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place two neighbors of different traits hold different recorded stances on the same question before any campaign, and a vote tally reads them, by person and stance ids. SG-GOV-views-stand-in is resolved.

**Files.** src/core2/modules/views.ts, src/core2/campaign-views.ts, src/core2/electorate.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Oct 20 (claude, claude/views-opening-stance), released unbuilt. Findings: only one `platformAgreement(lean, …)` call remains outside tests (`countedAppeal` in `electorate.ts`, line 333: the counted voter's recognition term); `meetings.ts`, `office-day-federal-president.ts` and `election-ties.ts` already call `agreementWith`. The stand-in is `personStance(lean, question)` = lean × the question's measured axis (`campaign-views.ts`), so two neighbors differ today only through their one-dimensional lean. A per-question opening stance needs per-question dependence on education, faith and traits that no file in the repository holds: `src/core2/data/views/ces-2024-views.json` is the CES 2024 ideology (ideo5) distribution by age, education, faith and urbanicity, not issue items. The source is reachable from a cloud session (Harvard Dataverse doi:10.7910/DVN/X11EP6, file 12050325, `CCES24_Common_OUTPUT_vv_topost_final.csv`, 184 MB, CC0), but mapping the catalog's policy questions to CES issue items (abortion, guns, immigration, health care, taxes, climate and the rest of the common content) needs the questionnaire (`CCES24_Common_pre.docx` and `_post.docx`) and a research pass: write `data/research/views/derive-ces-2024-issue-stances.py` that, per mapped question, gives the weighted support share by ideo5, education, faith and state, then read that in `viewOn` in place of `personStance`; questions with no CES item keep lean × axis and are marked ESTIMATED. Not started; M becomes L.

Follow-up the same day: the CES microdata is reachable (Harvard Dataverse doi:10.7910/DVN/X11EP6, file id 12050325, a 184 MB csv, plus the pre and post questionnaires as docx), so tabulating policy items by cell is possible. But the game's 54 questions (`data/research/campaigns/issue-axes-2026.json`: groundwater limits, bottle deposits, farmland protection, universal preschool and so on) are mostly state-law questions the CES does not ask; only a handful (abortion, guns, immigration, health care, minimum wage, marijuana and a few more) have a CES item. So a sourced per-question spread covers a small part of the list. The rest would keep lean times the axis, or need a stated rule for questions with no survey item. That coverage rule is a design call for the CTO before any research is done.
