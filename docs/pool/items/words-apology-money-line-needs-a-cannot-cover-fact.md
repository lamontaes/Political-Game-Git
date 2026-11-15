---
id: words-apology-money-line-needs-a-cannot-cover-fact
title: "The apology's money reply 'I don't have it right now' waits for a record that says the player cannot cover what is owed"
area: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc6-scenes-repeat
source: Words lead's what-will-you-do lines, Nov 14; found by M1 building #9290
checked: M1 2026-11-15
---

**What.** The Words lead's reply "I don't have it right now. I'll pay it when I do, and I won't dodge you." is true only when the player cannot cover what the housemate is owed. No record says that today, so the line is not in the bank (account lead, Nov 15: it stays out until the fact exists). Seen: the apology's money talk offers only promises the books support.

**Cause.** Found in code: the scene facts set in `purpose-scene.ts` (function `purposeScene`) carry the quarrel and the strain but not the housemate's share the player cannot pay, and the household money record the quarrel module writes from (`src/core2/modules/quarrel.ts`) keeps no shortfall the director could read. Without it the line would make the player say something the books contradict.

**Fix.** Have the scene read the player's balance against the missed amount from the household journal (the engine that wrote the missed payment), set a scene fact `cannot-cover` when the balance is short, and write the Words lead's line to the bank with `requiresFacts: ["cannot-cover"]` on the money arc's promise move. No new record: read what the payment engine already keeps.

**Time box.** 3 hours, Sonnet.

**Rules.** Wire to the world; no dice (the balance decides); estimate, never unknown; an effect is a read.

**Done when.** In a generated world with a missed payment the player cannot cover, the line is offered and in the same world with a covered payment it is not, each named by record id; a second session replays both in the running game and names the place and seed.

**Waits on.** #9290 folding.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/apology-variants.test.ts

**Notes.** Filed by M1 on claude/words-machine-pin-apology.
