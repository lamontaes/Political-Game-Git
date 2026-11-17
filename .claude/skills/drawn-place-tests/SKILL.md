---
name: drawn-place-tests
description: >
  Writes and fixes tests that build a played world: a test finds its case by
  drawing places and waiting and names what it passed over, a pinned place or
  seed only with a CTO line for that pull request, and a check that fails a
  world for leaving a real band becomes a check that a relationship has the
  strength the research gives. Use when writing or fixing any played-world test,
  moving a pinned test to drawn places, converting a band check, or when a test
  is red by seed. Not for a played-year proof (done-proof, played-world-proof part) or reading a
  red's log (red-main).
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
   The CTO reconciled this with the Account lead's pinned tests on Nov 16 (`done-proof`): a test draws its place, and a test pinned to a named place or seed, a labeled case included, is added only when a CTO line on the crew's thread approves that exact pull request. It is then written as `drawn-place-tests` (pinned-tests part) says.
7. **Change no assertion.** The search for a witness changes; what is asserted about it does not.
8. **Print the place with `process.stdout.write`, never `console.log`.** The runner swallows `console.log`, so a passing test that logs its place and its passed-over list shows nothing (found Nov 12, #8580 and #8567). A pass line names the place used, its seed and every place passed over, on stdout.

## Putting a pinned test back on a drawn place

The owner's answer to the pins of Nov 13 to 16 was "be random with it." Long game lane, Nov 17, from #9766, #9792 and the card-life branch:

- **Bring back the drawn version's own seed line and limit.** Read the file before the pin (`git show <pin commit>^:<file>`) for its `randomBytes` seed, its env name (`GOLDEN_PATH_SEED`, `LIFE_SEED`, `ORDERS_SEED`) and its time limit. The pin cut the limit to one place's time, and a draw that passes over places needs the old one (bill-orders: 900 s, not the pin's 50 s).
- **Draw 0 is the seed itself** (`` draw === 0 ? seed : `${seed}:${draw}` ``) when the old pin used `drawPlace(seed, ...)`, so the env seed replays the reported world exactly.
- **Replay the old pinned seed through the env name before calling it fixed.** At the old seed the new test should pass over the failing place by name, or pass there. That is the proof the pin's red is understood.
- **The case that only checked the pinned place goes, and the guard counts it.** `check-changes` (#9752) reports one dropped case and one dropped assertion for it. Say so in the pull request body and ask the CTO for the line; never add a filler check to keep the count.
- **A red that moves with the draw is often the test's shared world.** Cases that end a term or move the date leave it changed for the next case (wide-races, #9781). Run the failing case alone with `-t`; if it passes alone, wrap the cases that change the world in `snapshotWorld` before and `restoreWorld` after, around those cases only (a snapshot before every case cost 25 s in a 12 s file).
- **Print what was passed over on stdout** with the place used, as rule 8 above says; most pinned files had moved this to `console.log`.
- **Draw from the places the case covers, read from the data, before building a world (Long game, Nov 17, #9766).** Only seven states' researched powers let a governor issue an order the engine carries, so a blind draw from 56 passed over 35 of 40 places and gave up. `drawPlace(seed, purpose, accept)` takes a filter on the locality key: build it from the research file the engine reads (there, `executive-powers-2026.json` `canOrder` keys the engine maps), and keep the world's own check (`orderableBy`) as the decider. It passed in 193 s at the CI seed.
- **Choose the actor the case needs among the world's people (#9792).** A campaign ask goes to people the candidate knows, and at Banks, Alabama the first resident who could file knew nobody. Choose the filer among residents with acquaintances; never assert something weaker.
- **A test whose case moves with the engine is drawn again, not re-pinned.** When a fix changes which places hold the case (a party's seat left empty on the day filing opens), draw places until the case holds and name each place passed over (`party-ask-refused`, CTO, Nov 17).

## Before you call a red a flake

Replay it. A check that failed once and passed on a second draw has told you nothing yet: run it again on the failed seed (`BENCH_SEED` for a browser check). If it fails every time on that seed, it is a finding about that place. On Nov 11 the merge desk saw `bill-stage` time out once in Red Hook, U.S. Virgin Islands. On replay it failed every time, and showed three defects: Play as offered another place's council, a bill's page cut off its vote, and a heading stood with nothing under it.

**Compare a branch with its base on the same seed (story builder, Nov 15).** A test that takes `GOLDEN_PATH_SEED ?? randomBytes(...)` draws a new world every run, so "red on my head, green on the base" proves nothing until both ran with the failed seed in `GOLDEN_PATH_SEED`. On Nov 15 `src/director/ask-vote-variants.test.ts` and `ask-before-the-roll.test.ts` were red at all six places on a #9369 head; both failed the same on the clean Train at the same seeds, and a revert bisect had begun before the seed was read from the log.

- **A check that steps in as an official picks one whose office the played place runs.** A match on a word in the list ("council") found another place's council, whose office is held as results only. Match the body by its government, never by a word in a name.
- **A check never drafts around a missing case.** One that fell back to "the first subject" when none had a law in force went on and failed two minutes later, somewhere else. Fail by name at the point the case is missing, with the seed and what was passed over.

## Before you call a red "the game's"

Print what the place holds before blaming an engine: every candidate for the case (each race with the day its filing opens, each resident the law covers) and why each was refused. Ten lines of probe settled each of the Nov 10 reds in a few minutes. If the place's own calendar or size is the reason, the test is wrong; if a rule refused something it should not, the game is, and that is an item with the record ids.

## When the wait is the finding

A long wait can be real: a town whose first race an 18-year-old may enter opens 69 weeks after their birthday. Say so in the pull request. The player's experience of that wait is a question for the owner, never something a test hides.

## A calibration test went red on my change

The trait and calibration tests (`src/core2/modules/*.traits.test.ts`) draw a fresh town per run, so one red proves nothing about your change. Replay both sides on the same seeds: run the file with `GOLDEN_PATH_SEED=<40 hex digits>` on your tree, `git stash`, run it again with the same seeds, `git stash pop`, and compare the printed odds. Equal numbers mean the draw was red and your change left the measure alone; numbers that moved mean your change reached what the weight was fitted on (Nov 15: narrowing a town hall's room as well as its question cut the rooms filled by a third and moved the take-part odds from 3.8 to -0.3). Change the part that moved, never the test or the weight. A file takes five to ten minutes: run it in the background and read the output file.

## A name check that matches inside another word

A drawn place can name a business after a person, so a check that counts the player's name in a line must match the whole word (`\bSam\b`), or "Sampson's Market" counts as saying "Sam" (Nov 15, the coworker test at Anderson Island WA, seed 666aac4c9a33aa4fddd8). When a drawn test goes red, rerun that file pinned to the failing seed (`GOLDEN_PATH_SEED=<seed>`) before and after the fix. That shows the fix, not a new draw, turned it green.

## The case is there, but the test asked for the wrong one (Nov 17)

- **A scenario choice can be the luck.** `src/director/press-comment-variants.test.ts` brought "the town's four most settled questions" to a town body. In most drawn towns those are a state's or the country's to decide, so the draft was blocked for want of authority and never voted, and the test reported a slow body 12 places out of 12. Take the first case the place's own rules allow (the most settled question the body may decide), trying each in order, and pass over by name a place that allows none.
- **A probe must not hope an arc wins.** Where an engine adds several reads in one sum, a probe that changes one record while another large one is still on record asserts a result the engine does not promise. Check each arc on a case that makes it the larger product under the engine's own sum, check the competing arc as its own case, and name any place that cannot show one (CTO, Nov 17, on the national reporter's call).
- **Following whoever the case happens to, then replaying the town as that person, can fail by tier.** A townsperson who misses a loan payment opens with a loan and no cash; the same person as the player opens with cash and no loan, and never misses. Check that the case survives the rebuild before building a test on it, and file the tier difference when it does not.
- **A build by the runner's drawn key is a draw.** A place where no player can live is passed over by the build itself when the key is the golden-path runner's (`passOver` in `src/bench/world.ts`); a test that draws its own key catches `NoPlayerHereError`, names the place and draws again, as `src/core2/past-votes-by-level.test.ts` does.

## Gotchas (Nov 16 and 17)

One line each: what happened, its cause, and what to do. From the crew threads (#9747, #9750) and the CTO's log.

- Nov 17, 12:20Z (press-comment-variants, Bondurant, Wyoming): a scandal probe asked a town's reporters for a scandal arc, and every one of them leaned friendly. Cause: an arc's score is its records times one plus the asker's pull, so no record can win where every asker's temper refuses it. Pass over a town with no asker whose traits allow the case (#9959).
- Nov 17, 13:45Z (business-charges, Calvin, North Dakota): a town total fell with a tax raise because a TV station sold more in the raised twin. Cause: twin worlds drift apart. Compare one business at a time, only where its inputs are equal in both twins, and add the exact half (the charge equals the rate times its own wages, to the cent).
- Nov 17, 03:47Z (pay-on-time, apology-variants): a test pinned to one borrower in Ragland, Alabama went red when the world changed and she stopped missing payments. Cause: it was pinned to a town where the case need not happen. Draw places, advance until any borrower misses, and name the places passed over.
- Nov 17, 03:23Z (moves by age, Gisela, Arizona): a test ranked the whole town by net push, where the engine ranks within each age band. Cause: a whole-town ranking mixed the bands. Assert the order within each band.
- Nov 17, 01:25Z: 42 checks failed a world for leaving a real band. Cause: the band was a target, which makes every world the same. Check the relationship's strength instead (`references/relationship-checks.md`).
- Nov 17, 02:21Z (national-events, disaster-aid): tests counted disasters in fixed windows tied to real dates. Cause: disasters now come from each world's own risks. Stage one through the world's own hazard, or play until one occurs, and fail on zero.
- Nov 17, 04:26Z (estates-played-heirs, Pins 31): once wills followed savings and family, the pinned Dennis test found an intestate decedent whose heirs were parents, and the law gives a dead parent's share to the surviving parent. Cause: a lifted pin moved which case the search found first. Narrow the search to the case the assertion is about (an heir among the children), say why in the test, and leave the assertion alone.
- Nov 17, 05:20Z (estates-played-heirs, Pins 31): probate never closed in 270 days at two drawn places. Cause: a last owner's home holds probate open until it sells. Wait for the settlement itself, and pass over by name an estate with a home to sell when the test is about heirs.
- Nov 17, 05:30Z (estates-played-heirs, Pins 31): a decedent picked as having no will closed probate by will. Cause: the search read the will before the death, and probate uses the will kept on the row at death. Classify each candidate by the record the engine keeps at the event, not by a reading taken before it.
- Nov 17, 13:05Z (History, `electorate-house-side`, `world-races-no-district`): two reds on a stacked branch looked like the branch's own. Cause: one came from a pull request lower in the stack and one was red before any world was built. Before calling a red yours, run the test with only your changed files reverted to the base (`git checkout <base> -- <files>`), then read which assertion fails first.
- Nov 17, 20:40Z (officials-town-opinion, Pins 18): a test drew places forever, looking for another state's legislator seated as a row, which the train no longer seats. vitest's timeout cannot stop a synchronous loop, so it ran an hour with no output. Bound every draw loop (twelve places), fail naming the places passed over, and fall back to a case the world still keeps (another state's U.S. House member).
- Nov 18, 02:46Z (counted-moves-causes, Pins 29): a search of 60 drawn places for a household of minors alone ran 63 minutes and found none, so it checked nothing. Cause: the case was rare, and the model could not produce it at all. Build the condition from the place's own records through the engine's own call (`removeCountedPerson` on a real household's adults), in one drawn place, and if it still never happens, post that as the finding with its line of code.
- Nov 17, 13:12Z (dev-discharge, dev-chair, dev-discharge-state; #9970, Fagamalo, American Samoa): 60 tries found no bill a committee held. Cause: every try proposed a minimum-wage cut, and a chair holds only what goes against their own position, so a chair who favors a cut heard all 60. When a search looks for a held, refused or defeated bill, alternate the two directions (a cut and a raise) and let the members' own positions decide which one is held.
- Nov 17, 08:25Z (campaign-platform-played): a test drawn at a new place failed, and the draw looked guilty. Cause: the test is left out of the normal run (`vite.config.ts`, `npm run test:calibration`) and was already red on main at its own pinned town. Before blaming a draw, run main's unchanged test once.
- Nov 16, 23:52Z (standing CTO ruling): a case that only checked the pin ("the fixed seed drew Cassoday") may go when the test moves to drawn places. Cause: it has nothing to check once the place is drawn. Every other dropped case needs a CTO line.
- Nov 17, 17:35Z (school-outcomes fill-in, Lake Viking, Missouri, seed cbf9c13751481f75): the test took the first counted student whose household's income moves its fifth, and met them, but the student was in the inactive "husk" tier, which the school counts leave out on purpose. Cause: a counted record's members can carry an inactive tier (they live away), and meeting one does not make them active. Choose the case's person among the active-tier members (`!inactiveTiers.has(p.tier ?? "")`), change no assertion.
- Nov 17, 18:35Z (jobs, declined opening): a fixed-fixture test that needs the player to be offered a job went red with no offer made. Cause: since the owner's Nov 16 ruling an employer offers the player a job only through someone on its staff who knows them, and the fixture's player knew nobody there. Give the fixture's player an acquaintance on the employer's staff (`knownIds`), with the ruling in a comment; change no assertion.

## More in this folder

Read each file here when its moment comes:

- `references/pinned-tests.md`: only when a CTO line approves a pin for your pull request.
- `references/relationship-checks.md`: when you turn a check that a world stays in a real band into a check of a relationship's strength.
