---
id: laws-checker-first-asker-cache
title: "The law-wiring checker credits whichever engine first fills a per-day law cache as the law's reader"
area: laws
kind: bug
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The law-wiring checker credits whichever engine first fills a per-day law cache as the law's reader. The justice helper found on Oct 24 that restore-voting-after-sentence grades its systems link wired only in a third drawn place (Reddington, Indiana, seed 7c6e6a3aa5e6453d), because elections.ts:693 happened to fill the shared per-day election-law cache in src/core2/law-reach/group-a-voting.ts first; in Prescott, Michigan and Uehling, Nebraska the trace names only the interest-groups engine. A cached read hides every later engine that reads the same law the same day. Three narrower faults are folded in: the checker credits a payment to every law its file reads, it credits a pass-through payment helper instead of the engine that read the law and paid, and it counts interest-group dues and drive donations that name a law as the law's own money.

**Cause.** Found in code: `readerFrame` in scripts/law-wiring/check.ts (line 117) records the stack of whichever call reads the laws table, and the per-day cache in src/core2/law-reach/group-a-voting.ts (the `cache` WeakMap, line 94) answers later readers without a read, so only the first asker is credited.

**Fix.** Credit every engine that reads a law through a per-day cache (record the readers at the cache hit, not only the fill). Credit a post as direct only when the call that made it read the law (the read and the post share a call path in the same day's step). Credit a pass-through poster to the engine below it only when that engine read the same law in the same call. Leave dues, donations and other advocacy posts out of a law's cited money by the post's source kind.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read: the checker must credit each engine that reads the law at the moment it decides or pays, not the first caller of a cache. One rule, all 56 places: the same crediting holds in every drawn town, whichever engine runs first. This is a check, not play: the player notices only that the game keeps running.

**Done when.** A second session, not the builder, reruns scripts/law-wiring/check.ts in played worlds (`buildBenchWorld`) at the drawn places Prescott, Michigan (seed a91c03e7d2b84f10), Uehling, Nebraska (seed 5e27b0c4196fd3a8) and Reddington, Indiana (seed 7c6e6a3aa5e6453d). restore-voting-after-sentence names the voting or elections engine by file and line as a reader in each; the housing-credit family's by-right and inclusionary laws no longer rest their money on a down payment and the counsel and rent-help laws' money is direct, by journal id; the rights-env family's four laws' money cells rest on the law's own payment or are graded honestly, by journal id; and every other family's matrix rows keep their grades or say why they changed.

**Waits on.** Nothing.

**Files.** scripts/law-wiring/check.ts, src/core2/law-reach/group-a-voting.ts, scripts/law-wiring/matrix.ts

**Notes.** From the laws lead's justice helper, Oct 24 (branch claude/laws-nine-links-justice). Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it makes the law checker credit the right engine in a grade nobody but the crew reads.

Folded in Oct 25 from laws-checker-file-reads-many-laws. Its done when: `scripts/law-wiring/check.ts` credits a post as direct only when the call that made it read the law (the read and the post share a call path in the same day's step), and a rerun of the housing-credit family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows the by-right and inclusionary laws' money no longer resting on a down payment, by journal id, while every other family's matrix rows keep their grades or say why they changed.

Folded in Oct 25 from laws-checker-pass-through-poster. Its done when: `scripts/law-wiring/check.ts` credits a post made through a pass-through helper to the engine below it only when that engine read the same law in the same call, and a rerun of the housing-credit family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows the counsel and rent-help laws' money as direct, by journal id, with no law gaining direct money from another law's engine.

Folded in Oct 25 from laws-checker-advocacy-money. Its done when: `scripts/law-wiring/check.ts` leaves dues, donations and other advocacy posts out of a law's cited money (by the post's source kind), and a rerun of the rights-env family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows those four laws' money cells resting on the law's own payment or graded honestly, by journal id.
