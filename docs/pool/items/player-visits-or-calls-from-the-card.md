---
id: player-visits-or-calls-from-the-card
title: "Let the player visit or call a person from their card"
area: play
kind: feature
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/project-thread-soscar
pr:
after:
blocked-on:
lead: words
source: "Account lead, Nov 14, 2026: three threads found the same gap (the promises, family life and eviction-talk work): a promise made in a talk ('I'll come by', 'I'll call') has no act that keeps it"
model: sonnet
effort: medium
root: rc3-thin-life-record
checked: account lead 2026-11-14
---

**What.** A person's card has no way to see or reach them. A relative offers a visit in a talk, or the player promises to call, and nothing the player can do keeps it: Travel lists places, not homes, and no act reaches someone who is not in the room. Seen: `/api/goto/visit` takes an organization only; the card (People screen) has no buttons.

**Cause.** Found in code: the people engine's own act `contact-known-person` (src/core2/data/content.json, handler `contact` in src/core2/modules/life.ts) writes a visit's hours as time together and meets the host's household, but the player has no route to it; the bench's `/api/goto/visit` (src/bench/handler.ts) spends a trip and an hour at a place and writes no contact; and the only road to a talk with someone is clicking them in the room.

**Fix.** Two acts on the card, through the engines that exist. Visit: the trip (`tripMinutes`, SG-PLAY-trip-time-average) and the visit's hours (`socialHours`, the people engine's own visit effort) spent on the player's clock; the room is where that person is now (their workplace on a shift, else their home, `visitHome` in src/bench/places.ts); the time together written by one shared writer (`recordVisit` in src/core2/encounters.ts, now also used by the people engine's act), the household met, a `contact.visit` event; the talk opens through the existing engine. Call: no trip; the talk opens through the existing engine over the player's own room; a `contact.call` event. A closed act says why (here, elsewhere, away, held, silent), worded from controls.json. The list lives in src/bench/person-acts.ts so another act (ask out, propose) adds a row.

**Time box.** 4 hours, Sonnet at medium effort. Done.

**Rules.** One engine per mechanic; no new number (socialHours is SOURCED, the trip time is the existing registered stopgap); no dice: the records say whether an act is open.

**Done when.** A second session, in a drawn place with its seed named, opens a person's card in the People screen, presses Visit on someone in town and sees the clock move by the trip and the visit's hours, the room be that person's home (or workplace on a shift) with them in it and the talk open; presses Call on someone with something to say and sees the talk open with no trip; and finds `contact.visit` and `contact.call` in dev mode's records for the person. Relatives who live outside the town are called, not visited, and a call to one with no line says so on the card.

**Waits on.** nothing. The promises builder settles kept and broken promises on these two events (`design-player-reaches-a-relative-or-friend`); lines written for a call (a call opens with the same greetings as a visit today) are the Words lead's.

**Files.** src/bench/person-acts.ts, src/bench/handler.ts, src/bench/places.ts, src/bench/shift.ts, src/bench/player.ts, src/bench/play.mjs, src/bench/data/controls.json, src/core2/encounters.ts, src/core2/modules/life.ts, src/core2/data/life/remembered.json
