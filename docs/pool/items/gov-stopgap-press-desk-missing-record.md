---
id: gov-stopgap-press-desk-missing-record
title: "Stopgaps in press-desk (missing-record): 1 open"
area: gov
kind: stopgap
priority: 2
status: claimed
claimed-by: claude/gov-stopgap-press-desk-missing-record
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/press-desk.ts, kind missing-record"
claimed-at: 2026-10-15T23:41:50.349Z
---

**What.** Readers of a printed story learn which outlet printed what (the perceived fact `printed:<outlet>:story`), and bring-it-up's matcher reads it, but bring-it-up's data has no `news.read` change row for a printed story, so nobody says it aloud (SG-PEOPLE-press-bring-it-up-row, `press-desk.ts` line 339). Add the change row `{eventKind news.read, institutionFact printed:/:story}` to `src/director/data/bring-it-up-rows.json` with mined lines naming the outlet, the topic and whether it ended something. The player would notice a neighbor saying 'I read in the Courier that the mill is closing' after the paper printed it.

**Rules.** No hand-written player text: the lines are mined or authored with origin and added to `data/english/parts/bring-it-up.json`; no line is typed into code; An effect is a read, not a record: bring-it-up reads the perceived `printed:` fact from the reader's knowledge at the moment they talk; Ask why: the line cites the story the speaker read, by record id; No dice: who brings it up follows their traits, closeness and what they read, never a roll; Placeholders: SG-PEOPLE-press-bring-it-up-row closes only when a person says it; Research before building: mined lines are from public-domain sources with the source recorded.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a named reader of a printed story brings it up in a conversation, with the outlet, the topic and the story id in the line's facts; the stopgap row closes. Tests in `src/director/bring-it-up.test.ts`. The owner plays it: talks to a neighbor the day after a paper runs a story and hears them mention it by outlet.

**Files.** src/core2/press-desk.ts, src/director/data/bring-it-up-rows.json, data/english/parts/bring-it-up.json, src/director/bring-it-up.ts

**Notes.** First row: Readers of a printed story learn which outlet printed what (the perceived fact printed:<outlet>:story), which bring-it-up's matcher reads, but bring-it-up's data has no change row for a printed story yet, so no one says
