---
id: play-people-web
title: "People opens as the relationship web (#4294)"
area: play
kind: feature
priority: 2
status: done
claimed-by: claude/play-people-web
pr: #4574
blocked-on:
milestone:
source: "astra order 1; PR #4294 branch play/people-web"
claimed-at: 2026-10-16T03:22:30.717Z
---

**What.** PR #4294 (branch play/people-web) opens People as the relationship web: you at the center, family, friends, coworkers and acquaintances around you, built on the old People web. It was sent back on 2026-10-15 for code conflicts with main in `src/bench/play.mjs` and `src/bench/data/controls.json`. Merge main into the branch, finish the screen to the owner's mockup in `docs/ui/mocks/screens-2026-10-14/` (README.md, shots/, page/), and retake the screenshot. The player would notice a web of the people he knows, each card showing name, relation or office, where they live, their work and how he knows them, and nothing that breaks immersion.

**Rules.** No hand-written player text: every label, row and sentence is a record worded by the English engine or a control name from `src/bench/data/controls.json`; no raw ids, no 'undefined' and nothing immersion-breaking on a person card; Replace, never layer: the old look of this screen and the generic `row(label, value)` printer it used are deleted in the same change, and the PR body counts what was removed; An effect is a read, not a record: the screen shows only records an engine wrote, and a read-only screen spends no game time and creates no facts; This is a game, not a spreadsheet: the screen adds no form or paperwork; it only presents the golden path, with Day advancing time and never opening a choice list; One model, two tiers: only people the player has met or who are in his circle are full people; the web does not invent anyone; Ask why: how-you-know-them reads the relationship record.

**Done when.** The branch merges clean with main and the People screen of the drawn place (name it and the seed) shows the web with real people from the relationship records, each card with name, relation, home and work and no 'what she thinks of you' label. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: opens People and clicks his sister's card.

**Files.** src/bench/play.mjs, src/bench/family.ts, src/bench/card.ts, src/bench/data/controls.json

**Notes.** One PR per screen; gate: browser spec for the screen.
Sent back 2026-10-15 from PR #4294 (branch play/people-web): code conflict with main in src/bench/play.mjs, src/bench/data/controls.json; finish on that branch, merge main into it first.
