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

**Notes.** Probe (Lane 3, Nov 4 UTC, main 9e2f7a46). The first five people the player knows, on 2021-01-10, are two housemates and three others in the same place, all alive, tier weekly. `openConversation` gives each 0 lines and 0 choices. `openConversation` has no early return, so the greeting (`words(..., "greet", "open", { statementsOnly: true })`) found no line and no subject offered a choice. Look at what `words()` reads for these speakers, and at the conversation bank since 9b34b8ec (talk after the address, Nov 1).

**Notes.** Lane 3, Nov 4, three tries, none passed (ruling 6), so this goes back to the pool. Findings:
- **Order:** the failure needs the whole file. Run alone, or paired with any one earlier test, it passes. In the full file every known person opens an empty talk (no greeting, no choices), so the effect builds up across the shared core.
- **The farewell rule:** where talks do open, `endConversation` suppresses the goodbye after the other's own question was answered (from c039ba68). Answering every question therefore ends with no farewell, and letting a question go by in silence brings one ("I have to go.").
- **Tried:** silence on every third turn; every known person instead of the first 25; a new day before the test.
- **Next:** find what in the earlier tests leaves `openConversation` empty, then let the player fall silent so talks reach a farewell.
