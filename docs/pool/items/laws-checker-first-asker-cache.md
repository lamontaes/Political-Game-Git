---
id: laws-checker-first-asker-cache
title: "The law-wiring checker credits whichever engine first fills a per-day law cache as the law's reader"
area: laws
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The justice helper found on Oct 24 that restore-voting-after-sentence grades its systems link wired only in a third drawn place (Reddington, Indiana, seed 7c6e6a3aa5e6453d), because elections.ts:693 happened to fill the shared per-day election-law cache in src/core2/law-reach/group-a-voting.ts first. In Prescott, Michigan and Uehling, Nebraska the trace names only the interest-groups engine. The checker in scripts/law-wiring/check.ts records the stack of whichever call reads the laws table, so a cached read hides every later engine that reads the same law the same day. Combined by the Oct 25 audit, one change in one seam; the parts folded in: laws-checker-file-reads-many-laws (The law-wiring checker credits a payment to every law its file reads, not the law the call read); laws-checker-pass-through-poster (The law-wiring checker credits a pass-through payment helper, not the engine that read the law and paid); laws-checker-advocacy-money (The law checker counts interest-group dues and drive donations that name a law as the law's own money). Each part's own done-when line is listed in Notes and is part of this item's acceptance.

**Rules.** An effect is a read: the checker must credit each engine that reads the law at the moment it decides or pays, not the first caller of a cache. One rule, all 56 places: the same crediting holds in every drawn town, whichever engine runs first.

**Done when.** scripts/law-wiring/check.ts credits every engine that reads a law through a per-day cache, shown in a played world (buildBenchWorld, seeds a91c03e7d2b84f10 and 5e27b0c4196fd3a8) where restore-voting-after-sentence names the voting or elections engine by file and line as a reader. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** scripts/law-wiring/check.ts, src/core2/law-reach/group-a-voting.ts, scripts/law-wiring/matrix.ts

**Notes.** From the laws lead's justice helper, Oct 24 (branch claude/laws-nine-links-justice).

Folded in Oct 25 from laws-checker-file-reads-many-laws. Its done when: `scripts/law-wiring/check.ts` credits a post as direct only when the call that made it read the law (the read and the post share a call path in the same day's step), and a rerun of the housing-credit family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows the by-right and inclusionary laws' money no longer resting on a down payment, by journal id, while every other family's matrix rows keep their grades or say why they changed.

Folded in Oct 25 from laws-checker-pass-through-poster. Its done when: `scripts/law-wiring/check.ts` credits a post made through a pass-through helper to the engine below it only when that engine read the same law in the same call, and a rerun of the housing-credit family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows the counsel and rent-help laws' money as direct, by journal id, with no law gaining direct money from another law's engine.

Folded in Oct 25 from laws-checker-advocacy-money. Its done when: `scripts/law-wiring/check.ts` leaves dues, donations and other advocacy posts out of a law's cited money (by the post's source kind), and a rerun of the rights-env family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows those four laws' money cells resting on the law's own payment or graded honestly, by journal id.
