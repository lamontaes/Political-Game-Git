---
id: core-speed-journal-posting-in-play
title: "Each cash-journal posting does in play only what play reads (Long Hill: 160,000 postings, 29 s of the year)"
area: core
kind: bug
priority: 1
size: M
status: claimed
claimed-by: claude/speed-journal-in-play
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T00:54:33.235Z
---

**What.** Long Hill, Connecticut (seed m7b) posts about 160,000 cash-journal entries in a played year, and posting costs 28.8 of 264 profiled seconds, about 180 microseconds each, from every module that moves money. Each posting copies its rows and source, builds the list of 13 runtime fields and a pair array for each, sums totals as BigInt, protects and freezes its write objects and keeps a receipt copy, although with bookkeeping off nothing reads the copies or the pairs. Make a posting in play do only the work whose result is read, and keep every check and copy behind the bookkeeping switch for tests. This does not batch postings (that design is core-speed-cash-journal-posting): every posting stays the same record.

**Rules.** Bookkeeping is a debug switch: copies, freezing and validation run in tests, not in play. Speed: no change makes a year slower, measured before and after on the same machine. No dice: every dollar and record stays exactly the same.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b) the year's fingerprint from npm run speed:year stays fcdd81f3359b and a drawn place's three-year fingerprints are unchanged; postJournal's inclusive time in a CPU profile falls by at least a third; src/core2/journal*.test.ts, accounts and finance tests pass, with the speed lead's before and after on the fixed machine in the PR body.

**Files.** src/core2/journal-state.ts, src/core2/journal.ts

**Notes.** Filed Oct 24 by the speed lead from the by-module profile in core-speed-year-over-limit-dense-town. Helper assignment: one Sonnet helper owns these two files; nobody else edits them while it runs.
