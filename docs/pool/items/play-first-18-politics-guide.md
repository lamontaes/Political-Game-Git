---
id: play-first-18-politics-guide
title: "Politics has a guide that says what each tab is and how you could run"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6099
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** The owner's read of the playtest screenshots: the politics screen needs a guide. A first-time player in the v0.22.10 release opened Politics to lists of names and numbers with nothing saying what to do with them. This item adds a guide to Politics that says what each tab shows and points to the way into a race (where the place files, when).

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. No hand-written player text: the guide's words come from the glossary entries already in the Guide and from English-engine lines, with the place's own filing office and dates from records. This is a game, not a spreadsheet: the guide is short and leads to play.

**Done when.** In a drawn place, Politics shows a Guide control whose pages name each tab's purpose and the place's own filing office and next filing date from records, shown by a screenshot of each page.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Opening Politics, a Guide control walks through Government, Issues, Parties and Campaigns in a line each, and how you could run for a seat here.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/government.ts, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Guide lines beyond the glossary are the Words lead's (`needs-from: words`). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): Politics > Campaigns before filing is blank and has no "how to run here".

Sent back 2026-10-26 from PR #6099 (branch play-first/play-first-18-politics-guide): Current-main integration conflicts in src/bench/government.ts and src/bench/play.css, plus main-only PROGRESS.md; merge aborted, preserve current government/creator/card readers and rerun the guide record/browser checks after reconciliation; Words approval and owner screenshot policy are not blockers; finish on that branch, merge main into it first.
Sent back 2026-10-27 from PR #6099 (branch play-first/play-first-18-politics-guide): the Guide still prints '(counter: director)' in some places (Duncan Falls, Ohio); finish on that branch, merge main into it first.

Fixer 6 (Oct 27): superseded by PR #6413 (every counter tag in words; the check compares the worded line; main merged).
