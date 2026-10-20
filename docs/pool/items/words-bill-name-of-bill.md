---
id: words-bill-name-of-bill
title: "One function names any bill from its sections, for the meeting, the desk, the news and the journal"
area: words
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: claude/bill-name
pr: #5067
blocked-on:
source: "split from play-meeting-bill-title; PR #4487 sent back by the morning check"
claimed-at: 2026-10-19T17:59:05.034Z
---

**What.** The English engine can name a bill from a policy key and a form (`billNameFor`), but nothing names a whole bill from its sections. The meeting screen and the desk need a bill's real name, and the news and journal want the same one. Add `billNameOf(bill)` to the English engine: the first section that has a name decides it, and a section reverses its policy by its operation or, for a policy question, by its value being off. Add the authored names for the twelve budget lines and rates that have none. The player would notice a real title instead of a description.

**Rules.** No hand-written player text: names are authored rows in the Words data, never typed into the bench. Replace, never layer: the journal and the news use this one function. One rule, all 56 places: names carry no place. Ask why: a bill with no known direction has no name rather than a guess.

**Done when.** In a one-year `buildBenchWorld` run in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), `billNameOf` names every bill on a meeting agenda that has a named section, with the bill record id and the section it used, and a test in `src/english/bill-names.test.ts` covers a repeal, a cut, a policy question and a rate with no direction. The owner plays it: reads a real title on a bill at the meeting.

**Files.** src/english/bill-names.ts, src/english/bill-names.test.ts, data/english/bill-names.json, scripts/dialogue-batch/coverage-batch.ts

**Notes.** PR #4487 (branch claude/play-meeting-bill-title, commit f47377bcc4) already holds a working `billNameOf`, the `reverses` flag, 98 lines of authored names and tests; the Words session may take them from that branch. The Play item `play-meeting-bill-title` is blocked on this one and then only changes src/bench/office.ts and src/bench/play.mjs.

Checked Oct 16 (claude/bill-name-of-bill): already built on main. `billNameOf`, `billNameFor`, `billTitleOf` and the budget bill name are in src/english/bill-names.ts (commits 6c9487e028 and 40cf9f6a7f), the authored rows are in data/english/bill-names.json, and src/english/bill-names.test.ts passes (6 tests, including the section direction, the form word and the composed long title). Nothing left to build here; recommend the CTO sets it done. The Play item play-meeting-bill-title is unblocked.

Sent back 2026-10-16 from PR #4743 (branch claude/pool-notes-oct16): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4743 (branch claude/pool-notes-oct16): Merging current main into claude/pool-notes-oct16 conflicts in docs/pool/items/elections-petition-signatures.md, docs/pool/items/words-bill-name-of-bill.md. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.

<<<<<<< HEAD
Checked again Oct 19 (claude/peaceful-ritchie-03780x): `npx vitest run src/english/bill-names.test.ts` passes (5 tests) on main; `billNameOf`, `billNameFor` and `billTitleOf` are exported from `src/english/bill-names.ts`. Nothing outside that file and its test calls `billNameOf` yet, which is the Play item `play-meeting-bill-title`. Recommend the CTO sets this item done.
=======
Verified Oct 19 (claude/bill-name): on current main `billNameOf`, `billNameFor` and `billTitleOf` are in src/english/bill-names.ts; src/director/journal.ts and src/bench/office.ts both call `billTitleOf`; src/english/bill-names.test.ts, src/director/journal-bill-names.test.ts and src/bench/office-bill-title.test.ts pass (8 tests). Nothing left to build; the merger sets it done.
>>>>>>> 408bea279624f2525e8cbea4dc1f554f9f28339c
