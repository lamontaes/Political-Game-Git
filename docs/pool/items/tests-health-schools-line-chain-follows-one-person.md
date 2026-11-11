---
id: tests-health-schools-line-chain-follows-one-person
title: "The health-schools family test's budget-line chain names a person and a payment from different chains"
area: laws
kind: bug
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** For the welfare, health, schools and higher education lines, src/core2/law-wiring-health-schools.test.ts prints an applied record, a person and a journal entry that are not one chain: the person's record and the payment come from different people or different dates (found by the health-schools helper, Oct 25). In Montgomery, Michigan (seed 5bc87ba8c575d498bfcfbac8353c3cae24df7a433ca9e816da727ccfaff83c9e) the welfare line's record for person_bcdb90b24cb328c1 is dated September 1, 2025 while the journal entry it cites, journal:2025-03-07:16293, is March 7, 2025. In Greenwood, Indiana (world seed 38164ec10219eff4fb4fe05999ad9366675fd67a414691444009f6a1695797cf) the entry cited is a February 2, 2026 payment of a different obligation.

**Cause.** Found in code: src/core2/law-wiring-health-schools.test.ts lines 675 to 705 build the chain from an applied row and then take, through moneyTo, the first payment of the line's kind to anyone reached, so the person, the applied record and the payment need not be one chain.

**Fix.** Start from the journal entry that pays under the changed line, take its payee or household, and assert by id that the applied record and the person match, for welfare, health, schools and higher education. Drop the example person id from the item, since it belongs to a past world.

**Time box.** 3 hours.

**Rules.** The chain is the acceptance: one dollar or one rule is followed to a named person and back out, by record id, so the person and the payment must be the same chain. An effect is a read, not a record: the payment is read from the journal, not from a note.

**Done when.** A second session runs the family test in src/core2/law-wiring-health-schools.test.ts on Montgomery, Michigan (seed 5bc87ba8c575d498bfcfbac8353c3cae24df7a433ca9e816da727ccfaff83c9e) and on a fresh drawn seed named in the PR, and sees for each of the four lines a person, that person's own applied record and a journal entry that pays that person or their household under the changed line, matched by id.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-health-schools.test.ts

**Notes.** From the laws lead, Oct 25, on the health-schools helper's report. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it makes a test print one chain instead of two; the test passes and no player sees it.
