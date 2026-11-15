---
id: core-term-read-warmup-blinds-the-first-fifteen-months
title: "For a world's first 15 months no campaign or address can read what the term did, because the term read skips the first year"
area: core
kind: bug
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
after: campaigns-lean-toward-the-area-the-term-hurt
source: account lead thread "Give rivals more than one issue", Nov 14 (the campaign tilt probe, #9303; owner Nov 14 19:27Z: "it's all one simulation")
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** A world in motion on day one already has a term behind it, but the term read ignores the web's first 12 months and needs 3 more, so campaigns and addresses opened before about April of the second year read nothing. Seen: seed t2 (speed:year), 63 campaign openings by January 2027, all 63 read nothing (17 town, 46 state); the town races opened 2026-01-30 and 2026-02-06 with the web starting 2025-01. By year 4 the same world reads non-empty (pay -0.64, jobs 0.30, need up to 0.635). Seen: a first-year campaign's platform shares equal the untilted ones in every world.

**Cause.** Found in code: src/core2/term-read.ts `rowsOf` starts at the later of the term's start and the web's first month plus `warmupMonths` (12, ESTIMATED), and `placeTermRead` returns nothing under `minimumMonths` (3); the web writes its first row at the game's start, with no history before it (SG-WORDS-term-read-warmup).

**Fix.** Seed the web with the months before the game's start for the place's sitting terms (the opening warm-up the skills thread is building), so a read exists on day one; then lower or delete `warmupMonths`. A term's own record from before the game is generated, never a typed number.

**Time box.** 6 hours for an Opus session.

**Rules.** Replace, never layer: the warm-up seed replaces the skipped first year and its stopgap, never a second read beside it. Sliding scales and causes: the lean stays a weight on the record, never a roll.

**Done when.** A second session sees, at a place drawn from all 56 (name the place and seed), a campaign opened in the world's first year whose platform shares differ from the untilted ones and a governor's or mayor's first address that opens on a hurt area, by record id in a played world.

**Waits on.** campaigns-lean-toward-the-area-the-term-hurt (#9303).

**Files.** src/core2/term-read.ts, src/core2/data/term-read/areas.json, src/core2/outcome-web-model.ts, src/core2/modules/campaigns.ts

**Notes.** Filed Nov 14 by hand.
