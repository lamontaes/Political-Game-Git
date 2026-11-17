---
id: director-board-string-index
title: "The director finds a moment's scenes by the strings it touches, and what passed between two people from their own replies, not by scanning"
area: director
kind: feature
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/story-board-strings
pr: 9819
after:
blocked-on:
model: sonnet
effort: medium
root: rc6-scenes-repeat
lead: director
source: "Story lead's director board design, Nov 16, 2026, build plan item 3 (owner, Nov 15, 3:39 PM: read the whole set of scenes that could happen to this player, cut it, pick a few; CTO, Nov 16: each scene is a card on strings to its records)"
---

**What.** The director checks every moment against all 89 situation types and 130 causes, and reads what passed between two people by scanning every scene reply in the log. The board the owner asked for needs one index of cards by the strings they hang on, built once. Nothing a player sees changes: the same scenes play with the same people on the same days.
Seen: dev mode's director's day lists the same moments and outcomes as before, and a year runs no slower.

**Cause.** Found in code: `scheduleMoment` in src/director/scheduling.ts loops over every type and cause for each moment; `rowsByKind` in src/director/circumstance.ts is a second, smaller index of circumstance rows; `passedBetween` in src/director/relation-facts.ts scans `core.logByKind.get("scene.reply")` on each call.

**Fix.** Add src/director/strings.ts with `cardsByString`: each cause's `label`, `labelPrefix` and `causeKind`, and each circumstance row's record kinds, inverted once per library. Split the binding half of `scheduleMoment` into `bindMoment`, which looks up only the causes on the moment's strings, in library order. Delete `rowsByKind`; the ledger and `circumstancePicks` read the index. Add the ledger's `repliesByPlayer` index, filled as each `scene.reply` is recorded, and make `passedBetween` read it (its scan deleted, and `passed` leaves `relationFacts`, which nothing but the purpose scene read). Where the player sees it: nowhere; the board (director-board-picks-a-few) builds on it.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: `rowsByKind` and the reply scan are deleted, not kept beside the index. Speed: the index is built once and a moment's cost is the cards on its strings, never the library or the log.

**Done when.** A second session plays a year at a drawn place, Town, State (seed in the PR body), on this branch and on its base, and sees the same schedule lines (person, day, outcome, type, setting, everyone present) by hash, and the year no slower than its base on the same machine. `src/director/relation-facts.test.ts` reads what passed between two people from the index.

**Waits on.** director-scene-tags-from-player-standing (#9806), dev-mode-shows-the-directors-day (#9801).

**Files.** src/director/strings.ts (new), src/director/scheduling.ts, src/director/circumstance.ts, src/director/ledger.ts, src/director/relation-facts.ts, src/director/purpose-scene.ts, src/director/types.ts
