---
id: gov-permit-fee-to-treasury
title: "A public-safety permit fee is paid to no treasury: it matches no outside-flow row in closures check 6"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** scripts/core2-year/closures.mjs check 6 lists public-safety:permit-fee transfers (src/core2/public-safety.ts) that match no row in src/core2/data/outside-flows.json. A permit fee is a government charge, so it should reach the treasury of the government that issues the permit and count in that treasury's charges, not leave the town unclassed. The player would see the fee in the issuing government's charges line.

**Rules.** Wire to the world: the fee moves the payer's money to the issuing government's treasury on the journal. Replace, never layer. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named), closures.mjs check 6 shows no unmatched public-safety:permit-fee transfers, and a named payer's permit fee reaches the issuing treasury by journal receipt and transfer id, in a test in src/core2.

**Files.** src/core2/public-safety.ts,src/core2/data/outside-flows.json

**Notes.** Found working gov-outside-revenue-fees (#5926).
