---
id: laws-teacher-minimum-misses-a-named-teacher
title: "The teacher minimum's record misses a named teacher in Hauula, Hawaii, so the health and schools law test fails on main"
area: laws
lead: laws-effects
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: laws lead helper, Oct 30 (claude/laws-medical-debt, the health and schools test on a fresh seed)
---

**What.** `src/core2/law-wiring-health-schools.test.ts` fails on GOLDEN_PATH_SEED=1b7d583357ade2cd7372, which draws Hauula, Hawaii (US-HI, 1512400, world seed 35b3f51d30bc9faad8b87df7c872033af9447a6c965644f9aab9d0c80edb2126): after the pay floor engine's own review for the day (`recordPublicPay`, `src/core2/public-pay-floor.ts`), the named teacher person_024ccd4437ed9dcf holds a public-school teacher job (`service:school`, `profession:teacher`, paid by the hour) but no applied row of raise-teacher-minimum-salary names them ("teacher person_024ccd4437ed9dcf is covered: expected false to be true", the test's line 602). It fails the same way on origin/main at 93f0475b17 and on claude/laws-medical-debt, so it is not the medical bills. Find why the law reach's teacher rows leave this teacher out (a teacher hired or filled in since the reach's last run, or a job the reach's selector reads differently from the test's `teachersOf`) and fix it at the root.

**Rules.** An effect is a read: the applied row must follow from the engine that sets the teacher's pay, not be written for the test. One rule, all 56 places: the fix holds for every place, with no path for one state. One model, two tiers: a teacher filled in from the counted population is covered by the same rule.

**Done when.** The health and schools test passes on GOLDEN_PATH_SEED=1b7d583357ade2cd7372 and on two fresh seeds, and the PR names the teacher's applied row by id or the reason the selector excluded them.

**Time box.** 2 hours, the laws lead or a Sonnet helper.

**Files.** src/core2/public-pay-floor.ts, src/core2/law-wiring-health-schools.test.ts

**Notes.** Filed by the laws lead helper, Oct 30, from a fresh-seed run of the health and schools test on claude/laws-medical-debt, then reproduced on main's code.
