---
id: tests-health-schools-line-chain-follows-one-person
title: "The health-schools family test's budget-line chain names a person and a payment from different chains"
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** For the welfare, health, schools and higher education lines, `src/core2/law-wiring-health-schools.test.ts:675-698` prints an applied record, a person and a journal entry that are not one chain: the person's record and the payment come from different people or different dates (found by the health-schools helper, Oct 25). In Montgomery, Michigan (seed 5bc87ba8c575d498bfcfbac8353c3cae24df7a433ca9e816da727ccfaff83c9e) the welfare line's record for `person_bcdb90b24cb328c1` is dated September 1, 2025 while the journal entry it cites, `journal:2025-03-07:16293`, is March 7, 2025; in Greenwood, Indiana (world seed 38164ec10219eff4fb4fe05999ad9366675fd67a414691444009f6a1695797cf) the entry cited is a February 2, 2026 payment of a different obligation.

**Rules.** The chain is the acceptance: one dollar or one rule is followed to a named person and back out, by record id, so the person and the payment must be the same chain.

**Done when.** For each of the four lines, the family test names a person, that person's own applied record and a journal entry that pays that person or their household under the changed line, asserted to match by id, and the test passes on Montgomery, Michigan (seed 5bc87ba8c575d498bfcfbac8353c3cae24df7a433ca9e816da727ccfaff83c9e) and on a fresh drawn seed named in the PR.

**Files.** src/core2/law-wiring-health-schools.test.ts

**Notes.** From the laws lead, Oct 25, on the health-schools helper's report.
