---
id: play-first-18-politics-guide
title: "Politics has a guide that says what each tab is and how you could run"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner's read of the playtest screenshots: the politics screen needs a guide. A first-time player in the v0.22.10 release opened Politics to lists of names and numbers with nothing saying what to do with them. This item adds a guide to Politics that says what each tab shows and points to the way into a race (where the place files, when).

**Rules.** No hand-written player text: the guide's words come from the glossary entries already in the Guide and from English-engine lines, with the place's own filing office and dates from records. This is a game, not a spreadsheet: the guide is short and leads to play.

**Done when.** In a drawn place, Politics shows a Guide control whose pages name each tab's purpose and the place's own filing office and next filing date from records, shown by a screenshot of each page.

**Files.** src/bench/play.mjs, src/bench/government.ts, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Guide lines beyond the glossary are the Words lead's (`needs-from: words`). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
