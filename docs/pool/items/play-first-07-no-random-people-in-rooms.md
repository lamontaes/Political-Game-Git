---
id: play-first-07-no-random-people-in-rooms
title: "Nobody stands in a room without a reason on record, and no line says \"X is with you\""
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** On the v0.22.10 release a stranger in an apron stood in my bedroom at midnight, the city secretary turned up at the doors I knocked, and a moment opened with "Noah Chan is with you." with no reason given. The owner's read: people in the house need a reason to be there; no "X is with you"; "Noah Chan is with you" is removed. This item draws a person in a room only when a record gives the reason (lives there, works there, invited, the scene's cast) and removes the "X is with you" line from play.

**Rules.** Serves LAW.md §2, People in rooms and figures; LAW.md §4, Scenes and conversations; LAW.md §10, The owner's read of the Oct 24 screenshots. Wire to the world: who is in a room is read from records (household, workplace, an invitation, the scene's cast), never filled to a count. Replace, never layer: the filler staging and the "is with you" line are removed.

**Done when.** In a drawn place over the first month, every person drawn in a room carries a recorded reason a test reads, no screen shows "is with you", and a test fails when a person without a reason is staged, shown by a screenshot of home and the filing office.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** At home only your household and people with a reason to be there stand in the room, and no line says "X is with you".

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/scene.ts, src/bench/staging.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). The "{who} is with you." piece is data/english/parts/scene-words.json (the Words lead's; `needs-from: words` to retire it). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
