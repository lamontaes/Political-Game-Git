---
id: words-bring-it-up-law-line
title: "Bring it up: the engine writes what a neighbor says about a law taking effect"
area: words
kind: feature
priority: 1
size: M
status: claimed
claimed-by: claude/bring-it-up-law
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:03:35.574Z
---

**What.** The held hand-written sentences in data/english/parts/bring-it-up.json left the line a reader says aloud about a printed law story with no shippable part, so the game shows nothing there until the English engine writes it. Compose or mine the line for the line a reader says aloud about a printed law story from the printed story record of the law taking effect and its outlet, as engine-written bank parts with their source, and have the director use it. The player would read the line again, written by the engine from the record.

**Rules.** No hand-written player text: the line is composed or mined by the English engine, never typed (owner, Oct 6, EN-1 to EN-3). No dice: which part is said follows the record and the speaker's traits. American English. One rule, all 56 places: the part names no place.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, named in the PR body, the slot the line a reader says aloud about a printed law story is worded from engine or mined parts in data/english/parts/bring-it-up.json and cites the printed story record of the law taking effect and its outlet by record id; the rewritten director test that now asserts the slot is empty asserts the real line instead, and tests/english-parts-banks.test.ts passes.

**Files.** data/english/parts/bring-it-up.json, src/director/bring-it-up.ts, src/director/bring-it-up-law.test.ts

**Notes.** Filed by fs11vb while rewriting the 17 director tests for PR #5647, as the CTO required for every slot left without engine parts.
