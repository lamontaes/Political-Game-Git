---
id: roadmap-m0-08-closures-check-opening-timing
title: "M0-08's closures check counts opening cash after the opening build but outside flows from before it, so 'every dollar balances' reads false by exactly the opening's outside postings"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** scripts/core2-year/closures.mjs (M0-08's command) reads openingCash after buildBenchWorld, but its outsideNet includes the journal entries the opening build already posted. In Dickens, Iowa (place key 1921360, seed 54e03066883f228dfe2b9acb51259d9f50dd7d3f92fa9a6d906d613dc601faa8) those 1,558 entries net to -2,228,171,046 cents, exactly the gap; every non-outside owner's cash matches its journal postings, so no engine makes or loses money. A fix reads the outside net at the same moment as openingCash and keeps strict equality. The check is a spec's test, which the M0-M2 lead may not edit, so this needs the CTO's word.

**Rules.** One rule, all 56 places: the balance check must hold in every drawn place, so the fix keeps strict equality and changes only when the outside net is read, never the tolerance.

**Done when.** With the CTO's ruling recorded in the item, closures.mjs reads the outside net when it reads openingCash, and 'every dollar balances: true' prints for Dickens, Iowa (seed above) and two more places drawn from all 56, named with seeds in the PR body; with an engine minting one dollar, the check fails.

**Files.** scripts/core2-year/closures.mjs

**Notes.** TODO
