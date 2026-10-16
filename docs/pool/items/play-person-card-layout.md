---
id: play-person-card-layout
title: "Person cards use a large side figure in the Kit 13 panel (#4320)"
area: play
kind: feature
priority: 2
status: claimed
claimed-by: claude/play-person-card-layout
pr: #4320
blocked-on:
milestone:
source: "astra order 1; PR #4320 branch play/person-card-layout"
claimed-at: 2026-10-16T03:35:39.789Z
---

**What.** PR #4320 (branch play/person-card-layout) lays out person cards with a large side figure in the Kit 13 panel. It was sent back on 2026-10-15 for a code conflict with main in `src/bench/data/controls.json`. Merge main, finish the card to the owner's mockup in `docs/ui/mocks/screens-2026-10-14/` (README.md, shots/, page/), and retake the screenshot. The player would notice a card with a large figure of the person and the facts beside it: name, relation or office, where they live, their work and how he knows them, with none of the labels the owner ruled out.

**Rules.** No hand-written player text: every label, row and sentence is a record worded by the English engine or a control name from `src/bench/data/controls.json`; no raw ids, no 'undefined' and nothing immersion-breaking on a person card; Replace, never layer: the old look of this screen and the generic `row(label, value)` printer it used are deleted in the same change, and the PR body counts what was removed; An effect is a read, not a record: the screen shows only records an engine wrote, and a read-only screen spends no game time and creates no facts; This is a game, not a spreadsheet: the screen adds no form or paperwork; it only presents the golden path, with Day advancing time and never opening a choice list; One model, two tiers: a clicked stranger is filled in from the records first and the card shows that person; Ask why: how-you-know-them cites the relationship record.

**Done when.** The branch merges clean with main and a card for a family member and for a stranger in the drawn place (name it and the seed) shows the figure and the facts from records, with no 'Your mayor', 'Met Jan 6' or 'what she thinks of you'. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: clicks a neighbor and reads the card.

**Files.** src/bench/card.ts, src/bench/whole-figures.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** One PR per screen; gate: browser spec for the screen.
Sent back 2026-10-15 from PR #4320 (branch play/person-card-layout): code conflict with main in src/bench/data/controls.json; finish on that branch, merge main into it first.
