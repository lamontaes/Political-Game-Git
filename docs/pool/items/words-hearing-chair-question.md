---
id: words-hearing-chair-question
title: "Hearing bank: a chair's question move, read by the director for the committee day"
area: words
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #8426
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
branch: claude/pool-words-hearing-chair-question
---

**What.** The hearing bank (data/english/parts/hearing.json) has thanks, confirm, agree, answer, chair-procedure, time and repair parts and no question move, and nothing in src/director or src/english reads a hearing. Mine the chair's questions to witnesses and members from the same hearing transcripts, and have the director word one chair question and one witness reply for a committee-day hearing record. A player at a committee would read the chair ask a witness about the bill in front of them.

**Cause.** Design: docs/roadmap/political-process-baseline.md (Hearings row, M3-03 committee hearings: witnesses and questioning from real hearing patterns), and the item's own finding that data/english/parts/hearing.json has thanks, confirm, agree, answer, chair-procedure, time and repair parts and no question move.

**Fix.** Add chair-question and witness-reply parts to hearing.json (sourced from public hearing transcripts, tagged SOURCED), and have the director word one chair question and one witness reply for a committee-day hearing record from committeeSitting in src/core2/office-day-state.ts, the question following the bill's sections and the witness's side. Takes in words-budget-hearing-speakers: a budget hearing's public-comment speakers (the meeting engine's public-comment statements, src/core2/modules/meetings.ts) are called by name, and the chair announces the recorded vote counts, naming the bill by its title.

**Time box.** 6 hours for one Sonnet session.

**Rules.** No hand-written player text: every line comes from the bank. Research before building: questions are mined from public hearing transcripts and tagged SOURCED. No dice: which question follows the bill's sections and the witness's side, not a roll. One rule, all 56 places: the lines name no place.

**Done when.** A second session plays a drawn state (name and seed in the report) and sees a committee-day hearing record id from committeeSitting with a chair question and a witness reply worded from hearing.json parts, shown in the state day result, with a test in src/core2/office-day-state.test.ts; a budget hearing's public-comment speakers are called by name and the chair announces the recorded vote counts.

**Waits on.** Nothing.

**Files.** data/english/parts/hearing.json, src/core2/office-day-state.ts, src/core2/office-day-state.test.ts, src/core2/modules/meetings.ts

**Notes.** Split from office-committee-assignments-and-hearings-as-stops-and, which waits on it. Released from idle draft #5196 by the CTO, Oct 26.

Sent back 2026-10-20 from PR #5572 (branch claude/hearing-chair-question): six authored hearing question parts are shippable and the new hearing test catches all build/advance exceptions then redraws; hold authored lines non-shippable or source them, and diagnose failures instead of swallowing them; finish on that branch, merge main into it first.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-7xkkii` (2026-10-20). Cleared from the front matter and kept here.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:20 UTC) on branch claude/pool-words-hearing-chair-question.

Released by next (2026-11-13): no push to claude/pool-words-hearing-chair-question since 2026-11-11 01:20 UTC, more than twice its 6-hour time box. Continue on branch claude/pool-words-hearing-chair-question and pull request #8426.
