---
id: words-hearing-chair-question
title: "Hearing bank: a chair's question move, read by the director for the committee day"
area: words
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5572
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The hearing bank (data/english/parts/hearing.json) has thanks, confirm, agree, answer, chair-procedure, time and repair parts and no question move, and nothing in src/director or src/english reads a hearing. Mine the chair's questions to witnesses and members from the same hearing transcripts, and have the director word one chair question and one witness reply for a committee-day hearing record. A player at a committee would read the chair ask a witness about the bill in front of them.

**Rules.** No hand-written player text: every line comes from the bank. Research before building: questions are mined from public hearing transcripts and tagged SOURCED. No dice: which question follows the bill's sections and the witness's side, not a roll. One rule, all 56 places: the lines name no place.

**Done when.** In a drawn state (name and seed in the PR body) a committee-day hearing record id from committeeSitting has a chair question and a witness reply worded from hearing.json parts, shown in the state day result, with a test in src/core2/office-day-state.test.ts.

**Files.** data/english/parts/hearing.json, scripts/english-mining/mine-hearings.py, src/director/office-scene.ts, src/core2/office-day-state.ts

**Notes.** Split from office-committee-assignments-and-hearings-as-stops-and, which waits on it.
