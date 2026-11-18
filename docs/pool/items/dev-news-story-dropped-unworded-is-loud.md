---
id: dev-news-story-dropped-unworded-is-loud
title: "News drops a printed story it cannot word without a sign; dev mode should say so"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: views
model: sonnet
effort: medium
root: none
source: Desk, Nov 16, words-printed-story-kind-lost-with-its-record
---

**What.** When a printed story comes back with no headline and no lede, News leaves it out and nobody can tell. A story the paper printed must never vanish silently (the lead, Nov 16). Dev mode should list each story it left out, with its record and kind, so a missing builder is seen at once.
Seen: Baldwinville, Massachusetts, seed 502259e66d651f5a88b2ad4626a91b6a9fa572c6, 11 births left out of News before words-printed-story-kind-lost-with-its-record.

**Cause.** Found in code: src/bench/play.mjs, the heard-stories list filters `(r) => r.headline || r.lede` and drops the rest. src/bench/calendar.ts `heardItems` passes a story through whether `wordPrintedStory` worded it or not, so the only sign of a dropped story is its absence.

**Fix.** In dev mode, show the stories that filter drops as a row naming the story's kind and its source record, which opens in Trace; play stays as it is. play.mjs is held by the filing-counter builder, so this waits until it is free or goes through that builder.

**Time box.** 1 hour, one Sonnet session at medium effort.

**Rules.** Ask why: a printed story that News leaves out can be found in dev mode, by its record and kind.

**Done when.** In a drawn place with a seed nobody chose, with a builder taken out on purpose, dev mode's News shows the dropped story by kind and record, and a second session sees it in the running game.

**Waits on.** The filing-counter builder's hold on src/bench/play.mjs.

**Files.** src/bench/play.mjs, src/bench/calendar.ts
