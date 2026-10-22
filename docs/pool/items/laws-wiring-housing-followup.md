---
id: laws-wiring-housing-followup
title: "#5688 (law wiring, housing and credit) merged with no Pool item line and a typecheck 'clean apart from art-manifest errors'; run the full typecheck on main and show that law-wiring-housing.test.ts covers what rent-help.test.ts covered"
area: laws
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added by the acting CTO, Oct 22 merge sample
claimed-at:
---

**What.** PR #5688 merged on Oct 21 (0ba492e67f) with a body that opens on its checks, not a `Pool item:` line, and a typecheck reported "clean apart from art-manifest errors from a sparse checkout", which is not a clean typecheck. It also deleted src/core2/rent-help.test.ts (115 lines, one case: "pays renting heads monthly from the treasury, at most their rent, until the line is cut") and added src/core2/law-wiring-housing.test.ts (381 lines, one case: "wires every law in a played world"). Two things to settle on main: (1) `npm run typecheck` on a full checkout of current main is clean for this change set, and (2) the new test covers, by name, each thing the deleted one asserted: the helped head rents (a lease exists), the payment is at most the rent, a counted renter's help goes to the place's pooled account, the treasury has paid after a month, and cutting the housing line ends every payment obligation. The new test checks that the line reached a household and paid assistance, and its repeal loop skips KEYS.housing, so the last four look uncovered.

**Rules.** Never loosen or skip a test: a deleted test's assertions move into the replacement or come back; a typecheck with "apart from" errors is not a pass. Replace, never layer: the coverage goes into law-wiring-housing.test.ts, not a second rent-help file.

**Done when.** The PR body shows `npm run typecheck` on current main with zero errors (or names the art-manifest errors as a separate pool item on main with their first line), and a table with one row per rent-help assertion above naming the line in law-wiring-housing.test.ts that checks it or the hunk added for it; the changed test passes on a drawn place with the place and seed in the body; the laws-wiring-every-law item records #5688 in Notes as the housing and credit family's PR.

**Files.** src/core2/law-wiring-housing.test.ts, src/core2/housing-assistance.ts, src/core2/modules/housing.ts, docs/pool/items/laws-wiring-every-law.md

**Notes.** Found in the acting CTO's Oct 22 merge sample. The deleted file's body for reference: it amended the housing line up by three times housingAssistanceAnnualMinor, read the payments table of core2-law-reach-a-v1, advanced 40 days, then amended the line back down and expected every obligation's endedAt set.
