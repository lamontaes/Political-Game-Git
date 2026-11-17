# Pinned tests: dated lessons

Part of the `pinned-tests` skill. Lessons from the Nov 15 tests: public action, debugging, the paper's hold for comment, at-large races, playing a controlled person.

## Lessons from the public-action tests (Account lead, Nov 15)

7. **A bound a builder wrote is a premise, so state it.** A share bound ("no action holds a tenth of the adults") went red when the train's world shifted by a few people. Do not nudge the number silently: say in the test's comment what the number means (here, the renters an issue touches, not the town), change it once with the new measured figure beside it, and name the change in the PR body.
8. **A test that waits for a case it may not get is a drawn test even with a fixed seed variable.** A rally test and a movement test drew a place by a random seed and passed only where a rally or a founding existed. Draw and wait for the case and fail by name (`drawn-place-tests`), or, with a CTO line, pin the place (`drawPlace(<fixed seed>, <label>)`, then `expect(place.name)`); say in a comment why a run over a minute is the game's own days.
9. **Stage the id shape the engine really makes.** A recruiter's id may hold colons (a newspaper's owner is `newspaper:...`), and a parse written for a person's id lost the action. Put an id of that shape in the test.

## Debugging a test (Nov 15, Visit/Call thread)

`console.log` is swallowed by vitest here. A throwaway debug test writes its tally to a file and the file is deleted when the answer is found.

## Lesson of Nov 15 (the paper's hold for comment)

- **A Journal line is checked by its sentence, not its whole text (Nov 15).** The Journal opens a line on the time since the line before ("One month later, ..."), so a pinned exact-text assert goes red as soon as the Train writes any earlier line in that world (#9477 failed its fold this way on a head four Train pushes old). Assert `line.plain ?? line.text` equals the sentence and `line.text` ends with it, and merge the newest Train before the final gate.
- **Break it before you trust it.** Two press tests at their pinned places passed with the change and without it, because the place's tip never ran, so the asserts sat inside `if (ran)`. Undo the line under test and run the file. If it still passes, stage the case through the game's own path (here: the player takes the bribe in the offer scene, the offerer leaks it with `leakToReporter`), and assert outside any branch.

## Lesson of Nov 15 (an at-large race has one result record per seat)

- **A race is not one filed contest and one result.** A test that looks up `election-result:<the contest the player filed for>` and judges a win by that contest's winner calls an at-large win a loss and finds no Journal line (New Llano, Louisiana, a three-seat race: filed under `council:0`, elected to the seat counted as `council:4`). Read the result events whose `contestId` or `race` is the filed contest and that name the player, and take a win from any of them. Pin the place and say in the comment which premise changed.
- **A pin read before a merge is not a pin on the merged head.** A test pinned to a place's outcome (a win, a count) moves whenever any merged change touches that world. #9545's New Llano win was seen 3 of 3 on the commit before the train was merged in, then reported on the merged head without a rerun; CI showed the player losing there. After every merge of the train into a branch, rerun each pinned-outcome test on the merged head before any sha is reported, and say in the report which head the run was on. Prefer a pin whose margin is wide: New Llano's win rested on the third at-large seat, 51 votes to 63, and fell to 27 votes after unrelated train changes.
- **A played step to a distant date is the cost.** Playing a new life to April 2026 took 8 minutes at one place, so a test of a rule that sits inside it stages the rule on the opening day (a minute) and leaves the played-year read to the PR body, with the break-it run on the staged rule.

## Playing a controlled person through days

`advanceCore` refuses a controlled person. To play days for the player in a test, build the world with `buildBenchWorld`, wrap the person in `BenchPlayer`, `select` them, and loop: on a `stop` packet vote their floor holds with `voteOnStateFloor(api, id, bill, "own")` and `resume`, on a `choice` packet `resume` with `own-choice`, otherwise `advance("day")`. `src/core2/bill-floor-date-holds.test.ts` is the worked case (Holiday Lakes, Texas, seed aa11, about a minute); a fix test should be run once with the fix stashed to see it fail where the defect was.
