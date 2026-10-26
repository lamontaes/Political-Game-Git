---
id: web-coverage-reads
title: "Health coverage reads the outcome web once the coverage record lands"
area: people
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: claude/web-coverage-reads
pr: #5661
blocked-on:
after: people-coverage-counted
source: added with npm run pool -- add
claimed-at: 2026-10-20T10:40:55.490Z
---

**What.** Five links move health coverage only in the web's ledger (unemployment-to-uninsured, medicaid-expansion-to-coverage, work-requirement-to-coverage, marriage-equality-to-coverage, medicaid-expansion-to-medical-debt), stopgap SG-EW-HEALTH-coverage-record. When the coverage record from PR #5475 is on main, the coverage decision multiplies its own rate by webReach(api, placeId, 'health.uninsured-pct', subject) with age, sex and income fifth; unemployment-to-uninsured already carries a researched moderator by sex and age (Cawley, Moriya and Simon 2015). The five links then move a person's own coverage record instead of a ledger number, and the ledger-only path is deleted in the same change.

**Rules.** An effect is a read, not a record; one model, two tiers; no dice.

**Done when.** In a drawn bench world, a twin shift of the unemployment-to-uninsured effect changes coverage records for men more than women, by record id; SG-EW-HEALTH-coverage-record resolved; the unwired list regenerated.

**Files.** src/core2/modules/coverage.ts, src/core2/health-web.ts

**Notes.** TODO

Oct 24 (claude/web-coverage-reads, finishing it on top of the fixed people-coverage-counted): the coverage review (modules/coverage.ts holdersToday) gives each worker their own share of employer-plan slots: 1 less the uninsured part (1 less the national share) times `webReach(api, placeId, "health.uninsured-pct", {age, sex})`, in the same rank order as before (identical when the factor is 1). Full and counted workers read it by the same rule; the factor is not asked for state officials, who live outside the town's web. The unemployment-to-uninsured link on main already carries the sex and age moderators (Cawley, Moriya and Simon 2015: men 1.67, women 0.50 by sex, age bands for men), so this branch takes main's row; an earlier version of this branch set women to 0, which the paper's table does not say. `coverage-web.test.ts` plays two worlds opened alike (one after the other) to the April review; in one the link's effect on the web's month row is raised by 0.2 the day before; it compares who holds an employer plan in their own name, by coverage record id, as a share of each sex's plans. Women lose plans too under the shift (their weight is 0.5, not 0) and a household's policy can pass to the wife when her husband's ends, so the test compares shares, not counts, and prints both. SG-EW-HEALTH-coverage-record exists on main and is resolved; the medical-debt link (no household debt record) and the marriage-equality link (no running cause) stay open in the new SG-EW-HEALTH-medical-debt-reader. The factor uses age and sex only; an income-fifth moderator would need a link that carries one (none of the uninsured links has `varies` by income).
