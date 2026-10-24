---
id: director-talk-lived-crime
title: "A resident whose home was broken into, or who was robbed or assaulted, can bring it up in conversation"
area: director
kind: wiring
priority: 1
size: M
status: in-pr
claimed-by: claude/talk-lived-crime
pr: #5923
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T06:56:50.618Z
---

**What.** The crime engine writes a victimization record for each full household it victimizes, and the ledger keeps it as a moment for each person it names, but conversations never raise it: the conversation rules' happenings list has no crime prefix and the conversation bank has no subject for a victimization. So a burglary that an outcome-web link made more likely, and that moved the victim's view, never reaches a scene. Add a victimization subject the way eviction is one: the speaker raises their own household's latest victimization, its facts read from the crime record (what happened and when), and the listener's replies follow. Its lines come from the mined bank; where no graded line exists, file the lines for the Words line and keep the subject out of play until they are graded.

**Rules.** No hand-written player text: every line is a mined bank piece, held out of play until graded, never typed into the director. Ask why: the subject names the victimization record id as its source, so the scene's reason is on the record. Replace, never layer: use the existing happenings and subject machinery that eviction uses, not a second conversation path.

**Done when.** In a one-year buildBenchWorld run in a place drawn from all 56 (place and seed named, bounded redraw where no full household is victimized), a conversation with a victim raises a victimization subject whose source record is the crime record id; src/director/conversation-crime.test.ts proves it and fails when the subject is removed, and the PR names the bank parts and their graded or held state.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json, src/director/conversation-crime.test.ts

**Notes.** Added Oct 24 by the effects lead for effects-end-to-end-proof (its scene step), after web-views-lived-crime-moves-stance.
