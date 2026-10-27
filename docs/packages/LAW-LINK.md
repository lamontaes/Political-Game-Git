# LAW-LINK: every law has an effect the game reads

Fifty-nine policies can pass as law. Twenty-one change money or behavior. Thirty-eight only write a note on people's records, because their handlers were declared as note-only in data and nothing in the repository treats that as unfinished. This package links all 59 to the game using the two paths that already exist. It builds no new module, registry, store or data format.

## Who builds it, where

- **Builder:** one Codex session (Astra), high effort, owning the whole list. Not split by key, area or pillar. The seams between systems are the work, so one builder touches all of them.
- **Branch:** `codex/law-link`, from `main`.
- **Allowed paths:** `src/core2/modules/*.ts` (adding one law read where an engine acts), `src/core2/law-reach/**`, `src/core2/data/laws/**`, `src/core2/data/outcome-web/**`, `src/core2/modules/outcome-web.ts`, `src/core2/modules/views.ts`, `src/core2/modules/news.ts`, `src/core2/modules/budgets.ts`, `src/core2/data/stopgaps.json`, `tests/golden-path/played-world.node-test.ts`, the tests of files touched, `docs/roadmap/PROGRESS.md`, one release note. Nothing under `src/bench` except reading. No change to `src/core2/state.ts` or `life.ts`; a need there is a written request to OPUS-CORE in the PR body.
- **Read first:** `AGENTS.md`, this file, `src/core2/modules/laws.ts` (the law table and `lawInForce`), `src/core2/law-reach/group-a.ts` and `group-b.ts` (the registries being emptied), `src/core2/modules/outcome-web.ts` (the measures model), and the law check on main at https://claude.ai/code/session_012UfQTiJbjHfLhGMyTYf5fZ.

## The rule

A policy is linked when flipping it in a played world changes at least one of these. A dollar on a cash-journal entry. A price the place-prices engine sets. Who an engine marks eligible and then pays or serves. A decision's recorded reasons. A kept outcome measure that a voter group, a budget line, the news or the town panel reads. A record written on a person is not an effect. A handler whose mechanic is `none` or `records` is an unregistered placeholder and fails the guard.

## Two paths, nothing else

**Path 1, money and behavior laws pull from the law table.** This is how the eight working laws (income, sales and property tax, minimum wage, unemployment) work today: the engine reads `lawInForce(api, question)` at the moment it acts. Add the same read, in the engine that already does the thing, for:

| Engine       | Policies                                                                                                                                         | What the read changes                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| housing      | rent stabilization, right to counsel in eviction, multifamily in single-family zones, inclusionary requirement                                   | the rent rise it computes; who it evicts; what it builds when it adds dwellings                                  |
| credit       | cap consumer loan rates                                                                                                                          | the rate ceiling it offers                                                                                       |
| jobs         | right to work, public-sector collective bargaining                                                                                               | the dues line it takes; the public-employer wage it sets                                                         |
| health       | expand Medicaid eligibility, Medicaid work requirement, work requirement for assistance                                                          | who it marks covered or assisted, which changes who pays for care and who gets benefits                          |
| budgets      | cap property-tax growth, exempt groceries from sales tax, mileage fee replaces fuel tax, universal preschool, public funds for private schooling | the levy it computes; what sales tax collects on; the lines it moves and the school eligibility that spends them |
| place-prices | price carbon, bottle deposit, clean electricity standard, ban new gas hookups                                                                    | the price level, by a sourced per-unit cost                                                                      |
| business     | legalize cannabis sales, consumer data privacy law, age verification for social media, restrict government facial recognition, public broadband  | a business kind it may open; a compliance cost on businesses of that kind; a utility line                        |

Each read is a few lines in the engine plus one parameter row (SOURCED or ESTIMATED with spread) for the size of the effect. Delete the `none` and `records` mechanics for these keys in the law-reach data as each one lands.

**Path 2, every other law moves a measure, and the measures are read.** The outcome web already turns a law into monthly estimates of measures (it keeps 5 today: four crime rates and the birth rate) and writes them, and nothing reads them. This is the same model _The Political Process_ uses for every law. Finish it in two moves:

1. Every one of the 59 policies has a link row in `src/core2/data/outcome-web/` to the measures it moves, with the size and the source. Add the kept outcomes those rows need: jail population, court caseload, violent crime, property crime, police complaints and trust, deportations, health coverage, housing cost burden, turnout, air quality, water drawn, farmland lost, and the others the rows need. These are data rows in the existing file, not new code paths. Policies with no engine are linked this way only, and that is enough: the measure is the effect. Those are end cash bail, permit to carry concealed, stand your ground, raise handgun purchase age, child access prevention, civilian oversight of police, raise juvenile court age, partner with federal immigration enforcement, restrict abortion, independent redistricting, broaden local authority, limit groundwater withdrawal, protect farmland, clean air plan, and ban discrimination.
2. Four things that already exist read the measures through `placeOutcome` and `outcomeWebFactor`:
   - **views** (`src/core2/modules/views.ts`): a voter group's view of an issue and its approval of the officials who voted for the law move with the measure, so the next election uses it;
   - **budgets** (`src/core2/modules/budgets.ts`): a crime or caseload measure is spending pressure on the police, courts and corrections lines the module already carries;
   - **news** (`src/core2/modules/news.ts`): a measure that moved past its spread is a story, so people bring it up;
   - **the town panel**: the bench's world panel shows the kept outcomes from the same table; if it already lists them, nothing to do.

The money laws in Path 1 also get link rows, because a tax or a rent cap moves measures too. The two paths are not alternatives; Path 2 is universal and Path 1 is added where real money moves.

## The check

In `tests/golden-path/played-world.node-test.ts`, replace the "every installed module runs and changes its records" reading of law effects with: for the laws that took effect in the year, each one changed something in the rule above, named by record id. Add a second test, `src/core2/law-link.test.ts`, that builds a played world on a seed from `drawPlace`, and for each of the 59 policies enacts it on day 1, runs 90 days, and asserts the rule, with the record that changed. Mark a policy that cannot yet pass as an expected failure naming why; there should be none at the end, and the test fails if a policy has no row.

## What counts as finished

- All 59 policies pass the law-link test on two fresh seeds the builder did not choose, named in the PR body with the record ids.
- No handler mechanic is `none` or `records`. The guard fails if one appears.
- Every new number is a tagged parameter row. No state named in logic. No dice.
- Money balances; the speed guard holds (one law read per act is cheap; a monthly measure pass is already there).
- The PR body lists, for each of the 59, the path, the engine or measures, and the record id that moved in one named town.

Not finished means the PR body says which policies pass, which don't and why, with the same evidence, and the guard is red on the rest. Do not call it done over a record on a person.

## Do not

- Build a new module, registry, store, event kind or data format. If it feels like one is needed, it is not; read the two paths again.
- Keep `none` or `records` as a mechanic for any policy.
- Hand-write what a law does in prose. The English engine words it from the records.
- Tune to any one town.
