---
id: words-journal-office-lines
title: "Journal: the engine writes taking office, a town hall and an interview"
area: words
kind: feature
priority: 1
size: M
status: blocked
claimed-by: claude/words-journal-office-lines
pr:
blocked-on: PR #5647 (words-authored-parts-shippable-sweep) is not merged: until it holds the authored parts, main still ships them and the slot is not empty; the replacement lines then need the civic-prose editorial review or a rebuilt mining corpus (46,191 documents, outside the repo)
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:05:11.595Z
---

**What.** The held hand-written sentences in data/english/parts/journal.json left the officeholder entries for taking office, a town hall and an interview with no shippable part, so the game shows nothing there until the English engine writes it. Compose or mine the line for the officeholder entries for taking office, a town hall and an interview from the took-office event and the office-day act records, as engine-written bank parts with their source, and have the director use it. The player would read the line again, written by the engine from the record.

**Rules.** No hand-written player text: the line is composed or mined by the English engine, never typed (owner, Oct 6, EN-1 to EN-3). No dice: which part is said follows the record and the speaker's traits. American English. One rule, all 56 places: the part names no place.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, named in the PR body, the slot the officeholder entries for taking office, a town hall and an interview is worded from engine or mined parts in data/english/parts/journal.json and cites the took-office event and the office-day act records by record id; the rewritten director test that now asserts the slot is empty asserts the real line instead, and tests/english-parts-banks.test.ts passes.

**Files.** data/english/parts/journal.json, src/director/journal.ts, src/director/journal-office.test.ts

**Notes.** Filed by fs11vb while rewriting the 17 director tests for PR #5647, as the CTO required for every slot left without engine parts.
