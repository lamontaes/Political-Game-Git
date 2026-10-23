# PW-1: the played-world test, the gate everything else is measured by

One script and one test build the world the owner plays, on a seed nobody chose, and run it for one game year with no character controlled. They check that the world is alive: people are born, counted voters vote, laws pay someone, someone decides to run for office, money reaches accounts, memory stays bounded. Known failures are marked as expected failures with the package that owns each. When that package lands, its checks turn green or its PR is not finished. Nothing like this exists today. The golden-path suite's rows test small worlds or the opening only, and the sim-stories report found 20 breaks by hand that no gate had caught.

## Who builds it, where

- **Read first:** `docs/packages/PW-common.md`.
- **Builder:** one Opus session at **high**: this test defines "done" for every other package, so a wrong assertion here costs every later session a night.
- **Branch:** `pw/played-world-test`, from `main`. **Lands first.** Every other PW package verifies with this.
- **Owned paths:** `src/bench/played-world-check.ts` (new), `tests/golden-path/played-world.test.ts` (new), `docs/roadmap/features.json` (one new row), `scripts/core2-guard/policies.json` (only if a budget line is needed), `docs/archive/2026-10-23/roadmap/PROGRESS.md`, `docs/release/changes/pw-played-world-test.md`. Nothing under `src/core2`. If the check needs a read the core does not offer, read module tables through `coreAPI(core).moduleState(<id>).table(<name>)` as the modules themselves do; if that is not enough, write the request for OPUS-CORE in the PR body and assert on what you can.

## Build

1. **The script, `src/bench/played-world-check.ts`.** Arguments: `--seed <hex>` (required; no default seed, ever), `--years <n>` (default 1), `--opening <date>` (default the bench's opening date, read from where `src/bench/m0-check.ts` reads it), `--output <path>` for a JSON summary. Steps:
   - Draw the place from the seed the way `src/bench/place-selection.mjs` does for the bench, so the owner and the test get the same town for the same seed. Print place key, name, state and seed on the first line.
   - Build with `buildBenchWorld(seed, opening, { twoLevel: true })` and the same module list `src/bench/world.ts` installs. Do not pass a module list of your own; the point is to run what the owner gets. Do not control a character; call `advanceCore(core, date)` from `src/core2/life.ts` one day at a time through the last day.
   - After each game month, record `process.memoryUsage().heapUsed` and wall time. After the run, write the summary: every check below with pass or fail, the record ids behind it, the month-by-month memory and time, and the place and seed.
   - Exit code 1 if any check that is not an expected failure fails.
2. **The checks.** Each one reads records, never a screen. Each names what it read. Write them as small functions so the test and the script share them. The list, with the package that owns the fix today:

   | #   | Check                                                                                                                                                                                                                                                   | Reads                                                    | Owner today              |
   | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------ |
   | A   | The run completes the year without throwing                                                                                                                                                                                                             | the script                                               | PW-1                     |
   | B   | Every module under `src/core2/modules` is installed (`core.modules` has its id) or listed in an exemption file with a reason                                                                                                                            | `core.modules`, the directory                            | PW-2                     |
   | C   | At least one named adult recorded a candidacy decision, and at least one decision in the year was to run                                                                                                                                                | candidacy `decisions` table                              | PW-3                     |
   | D   | In the first local contest of the year, counted votes are more than the named voters: the result's total exceeds the number of full people who cast ballots                                                                                             | voting `contests` and the ballot records                 | PW-3                     |
   | E   | No ballot by a full person with a view score on the ballot's issue runs against that view by more than the parameter the voting module declares                                                                                                         | voting ballot records, views                             | PW-3                     |
   | F   | Federal income tax and Social Security withholding appear on a payroll record dated after January 1 of the second calendar year                                                                                                                         | cash journal payroll receipts                            | PW-4                     |
   | G   | At least one law in force paid or served a named resident in the year (a payment or service record with that law as source), and every law in force reached at least one resident, business or budget line or carries a "no local effect" row           | law-effects `applied` table, law-reach store             | PW-4                     |
   | H   | A passed budget changed at least one spending line from the prior budget                                                                                                                                                                                | budgets module state                                     | PW-4                     |
   | I   | No official holds a seat past the term's end date; no official who moved away keeps the seat; each contest's take-office date comes from the state's term rule, not the old term's end                                                                  | elections `terms`, `seats`, residents                    | PW-5                     |
   | J   | The chosen player turns 18 during the first 60 days of the run (not before the opening)                                                                                                                                                                 | the entrant row, birth date                              | PW-6                     |
   | K   | The player, uncontrolled, made at least one choice in the year that was not rest or contacting a known person                                                                                                                                           | the player's decision records                            | PW-6                     |
   | L   | Every payroll receipt landed in a spendable account; no loan exceeds the parameter the credit module declares against the borrower's income; every owner-run firm made at least one owner draw or recorded why not; no occupied dwelling has a $0 value | cash journal, credit, business and housing module tables | PW-7                     |
   | M   | At least one birth record in the year, and the counted population at the end differs from the start by births, deaths and moves applied to the counts                                                                                                   | renewal `births` table, residents counts                 | PW-8                     |
   | N   | Heap after month 12 is under 1.5 times heap after month 1, and under the cap in `scripts/core2-guard/policies.json`                                                                                                                                     | the script's samples                                     | OPUS-CORE (BOARD item 5) |
   | O   | Every dollar balances: the money-balancing check the repository already runs passes on the finished world                                                                                                                                               | the existing check                                       | PW-1 (should pass today) |

   Where a check's threshold is a number (the 60 days in J, the 1.5 in N), it is a TUNABLE parameter in the test's own small table with the reason, not a literal. Where a check needs a module's own declared parameter (E, L), read it from that module's parameter table; do not invent one.

3. **The test, `tests/golden-path/played-world.test.ts`.** Draws a seed from the commit and the test id with `drawPlace` in `tests/golden-path/place.ts` (so CI varies the town), runs the script's functions in-process for one year, and asserts each check. A check that fails today is `it.fails(...)` with the owner from the table in its name, so the suite is green and the failing list is visible. Never mark a check `skip`. When you build this, run it on three fresh seeds. Record which checks fail on all three, on some, or on none. A check that passes on some seeds and fails on others is a real bug: file it in the PR body with the seeds. Mark a check `fails` only if it fails on all three.
4. **The golden-path row.** Add one row to `docs/roadmap/features.json` with id `PW-01`, milestone `M1`, golden path `1`, package `PW-1`, the test sentence from this file's "How the owner checks it," and the command `node node_modules/vitest/vitest.mjs run --config src/core2/tooling/vitest.config.ts tests/golden-path/played-world.test.ts`. Keep it inside the PR budget in `policies.json` (five minutes); if a year does not fit, say so in the PR body with the measured time and do not shrink the year.
5. **Nothing else.** Do not fix anything the checks find. Every failing check is another package's job; your job is that it fails loudly, with the owner's name on it.

## Acceptance checks (what finished means for PW-1)

1. `node --import tsx src/bench/played-world-check.ts --seed <fresh>` runs a year on two fresh seeds and prints place, seed, every check's result, record ids, and month-by-month memory and time. Paste both outputs in the PR body.
2. The test is in the golden-path suite and the suite is green on the branch, with the failing checks visible as expected failures naming their owner.
3. Checks A and O pass on both seeds. If O fails, that is a real money bug today: report it with record ids and mark it `fails` for OPUS-CORE.
4. The year's wall time is in the PR body, and it is under the two-minute budget or the PR body says by how much it is over, with the top ten functions from a profile.
5. No `src/core2` file changed.

## How the owner checks it

Open the PR body and read the table: which letters pass and which fail in a town he did not pick. A week later, the same table on main is the game's health, and no package can claim a letter it did not turn green.

## Out of scope

Fixing any break. Changing the module list (PW-2). Changing the bench or `/play`.
