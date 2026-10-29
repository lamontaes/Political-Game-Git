---
id: words-journal-starting-law-unnamed
title: "The journal tells a law the person learned changed what they pay even when it is a starting law with no bill"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #6721
blocked-on:
source: added with npm run pool -- add
lead: words
---

**What.** src/director/journal-law-effect.test.ts fails on clean main with GOLDEN_PATH_SEED=e27ddbf44d3f2d4eb844f02493895cdc43718647: Randolph, Maine (2361735), seed 5ef6c0df7ff16cd2e5aa641ecc12d40b248a3df463da723a1415cfd513f60f5e. The resident learned on February 3, 2025 that the state's clean electricity standard (event:law.effect-learned:2025-02-03:person_cec9cb5c80bb2b17:law:US-ME:state:us-policy-positions:environment-energy.clean-electricity-standard:general:starting) changed what they pay, and no journal line cites it. The law is a starting law with no enacting bill, so the journal row's lawName read finds no name and the moment is skipped; the same day's Free Fares for Riders Act line is told.

**Rules.** Words from banks through one picker; no hand-written player text; a starting law is named from its own law record or policy name, never a raw key; one rule, all 56 places.

**Done when.** journal-law-effect.test.ts passes with GOLDEN_PATH_SEED=e27ddbf44d3f2d4eb844f02493895cdc43718647 and on two random seeds, each named, with the line citing the law.effect-learned record id of a starting law.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json

**Notes.** TODO
