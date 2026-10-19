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
claimed-at:
---

**What.** The press interview opens as a conversation on the screen. The reporter's lines appear one at a time, and the player picks a move from worded choices, such as answering, deflecting or declining. Today an interview is a record with no screen of its own. Build the screen on the bench's conversation controls so the reporter's lines come from the English engine, the choices are worded by the same engine, and each choice records the player's answer as the press engine's interview record.

**Rules.** No hand-written player text: every line and every choice is worded by the English engine, and the screen shows record data and control names only. The chain is the acceptance: one interview is followed from the reporter's question, through the player's pick, to the press record, the view it moved and the news line. Wire to the world: the interview reads the player's office and the story the reporter asked about. Read-only screens spend no game time until a choice is made.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, an interview opens on the bench screen with the reporter's worded lines and at least three worded choices, a pick records the answer by record id, and a test in src/bench proves the choices resolve through the press engine. The owner plays it: he sits for an interview and answers the reporter.

**Files.** src/bench/handler.ts, src/core2/modules/press.ts, src/director/conversation.ts

**Notes.** Written from the title on Oct 19 so the item meets the quality gate. Waits on people-words.
