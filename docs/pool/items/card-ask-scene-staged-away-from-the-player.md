---
id: card-ask-scene-staged-away-from-the-player
title: "An Ask out pressed on a card plays its answer in a park, with the person walking up on the street, not where the player is"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Family life thread, Nov 15, 2026, card walk on #9256 (creator life at Ainaloa HI, seed 4418d02c-77e9-43d1-a6b6-6b462b0b6de4)"
model: opus
effort: medium
root: none
---

**What.** At 9:07 AM the player stood in Waters Building Services with Alice Price in the room, opened her card and pressed Ask out. The answer played in a park picture with the narration "Late in the morning on January 21st, Alice Price walks up to you on the street. You asked Alice out." The player never left the building, and 9:07 AM is not late in the morning. Seen: the person card's Ask out, in the room the player stands in.

**Cause.** Found in code: the `asked-out` type in src/director/data/situation-types.json has `"setting": ["public", "venue"]`, and `resolveSetting` in src/director/scheduling.ts places a scene from the type's list and the records (`public` is the subject's town), never from where the player stands when they press. The partnerships record (`family.asked-out`, src/core2/modules/partnerships.ts) carries the town as its `placeId`, so `venue` cannot name the room either. The arrival line then comes from scene-words `arrival-public-other`. `proposal-answered` has the same list with `home` first. The same holds for any scene the player's own press stages through `stageOwnPress` (the running-mate ask is staged at its own setting too).

**Fix.** A press made where the player stands is answered there: the bench passes the player's room (the organization or household they are in at that minute, `whereIs`) on the ask, the record carries it as its place, and a setting the director already has (`venue` for an organization, `home` or `other-home` for a household) resolves from that record first, so no arrival line is said and the picture is the room the player was in. No new setting kind and no second staging path: the one `resolveSetting` reads the record. The time phrase comes from the record's minute.

**Time box.** 3 hours, Opus at medium effort. When it runs out, push what passes, set the state honestly and stop.

**Rules.** One engine per mechanic: the director's one staging path. No hand-written player text. Ask why: the place said is the place on the record.

**Done when.** A second session, in a played life, Ask out pressed in a room with the person plays its answer in that room's picture with no arrival line, and the same at the player's home; a test at a named place and seed checks the staged setting and record id; and the second session sees it in the running game with a screenshot.

**Waits on.** #9256 (the card's Ask out) folding into the train.

**Files.** src/bench/person-acts.ts, src/core2/modules/partnerships.ts, src/director/scheduling.ts, src/director/data/situation-types.json.
