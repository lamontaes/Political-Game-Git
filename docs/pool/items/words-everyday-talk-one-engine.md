---
id: words-everyday-talk-one-engine
title: "Everyday talk answers what was asked, and runs on the one word engine"
area: words
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: words
source: added with npm run pool -- add
---

**What.** Talking to people in town (src/director/conversation.ts, about 2,900 lines) is worded by its own word maker (src/english/conversation-words.ts, wordConversationMove) from its own bank (data/english/parts/conversation.json, 638 parts), beside the one scene word maker (wordSceneMove) and its bank that scenes, narration, news and the journal now share. A reply is picked from every reply the subject's bank has, not from the answers that fit the line it answers, so the owner saw a yes-or-no question ('Did you see the President's address?') answered with an acknowledgment and a turned-back question ('Oh, okay. What about you?'). The words-director plan of Oct 28 listed the copies to fold and missed this one.

**Rules.** One engine per mechanic: one word maker and one bank for every line a player reads (owner, Oct 29: every text in the game, not ten). Replace, never layer: the conversation word maker and its loader go when the fold lands, and the PR counts what was removed. No hand-written player text in code. Scene standard: a reply answers the line before it. Calibration is one (owner, Oct 29: "calibration should affect the entire thing... when I open the game and give feedback, that should affect the entire game"): the owner's grades, the trait pull and the move-pair weight reach a conversation line exactly as they reach a scene line. Today the grade hold and the trait pull reach it, but the move-pair weight does not, because conversation-words.ts passes no previous move (line 184), and which reply follows which line is decided by conversation.ts's own rules, not the scene engine's.

**Done when.** In a played world (buildBenchWorld) in two drawn places with the seeds named, a test plays every everyday conversation the player can open over 30 days and shows that every reply to a question is an answer to that question (yes, no, not sure or its own subject's answer), never an acknowledgment, and that no turned-back question follows an answer; and conversation lines are worded by wordSceneMove from the one scene bank, with src/english/conversation-words.ts deleted; and a test shows that one move-pair grade (an acknowledgment after a question marked bad) changes the pick in an everyday conversation and in a scene alike.

**Files.** src/director/conversation.ts, src/english/conversation-words.ts, src/english/mined/conversation-bank.ts, data/english/parts/conversation.json, data/english/parts/scene-talk.json

**Notes.** Filed Oct 29 by the Words and director session after the owner asked whether personal conversations were on the one engine; first PR: reproduce in a played world and make replies fit the question; second PR: fold into the one word maker and delete the old one.
