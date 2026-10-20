---
id: release-pool-words-speech-voices-malformed
title: "words-speech-voices is a priority-2 item the pool check rejects: Done when and Files are too thin"
area: release
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-speech-voices
pr: #5763
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T23:20:13.516Z
---

**What.** The pool check (`npm run pool -- --check`) rejects priority-1 and priority-2 items whose text is too thin, and the item words-speech-voices was among them: its Done when and Files did not meet the rules. On main today words-speech-voices passes the check; the only line that names it is this item's own, which was filed as an empty shell (every section TODO) and so fails the same check. This item is closed by giving the shell a real body, and by keeping the check clean for words-speech-voices.

**Rules.** Look before you ask: the pool README defines what each section must hold and the check enforces it, so the text is written to that definition and the check is not loosened. Replace, never layer: the empty shell is rewritten in place, not added beside.

**Done when.** `npm run pool -- --check` prints no line for release-pool-words-speech-voices-malformed or words-speech-voices when run on this branch (a test of the check itself in scripts/pool/index.test.ts already covers the rules), and the output is pasted in the pull request body with the head it was run on.

**Files.** docs/pool/items/release-pool-words-speech-voices-malformed.md, docs/pool/items/words-speech-voices.md

**Notes.** TODO

Sent back 2026-10-20 from PR #5188 (branch claude/pool-words-speech-voices): Merge main 44423a19b4a4 into claude/pool-words-speech-voices conflicts in: scripts/pool/index.test.ts, scripts/pool/index.ts. Resolve these files with a normal merge before changed-file validation; no integrated green head exists.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5196 (branch claude/political-game-pool-7xkkii): Merging current origin/main conflicts in code: src/core2/counted-weight-money.test.ts, src/core2/data/campaigns/parameters.json, src/core2/modules/jobs.ts, src/core2/office-day-state.test.ts, src/core2/speech-composition.ts (deleted on main), and src/director/office-scene.ts. Resolve these on this branch, preserving current main behavior and the removal of the old speech composer, then rerun changed-file checks. The pool/index and stopgap conflicts are documentation/register conflicts; they are not the reason this is being returned.; finish on that branch, merge main into it first.
