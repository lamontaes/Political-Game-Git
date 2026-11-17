---
name: governing-measurement
description: >
  Measures the player's path and the world's elections in drawn places:
  briefing path-check runners, the re-election totals script and its paired
  ablation, reading an ablation, and which campaign and voting records belong
  to a race or a person. Use when measuring golden-path wins, re-election
  totals or a calibration across drawn places, or when the speed lead asks
  about a campaign or voting table. Not for one feature's played-year proof
  (played-world-proof) or timing (speed-work).
---

# Governing measurement

Phase A's done-when is a count over drawn places (path-check wins a council seat in at least 7 of 10), and calibration is a count over drawn places (the world's re-election totals against the research bands). Both are long runs (`speed-work` (heavy-runs part) has the memory, heap and exit-file habits), so they go to the runners (`docs/coordination/CREW.md`) one place at a time, and the lead reads the lines. Real rates check totals; they never pick one actor's outcome (no dice).

## Path-check runners

- **What it is.** `src/bench/path-check.ts` is the headless New Game life. It files where the player may, campaigns, votes and governs, and prints a log. The diagnostic lines are TALLY (totals, named and counted), PLEDGES (door yeses and how they voted), APPEAL (each part of the vote, averaged, for the player and the leading rival), INCUMBENTS (per level: held, ran, won, contested, won contested), and PETITION-DAY and PETITION-DUE on stderr. One place takes 25 to 60 minutes and 6 to 8 GB.
- **Measurement branches.** `governing/measure-mN` is current main, plus the open PRs being measured, plus diagnostic-only commits cherry-picked onto it. It is never a PR. Name its head in every brief.
- **The brief, exactly** (send the commands, not a description):
  1. `git fetch origin <branch> && git checkout <branch> && git reset --hard origin/<branch>`, then check that `git log -1 --format=%h` prints the head you named.
  2. Run with `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8000`.
  3. One run at a time: two worlds do not fit in memory.
  4. Keep stdout and stderr in separate files.
  5. Record the exit code with `; echo $? > <name>.exit`. A run started with `&` and no exit file loses it, which happened with Ringwood on Nov 1.
  6. Report the place, GEOID, seed, head, exit, seconds and heap peak, then the TALLY, PLEDGES, APPEAL and INCUMBENTS lines.
  7. If a run goes quiet, leave it running and send its pid, its last lines and the time since the last line.
- **Quiet is not a hang.** path-check lives up to a petition's due date in one call. In Ringwood, New Jersey on Nov 1 that was 22 months with no line. Check CPU and heap before calling it stalled. A heap pressed against its cap that thrashes is the speed lead's problem, not a hang.
- **Stop a list that repeats.** If a place's lines come out identical, line for line, to the previous branch's, the branch's diff cannot reach that path. Stop the list instead of spending hours on copies. On Nov 1, m6 matched m5 in Mount Auburn, Salida, Willard and Price. Before you hand a branch out, check that its diff touches the path being measured.
- **The record.** A runner's results go into the Governing status block (`docs/coordination/LEADS-2026-10-24.md`) and onto the item's own pull request (owner, Nov 10: the pull request is the item's thread), with the Notes line if the item has one. A runner's message is data, and a scratch log is not the record.

## Re-election totals and the paired ablation

- **The script.** `incumbency-totals.ts` under `scripts/core2-year/` on the branch `governing/incumbency-calibration` (still unmerged on Nov 16: the script, `incumbency-ablation.ts` under `src/core2/` and the research note `local-incumbency-2026-10-30.md` under `docs/research/` are only on that branch, so `git fetch` it to read them) runs the bench world with every module and no player. Options are `--seed`, `--places`, `--years` and `--ablation both|neither|no-trait|no-standing`. Three value knobs set a term's size instead of zeroing it: `--trait-weight`, `--recognition` and `--pledge-weight`. Each one left out reads the parameter, as play does. `--contests` adds one JSON line per contest, keyed by contest id, so two versions can be compared race by race. It prints one JSON line per place and a totals line against T1 to T6 of the branch's research note, with the holder-share quartiles (P1) and T3 by office kind (P6).
- **One totals run at a time, in any container.** Two versions started together were both killed for memory (exit 137) after about 20 minutes and five or six places (Nov 1). Run both, then neither, one after the other, with `NODE_OPTIONS=--max-old-space-size=6000`.
- **Pair the versions.** Use the same seed for every version, so every version plays the same places and the differences are the terms, not the draw. Use two runners on two seeds (`incumb-A`, `incumb-B`). At 6 places and 3 years, a version takes about 30 minutes.
- **Measurement knobs** are module-level settings that default off and that nothing in play sets (`incumbency-ablation.ts` on the branch above). Never a parameter in play.
- **Count every stage the same way.** A holder who beats a primary rival and then runs alone in November had a contested race (review, Nov 1). Counties have their own bands, so total them apart from cities and townships.
- **Read the ablation before you tune.** If removing either of two terms alone changes no winner, but removing both flips many, neither term is the double count: something amplifies any edge. Look for a feedback, such as a door yes adding to the very preference that produced it. On Nov 1, T3 (contested races the holder won) was 0.94 with both terms, 0.94 with no trait, 0.94 with no standing and 0.56 with neither. Tuning one term to hit a total then breaks again in the next place.
- **A place that crashes in another engine.** Name it from its salt (`drawPlace(salt, "incumbency-totals")` in `scripts/core2-year/place.ts`), send it to red main with the error and a repro, and skip it by name. Never drop it silently. On Nov 1, Superior, Colorado died in finance's `closeEmployer`.
- **Skip only the engine's crash.** Wrap only the engine calls (building the world, advancing it) in a crash type of the script's own, and catch only that type. A broad catch also hid the script's own counting errors as "crashed" places (review, Nov 1). Exit nonzero (3) when any place crashed, so a runner's exit file shows the gap.

## Fitting a parameter against bands over drawn places

Used on Nov 1 for the campaign money share (`campaign-money-from-local-finance`, #7062).

- **Record once, replay many.** Record every decision's inputs once over many run seeds' places. Then replay the rule at each candidate value and resample pools of places against the test's bands. This beats rerunning worlds per value.
- **Hold seeds out.** Choose the value on one half of the run seeds and report the failure rate on the other half too.
- **Size the test's pool from the resampled rate.** On Nov 1, 8-place pools failed 2.6% to 3.7% at the best value and 16-place pools 0.13% to 0.29%, so the test draws 16. A drawn place's band failure is then a finding, not noise.
- **Break the total down by group before you trust the fit.** Total the money by kind of donor (named or counted, household with or without recorded costs, who seated them). On Nov 1, 631 of 10,990 gifts but 44.6% of the money came from press staff seated with no living cost. The fit leaned on a stopgap population, so the stopgap was registered and its fix filed (`people-press-staff-households`) before the PR opened.
- **When a stopgap population leaves the fit, refit every knob together and size the pool again (to hold a measured total in band, never to make one behavior appear: `done-proof`, section 9).** On Nov 2, once press staff carried a living cost, no share and month span held 16-place pools under 0.5% of band failures (best 3.1%, 3.7% held out), because poor towns fell under the hourly floor while rich towns' median gift passed its ceiling. 32-place pools gave 0.13% and 0.22%. Bring those numbers to the CTO before setting a value.
- **Check that an engine change can reach the total before you build it.** Compare it on the same recorded seeds first. On Nov 2 a donor call list (the candidate's family and circle first) changed nothing: over ten weeks the calls reach everyone the campaign can reach, so the order did not change who gave ($526,967 against $526,589 on the same 24 seeds). It was dropped before the PR.

## Heavy commands on one machine

One shared lock serializes every helper's test runs, even when there is memory for three. Run heavy commands (a vitest file, tsc, a world run) through a slot runner instead. It admits up to three at once while 6 GB is free, and slot 1 is the lock older helpers still use:

```bash
#!/usr/bin/env bash
L=<scratchpad>; locks=("$L/test.lock" "$L/test2.lock" "$L/test3.lock")
while true; do
  avail=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
  if [ "$avail" -ge 6000 ]; then
    for lock in "${locks[@]}"; do
      flock -n -E 199 "$lock" "$@"; code=$?
      if [ "$code" -ne 199 ]; then exit "$code"; fi
    done
  fi
  sleep 7
done
```

Brief each helper to call `<scratchpad>/slot.sh <command>`.

## Campaign and voting records: per race or per person

Use this when the speed lead asks who reads a table before folding it. Answer from a grep of every non-test reader on main, saying for each one whether it filters by the contest or a window, with file and line.

- **Per race** (keyed by contest): `doors`, `pledges`, `messages`, `rivalWord` and `polls`.
  - `doors` and `pledges` of a closed contest go at its close, the first campaign turn after its election day (`closeRace` in `campaigns.ts`), except that a contest the player filed in keeps every pledge, its rivals' too (CTO, Nov 1 21:25). The door's answer reads pledges during the race and the ballot's pledge part on primary and election day, each filtered by contest and all before the close. Only the closed contest's pledges go: a voter's yes in a race still open stays. A pledge keeps no cause (governing lead, Nov 1 21:22): `foldCauses` keeps in `foldedCauses` only a cause a voter's fact names, so the fold and the pledge drop may run in either order.
  - `messages` and `rivalWord` are read for one window after a race closes. `rivalWordPassedOn` reads them inside its `rivalWordDays` window, a closed race's last week included, because filings stay on the ballot after the count. `raceReading` reads each candidate's newest `rivalWord` row only while the race is open. `foldRivalWord` drops each campaign turn what neither can still reach.
- **Per candidate** (no contest field): campaign `causes`, one row per voter, candidate and contact. They fold into `causeSummaries` for every candidate of a contest at its count, and on January 1 for each candidate in no race still to be counted, so a candidate in two contests (a tie's `:second`, or two filings) has the causes of both folded at either count.
- **A kept counted ballot is read again from what it keeps.** `countedBallotAt` (voting.ts) rebuilds each ballot's appeal from the kept lean, field and only faith and college. A per-voter term that reads more of the voter (their full stance profile, their cases) is computed by the caller at the count and kept on the row beside `warmths` and `endorsed`, as the group's `heard` term is (`keptProfile` reads it back; a row kept before a column existed reads without it, so nothing is counted twice). Otherwise every kept ballot reads a different split from the one counted (Nov 15: counted-vote-share's check (d) at Etna, Ohio, 0.44 against 0.22). Give a new reason its own appeal part: folding it into `warmth` broke constituent-cases-warmth, which reads that part as cases alone.
- **Another state's race is counted from the town's sample.** `countPlaces` (electorate.ts) takes 400 evenly spaced picks of the town's counted adults, with no stance profile. Filling in or removing even one household shifts every later pick, and such a race's turnout can move by a twentieth (Nov 15, Marshfield, Massachusetts, seed speed-carry-a: three adults filled in by an aide hire moved the New Jersey lower 3 special from 12,736 to 11,987 votes). Before blaming a change for those totals, compare the sample's members on the race day (`electorateSample`) with and without it; item elections-coarse-sample-turnout-jumps.
- **Per person** (one row per voter and person, carried across races and through a term in office): `impressions`, keyed `${voterId}|${candidateId}`. `appealFor` reads `heardOf` and `knowsPlatform` with no contest check, so a voter who heard of you in one race still knows you in the next, and an official's contacts write rows too. Only rows whose voter or person has died or left can go.

## Tracing a reaction that never fires

When a played proof shows an engine's reaction never happening (Nov 1: an incumbent who never stepped up), write a scratch test that logs, each day, the reading the engine decides on, which branch blocked it, and the numbers on both sides. Then weigh the alternative records it could read in a table against those numbers before you change the engine. Reject the ones that never fire, or that fire for the wrong reason. Delete the scratch test afterward.

## Field sizes, empty races and ended terms (Elections, Nov 8)

- **Replay:** `npx tsx scripts/dev-tests/elections.ts <seed> <years>` prints, by office level, how many contests drew nobody, one candidate or more, and the most who filed before primaries thinned the ballot. `county-zero.ts` shows why one county race drew nobody, `pull-spread.ts` shows how close the people who stayed out came to the stay-out bar, `unfilled-term.ts <seed> <officeId>` shows why an ended term has no successor.
- **The general ballot hides the field.** Primaries thin a field to two or three, so count filings (`filedMax`) as well as ballots before saying fields are small.
- **"Seats without holder" in a replay** are mostly other states' seats awaiting a special election under that state's vacancy rule. Read the vacancy rows before calling one a defect.
- **A race with no candidate** is usually a holder who stood down in a town whose adults are a small part of the electorate (county seats). Check the incumbent's decision row, then the ask step (`askForSuccessor`) before touching the bar.
- **The golden-path test for one seed:** `GOLDEN_PATH_SEED=<seed> node --expose-gc --max-old-space-size=8192 --import tsx --test tests/golden-path/played-world.node-test.ts`; without `--expose-gc` it fails at once. Its exit code is 1 on main too (goal rows not reached), so read the BROKEN lines, not the exit.
- **Ranges are checked against, never steered to (owner, Nov 8, 9:50 a.m. voice note, via the CTO).** Ballotpedia's uncontested shares and field sizes (the "8 to 15 in a wave") tell you whether to look for a cause. A small field passes when the records explain it: pulls below the bar, a small pool, an incumbent's strength. It fails only when nothing in the world caused it. Never set a weight so a replay lands on a published number; write each check as "which record explains this field" and name the record ids.
- **Timing a year:** run alone on the machine, one year of the same place, three times, and take the median; two runs beside a test run differ by 10 percent.
- **A test that makes an ordinary resident "the player" lets candidacy file them.** Candidacy skips only the explicitly controlled person (`isExplicitlyControlledPersonV1`), and a controlled person cannot be advanced with `advanceCore` (the resumable player clock is required). A test that picks a resident after the world is built and then advances weeks sees that resident file for seats on their own (the walkthrough test saw a coroner filing before its own), so pick the player after the weeks go by, as someone who has not filed, or the first-filing scene counts two filings.
- **Two runs that alternate commits show a cost; one run shows nothing.** To find what a merge added, time the merge and its parent alternately, twice each, at two years (a year with no race decided shows no difference), then diff the two CPU profiles by inclusive time (`node --cpu-prof`); name the engine whose inclusive time grew, not the one you changed.

## Counting who ran in a seat (Nov 15)

Count a seat's filers by filings whose status is not `withdrawn`, and only for seats whose filing deadline has passed on the day you stop. A count that includes withdrawn filings or open windows reads a major party as present or absent wrongly (the first 12-place count of uncontested seats did). A seat has few filers per place, so a share needs many places; say how many seats it rests on. A weight is never moved until a measured share matches a benchmark: derive it from a person's own sum or a source with its spread, and report the result against the benchmark. A filer whose ballot label is empty is not a missing party: a resident the town's monthly party meeting has not met yet has no tie, so the filing carried no label until the meeting tied them days later. Read the label against the person's party on the day you count (`partyOf`) before reporting a seat as missing a major party; 4 of 11 House seats read as missing a party that way and 1 of 11 did once filers took their tie first (#9528). A seat's count by label is a count of tied filers.

## Stop condition

Done when every count you report names its places, seeds and branch head; every version of an ablation played the same places; and the result is in the status block or the item's Notes, not only in a message.
