---
id: play-money-layout
title: "Money gets a dedicated account overview (#4321)"
area: play
kind: feature
priority: 2
status: done
claimed-by:
pr: #4580
blocked-on:
milestone:
source: "astra order 1; PR #4321 branch play/money-layout"
claimed-at:
---

**What.** PR #4321 (branch play/money-layout) gives Money a dedicated account overview: balances, income and spending, and where money went, read from the journal. It was sent back on 2026-10-15 for a code conflict with main in `src/bench/play.mjs`. Merge main into the branch, finish the screen to the owner's mockup in `docs/ui/mocks/screens-2026-10-14/` (README.md, shots/, page/), and retake the screenshot. The player would notice his accounts, bills and income laid out the way a bank app would show them, in words, from his real records.

**Rules.** No hand-written player text: every label, row and sentence is a record worded by the English engine or a control name from `src/bench/data/controls.json`; no raw ids, no 'undefined' and nothing immersion-breaking on a person card; Replace, never layer: the old look of this screen and the generic `row(label, value)` printer it used are deleted in the same change, and the PR body counts what was removed; An effect is a read, not a record: the screen shows only records an engine wrote, and a read-only screen spends no game time and creates no facts; This is a game, not a spreadsheet: the screen adds no form or paperwork; it only presents the golden path, with Day advancing time and never opening a choice list; Estimate, never UNKNOWN: a missing figure shows the estimate with its source, never UNKNOWN; One model, two tiers: the household's figures are the sum of its members' accounts under the same rules.

**Done when.** The branch merges clean with main and the Money screen of the drawn place (name it and the seed) shows the player's accounts, income and recent spending from the journal in words, each row traceable to a journal entry id, with no raw ids and no 'undefined'. A full-window screenshot at 1672x941 of the finished screen is attached to the PR and merged on the owner's yes; a browser spec for the screen (a new `src/bench/<screen>.browser.mjs` beside `sheets.browser.mjs`) opens it in a drawn place and fails on a raw id or the word undefined. The owner plays it: opens Money and sees where his paycheck went.

**Files.** src/bench/play.mjs, src/bench/economy.ts, src/bench/budget.ts, src/bench/data/controls.json

**Notes.** One PR per screen; gate: browser spec for the screen.
Sent back 2026-10-15 from PR #4321 (branch play/money-layout): code conflict with main in src/bench/play.mjs; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4580 (branch claude/play-money-layout): Merger: not merged. Merging current main into this branch conflicts in src/bench/play.mjs. Please merge main, resolve the conflict and push; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4580 (branch claude/play-money-layout): This stacked PR includes the failing person-card change from #4579. Its src/bench/person-card.browser.mjs and person-card implementation in play.mjs are byte-for-byte identical to the tested #4579 versions: the new check fails at line 72 because card.tie.lastContactDate is still rendered. Fix that shared card implementation on the stack and merge main again; do not weaken the browser assertion. Main was merged and pushed cleanly here; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4580 (branch claude/play-money-layout): Merging current main into claude/play-money-layout conflicts in src/bench/data/controls.json. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.
