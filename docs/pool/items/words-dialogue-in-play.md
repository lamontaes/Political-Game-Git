---
id: words-dialogue-in-play
title: "Every piece of dialogue plays; the owner's grades take out only what he rejected and tune the rest"
area: words
kind: feature
priority: 1
size: M
status: claimed
claimed-by: words/dialogue-in-play
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T13:12:58.067Z
---

**What.** The owner, Oct 24: Quit worrying about my grades. Get the English engine in the game. That should make every single piece of dialogue available, and if I find pieces I don't like or keep grading, keep updating it. Until now 891 bank parts were held out of play until he graded each one, so ordinary play showed a narrator and a chat button, the campaign speech screen offered nothing and purpose scenes never talked. The grade step now sets every bank's flag from the grade ledger, so every part plays except the ones he graded bad or fix, and each new round of grades reaches the whole game at once.

**Rules.** No hand-written player text: words still come only from the English engine's banks, and a part he rejected stays out everywhere at once. Ask why: a scene that plays cites the records behind it; nothing is said that a record does not back.

**Done when.** In the played world (buildBenchWorld) in a drawn place, the speech screen test builds a speech of four stages from the bank and the scene-talk test composes every purpose in ordinary play with no part the ledger holds; tests/english-parts-banks.test.ts refuses a bank whose shippable flag disagrees with the grades; the tests rewritten to expect held lines pass with their pre-hold checks restored.

**Files.** scripts/dialogue-batch/apply-grades.ts, data/english/parts/, tests/english-parts-banks.test.ts, AGENTS.md, .agents/skills/words-engine/SKILL.md

**Notes.** TODO
