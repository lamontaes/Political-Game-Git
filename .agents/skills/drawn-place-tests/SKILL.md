---
name: drawn-place-tests
description: >
  How a test that needs a particular case in the world (a race open for filing,
  a renter, a named person the law covers, a body of three seats) finds one by
  drawing places and waiting, and says what it passed over, so it never fails
  or passes by the luck of the draw. Use when writing or fixing any test that
  builds a played world, and when a test is red "by seed" on main. Not for
  proving a feature in a played year (played-world-proof) or for reading a red
  on main from its log (red-main).
---

# Tests that draw their place

A test that builds a world draws its place from all 56 (`drawPlace` in `scripts/core2-year/place.ts`) and names the place and seed in every message. That rule (`AGENTS.md`, "One rule, all 56 places") has a trap: the place drawn may not hold the case the test needs. On Nov 10, 2026 three reds on main were this trap and none was a defect in the game.

## The three ways it goes wrong

- **The test looks on one day.** Every race opens its filing on a real day (since Nov 4). A test that looked for a race on the player's 18th birthday found none in eight places out of eight, because filing had not opened yet (`src/bench/election-day.test.ts`, seed dcba28c7e37e52d9). In Rudyard, Montana the first race opened 46 weeks later and took the filing at once.
- **A test that needs a race open for filing never reads a drawn place on a fixed date.** The nomination calendar opens windows on different days by place (Alabama's was open on Jan 5, 2026; the other eleven places of a draw had nothing open), so a test that files on the start date passes only where the calendar happens to be open. It advances the place to its filing window with `advanceToFilingOpen(core)` (`src/core2/gov-test-clock.ts`) or waits week by week as `src/bench/election-day.test.ts` does. Two reds on Nov 12 were this: race-told-scene and `src/core2/door-pledge.test.ts` (seed f26db0f13c6bffec4a68430111c0bdb5).
- **The first thing that turns up refuses.** In Braggs, Oklahoma the first four races to open were governor, state house, U.S. House and U.S. Senate, and each refuses an 18-year-old on minimum age. A wait that stops at "something is open" still fails there.
- **The test needs a named person and the world has few.** After a world is collapsed to two levels, only the player's household and circle are full people. A test that needs a full person inside a law's income band passes only when one of that handful happens to be in it (`src/core2/law-reach-group-b.test.ts`, the Medicaid case).

## What a test does instead

1. **Draw, then wait, then draw again.** In the place drawn, advance the world a week at a time, to a stated limit, until the case holds. Only then move to the next place. One run should advance one world, not eight.
2. **Wait for the thing itself.** Wait until the action the test is about succeeds (the filing is taken, the payment lands), not until a list is non-empty.
3. **Choose the person from the people the case covers.** When the test needs a named person with a trait, read who qualifies among all residents, named or counted, and build the place again with one of them as the player. Do not redraw places until a named person happens to qualify.
4. **Name every place passed over,** with the date reached and the reason (each refusal's rule, each count that was zero). A reader of the log must be able to tell a thin place from a defect.
5. **Fail by name when nothing is found.** After the last draw, throw with the whole list. Never `return` early, and never mark the test skipped: a test that passes without checking proves nothing.
6. **Never pin a place or a seed** to get green. A pinned world breaks the day main changes the world. A named place appears only as a labeled case beside the drawn ones.
   On the train (Nov 13 to 14) the Account lead requires tests that gate a PR to be pinned in the test file to named places and fixed seeds so they are never red by draw; see `pinned-tests`. The CTO reconciles the two. Reading of the history: this skill's tests hunt for faults across the 56 places, so a drawn place is the point; a pinned test only gates a PR on one known case.
7. **Change no assertion.** The search for a witness changes; what is asserted about it does not.
8. **Print the place with `process.stdout.write`, never `console.log`.** The runner swallows `console.log`, so a passing test that logs its place and its passed-over list shows nothing (found Nov 12, #8580 and #8567). A pass line names the place used, its seed and every place passed over, on stdout.

## Before you call a red a flake

Replay it. A check that failed once and passed on a second draw has told you nothing yet: run it again on the failed seed (`BENCH_SEED` for a browser check). If it fails every time on that seed, it is a finding about that place. On Nov 11 the merge desk saw `bill-stage` time out once in Red Hook, U.S. Virgin Islands. On replay it failed every time, and showed three defects: Play as offered another place's council, a bill's page cut off its vote, and a heading stood with nothing under it.

- **A check that steps in as an official picks one whose office the played place runs.** A match on a word in the list ("council") found another place's council, whose office is held as results only. Match the body by its government, never by a word in a name.
- **A check never drafts around a missing case.** One that fell back to "the first subject" when none had a law in force went on and failed two minutes later, somewhere else. Fail by name at the point the case is missing, with the seed and what was passed over.

## Before you call a red "the game's"

Print what the place holds before blaming an engine: every candidate for the case (each race with the day its filing opens, each resident the law covers) and why each was refused. Ten lines of probe settled each of the Nov 10 reds in a few minutes. If the place's own calendar or size is the reason, the test is wrong; if a rule refused something it should not, the game is, and that is an item with the record ids.

## When the wait is the finding

A long wait can be real: a town whose first race an 18-year-old may enter opens 69 weeks after their birthday. Say so in the pull request. The player's experience of that wait is a question for the owner, never something a test hides.
