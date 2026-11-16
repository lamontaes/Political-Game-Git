---
id: world-town-businesses-sizes-from-county-size-bands
title: "A town's businesses of one kind all open the same size; the county's counts by size band would give one big grocery and several corner stores"
area: world
kind: gap
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: filed by the stores-and-clinics sizing thread, Nov 16
claimed-at:
---

**What.** A town now opens with as many businesses of each kind as its workers fill at the county's average business size, but every business of a kind gets the same number of workers. Real towns mix sizes: one large grocery and several small shops, one big plant and a few machine shops. The Census county file already holds each sector's establishments by size band, so the spread can come from data. Seen: dev mode's Businesses section on the Calendar lists every store with nearly the same workers.

**Cause.** Found in code: src/core2/opening-town-jobs.ts, function spreadTownBusinesses, deals a kind's jobs evenly (job n to business n mod count); the size bands (`sizeEstablishments` in data/source/county-business-patterns/regional-corpus.json.gz) are not exported by scripts/source/regional-money/export-town-employment.ts.

**Fix.** Export each county sector's establishments by size band beside the counts in scripts/source/regional-money/export-town-employment.ts, and have spreadTownBusinesses give the kind's businesses the county's mix of sizes (bands with withheld cells read the state's counties), keeping the count as it is. Seen in dev mode's Businesses section and in which businesses a closing or a law reaches.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the sizes come from the county's real size bands, never a tuned spread, and every business still holds at least one worker record.

**Done when.** A second session opens a drawn place, a city in its own county (seed of its choosing, named), and sees in dev mode's Businesses section that its stores and restaurants come in several sizes in about the county's mix, with the counts unchanged; a test names the place and seed.

**Waits on.** Nothing.

**Files.** scripts/source/regional-money/export-town-employment.ts, src/core2/reference/town-employment.generated.ts, src/core2/opening-town-jobs.ts, src/core2/town-establishments.ts

**Notes.** Offered to the owner as a later step of the stores-and-clinics sizing plan (Nov 16) and not yet approved; filed so it is not lost.
