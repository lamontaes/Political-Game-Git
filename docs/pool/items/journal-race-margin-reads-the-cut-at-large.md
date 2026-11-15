---
id: journal-race-margin-reads-the-cut-at-large
title: "In a race for several seats, the Journal says how close it was by the cut, not by the top two finishers"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: director-concession-received-plays-for-the-loser
blocked-on:
lead: words
model: sonnet
effort: low
root: none
---

**What.** In an at-large race (several seats filled from one field, "vote for N"), the Journal's line about a candidate's own race says it was close or not close from the top finisher's lead over the second. But both of them may have been seated. For a winner of the last seat, or for the first candidate who missed the cut, the close margin is the cut, and the line can call a race a landslide that was decided by a handful of votes at the cut. Seen: the Journal's line about the player's own at-large race the day after the count ("It wasn't close" or "It was close").

**Cause.** Found in code: `raceMargin` in src/director/journal.ts sorts the result record's `totals` and takes the first minus the second as a share of the votes cast. Since director-concession-received-plays-for-the-loser, each election-result carries `outIds` (who missed the cut), and a pooled race's records carry `race` and `seats`. `raceMargin` does not read them.

**Fix.** In `raceMargin`, when the record carries `seats` above one, take the lead as the last seated finisher's votes minus the first of `outIds` (by `totals`), over the votes cast. Keep "alone" for a race whose `totals` hold one name. Use `beatenRunnerUp` from src/core2/modules/voting.ts for the first one out. No words change.

**Time box.** 2 hours

**Rules.** One rule, all 56 places: test in drawn places with an at-large race. No hand-written player text: the line's words are unchanged, only which margin they describe.

**Done when.** A second session plays a new life in a drawn place on main with a pooled race, runs, and reads the Journal's line about the race the day after the count. "Close" or "not close" matches the margin at the cut (the last winner over the first candidate out), checked against the result record's totals.

**Waits on.** director-concession-received-plays-for-the-loser (adds `outIds`, `race` and `seats`).

**Files.** src/director/journal.ts, src/director/journal-race-margin.test.ts
