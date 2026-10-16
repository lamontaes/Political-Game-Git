---
id: tests-research-data-reader-allowlist-red
title: "research-data-has-reader tests fail on main: the allowlist names a file that now has a reader, and the import scan test finds nothing"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The research-data reader guard (`tests/guards/research-data-has-reader.test.ts`, scanner `scripts/audit/readers.ts`) cannot catch an unread research file. Two files quote the prefix "data/research/" (`src/core2/tooling/calibration-guard.ts` line 103 and `src/core2/tooling/tripwires.ts` line 634) and the scanner counts a quoted directory as a read of every file inside it, so every file under `data/research` shows two "directory" readers. Two guard tests fail on main for that reason: the allowlist's files all "have a reader now", and the catalog-terms-batch-02 file is meant to show none. With the scanner fixed to ignore the bare research root, 370 research JSON files have no reader at all (for example the 50 `renewal/moves/roadmap-r9-components-*.json` files, `stand-in-figures-2026-10-12.json` and the `speech-sources` catalogs), and only 4 allowlist entries are stale.

**Rules.** An effect is a read, not a record: a research file the game does not read either gets a reader, goes on the allowlist with a one-line reason, or is deleted. The allowlist may only shrink. Replace, never layer.

**Done when.** The scanner ignores the bare research root, so `tests/guards/research-data-has-reader.test.ts` passes on the branch in a run of that file alone with every unread file wired, allowlisted with a reason, or removed; the PR body counts the files in each group and the allowlist ceiling is lowered or justified. The owner plays nothing new: this is a developer guard.

**Files.** scripts/audit/readers.ts, scripts/audit/research-data-allowlist.json, tests/guards/research-data-has-reader.test.ts

**Notes.** Found Oct 16 by running the tests and scripts folders on main. The 370 count is from a scan with the one-line scanner fix (skip a quoted path equal to the research root). The fix alone turns the guard red until the 370 are sorted, so it needs a sorting pass first; a session can sort them by folder.
