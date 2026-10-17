---
id: play-person-card-layout
title: "Person cards use a large side figure in the Kit 13 panel (#4320)"
area: play
kind: feature
priority: 2
status: done
claimed-by:
pr: #4579
blocked-on:
milestone:
source: "astra order 1; PR #4320 branch play/person-card-layout"
claimed-at:
---

**What.** PR #4320 (branch play/person-card-layout) lays out person cards with a large side figure in the Kit 13 panel. It was sent back on 2026-10-15 for a code conflict with main in `src/bench/data/controls.json`. Merge main, finish the card to the owner's mockup in `docs/ui/mocks/screens-2026-10-14/` (README.md, shots/, page/), and retake the screenshot. The player would notice a card with a large figure of the person and the facts beside it: name, relation or office, where they live, their work and how he knows them, with none of the labels the owner ruled out.

**Rules.** No hand-written player text: every label, row and sentence is a record worded by the English engine or a control name from `src/bench/data/controls.json`; no raw ids, no 'undefined' and nothing immersion-breaking on a person card; Replace, never layer: the old look of this screen and the generic `row(label, value)` printer it used are deleted in the same change, and the PR body counts what was removed; An effect is a read, not a record: the screen shows only records an engine wrote, and a read-only screen spends no game time and creates no facts; This is a game, not a spreadsheet: the screen adds no form or paperwork; it only presents the golden path, with Day advancing time and never opening a choice list; One model, two tiers: a clicked stranger is filled in from the records first and the card shows that person; Ask why: how-you-know-them cites the relationship record.

**Done when.** The branch merges clean with main and a card for a family member and for a stranger in the drawn place (name it and the seed) shows the figure and the facts from records, with no 'Your mayor', 'Met Jan 6' or 'what she thinks of you'. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: clicks a neighbor and reads the card.

**Files.** src/bench/card.ts, src/bench/whole-figures.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** One PR per screen; gate: browser spec for the screen.
Sent back 2026-10-15 from PR #4320 (branch play/person-card-layout): code conflict with main in src/bench/data/controls.json; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4579 (branch claude/play-person-card-layout): Merger: not merged. Merging current main into this branch conflicts in src/bench/play.mjs. Please merge main, resolve the conflict and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4579 (branch claude/play-person-card-layout): The new person-card browser check fails at src/bench/person-card.browser.mjs:72 on merged head 30e5b73d: the card text contains card.tie.lastContactDate (Kendall, Wisconsin, seed 72670db2-1c1e-41cf-9155-b18a09384f06). src/bench/play.mjs still renders row(c.tie.kind, c.tie.lastContactDate). Make the card meet its no-raw-contact-date requirement without weakening the test. Typecheck, changed-file eslint/prettier, zero-dice, release, pool and the travel browser check pass; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4579 (branch claude/play-person-card-layout): The person-card browser failure remains unresolved. The browser test and showPerson, row and plain functions are byte-identical to checked head 30e5b73de2d02ca19a43b542ae22e356e2786d60: play.mjs still inserts c.tie.lastContactDate directly. The existing browser test fails at line 72 on Kendall, Wisconsin, seed 72670db2-1c1e-41cf-9155-b18a09384f06 because that raw date appears in the card. Correct the display without weakening the assertion; no new passing browser result is claimed; finish on that branch, merge main into it first.
