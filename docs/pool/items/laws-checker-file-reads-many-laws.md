---
id: laws-checker-file-reads-many-laws
title: "The law-wiring checker credits a payment to every law its file reads, not the law the call read"
area: laws
kind: bug
priority: 3
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The checker counts a post as a law's own money when the file that posted it read that law in the run (`ownPost` in `scripts/law-wiring/matrix.ts`, `direct` in `scripts/law-wiring/check.ts`). A file that reads several laws then has every one of its posts credited to each of them. In the housing-credit family's year run in Uehling, Nebraska (seed 5e27b0c4196fd3a8), one household's down payment on a home (`src/core2/modules/housing.ts:1122`) differed from the control world under both the by-right zoning law (7 cents, `journal:2026-01-06:99123`) and the inclusionary rule (`journal:2026-01-06:99294`). The matrix grades both laws' money wired on it, though neither law sets a down payment. Found by the laws lead on Oct 25, writing the housing-credit PR body.

**Rules.** An effect is a read: a law's money is a post made by the engine that read that law at the moment it paid, or a post that cites the law, never a post that merely shares a file with the law's reader.

**Done when.** `scripts/law-wiring/check.ts` credits a post as direct only when the call that made it read the law (the read and the post share a call path in the same day's step), and a rerun of the housing-credit family in Prescott, Michigan (seed a91c03e7d2b84f10) and Uehling, Nebraska (seed 5e27b0c4196fd3a8) shows the by-right and inclusionary laws' money no longer resting on a down payment, by journal id, while every other family's matrix rows keep their grades or say why they changed.

**Files.** scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts

**Notes.** From the laws lead, Oct 25.

Folded into laws-checker-first-asker-cache (Oct 25 audit).
