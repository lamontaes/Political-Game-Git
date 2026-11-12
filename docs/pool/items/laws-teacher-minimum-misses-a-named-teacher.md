---
id: laws-teacher-minimum-misses-a-named-teacher
title: "The teacher minimum's record misses a named teacher in Hauula, Hawaii, so the health and schools law test fails on main"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: laws lead helper, Oct 30 (claude/laws-medical-debt, the health and schools test on a fresh seed)
after:
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** `src/core2/law-wiring-health-schools.test.ts` fails on GOLDEN_PATH_SEED=1b7d583357ade2cd7372, which draws Hauula, Hawaii (US-HI, 1512400, world seed 35b3f51d30bc9faad8b87df7c872033af9447a6c965644f9aab9d0c80edb2126): after the pay floor engine's own review for the day (`recordPublicPay`, `src/core2/public-pay-floor.ts`), the named teacher person_024ccd4437ed9dcf holds a public-school teacher job (`service:school`, `profession:teacher`, paid by the hour) but no applied row of raise-teacher-minimum-salary names them ("teacher person_024ccd4437ed9dcf is covered: expected false to be true", the test's line 602). It fails the same way on origin/main at 93f0475b17 and on claude/laws-medical-debt, so it is not the medical bills. Find why the law reach's teacher rows leave this teacher out (a teacher hired or filled in since the reach's last run, or a job the reach's selector reads differently from the test's `teachersOf`) and fix it at the root. Guards: a teacher's pay on their card reflects the teacher minimum the player passes.

**Cause.** Measured: `GOLDEN_PATH_SEED=1b7d583357ade2cd7372 npx vitest run src/core2/law-wiring-health-schools.test.ts` on main d604b3494b (Hauula, Hawaii, 1512400), with prints added and then removed. The engine is right; the test assumes the law it enacts stands all year. The test enacts the teacher minimum at the state level (`law:US-HI:state:...raise-teacher-minimum-salary:general:2025-01-23:health-schools-on`), and `holdTeacherPay` (`src/core2/public-pay-floor.ts`, line 270) raises person_024ccd4437ed9dcf and records them that day (`raised-to-teacher-minimum`, since 2025-01-23). Hawaii's own legislature is sitting in the played world, and it passes HB 12, which answers the question no from 2025-02-10 (`law:US-HI:state:...:2025-02-10:HB 12`). From then on `teacherFloor` (line 56) finds no yes, and `holdTeacherPay` ends every teacher row (`lawNoLongerApplies`), as a repeal should. When the test reads coverage on 2025-03-03 (line 602), `appliedOn` returns no open row, so the named teacher reads as not covered. A second cause now stops the same seed earlier: "no open voucher payment". Hauula has no family at a private school, and tuition is charged only to enrolled families (`src/core2/opening-private-tuition.ts`), so the voucher has nothing to pay. That is also right.

**Fix.** Test only, in `src/core2/law-wiring-health-schools.test.ts`. Read the teacher coverage against the law in force when it is read. Where `yesLevels(api, TEACHER)` still holds a yes, keep today's checks. Where a later law row answers no (the world's legislature repealed it), check instead that every teacher row on the key ended on that row's effective date. Name that row in the message, since repeal stopping the law is one of the nine links. Do the same for any other law in the family the world can repeal during the run. For the voucher, add to the test's playability check (the function before line 340 that says why a town cannot be played) the reason `no family pays private tuition` when the town has no `opening-private-tuition` contract, so the draw goes on and names the place passed over, as `drawn-place-tests` says. Do not loosen an assertion.

**Time box.** 1.5 hours for one Sonnet session.

**Rules.** An effect is a read: the applied row must follow from the engine that sets the teacher's pay, not be written for the test. One rule, all 56 places: the fix holds for every place, with no path for one state. One model, two tiers: a teacher filled in from the counted population is covered by the same rule.

**Done when.** A second session runs `src/core2/law-wiring-health-schools.test.ts` with GOLDEN_PATH_SEED=1b7d583357ade2cd7372 and on three fresh seeds (written down), and sees it pass. In Hauula, the test's message names HB 12 as the act that ended the teacher rows, or names Hauula as passed over for having no private school, and in a drawn place where the law stands it names person_024ccd4437ed9dcf or another named teacher covered by record id.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-health-schools.test.ts, src/core2/public-pay-floor.ts, src/core2/opening-private-tuition.ts

**Notes.** Filed by the laws lead helper, Oct 30, from a fresh-seed run of the health and schools test on claude/laws-medical-debt, then reproduced on main's code.

Nov 11 (cause finder for Fable B): reproduced on main d604b3494b with prints, since removed. The teacher law the test enacts on 2025-01-23 is repealed by Hawaii's sitting legislature (HB 12, effective 2025-02-10), so by the test's read on 2025-03-03 the engine has rightly ended every teacher row. The seed now also stops earlier on the voucher, because Hauula has no private-school family. Both fixes are in the test.
