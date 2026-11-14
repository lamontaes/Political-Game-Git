---
id: talk-offer-of-help-cannot-spend-the-players-day
title: "An offer of help made in a talk cannot spend the player's day or become a visit"
area: director
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Account lead, Nov 14, 2026, from #9120 (the eviction talk carry, #8924) and the CTO's ruling that an effect the world did not pay for is not written"
model: opus
effort: medium
root: rc3-thin-life-record
checked: account lead 2026-11-14
---

**What.** In an eviction talk the player can answer "Need help moving?" and the relative says "Sure. It's all going to Dad's." Nothing follows: the talk engine writes the talk and the remembered topic, and nothing else, because it has no way to place a block of the player's time on a day or to make the offer a visit. The same gap holds for any offer made in a talk, and meetings spend none of the player's time either. Seen: after the "Sure.", the player's calendar and the tie's contact are the same as if the offer had not been made.

**Cause.** Design: docs/design/story-director.md (scenes pay a commitment; talks write none). `sayNow` in src/director/conversation.ts writes only the exchange's contact (`data.minutesPerExchange`, the "Talking is time together" block) and the topic memory (`talkedKey`); no module in the talk path writes a scheduled block or a commitment, and the scheduling engine (src/director/scheduling.ts) is read by scenes, not by talks. Evidence at three drawn places on seed 447c806a-1dcc-4172-b521-dd58499dcd08 (Chalan Pago-Ordot, Guam, draw 3) and seed a20d6c4e-e890-49d7-8027-bc461837d0c9 (Freeport, Maine, draw 0; Charlotte Amalie West, draw 1): the eviction "help" reply answered yes, no record changed beyond the talk.

**Fix.** Let a talk reply that accepts an offer write one commitment record through the scheduling engine (a block of the player's time on a named day, from the offer's kind, with the person it is for), which a visit scene can pay when the day comes and which the calendar shows. The hours of the block come from a TUNABLE parameter, not from the line. Meetings spending the player's time use the same record. No new time system.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: reuse the scheduling engine, never a second scheduler. An effect is a read, not a record: the commitment is finished only when the calendar or a visit scene reads it. Registered stopgaps only.

**Done when.** A second session, in a drawn place with its seed named, answers "Need help moving?" yes to an evicted relative on main and sees the block on the player's calendar for a named day, then plays that day and sees the visit; and a meeting the player attends shows its hours on the calendar.

**Notes.** Nov 14 (Account lead, thread "Let the player call or visit someone"): the scheduling engine named in Cause and Fix (src/director/scheduling.ts) stages the director's scenes; it keeps no calendar of the player's own blocks, so the Fix as written would build a second scheduler. Split instead: the player's acts that spend time and write a contact record are item `player-visits-or-calls-from-the-card` (Visit and Call on a person's card, built); a talk reply that accepts an offer becomes a kept promise settled by those records, which is item `design-player-reaches-a-relative-or-friend` and the promises builder's `promise-kinds.json`. What stays here: meetings spending none of the player's time, still open as its own gap, and the calendar showing a promised visit, which needs the promise record first.

**Waits on.** `player-visits-or-calls-from-the-card` for the act; the promises engine for the record.

**Files.** src/director/conversation.ts, src/director/scheduling.ts
