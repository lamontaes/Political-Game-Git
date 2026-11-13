---
id: director-filed-late-told-without-own-filing
title: 'A player who never filed is told "Before you filed, Harper Lin put in for supervisor"'
area: director
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/p1-filed-late-own-filing
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: Playtester P1, Nov 13
claimed-at: 2026-11-13
---

**What.** In Curtisville, Pennsylvania (bench seed 24b09c77-0589-433f-9b6b-0c77e53b4ff7), a 17-year-old who has not filed for anything presses Day three times and on Thursday, January 23, 2025 at 7:00 AM gets a scene at home: "Taylor Webb has been reading who filed for supervisor before you did." then "Alan, sit down a second. Before you filed, Harper Lin put in for supervisor." The player is not old enough to file and never went to the board of elections. Seen: the talk at home the morning after someone else files for a race the player is not in.

**Cause.** Found in code: src/director/circumstance.ts, `playerHolds`, case `filed-late`. The row `rival-known-late` (src/director/data/circumstances.json) is meant for the day after the player's own filing, but its gate only asks whether someone other than the player is on the contest's ballot. `playerNamed: true` lets the row take a record that names the player; it does not require one. So any `candidate-filed` record of anyone else, in a contest with another filer, calls it for a player who never filed.

**Fix.** In the `filed-late` case, return false unless the `candidate-filed` record names the player (`record.personIds` includes the player; the elections engine's `announce` puts the filer there). Add the matching check in src/director/circumstance.test.ts: a scene from a `filed-late` row cites a record that names the player.

**Time box.** 1 hour for one Sonnet session.

**Rules.** scene-standard: a scene exists only when its records say so. One rule, all 56 places: the gate reads the record, no place named.

**Done when.** A second session, on main, starts a new life in a drawn place where someone files before the player can, plays the first weeks without filing, and gets no talk saying who filed "before you did"; then files in a race someone else entered first and, the next day, is told who is already on the ballot.

**Waits on.** Nothing.

**Files.** src/director/circumstance.ts, src/director/circumstance.test.ts, src/director/data/circumstances.json
