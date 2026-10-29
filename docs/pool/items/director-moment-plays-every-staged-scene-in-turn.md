---
id: director-moment-plays-every-staged-scene-in-turn
title: "A record that stages several scenes plays each in turn, not only the first the records can word"
area: director
kind: bug
priority: 1
size: M
status: done
claimed-by: claude/director-scenes-play-in-turn
pr: #6440
blocked-on:
source: "Helper B, Oct 27, episode docs/design/scenes/from-life/concession-call-received.md"
lead: director
claimed-at: 2026-10-27T22:19:36.526Z
---

**What.** An election-result record stages up to four purpose scenes for its winner (the victory night, the household's win, and the loser's call to the winner), but the bench plays the first one the English engine can word and the rest are never reached except by naming their type in a test. The same holds for any record that binds more than one type for one person. Each staged scene should play after the last one ends, so the victory night is followed by the call, and a scene the player already finished is not offered again.

**Rules.** Cast from the world: each scene keeps its own cast and setting. No dice: the order follows the types' order in the library and the day's sitting rule, never a roll. Replace never layer: the first-scene-only pick in src/bench/story.ts is replaced, not kept beside the new order.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a watched winner of a counted race plays race-won, then concession-received, each citing the result record id, in that order in ordinary play through src/bench, and a test fails when the second is skipped; bench screenshots of both at 1440x900.

**Files.** src/director/purpose-scene.ts, src/bench/story.ts, src/director/scheduling.ts

**Notes.** Found while building words-scene-concession-received (src/director/concession-received.test.ts reaches the call only with typeKey). Overlaps the director lead's circumstance work; fold into it if it already stages scenes in turn.
