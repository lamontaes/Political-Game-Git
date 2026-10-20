---
id: web-coverage-reads
title: "Health coverage reads the outcome web once the coverage record lands"
area: people
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/web-coverage-reads
pr:
blocked-on:
after: people-coverage-counted
source: added with npm run pool -- add
claimed-at: 2026-10-20T10:40:55.490Z
---

**What.** Five links move health coverage only in the web's ledger (unemployment-to-uninsured, medicaid-expansion-to-coverage, work-requirement-to-coverage, marriage-equality-to-coverage, medicaid-expansion-to-medical-debt), stopgap SG-EW-HEALTH-coverage-record. When the coverage record from PR #5475 is on main, the coverage decision multiplies its own rate by webReach(api, placeId, 'health.uninsured-pct', subject) with age, sex and income fifth; unemployment-to-uninsured already carries a researched moderator by sex and age (Cawley, Moriya and Simon 2015).

**Rules.** An effect is a read, not a record; one model, two tiers; no dice.

**Done when.** In a drawn bench world, a twin shift of the unemployment-to-uninsured effect changes coverage records for men more than women, by record id; SG-EW-HEALTH-coverage-record resolved; the unwired list regenerated.

**Files.** src/core2/modules/coverage.ts, src/core2/health-web.ts

**Notes.** TODO
