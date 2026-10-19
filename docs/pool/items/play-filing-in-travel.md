---
id: play-filing-in-travel
title: "The filing office is a place you travel to (#4298)"
area: play
kind: feature
priority: 2
status: done
claimed-by: claude/play-filing-in-travel
pr: #4578
blocked-on:
milestone:
source: "astra order 1; PR #4298 branch play/filing-in-travel"
claimed-at: 2026-10-16T03:32:33.153Z
---

**What.** PR #4298 (branch play/filing-in-travel) puts the filing office in the Travel menu as a place the player goes to, rather than a separate flow. It was sent back on 2026-10-15 for code conflicts with main in `src/bench/play.mjs` and `src/bench/data/controls.json`. Merge main into the branch, finish the screen to the owner's mockup in `docs/ui/mocks/screens-2026-10-14/` (README.md, shots/, page/), and retake the screenshot. The player would notice that filing for office is something he does by going to the clerk, registrar or board of elections that takes filings in his place, shown with the real requirements.

**Rules.** No hand-written player text: every label, row and sentence is a record worded by the English engine or a control name from `src/bench/data/controls.json`; no raw ids, no 'undefined' and nothing immersion-breaking on a person card; Replace, never layer: the old look of this screen and the generic `row(label, value)` printer it used are deleted in the same change, and the PR body counts what was removed; An effect is a read, not a record: the screen shows only records an engine wrote, and a read-only screen spends no game time and creates no facts; This is a game, not a spreadsheet: the screen adds no form or paperwork; it only presents the golden path, with Day advancing time and never opening a choice list; One rule, all 56 places: which office takes filings and what it requires come from the place's records via `filingOfficeFor`, with no place named; Wire to the world: filing writes a candidacy record another engine reads; Ask why: each requirement shown cites its source.

**Done when.** The branch merges clean with main and the Travel screen lists the filing office of the drawn place (name it and the seed) with its real requirements in words, no raw ids and no 'undefined'. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: opens Travel, goes to the filing office and files.

**Files.** src/bench/play.mjs, src/bench/filing.ts, src/bench/data/controls.json, src/bench/sheets.browser.mjs

**Notes.** One PR per screen; gate: browser spec for the screen.
Sent back 2026-10-15 from PR #4298 (branch play/filing-in-travel): code conflict with main in src/bench/play.mjs, src/bench/data/controls.json; finish on that branch, merge main into it first.
