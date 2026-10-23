---
id: play-m5-03-keep-playing-as-someone-else
title: "M5-03 keep playing as someone else."
area: play
kind: feature
priority: 2
size: L
status: done
claimed-by: claude/death-handoff
pr: #4837
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/play.md line 113 (unchecked checklist line)"
claimed-at: 2026-10-16T21:43:11.890Z
---

**What.** When the player's character dies or he chooses to step away, he should be able to continue as a connected person with their own life (a son, a protege, anyone eligible). The Carry-on-as sheet offers the household and closest ties and choosing one works while the character is alive; after a death it is blocked because every player-clock call (including `retirePlayerV1`) checks that the controlled person is alive (`src/core2/player-v1.ts:210`). Fix the clock to hand off after death, then make the sheet work at that moment. The player would notice a death that ends one life and starts the next without losing the game.

**Rules.** Wire to the world: the handoff moves the controlled person in a generated world and the new person's own life runs on the same engines; One model, two tiers: the chosen person is filled in from the counts if not already full, matching the records; An effect is a read, not a record: every module reads the controlled person from the clock after the handoff; This is a game, not a spreadsheet: one choice at the moment of death, no paperwork; No hand-written player text: the summary and sheet are worded by the English engine; Replace, never layer: the 'controlled person is no longer alive' hard stop is replaced, not worked around; No dice: who is offered follows relationships and eligibility, not a roll; One rule, all 56 places: no place named; Look before you ask: read DECISION-REGISTER.md on the CK3-style summary before building the summary.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): the bench player dies in the year, the summary offers connected people (ids named), choosing one continues the clock with that person and no throw, and the new person's journal starts from their own records. Tests in `src/core2/player-v1.test.ts` and `src/bench/player.test.ts`. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: loses his character and keeps playing as his daughter.

**Files.** src/core2/player-v1.ts, src/bench/player.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Checklist line from play.md; verify against main before starting.
Duplicate of play-m5-03-keep-playing-as-someone (priority 3, outside this pass) as of 2026-10-15; the CTO should drop that one.
