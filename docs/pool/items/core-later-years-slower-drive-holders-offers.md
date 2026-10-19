---
id: core-later-years-slower-drive-holders-offers
title: "A town's second and third years run 1.5 and 2.3 times slower than its first because activists are offered more acts each year (Bedford, Wyoming)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A town's second and third years run 1.5 and 2.3 times slower than its first because activists are offered more acts each year. The drives engine keeps growing the list of acts it offers and re-reads it for every holder every day. Make the daily cost depend on what changed that day, with the offer list kept bounded by what a holder can actually act on, so a later year costs about what the first did.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base; never scan a whole history every day. Sliding scales and causes: trimming offers must follow from the holder's drives and means, not a cutoff or a roll.

**Done when.** In a drawn place such as Bedford, Wyoming, `buildBenchWorld` with every module installed runs three played years on one process; the third year takes no more than 1.2 times the first, measured by the bench timing on the same machine, and the holders' chosen acts match the unbounded run by record id.

**Files.** src/core2/modules/drives.ts, src/core2/drives.test.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
