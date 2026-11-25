---
id: release-spelling-labeled-stopgaps
title: "american-english-sweep fails on main: stopgaps.json line 4188 has a British spelling"
area: release
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/spelling-labeled
pr: #4645
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T08:07:49.327Z
---

**What.** The American English sweep (`tests/american-english-sweep.test.ts`) failed on main because one stopgap row's reason in `src/core2/data/stopgaps.json` used the British spelling of "labeled". The word is respelled. The item's own first id also used the British spelling and showed in the generated index, so it was renamed to `release-spelling-labeled-stopgaps`.

**Rules.** American English everywhere; persisted identifiers keep their spelling, but a pool item id is not one that must stay.

**Done when.** `tests/american-english-sweep.test.ts` passes on the branch in a run of that file alone, `npm run spelling` prints nothing to fix, and the generated pool index holds no flagged word. The owner plays nothing new: this is a developer check.

**Files.** src/core2/data/stopgaps.json, docs/pool/items/release-spelling-labeled-stopgaps.md

**Notes.** Found by running the core2 and director suites on main on Oct 16. The first id was renamed in the fix PR because the old file was added to main with the flagged word in its id.
