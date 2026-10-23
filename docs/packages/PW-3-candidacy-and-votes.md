# PW-3: people decide to run, counted voters vote, ballots follow views

Three game years, two towns: the candidacy engine recorded 0 decisions. Every filing was the incumbent again or an unnamed party challenger. Local races were decided by 2 to 34 named people while thousands of counted residents cast nothing. A person recorded as very conservative voted for the Democratic candidate because ballots follow the party tie set at the opening, not the person's views.

## Who builds it, where

- **Read first:** `docs/packages/PW-common.md`, then PW-1 and PW-5 (shared files).
- **Builder:** one Opus session at **high**: three "no dice" decisions (who runs, who votes, how they vote) that every election in the game rests on.
- **Branch:** `pw/candidacy-and-votes`, from `main` after PW-2 lands. Pillar: OPUS-GOV owns these engines; build on your branch, and OPUS-GOV reviews the PR. Do not push to `opus-gov`.
- **Owned paths:** `src/core2/modules/candidacy.ts`, `src/core2/data/candidacy/`, the ballot code in `src/core2/modules/voting.ts` (who votes and how; functions around `atThePolls`, the counted-vote tally near line 533, and the ballot choice itself), `src/core2/electorate.ts`, `src/core2/opening-voter-groups.ts` (read; change only with OPUS-CORE's answer in the PR), their tests, `docs/archive/2026-10-23/roadmap/PROGRESS.md`, a release note.
- **Not yours:** contest and term dating in `voting.ts` and `elections.ts` (PW-5), the player's own ballot on a skip (PW-5).

## Build

Work in this order; each step is a commit with its test, measured in the played world.

1. **Why zero decisions.** `decideToRun` in `candidacy.ts` exists and goes through the core's chooser. Find out, in a played-world run on a fresh seed, why it never fires. Is the module installed but never asked, with no event or calendar hook when a contest opens filing? Is `candidatesFor` only called for incumbents? Does the filing window close before any named adult is offered the choice? Write the answer in the PR body with the record ids before changing anything.
2. **Named adults weigh running.** When a local contest's filing window opens (the `filing-closes` calendar row in `voting.ts` marks the window), every full adult resident eligible for the seat gets the run-or-stay-out choice through the core's chooser. The reasons come from `candidacyReasons`: their traits, principles, ambition, money, time, relationships to the incumbent and standing in town. Officials weigh it for the next seat up. The decision is recorded in the `decisions` table with its reasons either way. Retire the stopgap `SG-P15-candidacy-weights` or keep it with a reason the CTO accepts, in the PR body. No rate, no roll: if nobody in a town wants to run, nobody runs, and the records say why each one stayed out.
3. **Counted residents vote in local races.** The counted-vote tally in `voting.ts` (near line 533, through `countedResidents` in `electorate.ts`) exists. Find why local results still came from a handful of named people: counted turnout zero for local contests, counted groups attached only to statewide races, or the result row ignoring `countedVotes`. Fix the cause. Each counted voter group votes from its own record (its views, its turnout history in `opening-voter-groups.ts`, the contest's salience to it), with the group's vote recorded against the contest. A result row's total must exceed its named voters in every local contest in a town with counted residents.
4. **Ballots follow the person's views.** A full person's ballot comes from their views on the issues the candidates filed platforms on, their traits, their relationships to the candidates, and party only as one influence, weighted as the voting module's parameter table says. A voter who never heard a platform (OPUS-GOV audit item 3) votes on what they know: party, name recognition, incumbency, and records their reason as that. No person's ballot runs against a strong recorded view unless a recorded reason outweighs it. The `chosen` table keeps the ballot and its reasons.
5. **Parameters.** Every weight is in `src/core2/data/candidacy/` or the voting parameter table, tagged, with its spread. Cite the turnout and candidacy research you used in the parameter row, not in a comment.

## Acceptance checks (PW-1 letters C, D, E)

1. **C:** On two fresh seeds, the `decisions` table has at least one entry per local contest whose filing opened in the year, with reasons, and at least one named adult decided to run somewhere in the year. If on a seed nobody ran, the PR body shows the decisions and their reasons and that is acceptable for that seed; both seeds with zero runners is not.
2. **D:** In every local contest decided in the year, the result total exceeds the number of named ballots, and the counted votes by group are in the result row.
3. **E:** No full person's ballot contradicts a view scored past the module's declared threshold on the contest's issues without a recorded reason that outweighs it. Write the check so it reads the records, not the code.
4. Remove the `fails` markers for C, D and E in `tests/golden-path/played-world.test.ts` and show the suite green.
5. `npm run zero-dice` is green; no `Math.random`, no seeded roll, no fixed percentage in anything you wrote.
6. Year time before and after, same seed, within 20%.

## How the owner checks it

In `/play` on a fresh seed, skip to the first local filing deadline. The clerk's filing record shows named townspeople, not only the incumbent, and clicking one shows why they ran. Skip to Election Day: the result shows thousands of votes in a town of thousands, and a neighbor he talked to, who is against the thing the challenger ran on, voted against the challenger. If any of those three is not what he sees, the package is not finished.

## Out of scope

Contest dates and when a winner takes office (PW-5). The player's own vote (PW-5). Primaries with the wider electorate and no-winner-on-zero-votes (OPUS-GOV audit items 1 and 4) unless they fall out of step 3 for free.
