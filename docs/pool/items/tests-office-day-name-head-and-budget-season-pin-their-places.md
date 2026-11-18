---
id: tests-office-day-name-head-and-budget-season-pin-their-places
title: "The name-head and budget-season tests draw a new place every run and fail at some"
area: office
lead: laws
kind: bug
priority: 3
size: M
status: in-pr
standard: 2
claimed-by: account-lead-builder
pr: 9503
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Account lead builder, Nov 15 (duty need PR, coordinator's request)"
checked:
---

**What.** `src/core2/office-day-name-head.test.ts` (two cases) and `src/core2/office-day-budget-season.test.ts` (two cases) go red at whatever places a random seed draws, on the clean train head too: Mosier OR, West Memphis AR, Miami MO, Oak Creek WI, Latimer KS and Wilmington DE failed across runs on Nov 14 to 15. Seen: the changed-file gate of a PR that touches the office-day files fails on a place the PR did not choose.

**Cause.** Found in code: both tests take their seed from `randomBytes(8)` (src/core2/office-day-name-head.test.ts line 28; the budget-season file builds `${seed}:${draw}` the same way), so each run draws new places and a place where the town's pay line, head or council differs fails. They break the pinned-tests rule: named places with fixed seeds.

**Fix.** Pin each case to named places with fixed seeds (the places it passed at, and one where it failed, with the reason the failing one differs: found by reading the failure at that place), explicit time limits near twice the measured run, no draw loops. Do not loosen an assertion; where a place fails for a real reason, file that as its own item.

**Built (Nov 15).** The name-head case is pinned at Fenwick Island DE, East Bend NC and Van Wyck SC (draws `name-head-pin:1`, `:3`, `:5`, 83 s for the file); its pick case was already pinned on the Train. The budget-season aide's-read case is pinned at Williams SC (draw `pin-bs:advice:5`, 65 s). The other two budget-season cases are not pinned because they are red where they reach: at Golovin AK, Lincolnshire KY and Trenton UT (draws `pin-bs:0`, `:1`, `:4`) the line the council passed is lower at year's end than when it passed (Lincolnshire: 24,191,828 against 25,182,405, with `receiptsFactor` 1), and at Golovin and Trenton the month's paid schools line differs from the passed one; draws 2, 3 and 5 have no firm that does the line's work or no mayor. Ortley SD, the amend case's pinned start, no longer amends. That is a world defect (councils amend adopted budget lines with no cause at nearly every meeting), left for its own item and not re-pinned. The town-hall cadence test (its premise changed in #9472) is pinned at two named places (`town-hall-pin:0` and `:1`, 81 s and 47 s).

**Time box.** 3 hours for one Sonnet session.

**Rules.** Skill `pinned-tests`; no dice; never loosen a test to get green.

**Done when.** Both files run at named places and fixed seeds in about a minute each, naming a drawn place for each case in the PR (for example Mosier, Oregon and West Memphis, Arkansas, with the seeds they failed at), red or green by the code and never by the draw, and a second session reruns them on main and sees the same result.

**Waits on.** Nothing.

**Files.** src/core2/office-day-name-head.test.ts, src/core2/office-day-budget-season.test.ts

**Notes.** Found while gating the duty need (Nov 15). Seen again Nov 15 on #9485's gate and on Train 88b5b879: office-day-name-head at seed c5fa51b05add8d84, "No town with an appointed head and a pay line to name them in 8 draws".
