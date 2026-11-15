---
id: director-public-events-reach-the-director
title: "The country's big public events (other states' disasters, the President's acts, court rulings, a turn in national opinion) reach the director as moments, not only the three yearly addresses"
area: director
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Account lead's scene build-out, Nov 15, 2026 (owner's rules 143 to 149, given 20:34Z to 20:43Z; plans approved by the Account lead 20:41Z and 20:45Z)"
model: sonnet
effort: medium
root: none
---

**What.** The owner wants people in the player's life to bring them news of the world after a big public event, his example a friend calling after the president's speech. Only the three yearly addresses reach the director today; everything the nation module keeps about the rest of the country never becomes a moment a scene can start from.
Seen: in Advanced, the day after another state's disaster or a court ruling is printed, the director's moments list holds it as a cause.

**Cause.** Found in code: src/director/data/director.json `eventImpacts` holds 81 rows, and the only public events among them are president.address, governor.address and mayor.address; the nation module's records (the `nation` skill: other states' disasters, the President's acts, the federal courts, national opinion), which the press already prints as national news, have no row.

**Fix.** For each record kind the nation module emits that the press prints as national news, add one `eventImpacts` row in director.json with channel `cause` and an impact parameter (TUNABLE, with its spread) in the director's parameter table; how big the event is comes from that parameter's place in the ranking, never from a cutoff. Read the nation module's event kinds from its code, not from memory, and list them in the PR body. No scene type changes and no lines. Where the player sees it: Advanced's moments list, and later the catch-up scene that starts from these moments.

**Time box.** 3 hours for one Sonnet session, one PR. It waits on nothing.

**Rules.** Sliding scales and causes: an event is a moment because its record exists, and its weight is a parameter row, never a fixed share. Cadence and summaries: a row adds no daily scan; the moment is made when the record is.

**Done when.** A second session, on main, in a drawn place and a seed nobody chose, plays a year with Advanced open and sees, the day after each printed national story (a disaster in another state, an act of the President, a court ruling), a moment naming that record by id, and the year still runs under two minutes.

**Waits on.** Nothing.

**Files.** src/director/data/director.json, src/director/data/stopgaps.json
