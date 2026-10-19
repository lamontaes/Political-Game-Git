---
id: people-interview-screen
title: "The interview opens as a conversation on the screen: the reporter's lines, the player picks a move from worded choices"
area: play
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: people-words
source: added with npm run pool -- add
---

**What.** When the player is interviewed, the interview opens as a conversation on the screen. The reporter's lines come from the English engine, and the player picks a move from worded choices, the way a talk with a neighbor works. Today the interview is a desk action that resolves without a conversation, so the player never sees the question or answers it. The choices change what the outlet prints, and the screen shows only record data and control names.

**Rules.** No hand-written player text: every line and every choice is worded by the English engine from the interview's facts; This is a game, not a spreadsheet: the interview is one conversation, not a form; Read-only screens spend no game time: opening the interview screen advances no day until the player answers; An effect is a read, not a record: the outlet's story reads the move the player chose; Look before you ask: read DECISION-REGISTER.md and OWNER-DECISIONS.md before adding any step.

**Done when.** In the played world in a place drawn from all 56 with a seed the builder did not choose, named in the PR body, an official asks an outlet for an interview, the screen shows the reporter's worded line and the player's worded choices, the chosen move reaches the outlet's story by record id, and a test in src/bench plus a screenshot of the screen prove it.

**Files.** src/bench/office.ts, src/bench/play.mjs, src/core2/modules/press.ts

**Notes.** Body written Oct 19 (claude) from the title and the repo layout; the claimant should sharpen it.
