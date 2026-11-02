---
id: laws-took-effect-superseded-red-territory
title: "A scheduled federal wage row a statute overrode still records took effect in Aua, American Samoa (seed 2fa4d8f150b51d99)"
area: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/law-took-effect-superseded.test.ts fails on main (5cb91c07b3) at GOLDEN_PATH_SEED=2fa4d8f150b51d99: Aua, American Samoa (territory:AS:aua), world seed 29e996a3e03c344496c3705b3592bf712eece7248267d651059e106ba2c3353f. The test's overridden row law:US:federal:minimum-wage:general:test-scheduled still gets a law-took-effect record. Found by Words on Nov 2 while checking words-paper-law-and-budget-briefs-read-right.

**Rules.** Red by seed is red (red-main skill); a row a statute overrides never governs and never takes effect (laws-took-effect-for-row-not-in-force); one rule for all 56 places.

**Done when.** The test passes at GOLDEN_PATH_SEED=2fa4d8f150b51d99 and on three fresh draws, with the cause named by file and line.

**Files.** src/core2/modules/laws.ts, src/core2/law-took-effect-superseded.test.ts

**Notes.** TODO
