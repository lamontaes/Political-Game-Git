---
id: tests-counted-moves-balance-and-fit-once-run-minutes
title: "The counted-moves balance and fit-once tests take 10 to 20 minutes a case instead of about a minute"
area: core
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: "carry #9326 gate run"
claimed-at:
checked:
---

**What.** `src/core2/counted-moves-fit-once.test.ts` and `src/core2/counted-moves-balance.test.ts` are far over the one-minute pinned-test bar. Cut each to about a minute in its named place and seed without loosening what it asserts. Guards: the counted-moves engine, so a change to it is checked in a minute, not an hour.

**Cause.** Measured: with `npx vitest run src/core2/counted-moves-balance.test.ts` and `npx vitest run src/core2/counted-moves-fit-once.test.ts` at head 58ed9316 (train 8b6c8903, one process, Washington, D.C. seed 03dcde00232799ad5a2d214a30f002cd0307b7fb75772dac9043e2952235cf4e and Futiga, American Samoa seed dpA, in the tests) fit-once ran 4 cases in 566 s, and balance ran 934 s for its Washington, D.C. three-year case, about 15 to 20 minutes for Futiga, American Samoa, and 1,249 s for the immigration-law twin. Found in code: each case builds a whole played world and plays two to three whole years day by day (balance loops three years per case; the fit-once tax twin plays two years twice, with and without the law), then reads the people held. Both files are on the train already; the carry changed only a few lines of balance and the fit-once assertions, and I did not measure the train's own times, so the lengths are not shown to be new.

**Fix.** Design: read the same people counts from a world played only as far as the first moves month and the first year end (the tier's flows are monthly and the yearly rate is read at the year turn), and keep the three-year drift as one case that runs apart from the gate; stage the twin law with the law already in force at the start date instead of playing into it. No assertion is loosened.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes and set the state honestly with a one-line note.

**Rules.** Pinned tests (named place, fixed seed, explicit timeout near twice the measured time, no draw loops). Never loosen an assertion.

**Done when.** A second session, on main, runs both files and sees each case of both files passes in its named place and seed in about a minute, the assertions are the same ones (people within 1.5 percent a year, the tax twin's difference, the abroad arrivals), and the measured time of each case is in the PR body.

**Waits on.** PR #9326 folding.

**Files.** src/core2/counted-moves-fit-once.test.ts, src/core2/counted-moves-balance.test.ts

**Notes.** Filed by F5 on the #8412 carry (PR #9326), Nov 14.
