---
id: tests-budgets-public-pay-intermittent
title: "budgets-public-pay.test failed once in three runs on its fixed seed (Marlborough, New Hampshire): the treasury paid 11,549,162 cents against 12,181,567 on the payroll ledger"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/budgets-pay-intermittent
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T20:03:50.985Z
---

**What.** src/core2/budgets-public-pay.test.ts plays 90 days in Marlborough, New Hampshire on its fixed seed 109a7b3b1d5c1715d738e7b8ca9deec614910239 and expects the public employers' wages drawn from the treasury to equal what the payroll ledger says was paid. On Oct 24 it failed once at line 81, expected 11549162 to be 12181567, in a run of six budgets and withholding test files at two workers on a 4-core container, then passed alone and again in the same six-file run. A fixed-seed world should give the same number every time, so something in the run depends on more than the seed, or the test reads a ledger that can include pay the journal hook did not see.

**Rules.** No dice: the same seed and place play the same 90 days, so find what differs between the failing and passing runs instead of retrying. Wire to the world: every public paycheck the ledger counts is a journal entry out of the government's treasury, named by entry id. Never weaken a test: the equality stays exact.

**Done when.** The cause of the 632,405-cent gap is named by file and line with the paycheck or journal entry ids involved, the test passes in ten runs in a row of the same six files at two workers, and a drawn place also passes with its seed named.

**Files.** src/core2/budgets-public-pay.test.ts, src/core2/modules/budgets.ts

**Notes.** The failing run was on PR #5845's branch with PR #5782's change applied (each withholding posting's id names its tax, src/core2/modules/budgets.ts). The same test passed on that branch without the change once, and with it twice, so whether the change matters was not established.

Oct 24, 2026 (claude/budgets-pay-intermittent): not intermittent on main; it fails every run on this seed, alone too. The gap is the New Hampshire treasury's recorded shortfalls on the February 27 and March 27, 2025 paydays for two state workers in Marlborough (640,051 cents on main), which the authority paid and recorded (`src/core2/public-work-pay.ts:244`). The test compared the treasury's draws alone with the ledger; it now adds the recorded shortfalls. Found on the way: housing construction pays a builder's materials to the first organization in the place with an outside flow, which can be a public employer (separate item). Ten runs of the six files at two workers on Oct 25: this test passed in all ten; budgets.test.ts lost its worker at the 2 GB heap limit in two, filed as tests-budgets-worker-heap-limit.
