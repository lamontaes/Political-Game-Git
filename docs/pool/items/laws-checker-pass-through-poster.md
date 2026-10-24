---
id: laws-checker-pass-through-poster
title: "The law-wiring checker credits a pass-through payment helper, not the engine that read the law and paid"
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The checker names a post's engine by the first source frame on the stack outside the journal and accounts files. Some engines pay through shared helpers: `transferCash` (`src/core2/world-transfer.ts:40`) and `countedPayment` (`src/core2/counted-money.ts`). Their posts are then credited to the helper's file, which reads none of the laws, so a law whose own engine pays through them grades its money "wired, untraced" instead of naming the engine. Found by the housing-credit helper, Oct 24: the right-to-counsel lawyer (`counsel:<case>`) and rent help (`rent-assistance:<household>:<date>`) are decided in `housing.ts`, `housing-assistance.ts` and `credit.ts`, which read their laws, but post through those helpers. Skipping the helpers outright would credit every post they carry to the caller's file, and a caller that reads several laws would then get other laws' money, the false credit fixed by `laws-checker-day-loop-money-counted-as-reader`.

**Rules.** An effect is a read: a law's money is a post by the engine that read that law at the moment it paid, or a post that cites the law.

**Done when.** `scripts/law-wiring/check.ts` credits a post made through a pass-through helper to the engine below it only when that engine read the same law in the same call, and a rerun of the housing-credit family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows the counsel and rent-help laws' money as direct, by journal id, with no law gaining direct money from another law's engine.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts

**Notes.** From the laws lead, Oct 24.
