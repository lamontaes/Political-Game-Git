# The country tier and the results-first clock

Every state becomes people and firms kept as counts, with a state treasury, stepped once a month by the rules the town already uses. The nation is the sum of the states. Nothing outside the player's view is played day by day: it is kept as results and rebuilt when opened. That gives the game one economy that laws can move, and a clock that can run twenty years in seconds. Four things are deleted in the same work: the national formula, the pull of each state toward the nation, the forcing of moves to match the Census, and the fixed layoff pace.

## Where this comes from

Design by Fable, November 10, 2026, for pool item `core-country-tier-first-slice`. It answers root causes 1 and 5 of the audit (`docs/audits/fable-vision-2026-11-09.md` on branch `audit/fable-vision`).

## What you ruled

- November 8: "None of the simulation should be hard-coded like that or, you know, set against a baseline. The baselines are to calibrate... a cause formula... things can take drastic turns, wild turns, or just be, you know, calm."
- November 8: "ranges aren't targets. And look, that's not just for economics. It goes for everything."
- November 8: "The other 49 states changing laws and, stuff happening nationally and locally and stuff is to the utmost importance."
- November 5: "just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand."
- November 8: "for a 20-year thing, I'm fine with it simulating everything as long as it makes sense in the end. Like, I would love if 20 years only took, 5 seconds."
- October 14: "if California repealed its state income tax, people would flood in."
- October 14, standing rule: one model, two tiers. A counted group is read by every engine with the same rule as a full person, times its count.

## What the game does today

Measured and read in the audit, and confirmed on main on November 10:

- **The nation is one formula.** `stepMacroMonth` in `src/core2/macro-model.ts` computes unemployment, prices and rates from last month's figures. Its cycle is built in. The town's income enters at a weight that rounds to nothing, and no tax, budget or disaster enters at all.
- **Each state follows the nation.** `stepRegionMonth` in `src/core2/regional-model.ts` sets a region's unemployment to the nation's plus last month's gap, shrunk a little.
- **Moves are forced to the Census.** Every month `src/core2/modules/counted-moves.ts` adjusts each state's pull until arrivals match the survey, and pins departures to the survey rate.
- **Layoffs follow a fixed pace.** `reviewTurnover` in `src/core2/modules/jobs.ts` fills a meter at a national rate. Without it, firms almost never let anyone go, because about 80% of a small town's sales come from outside buyers who follow one smooth factor.
- **The result.** In Woods Cross, Utah (seed f61d987b2e0e), with both income taxes set to zero, national unemployment after three years was 5.722% against 5.727%, and the region's population was 729,822 in both worlds.
- **The clock.** Everything steps day by day. Twenty years take 17 to 51 minutes where they finish at all.

Three pieces of the answer already exist and are kept:

- The 56 states are already held as people by age band, stepped monthly (`counted-moves.ts`).
- The town's counted households are already paid, taxed and charged by shared rules (`withholdingFor`, the outlay rule, the benefit formulas).
- The past before the start is already run in months and quarters with no daily people (`src/core2/pre-start.ts`).

## The design in one page

**1. A state is counts and a ledger.** Each of the 56 states and territories holds:

- **Households as cells:** one cell per income fifth and age band, with its people, workers, job seekers, retired and children, and one cash account.
- **Employers as cells:** one per sector (the eleven the regional data already uses), with its jobs, pay, prices, sales and cash.
- **A ledger:** the state's treasury, with the revenue and spending lines its published budget has.

The federal government is one more ledger. The played town and its county stay as they are, in full detail, and count inside their own state's totals.

**2. One month, the town's own rules.** On the first of each month every state runs the same steps the town runs, times the counts:

1. Employers pay their workers.
2. Income and payroll taxes are withheld by the law in force in that state and the nation, with the same function a town paycheck uses.
3. Benefits are paid by the same formulas: unemployment insurance, retirement income, food aid.
4. Households spend what the town's outlay rule says, and the sales tax in force is collected.
5. Governments pay their lines: public pay, aid, purchases.
6. Each sector compares its sales with what its staff can produce. It hires when short and lets people go when over, and firms without cash close.
7. Pay moves with how hard workers are to find and with the minimum wage in force. Prices move with costs and with how busy firms are.
8. People weigh every other state: after-tax pay, prices, the chance of work. Some move.
9. People are born, age, retire and die at the rates the town uses.

**3. The nation is the sum.** National unemployment is everyone looking for work over everyone working or looking. The price level is what households paid. Output is what was sold. There is no national formula left to run.

**4. The cycle comes from causes.** A boom or a recession starts from something on the records and spreads through steps 1 to 7. The causes are a tax or spending change, the central bank's rate (its board already votes), a disaster, a price shock from abroad, and firms running out of cash. Lost jobs cut spending, and lost sales cut jobs. Nothing is scheduled and nothing is pulled back to a level.

**5. Laws land on people everywhere.** Every state's law is already readable (`stateLawInForce`). The monthly steps read it, so Utah's income tax changes Utah's paychecks, spending, jobs, treasury and arrivals. A federal law changes all 56.

**6. The town and its state talk both ways.**

- The town's firms sell to outside buyers. Those buyers become the state's and the nation's households and sectors, by sector, in place of one smooth factor. Each seller's share follows its price, capacity and standing against its rivals, so firms gain and lose customers for reasons on their books. That is what replaces the fixed layoff pace.
- The town's rates, prices and job prospects are read from its state and the nation, as today, but now those figures were made by people.
- The town's people, jobs and dollars are part of its state's sums.

**7. Results first.** Anything the player is not watching is kept as results, at the grain above, and detail is built when opened:

- **Another state:** its cells and ledger are the results. A person met there is filled in from their cell, with a job and pay that agree with it (the existing fill-in path, now reading the tier).
- **The player's own town during a long skip:** it runs as results too. Monthly engines run. The daily loop, rival campaigns event by event, interviews and the press do not. Elections are counted from the voters. On return, the day-by-day detail is rebuilt from the results.
- **The past before the start** is already kept this way. One coarse engine serves the past, other places and skipped years.

**8. The clock has two speeds.** Watched time runs in days. Unwatched time runs in months. A "20 years" control runs 240 monthly steps for the whole world, then rebuilds the present.

## What is deleted

| Deleted                                                             | Replaced by                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `stepMacroMonth` and its built-in cycle                             | The sum of the states                                                        |
| The pull in `stepRegionMonth`                                       | Each state's own month                                                       |
| The monthly re-fit of arrivals to the Census, and pinned departures | Place constants fitted once at the opening; flows then follow causes         |
| `reviewTurnover` (the fixed layoff pace)                            | Firms losing and gaining customers, in the town and in every state's sectors |
| Other states' budgets as a published figure times a factor          | Each state's ledger                                                          |
| The campaign-stride fast-forward switch                             | The monthly clock                                                            |
| Two of the three per-place summaries                                | The tier's cells                                                             |

Real data sets the opening and the parameters only: each state's people, jobs by sector, pay, budget lines and laws on day one, and the constants inside the rules. Each number sits in a parameter table with its source and its role. After day one nothing is checked against a real level, and nothing fails a run for leaving a real range.

## What stays out of the first slice

- **Other states' legislatures reacting to their economy and opinion.** They keep today's one tally per session until the tier's opinion and budget figures exist to drive them. That is the next slice, and the pool items `nation-other-states-change-laws-in-year-one-then-almost-never` and `nation-other-states-never-change-an-amount` carry it.
- **Regions inside a state.** A metro area reads its state's figures with its own opening difference. It gets its own cells later.
- **A States screen.** It is pool item `play-states-screen-opens-any-state`, built on the tier's records once they exist.
- **Household formation among counted households.** It is an existing stopgap and matters for runs past a generation.

Each of these is a registered stopgap with its pool item, not a silent gap.

## The order of the work

Each step is its own pull request, checked by a second session in the running game.

1. **The tier runs.** States open from data and step monthly. The national and state figures every screen and engine already reads now come from it. The national formula, the pull, the Census forcing and the two spare place summaries are deleted. Other states' budgets come from the ledgers.
2. **The town joins.** Outside buyers come from the tier by sector, and each seller's share follows its books. The fixed layoff pace is deleted.
3. **The fast clock.** Results mode for the whole world, the "20 years" control, and the rebuild on return.
4. **The proofs.** A 20-year game on main in a drawn place, and the Woods Cross twin test.

## How a second session checks it

- **Twenty years.** In a drawn place, press "20 years" in dev mode's Run panel. The game reaches the date twenty years on. The Metrics tab's country, state and town rows show figures a real place could have: never more jobs than adults, never a negative count. The check records the time taken.
- **The tax twin.** Woods Cross, Utah, seed f61d987b2e0e: set the state and federal income taxes to zero on day one with dev mode's law control, run three years, and press "Follow the money". National unemployment, Utah's unemployment and Utah's population differ from the twin, and Trace opens the households and sectors that moved them.
- **A recession with a cause.** Run forty years in a drawn place on the fast clock. Each downturn on the Metrics tab traces to a record: a rate decision, a budget, a disaster, a price shock.
- **Nothing left behind.** A search of `src/core2` finds none of the four deleted mechanisms.

## Risks, and how each is held

- **A model with feedback can run away.** The audit found a world where households held 1.7 jobs per adult. Every step keeps an account that must balance: people in equal people out, and every dollar has a payer and a payee. A nightly 20-year run (pool item `release-nightly-twenty-year-game-on-main`) fails loudly on a count that cannot be.
- **Speed.** The tier is about 4,000 cells for the whole country, so a month costs little. The cost is in the town's own monthly engines during a skip. Each is measured with `npm run speed:year` before and after.
- **The town's numbers will change.** Today's small-town unemployment is held up by the fixed layoff pace. Without it, the level comes from firms' books. By your ruling a level outside the real range is fine if causes support it. It is still checked for sense in drawn places before the pace is deleted.
- **Two models for one thing.** The cells use the town's own rule functions wherever one exists. Where the town's rule is written for one household at a time, it is rewritten once so both tiers call it.
