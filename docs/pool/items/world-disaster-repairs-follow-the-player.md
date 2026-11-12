---
id: world-disaster-repairs-follow-the-player
title: "A disaster's assistance and repairs go to whatever town the player lives in, not the town whose damage FEMA recorded"
area: world
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-world-disaster-repairs-follow-the-player
pr: #8538
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:28:35.297Z
merged-at: 2026-11-12T18:25:53.625Z
---

**What.** The disasters engine reads FEMA's damage figures for the town the world opened in, whose name it fixes when it first runs (the runtime function in src/core2/modules/disasters.ts, line 116), but pays the household assistance and charges the repairs to the residents of the town where the player lives on the declaration day (the begin function, line 447, and line 576). When the player has moved, the new town's households receive the assistance and pay for repairs to homes in the old one, and the old town's builders get nothing. Measured in Guthrie, Oklahoma (place 4031700, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83, salt stories-from-engines) with the player moved to another town of the world on the eve of disaster 4866: 42 damaged homes recorded under Guthrie, and no repair paid to Guthrie's 3 open builders. Seen: the town's households and budget after a disaster, which charges the town the player lives in for repairs in another.

**Cause.** Found in code: src/core2/modules/disasters.ts fixes the damaged town at its first run (line 116, from the player's place then) but begin (line 447) and the payment code (line 576) take the town from core.people.get(core.playerId).placeId on the declaration day. Measured in Guthrie, Oklahoma, place 4031700, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83, salt stories-from-engines.

**Fix.** Pay assistance and charge repairs to the damaged town's own households and builders, found from the world's records (the town whose FEMA row it is), whatever town the player lives in.

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the assistance and the repairs move between the damaged town's own households and builders, the town whose FEMA row it is, wherever the player lives that day. One rule, all 56 places: the damaged town is found from the world's records, never by a place name in code.

**Done when.** A second session (not the builder) plays a generated world where the player moves out of the opened town before a damaging disaster is declared (Guthrie, Oklahoma, place 4031700, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83 is the repro) and sees the opened town's residents account receive the assistance and pay its own builders, named by journal entry id, and the town the player moved to pay nothing for it. The no-payee regression in src/core2/disasters-no-market.test.ts stays reachable, its forced step changed if it must be. On screen: nothing yet; it would show on Jobs and study, and News, and nothing there reads it.

**Waits on.** Nothing.

**Files.** src/core2/modules/disasters.ts, src/core2/disasters-no-market.test.ts

**Notes.** TODO
