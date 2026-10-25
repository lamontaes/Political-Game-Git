---
id: laws-checker-own-payment-rules
title: "The law checker credits a law only with its own payment: other laws' payments left out, its payees followed, the earliest of equals"
area: laws
kind: wiring
priority: 1
size: S
status: claimed
claimed-by: claude/law-checker-own-payment-rules
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The labor family (#5589) merged with the first version of the checker's own-payment rule, which picks a law's own payment from the payments of those it reached, against the control world. Three flaws showed in the redone year runs. In Prescott, Michigan, the public pay floor's pick was a few cents of electricity charged under the clean electricity standard, ten days before the raised paycheck. Right to work's one real payment, a union local's dues, was outnumbered by thirty-eight workers recorded under a right that names no money. In Cambridge Springs, Pennsylvania, the spending a raise allows beat the paycheck on money moved. This item lands the three fixes and the labor and government runs redone on them.

**Rules.** Ask why: every pick names its payer, payee, journal id and treatment and control amounts. An effect is a read. Never weaken a check to pass.

**Done when.** `scripts/law-wiring/own-payments.ts` leaves out payments made under other laws, follows only the targets whose records name money where any do, and prefers the earliest of equally shared payments, each with a case in `scripts/law-wiring/own-payments.test.ts` that fails without its rule; the labor and government year runs in a played world (`buildBenchWorld`, Prescott seed a91c03e7d2b84f10 and Uehling seed 5e27b0c4196fd3a8, plus the two third places) are redone on it; and `docs/reports/law-wiring-matrix.json` grades every labor and government law wired on all nine links or not applicable, each money cell naming the law's own payment by journal id.

**Files.** scripts/law-wiring/own-payments.ts, scripts/law-wiring/check.ts, scripts/law-wiring/matrix.ts, docs/reports/law-wiring/families/

**Notes.** Laws lead, Oct 25. Branch `claude/law-checker-own-payment-rules`, cut from main after #5589 merged.
