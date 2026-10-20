---
id: people-opening-stance-formation
title: "Form each person's opening stance per policy question from their traits, faith and education, replacing the lean stand-in in viewOn"
area: people
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/opening-stance
pr:
blocked-on:
after: research-opening-stance-loadings
source: added with npm run pool -- add
claimed-at: 2026-10-20T14:27:22.684Z
---

**What.** viewOn computes a stance as the person's lean on the question's axis plus what they heard. Replace the lean part with an opening stance formed once per person and question from their traits, faith and education using the sourced loadings, stored as a stance record with its reasons, so two neighbors with different traits hold different stances on the same question before any campaign. This resolves SG-GOV-views-stand-in for full people.

**Rules.** No dice: the stance follows traits and loadings. An effect is a read: the voting, meetings and election-ties engines already read viewOn; the proof names the tally that read it. Replace, never layer: the lean-times-axis opening is deleted.

**Done when.** In a drawn place (buildBenchWorld, seed named) two neighbors of different traits hold different stored stances on the same question before any campaign, and a vote tally by agreementWith reads them, by person and stance record ids; SG-GOV-views-stand-in is resolved in stopgaps.json for full people; a test in src/core2/views.test.ts covers it.

**Files.** src/core2/modules/views.ts, src/core2/campaign-views.ts, src/core2/data/stopgaps.json

**Notes.** TODO
