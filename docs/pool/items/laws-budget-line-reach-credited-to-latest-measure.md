---
id: laws-budget-line-reach-credited-to-latest-measure
title: "A raised spending line's reach is credited to whichever measure changed the line last, at any level"
area: laws
kind: bug
priority: 1
size: M
status: claimed
standard: 2
claimed-by: Account lead thread "Check state and federal laws take effect"
pr:
after:
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 14, 2026 (/mnt/project-files/laws/take-effect.md)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** When the state raises a spending line that a town reader pays out (welfare and Medicaid, health and hospitals, natural resources), the people it reaches are recorded under another law: the last town or county ordinance that touched the same line. A state welfare raise passed; three weeks later the assistance benefit reached 22 people in town and 509 counted people, all credited to the town council's ordinance 2025-2, and the state bill's own page shows only the money sent to the outside account. Seen: dev mode's bill card and the law page's "What this did" for the state bill, and for the ordinance.

**Cause.** Measured: Eveleth, Minnesota (2719934), seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, Train 8b6c8903 (probe /mnt/project-files/laws/probes/active.ts): after state bill HF 4 raised welfare and Medicaid on Jan 20, the line's active row named HF 4; on Feb 4 the Eveleth council's ordinance 2025-2 amended the city's welfare line and the row named 2025-2 from then on; natural resources and health and hospitals did the same with ordinances 2025-5 and 2025-10. (Police is not this fault: src/core2/public-safety.ts `serviceOf` polices the town from its city and county lines and reads the state's line only where neither has one, so a state police raise rightly leaves the town's police service to the county's ordinance 2025-6.) Found in code: src/core2/law-reach/group-b-store.ts `setActive` keeps one active row per key (`budget-line:<line>`) for every government; src/core2/law-reach/group-b.ts `runBudgetLine` reads the line's level summed over every government (`lineLevel` in group-b-money.ts, which keeps each government's change in `byGovernment`) and records all of its reach under the one law id it was called with, and the monthly close re-runs it with that row's id (`runBenefitPrograms`, `rerun`).

**Fix.** Credit a line's reach to each law that changed it, by its share of the change, using the treasury's own credit for each government's line (`carriedMeasureOf` in src/core2/modules/budgets.ts, the measure whose change the treasury's `raisedBy` pays under), else the last act that government's level passed: `runBudgetLine` keeps the act at each level on the active row (`byLevel`) and writes one reach row per person, employer and group, named for the law with the largest part and carrying every law's share (`credits`); `lawReach` and `reachedBy` read a row for every law in its credits. No new store and no new engine.

**Time box.** 4 hours for one Opus session at medium effort.

**Rules.** The chain is the acceptance: each law's own reach is followed to its own people. One model, two tiers.

**Done when.** A second session, not the builder, passes a state welfare raise in dev mode in a drawn place and runs two monthly closes while the town's own bodies act; the state bill's card and "What this did" name the people its share reached, and any town ordinance on the same line names only its own share.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-store.ts, src/core2/law-reach/group-b-money.ts, src/core2/budgets-treasury.ts
