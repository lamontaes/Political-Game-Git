---
id: director-retire-stage-speech-builder
title: "Two speech builders exist: the director's speech-builder.ts and the core's speech-composition; keep one and delete the other"
area: director
kind: cleanup
priority: 3
size: M
status: claimed
claimed-by: claude/retire-stage-speech
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:53:02.709Z
---

**What.** Two speech builders existed. Kept `src/director/speech-builder.ts` (played on /play, stages from `data/english/parts/speech-stages.json`, matches the owner's Oct 15 ruling that speeches are built as the player gives them). Deleted `src/core2/speech-composition.ts` and its test: nothing imported it but its test, and its module was never installed. Deleted its four parameters (`speechOpeningParts`, `speechBodyParts`, `speechClosingParts`, `speechOffersPerStep`).

**Rules.** Replace, never layer. Owner rulings Oct 14 (speeches one of four parts at a time) and Oct 15 (built as given, stages) both stand in the kept builder.

**Done when.** The deleted file, test and parameters have no readers left (grep), and src/director/speech-builder.test.ts and src/bench/speech-screen.test.ts pass.

**Files.** src/core2/speech-composition.ts, src/core2/speech-composition.test.ts, src/core2/data/campaigns/parameters.json

**Notes.** Words-line pool items that named the deleted file now name the director's builder. Not kept from the deleted one: its ranked four-offer selection from the candidate's platform and rivals' votes; if the owner wants offers ranked that way in the stage builder, that is a new item.
