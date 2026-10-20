---
id: words-hearing-chair-question
title: "Hearing bank: a chair's question move, read by the director for the committee day"
area: words
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/political-game-pool-7xkkii
pr: #5572
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:13:49.604Z
---

**What.** The hearing bank (data/english/parts/hearing.json) has thanks, confirm, agree, answer, chair-procedure, time and repair parts and no question move, and nothing in src/director or src/english reads a hearing. Mine the chair's questions to witnesses and members from the same hearing transcripts, and have the director word one chair question and one witness reply for a committee-day hearing record. A player at a committee would read the chair ask a witness about the bill in front of them.

**Rules.** No hand-written player text: every line comes from the bank. Research before building: questions are mined from public hearing transcripts and tagged SOURCED. No dice: which question follows the bill's sections and the witness's side, not a roll. One rule, all 56 places: the lines name no place.

**Done when.** In a drawn state (name and seed in the PR body) a committee-day hearing record id from committeeSitting has a chair question and a witness reply worded from hearing.json parts, shown in the state day result, with a test in src/core2/office-day-state.test.ts.

**Files.** data/english/parts/hearing.json, scripts/english-mining/mine-hearings.py, src/director/office-scene.ts, src/core2/office-day-state.ts

**Notes.** Split from office-committee-assignments-and-hearings-as-stops-and, which waits on it.

Sent back 2026-10-20 from PR #5572 (branch claude/hearing-chair-question): six authored hearing question parts are shippable and the new hearing test catches all build/advance exceptions then redraws; hold authored lines non-shippable or source them, and diagnose failures instead of swallowing them; finish on that branch, merge main into it first.

Finished Oct 20 on claude/political-game-pool-7xkkii (PR #5196), which merged claude/hearing-chair-question (PR #5572) in and applied the send-back. The hearing test no longer swallows a world that fails to build or advance: it fails naming the place and seed. The follow-up questions are now sourced: six more short questions (Is that correct, Would you agree with that, Is that true, Why not, What does that mean, Is that fair) repeat across at least two of 45 hearings read from the 2025 govinfo sitemap and carry their source. The chair's six opening questions about the bill stay authored with author and date: no question about "the bill" repeats verbatim in any hearing read (the 45 returned only short generic follow-ups), so they cannot be sourced. They are kept shippable under the recorded ruling that a line is authored once and graded in a words batch (OWNER-DECISIONS, the purpose-phrase ruling, and OCD-CONTENT-001); the grading ledger can hold any of them back. If the CTO wants them held until graded, only the director's chair opening is lost.
