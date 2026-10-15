# Codex handoff: wire the last ten laws, then prove all 92 (September 29, 2026)

From Claude CTO, for one Codex run. Read `AGENTS.md` first; its standing rules bind this job: no dice, one rule for all 56 places, estimate never UNKNOWN, wire to the world, emergence report, local gate.

## Where things stand

`npm run unwired-laws` on main (`f0b7cdfd6`) says **82 of 92 policy questions** have a sized, built effect path. The ten that don't are listed in `scripts/unwired-laws/allowlist.json`.

How a law counts as wired is defined in `src/simulation/governing/law-effect-paths.ts`. There are two ways:

1. **An outcome-web link.** A link in `data/research/outcome-web/links.json` from `law:<question key>` whose status is `built`: its size is set, its cause is read, and its outcome is produced.
2. **A direct module.** A module that reads the law in force and changes a paycheck, a budget, a rent, a seat, a court outcome or a business's costs. It is listed in `DIRECT_PATHS` or `JUSTICE_PATHS` with the file that does it.

An `about-zero` link does **not** count. It records that research found one outcome unmoved, not that the law does nothing.

Most of the ten already have about-zero links, and **those are correct: keep them**. What's missing is the law's own direct operation, meaning the thing that happens to real people and budgets on the day it takes effect. Build that.

## The job

- One branch, `codex/wire-last-ten-laws`, and one PR, with one commit per law. Don't merge it; Claude CTO gates and merges.
- Every law gets its own direct path:
  - a module that reads the law in force through the existing law-in-force reader, the way `src/simulation/state-paid-leave-law.ts` or `src/simulation/justice/pretrial.ts` does;
  - an entry in `DIRECT_PATHS` or `JUSTICE_PATHS` (add a `LawEffectPathKind` if none fits);
  - its sizes from the bill's own terms;
  - a watched-world test.
- **The bill carries the amounts.** Numeric terms (a dollar cap, a share, a number of years, an admissions level) come from the bill's terms record, written by the sponsor from their views and current law. See how `src/simulation/public-budgets/tuition-freeze.ts` and the minimum-wage bills read their terms. Never use a stand-in constant for a term a bill can set.
- **Starting law is real 2026 law.** Check `data/research/laws/starting-law-2026.json` for each question. Where a place already has the law (for example, 36 states require voter ID), the world starts with it in force and the path runs from day one.
- **Who does what is decided, never rolled.** A person's age, license, car, income, schedule, views, engagement, debts and household decide their action. Real rates check the totals in the test; they never pick one person.
- **Unread values start from real averages** with a per-world spread, marked ESTIMATED FROM AVERAGE with the source.
- **Research first, briefly.** Each law below names what to look up. Put the numbers and sources in a data file under `data/research/laws/`, not in code.
- **When done:** `npm run unwired-laws -- --update` must empty the allowlist, and `npm run unwired-laws` must report 92 of 92.

## The ten laws: what each one does in the world

Each entry says what happens on the day the law takes effect, who pays, what to hook into, and what to research. File names are starting points. Search before you build, and reuse any existing system (people, jobs, money, households, budgets, courts, crisis, council meetings) instead of making a parallel one.

### 1. Require photo identification to vote (`us-policy-positions:government-operations.require-photo-id-to-vote`, state)

**What happens:**

- Adults who lack a current photo ID and intend to vote must get one before the next election.
- Whether a person lacks an ID is decided from their record, as ESTIMATED FROM AVERAGE: no driver's license, no car, age, income.
- Whether they get one is decided by their own engagement and past voting. Someone who wouldn't vote anyway doesn't bother.
- Getting one costs a trip during work hours: unpaid hours for hourly workers, from their job's schedule.
- The state pays for free IDs and outreach from its budget, sized from real fiscal notes.
- People who show up without one cast a provisional ballot that isn't counted unless they return.

**Keep:** the turnout and registration links stay about-zero (Cantoni and Pons 2021). The net turnout effect is near zero; the costs are real.

**Hook into:** election day in `src/simulation/living-world/local-elections.ts` and the state and federal election runners, the state budget (`src/simulation/public-budgets/`), and the jobs and pay records.

**Research:** the share of adults without a current photo ID by age and income; state fiscal notes for free-ID programs (Missouri, North Carolina, Wisconsin); provisional-ballot cure rates.

### 2. Cooling-off period before lobbying (`us-policy-positions:government-operations.ban-lobbying-after-office`, state; no outcome-web link today)

**What happens:**

- When a legislator or senior official leaves office, their next job is chosen from real openings.
- Under the law, lobbying employers are closed to them for the bill's number of years. They take their next-best offer, usually at lower pay.
- Their household money reflects it.
- Lobbying firms in that capital lose a hire they would have made.

**Hook into:** whatever handles people leaving office (term limits in `src/simulation/nationwide-world/state-legislative-term-limits.ts`, lost elections) and the jobs and employers system.

- If no lobbying employer kind exists, add one. Place it in each state capital and in D.C., with counts from registered-lobbyist data and pay from wage data.
- If departing officeholders don't take a next job today, build that step for everyone leaving office. That is the whole-module rule.

**Research:** registered lobbyists per state; the share of former members who become lobbyists (for example, OpenSecrets revolving door); lobbyist pay versus the typical post-office job; each state's existing cooling-off years (starting law).

### 3. Set curriculum at the state level (`us-policy-positions:education.state-curriculum-standards`, state)

**What happens:**

- The question moves from local school boards to the state, so it is an **authority gate**, like home rule in `src/simulation/governing/question-authority.ts`. Local boards can no longer answer curriculum questions while it is in force.
- Adopting new standards costs districts a materials-and-training cycle per pupil, paid from school budgets over the bill's phase-in.

**Keep:** the math-score link stays about-zero (Song, Garet and Yang 2022).

**Research:** per-pupil cost of a standards adoption (textbooks and professional development), for example from Common Core fiscal estimates.

### 4. Expand public land access (`us-policy-positions:agriculture-natural-resources.expand-public-land-access`, state; no outcome-web link)

**What happens:**

- State land opens to hunting, fishing and recreation, and visits rise.
- Visitors spend money at businesses in towns near that land: gas, food, lodging and outfitters, through the town-businesses books.
- The state pays land-management costs.
- Each town's nearby public acreage comes from data, as ESTIMATED FROM AVERAGE where unread.

**Hook into:** `src/simulation/living-world/town-businesses.ts` and `town-business-books.ts`, and the state budget.

**Research:** PAD-US acreage by county; BEA Outdoor Recreation Satellite Account spending per visit; state land-management cost per acre.

### 5. Local control of library materials (`us-policy-positions:civil-family-community.local-control-of-library-materials`, state)

**What happens:**

- Under the law, challenges to library titles are decided by the local board.
- Residents file challenges based on their own views, faith record and whether they have children in school. No rolling.
- Each challenge becomes an agenda item at the town's library board or council meeting. Members vote from their views.
- The town records which titles are removed. The legal and staff time comes from the town budget.
- Without the law, the state's standard applies.
- It is also an authority gate.

**Keep:** the reading-score link stays about-zero.

**Hook into:** council meetings and agenda items in the living world, the faith record, and question authority.

**Research:** challenges per library per year (ALA 2023: 4,240 titles), the typical cost of a reconsideration process, and each state's starting law.

### 6. Admit more immigrants (`us-federal-positions:immigration.admit-more-immigrants`, federal)

**What happens:**

- The bill sets the added admissions per year.
- New arrivals are split across all 56 places by each place's real share of recent immigrants (ACS).
- They arrive as **real residents**: generated people with families, homes and jobs, through the same code that makes a town's people.
- Arrivals raise the workforce, housing demand and rents through the existing links.

**Keep:** the crime link stays about-zero. Size `more-immigration-to-workforce`, which currently has no size, from your research, and change its status to built.

**Hook into:** town people generation, `town-families.ts`, `town-homes.ts`, the housing market and jobs.

**Research:** ACS recent-immigrant share by place; the age and household mix of new arrivals; the labor-force participation of recent immigrants.

### 7. Forgive federal student loans (`us-federal-positions:education.forgive-student-loans`, federal)

**What happens:**

- People carry student debt. Add a per-person balance and monthly payment if none exists, ESTIMATED FROM AVERAGE by age, schooling and income, using Federal Reserve SCF and NY Fed data.
- Under the law, each borrower's balance drops by the bill's cap per borrower, within its income limit. Their monthly payment falls and their household money rises every month after.
- The federal budget carries the cost.

**Keep:** the poverty link stays about-zero. Size `student-debt-relief-to-finances` (past-due debt), which currently has no size, and change its status to built.

**Hook into:** household finances (`town-finance-types.ts` already has household `debt`), paychecks and budgets, and the federal outlays in `src/simulation/federal-outlay-laws.ts`.

**Research:** the share of adults with student debt and their balances by age; the typical payment; research on past-due rates after forgiveness (for example, the 2022–2024 relief studies).

### 8. States share more disaster costs (`us-federal-positions:emergencies.states-share-disaster-costs`, federal; no outcome-web link)

**What happens:**

- When a disaster gets a federal declaration (`src/simulation/crisis/disaster.ts`, `disaster-warrants.ts`), the federal share of repair costs falls from the Stafford Act's 75% to the bill's share.
- The state budget pays the difference.
- Where the state budget is tight, repairs slow. Repair capacity is already modeled; tie it to the money.

**Research:** Stafford Act cost-share rules; average public-assistance costs per declared disaster; the bill proposals for changing the share, such as the 2023–2025 FEMA reform bills.

### 9. Reduce federal mandatory minimum sentences (`us-federal-positions:justice-rights.reduce-mandatory-minimums`, federal)

**What happens:**

- Federal cases get shorter sentences under the bill's new minimums.
- People come home sooner and go back to their households, jobs and earnings.
- The state mandatory-minimum path already exists in `src/simulation/justice/court-reasoning.ts`. Mirror it for federal charges.
- Whether a case is federal is decided by the offense's own facts (amount, interstate conduct, firearm), never rolled. If the justice module has no federal jurisdiction yet, add it for the offense kinds that are federal, sized to the real federal share.

**Keep:** the crime link stays about-zero. Size `mandatory-minimum-cut-to-federal-prisoners`, which currently has no size, and change its status to built.

**Research:** U.S. Sentencing Commission data: the federal share of drug and firearm cases, and average sentence cuts under past reforms (the 2014 "Drugs Minus Two" change, the First Step Act).

### 10. Ban stock trading by members of Congress (`us-federal-positions:government.ban-congressional-stock-trading`, federal)

**What happens:**

- Members of Congress hold investments. If the game keeps no member holdings, add them, ESTIMATED FROM AVERAGE from members' wealth.
- Under the law, members must move individual stocks into a blind trust or diversified funds by the bill's deadline, and pay any fees.
- A member who breaks the law pays the bill's fine, and the violation becomes a record the press system can report.
- Which members hold individual stocks is decided by their own wealth and traits.

**Keep:** the member-returns link stays about-zero (Chen and Sacerdote 2026).

**Hook into:** officeholder people records, the press records (`src/simulation/press/records.ts`) and household money.

**Research:** the share of members holding individual stocks (financial disclosures), median holdings, and blind-trust costs.

## Part 2: prove all 92

The guard only checks that a path exists. The owner's rule is that a passed law must move money or people in a watched world. Add `npm run laws:proof` (under `scripts/laws-proof/`). For every question in the catalog, it:

1. picks a random place from all 56, naming the place and seed, and uses the right level (a town for local questions, a state for state questions, the nation for federal ones);
2. runs the same world twice for 12 game months, once with the law enacted on day 1 and once without;
3. reports the difference in the measure each of the question's effect paths moves: dollars, people, seats, cases or rents.

It writes `docs/evidence/laws-proof-<date>.md` as a table with these columns: law, place, what moved, by how much, and the path file. A wired law that moves nothing in a year is a failure, so list it at the top. Fix every one you can in this PR.

If the run is slow, use the year-9 runtime fix already merged and keep worlds small. Do not skip laws.

## Not in this job (known, next)

Leave these alone. Mention them in the report if your proof table runs into them.

- Only the played state's legislature passes state laws; the other 55 pass nothing (Build 12's finding).
- Congress passes and repeals nearly everything by about 350 votes. The officeholder-principles fix and Senate reconciliation are a separate job.

## Gate and report

**Local gate:**

- typecheck, and eslint and prettier on changed files;
- `npm run release:check -- --mode pr`;
- `npm run zero-dice`, which must not add allowed lines;
- `npm run unwired-laws`, which must show 92 of 92;
- `npm run spelling` on new docs;
- the tests for the changed files, plus the new watched-world tests.

Add a release note under `docs/release/changes/`.

**PR body and hand-back** (see `.agents/skills/civic-reports/`):

- `MERGED`, which is nothing, because the CTO merges;
- `WHAT EMERGED`: per law, the numbers its watched test produced, each outcome marked `DECIDED` with the recorded reason or `HARDWIRED` with file:line;
- knock-on effects and missing links;
- `VITAL STATISTICS`: laws wired, proof-table failures, zero-dice count, tests added;
- every PLACEHOLDER you left, by name.
