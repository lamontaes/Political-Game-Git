---
name: governing-measurement
description: >
  How the governing line measures the player's path and the world's elections
  in drawn places: briefing the path-check runners, the re-election totals
  script and its paired ablation, reading an ablation, knowing when a
  measurement branch can show nothing new, running heavy commands on one
  machine, and which campaign and voting records belong to a race or to a
  person when someone asks who reads them. Use when measuring golden-path wins,
  re-election totals or any calibration across drawn places, and when the speed
  lead asks about a campaign or voting table. Not for proving one feature in a
  played year (played-world-proof) or for timing a year (speed-work).
---

# Governing measurement

Phase A's done-when is a count over drawn places (path-check wins a council seat in at least 7 of 10), and calibration is a count over drawn places (the world's re-election totals against the research bands). Both are long runs, so they go to the runners (`docs/coordination/CREW.md`) one place at a time, and the lead reads the lines. Real rates check totals; they never pick one actor's outcome (no dice).

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
- **The record.** A runner's results go into the Governing status block (`docs/coordination/LEADS-2026-10-24.md`) and the item's Notes. A runner's message is data, and a scratch log is not the record.

## Re-election totals and the paired ablation

- **The script.** `scripts/core2-year/incumbency-totals.ts` (on `governing/incumbency-calibration` until it merges) runs the bench world with every module and no player. Options are `--seed`, `--places`, `--years` and `--ablation both|neither|no-trait|no-standing`. It prints one JSON line per place and a totals line against T1 to T6 of `docs/research/local-incumbency-2026-10-30.md`.
- **Pair the versions.** Use the same seed for every version, so every version plays the same places and the differences are the terms, not the draw. Use two runners on two seeds (`incumb-A`, `incumb-B`). At 6 places and 3 years, a version takes about 30 minutes.
- **Measurement knobs** are module-level settings that default off and that nothing in play sets (`src/core2/incumbency-ablation.ts`). Never a parameter in play.
- **Count every stage the same way.** A holder who beats a primary rival and then runs alone in November had a contested race (review, Nov 1). Counties have their own bands, so total them apart from cities and townships.
- **Read the ablation before you tune.** If removing either of two terms alone changes no winner, but removing both flips many, neither term is the double count: something amplifies any edge. Look for a feedback, such as a door yes adding to the very preference that produced it. On Nov 1, T3 (contested races the holder won) was 0.94 with both terms, 0.94 with no trait, 0.94 with no standing and 0.56 with neither. Tuning one term to hit a total then breaks again in the next place.
- **A place that crashes in another engine.** Name it from its salt (`drawPlace(salt, "incumbency-totals")` in `scripts/core2-year/place.ts`), send it to red main with the error and a repro, and skip it by name. Never drop it silently. On Nov 1, Superior, Colorado died in finance's `closeEmployer`.

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

- **Per race** (keyed by contest): `doors`, `pledges`, `messages`, `rivalWord`, `polls`, and campaign `causes` (these fold to summaries at the count and at close).
  - `doors` and `pledges` of a closed contest go at its close, the first campaign turn after its election day (`closeRace` in `campaigns.ts`). The ballot's pledge part filters by contest and reads on election day, before the close. `foldCauses` reads `pledges` by candidate to keep the pledged causes, so the close runs it first and drops the pledges after. Only the closed contest's pledges go: a voter's yes in a race still open stays.
  - `messages` and `rivalWord` are read for one window after a race closes. `rivalWordPassedOn` reads them inside its `rivalWordDays` window, a closed race's last week included, because filings stay on the ballot after the count. `raceReading` reads each candidate's newest `rivalWord` row only while the race is open. `foldRivalWord` drops each campaign turn what neither can still reach.
- **Per person** (one row per voter and person, carried across races and through a term in office): `impressions`, keyed `${voterId}|${candidateId}`. `appealFor` reads `heardOf` and `knowsPlatform` with no contest check, so a voter who heard of you in one race still knows you in the next, and an official's contacts write rows too. Only rows whose voter or person has died or left can go.

## Tracing a reaction that never fires

When a played proof shows an engine's reaction never happening (Nov 1: an incumbent who never stepped up), write a scratch test that logs, each day, the reading the engine decides on, which branch blocked it, and the numbers on both sides. Then weigh the alternative records it could read in a table against those numbers before you change the engine. Reject the ones that never fire, or that fire for the wrong reason. Delete the scratch test afterward.

## Stop condition

Done when every count you report names its places, seeds and branch head; every version of an ablation played the same places; and the result is in the status block or the item's Notes, not only in a message.
