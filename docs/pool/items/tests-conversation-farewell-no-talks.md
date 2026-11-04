---
id: tests-conversation-farewell-no-talks
title: "conversation.test.ts: 'never parts with a word the talk already said' finds no talk with a farewell"
area: words
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/director/conversation.test.ts 'never parts with a word the talk already said' fails on main (fixed world, seed conversation-test): expected 0 to be greater than 0. Of the first 25 people the player knows, none reaches a farewell in 8 turns, and the first one's talk opens with no lines and no choices at all.

**Rules.** A talk with nothing on record says nothing (owner, Oct 24); fix the test's pick only when the engine is right (words-engine skill).

**Done when.** conversation.test.ts passes on main's fixed world; the PR names why the first known people opened empty talks (engine or test pick) by record.

**Files.** src/director/conversation.ts, src/director/conversation.test.ts

**Notes.** Filed by Lane 3 (Nov 4), found while checking lane3/everyday-answers; red on clean main (9e2f7a46). Unit tests don't run in main's Release workflow, so no red-main report named it.
