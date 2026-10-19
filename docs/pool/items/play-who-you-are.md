---
id: play-who-you-are
title: "Who you are becomes a character screen (#4291)"
area: play
kind: feature
priority: 2
status: done
claimed-by: claude/play-who-you-are
pr: #4571
blocked-on:
milestone:
source: "astra order 1; PR #4291 branch play/who-you-are"
claimed-at: 2026-10-16T03:14:35.085Z
---

**What.** PR #4291 (branch play/who-you-are) turns 'Who you are' into a character screen: the player's figure, name, age, home, work, family and traits he can read, in the Kit 13 look. It was sent back on 2026-10-15 for code conflicts with main in `src/bench/play.mjs` and `src/bench/data/controls.json`. Merge main, finish the screen to the owner's mockup in `docs/ui/mocks/screens-2026-10-14/` (README.md, shots/, page/), and retake the screenshot. The player would notice a proper character sheet, with 'Her story' and 'Your record' limited to what the records say in the engine's words.

**Rules.** No hand-written player text: every label, row and sentence is a record worded by the English engine or a control name from `src/bench/data/controls.json`; no raw ids, no 'undefined' and nothing immersion-breaking on a person card; Replace, never layer: the old look of this screen and the generic `row(label, value)` printer it used are deleted in the same change, and the PR body counts what was removed; An effect is a read, not a record: the screen shows only records an engine wrote, and a read-only screen spends no game time and creates no facts; This is a game, not a spreadsheet: the screen adds no form or paperwork; it only presents the golden path, with Day advancing time and never opening a choice list; Estimate, never UNKNOWN: a fact the player cannot yet know is shown as an estimate with its source, never UNKNOWN; One model, two tiers: the player is a full person; his household and circle read from their own records.

**Done when.** The branch merges clean with main and the character screen of the drawn place (name it and the seed) shows the player's figure, age, home, work and family from records, no raw ids and no 'undefined'. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: opens Who you are and recognizes his life.

**Files.** src/bench/play.mjs, src/bench/creator.ts, src/bench/card.ts, src/bench/data/controls.json

**Notes.** One PR per screen; gate: browser spec for the screen.
Sent back 2026-10-15 from PR #4291 (branch play/who-you-are): code conflict with main in src/bench/play.mjs, src/bench/data/controls.json, play.mjs; finish on that branch, merge main into it first.
