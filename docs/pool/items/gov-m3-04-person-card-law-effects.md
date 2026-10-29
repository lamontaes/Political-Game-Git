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

**What.** M3-04's test sentence says an enacted ordinance reaches specific named people who are clickable, with the law on their records. Clicking a person opens `knownCard` (src/bench/card.ts, about line 657, served as `/api/known` at handler.ts about line 1238 and fetched by play.mjs about lines 974 and 1690), which has no law field at all; the only reader of the law-reach rows is `lawEffects` in `personCard` (about line 158, from `reachOn`), and `personCard` is fetched only for the player and read only for the name. So no screen shows a reached person's law. Add the law effect to the card a click actually opens (`knownCard`), worded, and test that a person the law reached shows it there and that a repeal ends it.

**Rules.** An effect is a read, not a record: the card shows the law only by reading the person's reach row, by record id. No hand-written player text: the card's line about the law is worded by the English engine or a control name, never a raw key or id (`player-screen-text`). One rule, all 56 places: the place is drawn from all 56 and named with its seed.

**Done when.** A test in a drawn place built with buildBenchWorld and the seed it prints enacts a town law that reaches a named resident, opens the clicked card (`knownCard`, as `/api/known` serves it) for that resident and finds the law's entry naming the reach row and the law by record id, with words free of raw keys; after the law's repeal the entry is ended; the M3-04 command names the test file.

**Files.** src/bench/card.ts, src/bench/card.test.ts, src/core2/law-reach/host.ts

**Notes.** Filed by the governing lead, Oct 29, from the M3-04 command (branch governing/m3-spec-commands). Related, not a twin: play-law-on-your-record-unreachable is the lane's item for the player's own record on Issues, which also reads only `lawEffects`; this is any reached person's clicked card. Review on the first pass found the item had pointed at `personCard`, which no click opens. src/bench is the lane's; ask before editing.
