---
id: offices-who-holds-door
impact: none
---

The offices engine's entry now answers "who holds this seat" from both places it is kept, the offices engine's serving terms and the officials engine's seated members: `whoHolds` for a seat, `seatsHeldBy` for a person and `officeholderIds` for everyone who holds a seat today (OF3 of the offices map). They only read, so a named official is not filled in as a person by asking. Nothing calls them yet, so the fixed-seed records are unchanged; People switches its own list of officeholders to this door.
