---
id: gov-paid-leave-claims
title: "Paid family leave pays wage replacement to the people who take leave"
area: laws
kind: feature
priority: 3
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: none
source: stand-in triage T1, Nov 10, 2026 (docs/stopgaps/triage-2026-11-10/gov-a.md)
---

**What.** A paid family leave law collects a payroll premium into the government's treasury and never pays a benefit. Add the claim and the payment: a covered worker with a birth, an adoption or a relative's serious illness takes leave, and the treasury pays wage replacement through the one benefit payer. Seen: in the paychecks of people who take leave and in the state's paid leave line on the budget screen.

**Cause.** Found in code: src/core2/paid-leave.ts line 31 (stopgap SG-GOV-REACH-A-leave-claims, open in src/core2/data/stopgaps/gov.json): the law collects the premium through paidLeavePremium from paychecks (full) and counted wages, and nothing pays leave back; src/core2/law-reach/group-a-money.ts line 96 (the paidLeave handler) only sets the premium.

**Fix.** Reuse what exists; add no second payment path. The premium is already collected by `paidLeavePremium` in `src/core2/paid-leave.ts` into the program treasury (`paidLeaveProgram`), and the one benefit payer is `payBenefits` in `src/core2/law-reach/group-b-money.ts` (owed monthly from a government's treasury through the accounts, named and counted households alike). Change `paidLeaveProgram`'s caller in `src/core2/law-reach/group-a-money.ts` (the `paidLeave` handler) to register leave claims, and pay them through `payBenefits` (extending its input with a leave service row) rather than a new transfer. A claim comes from the health and family records that already exist (a birth, an adoption, a relative's illness) read by the worker's own traits, money and the law's benefit terms (weeks and replacement rate, SOURCED per place in data/research/laws/); counted households read the same rule times their count; the worker's job records the days away. Cheap: claims are created when the health or family record is written and paid monthly. Delete the stopgap row and marker.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the result must move money, people or places in a generated world, in all 56 places. One rule, all 56 places: nothing names a state, county or city in code; place facts live in data. Every number lives in a parameter table tagged SOURCED, ESTIMATED or TUNABLE. Speed: the work runs monthly or on the day something changes and keeps a played year under two minutes (npm run speed:year).

**Done when.** A second session plays one year of buildBenchWorld in a drawn place from all 56 whose state has the law in force (place and seed written down) in the running game's dev mode, and finds one named worker with a birth or illness record who took leave, the benefit transfer from the program treasury to that worker by record id, the premium that funded it, and the worker's paycheck that month; a counted household shows the same by the same rule. The stopgap SG-GOV-REACH-A-leave-claims is resolved in src/core2/data/stopgaps/gov.json and the paid-leave test passes.

**Waits on.** Nothing.

**Files.** src/core2/paid-leave.ts, src/core2/law-reach/group-a-money.ts, src/core2/modules/health.ts, src/core2/modules/budgets.ts, src/core2/data/laws/reach-group-a-parameters.json, src/core2/data/stopgaps/gov.json

**Notes.** Written by the stand-in triage (T1). The lead adds the checked line after reading.
