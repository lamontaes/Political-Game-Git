---
id: gov-m3-04-person-card-law-effects
title: "A named person an enacted law reached shows it on their card when the player clicks them"
area: gov
lead: governing
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead Oct 29
---

**What.** M3-04's test sentence says an enacted ordinance reaches specific named people who are clickable, with the law on their records. The person card already reads the law-reach rows (`lawEffects` in `personCard`, src/bench/card.ts, about line 158, from `reachOn`), but no test checks it: the six card tests never look at `lawEffects`, and law-wiring-labor.test.ts checks the reach rows without opening anyone's card. A card that dropped the law or showed a raw key would pass today. Test that a person the law reached shows it on their card, worded, and that a repeal ends it there.

**Rules.** An effect is a read, not a record: the card shows the law only by reading the person's reach row, by record id. No hand-written player text: the card's line about the law is worded by the English engine or a control name, never a raw key or id (`player-screen-text`). One rule, all 56 places: the place is drawn from all 56 and named with its seed.

**Done when.** A test in a drawn place built with buildBenchWorld and the seed it prints enacts a town law that reaches a named resident, opens `personCard` for that resident and finds a `lawEffects` entry naming the reach row and the law by record id, with words free of raw keys; after the law's repeal the entry is ended; the M3-04 command names the test file.

**Files.** src/bench/card.ts, src/bench/card.test.ts, src/core2/law-reach/host.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-04 command (branch governing/m3-spec-commands). Related, not a twin: play-law-on-your-record-unreachable is the lane's item for the player's own record on Issues; this is any reached person's card. src/bench is the lane's; ask before editing.
