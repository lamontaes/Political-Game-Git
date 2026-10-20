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

Oct 20 (claude/web-coverage-reads, stacked on #5475): built. The coverage review (modules/coverage.ts holdersToday) now gives each worker their own share of employer-plan slots: 1 less the uninsured part (1 less the national share) times `webReach(api, placeId, "health.uninsured-pct", {age, sex})`, in the same rank order as before (identical when the factor is 1). The item said unemployment-to-uninsured already carried a moderator by sex and age; it did not, so `varies` by sex is added to the link in links.json from Cawley, Moriya and Simon 2015 (men -1.67 points per point of unemployment, women and children not significant; adult shares 49 and 51 percent are rounded, not read from a table). Test: coverage-web.test.ts (twin worlds; the link effect raised to 0.5 on the web month row; men holding a plan fall, women unchanged, the factor cites the web month record id). SG-EW-HEALTH-coverage-record has no row in stopgaps.json (it names nothing the repo holds), so nothing to resolve; the other four coverage links still wait on the Medicaid reader and the marriage-equality law row. The sex bands apply to the other coverage links only if they gain `varies`.
