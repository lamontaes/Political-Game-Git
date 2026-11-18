---
id: results-mode-files-fewer-candidates-than-played-time
title: "A player who skips years meets emptier ballots: skipped time files about 14% fewer candidates than the same years played"
area: elections
kind: bug
priority: 2
size: M
status: open
after:
blocked-on:
source: "Account lead G1 measure for the #8606 fix, Nov 14, 2026"
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** After the dev Skip, a race has fewer candidates on its ballot than the same race would have if the years had been played day by day: more races are uncontested and many have one candidate fewer. A player who skips years then meets ballots with one name where playing them would have given several. Seen: the race card's list of candidates in a skipped year's election, which holds fewer names than the same race played.

**Cause.** Measured: four drawn places, the same world seed built twice, one skipped four years with `advanceCore(core, end, { results: true })` and one played to the same day, counting every filing still standing (`standing` in src/core2/modules/elections.ts) on every race held before 2029-01-19, as the dead are not counted away: Humphrey, Nebraska (3123480, run seed 2301c649b103fd851e35f9c129a378d01722139e): 30 races, 52 filers skipped against 59 played, 17 uncontested against 15; Maybeury, West Virginia (5452588, 59a5f208ec60b2e40ea8f4744156f4b9a484124b): 22 races, 35 against 41, 9 uncontested against 7; Ririe, Idaho (1667960, aa11bb22cc33dd44): 33 races, 52 against 69, 18 uncontested against 14 (the 2027 council race has 1 filer skipped against 4 played); Pascoag, Rhode Island (4454460, ee55ff6600112233): 23 races, 71 against 76, 10 uncontested against 9. In total 210 filers skipped against 245 played (14% fewer) and 54 uncontested races against 45; of 108 races, 30 have fewer filers skipped, 6 have more and no race is empty either way. Skipped time weighs and files through `onResultsDay` in src/core2/modules/candidacy.ts (`candidacyDay`), which runs no person's own day, while played time also has people deciding on their own days; which of those played-time paths adds the missing candidates is not yet read.

**Fix.** Read which played-time path adds the filers skipped time lacks (a person's own day deciding to run, a party's ask answered, an incumbent's decision, a rival's entry) and let the results-mode day or month run the same rule for the people it can read from their records, with no dice, so the same race has the same candidates whether its years were skipped or played. Do not add candidates by a rate. Keep the skip fast: measure `speed:year` and the fast clock's year before and after.

**Time box.** 4 hours for one Opus session.

**Rules.** One engine for candidacy: the skipped path reads the same decision rule as the played one. No dice: no percentage of races is given a candidate. One rule, all 56 places: measure in three drawn places. An effect is a read: the filers appear on the ballot, in the count and on the race card.

**Done when.** A second session builds a place from the four above and two it draws, skips four years and plays the same four years, and sees total filers within 5% and uncontested races within one of each other, in each; sees a skipped year's race card list the same candidates as the played world's; and sees `src/core2/results-mode-elections.test.ts` pass.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/life.ts, src/core2/modules/elections.ts

**Notes.** Filed by hand on the Account lead's branch (pool add pushes to main). Measured with `src/core2/results-mode-elections.test.ts` from #8606 merged into train 5fc60b90; the probe script is not in the repository.
