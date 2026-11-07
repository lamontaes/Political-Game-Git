---
id: law-levels-starting-law-repeal-audit
title: "Every active starting law has an authorized body and reversal bill"
area: laws
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Add the owner-requested generated-world test that walks every active starting law row and names a body with an authorized bill route to reverse it. Existing catalog audits hide the missing unemployment-insurance route behind an incorrect claim that states cannot repeal it.

**Rules.** Do not skip an active law or accept an unsupported declared exemption. Preserve state wage bars. Reuse the existing catalog, authority and body readers. Treat reader or drafting fixtures as such, not as played votes. 26 USC 3304(a)(19) expressly reserves state legislative amendment and repeal.

**Done when.** In a randomly drawn generated game the test walks every active starting law row, prints the place replay law IDs and authorized body/bill routes, and finds no missing route. New tests fail before missing routes are repaired and pass on ten fresh draws after. Any calibration fact wrongly stored as law is corrected at its producer, not skipped by the test.

**Files.** src/core2/starting-law-repeal-routes.test.ts,scripts/law-wiring/catalog.ts,law-level follow-up fixes

**Notes.** Astra owner-goal item 1. One session, no helpers, initial two-hour diagnostic pass followed by bounded fixes. Keep a draft PR while the exhaustive assertion fails; do not merge a failing audit or declare the owner goal done. Known probes show unemployment-insurance and local-sales-tax-average lack direct routes; local-minimum-wage-authority has an existing policy-writer alias that must be verified.
