---
id: play-town-moves-news-line
title: "News prints a line when someone the player knows moves away"
area: play
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The second half of play-town-moves-on-screen, split off by Lane 4 on Nov 4: the town's size and moves show on Who you are (lane-4/town-size); News should print a line when someone the player knows moves away, read from the person.moved-away record (MOVED_AWAY_EVENT, re-exported from core2/modules/people).

**Rules.** Words from the English engine's news bank (Review: words). Wire to the world: the line cites the moved-away record by id.

**Done when.** In a drawn place after a played year, a known person's move appears in News by record id, shown by a screenshot with place and seed.

**Files.** src/bench/story.ts, data/english/parts/news.json

**Notes.** lead: Lane 4. The old branch play-first/play-town-moves-on-screen (Oct 26, before the old core was deleted) has a wordMovedAway draft for reference.

Lane 4, Nov 4: the news engine keeps no story for a move: `person.moved-away` is read by people, offices, jobs and parties, never by news or press (`src/core2/modules/news.ts`, `press.ts`). A line built in the bench would be a view inventing news (one engine per mechanic). Needs first: the press records a known person's move as a story (Lane 3, the press and news engines); then News shows it as any other story, with no bench change.
