# PW-5: elections and terms dated by the state's rules; the player votes

A county voted on all nine seats in 2026 and on eight of them again in 2028, for terms starting in 2031 and 2032. A town's 2027 winners took office on Election Day. Officials kept seats after their terms ended and after moving away. The player missed every election, a presidential one included: the game casts no ballot for the player unless the player chose one, and a skip never stops on Election Day. This package dates every contest and term from the state's own rules, in all 56 places, and gives the player their vote.

## Who builds it, where

- **Read first:** `docs/packages/PW-common.md`, then PW-1 and PW-3 (shared files).
- **Builder:** one Opus session at **high**: dates that are wrong by a year break every election after them, in every place.
- **Branch:** `pw/elections-and-terms`, from `main` after PW-2 lands. Pillar: OPUS-GOV; it reviews the PR. Do not push to `opus-gov`.
- **Owned paths:** `src/core2/modules/elections.ts`, `src/core2/modules/offices.ts`, `src/core2/data/offices/`, `src/core2/data/elections/`, the contest and term dating in `src/core2/modules/voting.ts` (the result and take-office code near line 1086, the `election-day`, `primary` and `filing-closes` scheduling near lines 160 to 180), the player-ballot path near line 950, `src/core2/player-stops-v1.ts` (only to add the Election Day stop), their tests, `docs/archive/2026-10-23/roadmap/PROGRESS.md`, a release note.
- **Not yours:** who decides to run and how people vote (PW-3).
- **Where:** the take-office date is copied from the old term's end near line 1086 of `src/core2/modules/voting.ts`; the player's missing ballot is near line 950 of the same file.

## Build

1. **Term rules are data, per state and office kind.** Cover each office kind the game has: council, mayor, county board, clerk, state house, state senate, governor, U.S. House, U.S. Senate, president and the others in `offices.ts`. For each, record six things. Term length. Whether terms are staggered and how. The election date rule: general election day, the state's local election date where it differs, odd-year municipal elections where the state has them. The primary date rule. The filing deadline rule. The take-office rule: the first Monday in January, the first council meeting of the year, or the date fixed in the charter. All 56 states and territories, one row each per office kind, sourced from the state's statute or the National Conference of State Legislatures compilation, tagged SOURCED with the citation. Where a state leaves it to the locality and the place's records say, read the place's record. Where they don't, mark it ESTIMATED from the state's most common rule, with the spread. Put them in `src/core2/data/elections/`. No state named in logic.
2. **Every contest is dated from the rules.** When `openElections` builds the opening seats and the next contests, each term's end date, each contest's filing deadline, primary and election day, and each winner's take-office date come from the rule rows for that state and office kind. A seat up in 2026 with a four-year term is next up in 2030, not 2028. Staggered bodies put the right half up. A winner takes office on the rule's date, never on Election Day, never on the old term's end unless the rule says so.
3. **Officials leave when they should.** On a term's end date, the seat's holder leaves unless re-elected; the record says who holds the seat from that day. When an official moves out of the jurisdiction (the moves module records it), the seat vacates on the date the state's rule gives: immediately, or at the next meeting. The vacancy is filled by the state's rule for that office (appointment by the body, special election, next-in-line), recorded with its source. Nobody holds a seat past its end or from outside the place.
4. **The player votes.** On each Election Day the player is eligible for, a skip or calendar jump stops with the ballot as the open choice (register the stop in `player-stops-v1.ts` the way other module stops are). If the player is not controlled (the PW-1 run, or the owner left the character idle), the character votes on its own reasons through the same ballot path everyone else uses (PW-3's); the player is never special-cased to abstain. The ballot and its reasons go in the `chosen` table either way.
5. **A next contest every cycle.** OPUS-GOV's audit says one contest per seat ever blocks the golden path's step 11. After a result, schedule the seat's next contest from the rules. The election record (who ran, who won, on what) stays with the seat so the next election uses it.

## Acceptance checks (PW-1 letter I, and the player's vote)

1. **I:** On two fresh seeds, at the end of the year no term row has a holder past its end date, and no seat holder's residence is outside the jurisdiction. Every contest decided in the year has a take-office date equal to the rule row's date for that state and office kind. The test reads the rule row to check it.
2. On both seeds, the uncontrolled player has a ballot in the `chosen` table for every contest they were eligible for in the year, with reasons.
3. In the bench, with the player controlled, a skip across Election Day stops on it with the ballot offered; put the screen's control names in the PR body.
4. Every seat decided in the year has a next contest scheduled, dated from the rules.
5. A random-place test: draw five places from `drawPlace`, build the opening, and for each seat assert the first contest's dates against the rule rows. Name the five places and seeds in the PR body.
6. Remove the `fails` marker for I and show the suite green.
7. Year time before and after, same seed, within 20%.

## How the owner checks it

In `/play`, open the town's offices: each seat shows who holds it, since when, until when, and the next election date, and the dates make sense for that state (he can check one against the state's own website). Skip a year: the game stops on Election Day with his ballot. A council member who moved away last spring is no longer on the council, and the record says how the seat was filled.

## Out of scope

Who runs and how others vote (PW-3). Primaries with the wider electorate (OPUS-GOV audit item 1), beyond dating them. The Electoral College (OPUS-GOV audit item 14).
