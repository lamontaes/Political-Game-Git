---
id: words-journal-memoir-revise
title: "Journal: the engine writes the look-back that revises an early entry"
area: words
kind: feature
priority: 1
size: M
status: blocked
claimed-by: claude/words-journal-memoir-revise
pr:
blocked-on: PR 5647 (words-authored-parts-shippable-sweep) is an unmerged draft, 'do not merge as is'; on main the journal lines still ship as authored shippable parts, so the slot is not empty and the rewritten test in the done-when does not exist yet. Needs the owner to grade the lines (the 5647 decision).
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:05:04.406Z
---

**What.** The held hand-written sentences in data/english/parts/journal.json left the memoir look-back sentence for a revised entry with no shippable part, so the game shows nothing there until the English engine writes it. Compose or mine the line for the memoir look-back sentence for a revised entry from the later moment's echo of an earlier moment and both cause records, as engine-written bank parts with their source, and have the director use it. The player would read the line again, written by the engine from the record.

**Rules.** No hand-written player text: the line is composed or mined by the English engine, never typed (owner, Oct 6, EN-1 to EN-3). No dice: which part is said follows the record and the speaker's traits. American English. One rule, all 56 places: the part names no place.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, named in the PR body, the slot the memoir look-back sentence for a revised entry is worded from engine or mined parts in data/english/parts/journal.json and cites the later moment's echo of an earlier moment and both cause records by record id; the rewritten director test that now asserts the slot is empty asserts the real line instead, and tests/english-parts-banks.test.ts passes.

**Files.** data/english/parts/journal.json, src/director/journal.ts, src/director/journal-revision.test.ts

**Notes.** Filed by fs11vb while rewriting the 17 director tests for PR #5647, as the CTO required for every slot left without engine parts.
