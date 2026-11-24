# Codex coordinator: how to run these jobs

From Claude CTO, September 29, 2026. Lamontae approved this folder as the way Codex gets its work: one bounded prompt per job, with references.

## Before any job

1. Read `AGENTS.md` at the repository root. Its standing owner rules bind every job:
   - no dice;
   - one rule for all 56 places;
   - estimate, never UNKNOWN;
   - wire to the world;
   - the emergence report;
   - the local gate;
   - research before building;
   - scenes are places.
2. Also read the rules below. Lamontae set them on September 29, and every job follows them.
   - **Sliding scales, never thresholds.** Nothing flips at a line like "below the town median". How much a person works, when they retire, whether they move: each rises or falls smoothly with every factor that bears on it. Real totals check the result; they never pick one person.
   - **Causes, not chances.** A world event happens because something caused it. For example: a place's real hazard record and season, a person's own health record, a law, an energy price change. Never a monthly chance.
   - **Born, not rolled.** A new person's looks come from their parents, their name from real name records for their birth year and place, and their upbringing from their family's money and home. A seeded pick is allowed only among real options, such as which parent a child takes a feature from.
   - **Realistic, not real, at the start.** Starting values need to be realistic. They start from real averages with a per-world spread, and exact real values are used only for things players recognize.
   - **Speed budget.** No change may make a game year more than 20% slower than on main. Measure it with job 06's timing script once it exists; until then, time a 3-year watched world before and after.
3. Work on a branch named `codex/<job-slug>`. Open one pull request per job, or several small ones for a big job. **Never merge**: Claude CTO gates and merges.

## Running the jobs

Take jobs in the order listed below unless a job says it waits on another. Two jobs may run at once only if they touch different files; each prompt names its files. Run the tests for the files you changed, not the whole suite.

| #   | Job                                                                      | File                                        | Waits on                       |
| --- | ------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------ |
| 01  | Wire the last 10 laws and prove all 92                                   | `docs/handoffs/codex-wire-last-ten-laws.md` | nothing (running)              |
| 02  | Every state governs, and Congress votes from principles                  | `02-every-state-governs.md`                 | nothing                        |
| 03  | Remove the 217 dice lines                                                | `03-dice.md`                                | nothing; split by group        |
| 04  | Towns built from census counts                                           | `04-towns-from-census.md`                   | nothing                        |
| 05  | Town work and money                                                      | `05-town-work-and-money.md`                 | 04                             |
| 06  | Speed                                                                    | `06-speed.md`                               | nothing                        |
| 07  | Canned and fake content out                                              | `07-canned-content-out.md`                  | nothing                        |
| 08  | Art into the game                                                        | `08-art-into-the-game.md`                   | Claude CTO's image delivery    |
| 09  | Playtest fixes                                                           | `09-playtest-fixes.md`                      | routes items to the other jobs |
| 10  | UI restyle                                                               | `10-ui-restyle.md`                          | the mockups Lamontae approves  |
| 11  | Elections and place counts                                               | `11-elections-and-places.md`                | 04 for place counts            |
| 12  | People's history in the dossier                                          | `12-people-history.md`                      | nothing                        |
| 13  | Every policy topic has laws (107 topics have none, including state rail) | `13-every-topic-has-laws.md`                | 01 finished                    |

## Hand-back

Every job ends with a hand-back file, `docs/codex/handbacks/<job>.md`, committed in the job's last pull request. Write it in the order and format of `.agents/skills/civic-reports/`:

- **MERGED**: what is in pull requests, with each pull request's number and what it does in plain words.
- **WHAT EMERGED**: each outcome marked DECIDED (quote the recorded reason) or HARDWIRED (give file:line), with the numbers from a watched world in a random place (name the place and the seed).
- **Wider knock-on effects and missing links.**
- **VITAL STATISTICS**.
- **NEEDS LAMONTAE**: only a real product decision, written as a question with options and your recommendation first. Claude CTO puts these on Lamontae's docket.
- **PLACEHOLDERS**: every stand-in value you left, by name.

Never say "unknown" about a value, and never report a pull request by its number alone; say what it does.
