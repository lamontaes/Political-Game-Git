---
id: director-dev-mode-board
title: "Dev mode's scene trace shows the director's board for a day, and a forced scene says what the board did with it"
area: director
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-board-devmode
pr: 9960
after:
blocked-on:
model: opus
effort: medium
root: none
lead: director
source: 'Story lead''s director board design, Nov 16, 2026 (docs/design/director-board.md), build plan item 7; owner, Nov 14: "every single one of those should be able to be triggered using the game code and advanced in order to see the effect"; owner, Nov 16: "a part of the dev mode should be able to trace and force every scene to play. So see why every scene played".'
---

**What.** Dev mode's scene trace forces a scene through the game's own code, but it says only whether a scene of that type was bound, not what the director's board did with it. The board weighs every candidate of a day, cuts some by a gate, scores the rest and picks one while the life has room, and none of that shows in the scene trace. A tester cannot see why a forced scene did not play, or what else the day held.
Seen: dev mode's scene trace shows the board for a chosen day, and a forced scene names whether the board staged it or which gate held it back.

**Cause.** Design: docs/design/director-board.md, section 5 (dev mode: the board view) and section 6 item 7; the owner's dev-mode rule of Nov 14 (AGENTS.md, every effect can be triggered and traced in dev mode). Found in code: the force route in src/bench/dev-views/scene-trace.ts (`POST scene-trace/force`) answers `staged` from the bindings alone, and `pickFromBoard` in src/director/board.ts computes the life's room without keeping it, so no view can show it.

**Fix.** `pickFromBoard` keeps the room it read (pace, standing multiplier, picks this year, room left) on the board of the day's holder entry, beside the offers. The scene trace gains `GET scene-trace/board?date=`: the player's schedule entries of that day, each with its cause record and its own `board` as board.ts wrote it, and the room; nothing is computed a second time. The force route answers the board's verdict (staged, held back with the gate's reason, or not weighed) from the entries written since the force, and the page redraws the board for that day. No gate changes (the lead's decision pending the CTO's line on #9809).

**Time box.** 4 hours for one Opus session. When it runs out, push what passes and say so.

**Rules.** Wire to the world: the board view reads the one ledger the director writes, with every cause and read record opening in the trace box, and a forced scene meets the same gates and room as any other.

**Done when.** A second session, on main at a drawn place and seed it did not choose, opens the Calendar's dev panels, forces a scene from the scene trace, reads the board's verdict on the button, and sees the board section for that day with the forced cause's card, its gate or the pick, its score with the reads, and the life's room. `src/bench/dev-scene-board.test.ts` passes on a fresh draw.

**Waits on.** director-cards-require-and-weigh (#9891, the base branch).

**Files.** src/director/board.ts, src/bench/dev-views/scene-trace.ts, src/bench/ui/dev-scene-trace.mjs, src/bench/dev-scene-board.test.ts (new)

**Notes.**

- Nov 17. Built on claude/story-board-devmode, stacked on #9891. #9809's rival-word fix (`heldBack` with `not-received`, origin/claude/story-force-scenes-3) is not on this base; the `not-received` cut comes from the board's own cards.
