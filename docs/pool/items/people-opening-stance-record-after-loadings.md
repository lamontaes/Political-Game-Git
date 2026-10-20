---
id: people-opening-stance-record-after-loadings
title: "Store each person's opening stance as a record with its reasons, and narrow SG-GOV-views-stand-in, once the loadings shift is on main"
area: people
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-yucp92-ah
pr: #5625
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T09:20:37.420Z
---

**What.** The branch claude/stance-from-loadings (pool item people-opening-stance-from-loadings) adds openingLoadingShift to viewOn in src/core2/modules/views.ts: faith and degree loadings from data/research/people/opening-stance-loadings.json shift a person's opening stance on the eight survey questions, computed at read time. What people-opening-stance-formation still asks for is the stored part: form each person's opening stance once per question as a stance record that keeps its reasons (lean, faith term, degree term), read by viewOn in place of the lean-times-axis opening, so a tally can name the stance record. And SG-GOV-views-stand-in (campaigns.ts) can only be narrowed, not resolved: the survey asked eight questions, so every other question still opens as lean times axis; the row should say which questions are formed from life.

**Rules.** No dice: the stance follows traits and loadings. An effect is a read: the voting, meetings and election-ties engines already read viewOn; name the tally that read the record. Replace, never layer: the read-time shift and the stored record must not both stand. Estimate, never UNKNOWN: a question with no survey item opens as before, marked ESTIMATED.

**Done when.** In a drawn place (buildBenchWorld, seed named) two neighbors of different traits hold different stored opening-stance records on the same surveyed question before any campaign, a vote tally by agreementWith reads them by person and stance record ids, SG-GOV-views-stand-in lists which questions are formed from life, and a test in src/core2/views.test.ts covers it.

**Files.** src/core2/modules/views.ts, src/core2/campaign-views.ts, src/core2/data/stopgaps.json

**Notes.** From claude/political-game-pool-yucp92-ah, which claimed people-opening-stance-formation and found most of it built on claude/stance-from-loadings. Build this on top of that branch once it merges.
