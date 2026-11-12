---
name: labor-market-proof
description: Proves a change to Our Civic Duty's jobs, wages or firm demand in a played town for 24 months, month by month, with both the inflow into unemployment and the outflow out of it. Use for any jobs, business-demand, layoff or regional-work change; not for law effects (wiring-audit) or timing (speed-work).
---

# Proving a labor-market change

Lessons from the Nov 8 night (Algiers, Vermont, seed r7). The proof goes on the item's own pull request with the place, the seed and the month-by-month table (owner, Nov 10: the pull request is the item's thread); a second session then checks it in the running game (`seen-in-game`).

1. **Run the month-by-month proof, not a year-end number.** `node --import tsx scripts/world-proofs/jobs-24-months.ts <seed> <placeKey> 24` prints, each month, the out-of-work count against the labor force in the jobs engine's own units (one record is one person, named or counted; never household weights), open positions, layoffs, hires and regional hires with record ids. Pass an empty place key to draw one from all 56 by the seed.
2. **A rate that climbs, sinks to zero or sits flat is a defect.** Fixing only the outflow (finding work) drains the pool to zero; fixing only the inflow lets it climb. Check both flows: layoffs per month against hires per month.
3. **Find the cause in sales before staffing.** Firms lay off toward observed sales (`reviewEmployers`, `observedStaff`). Compare sales to the books' demand per firm by month first: in a small town the customers beyond the town were missing (`addTradeArea`), not the staffing rule.
4. **One rule for the lives elsewhere and the town.** Use `workConditions` (src/core2/jobs-elsewhere.ts) for the state's unemployment and `findPerQuarter` / `layoffPerQuarter` (src/core2/past-work.ts). A pull that starts at zero never reaches one in 24 months: seed day-one pulls from the person's own seeded line, as the lives elsewhere do.
5. **A job outside the town is paid through the commuter payroll.** The place's outside account needs a public-pay commitment; copying a private employer's commitment crashes payroll. Use `startRegionalWork` (residents.ts).
6. **Memory.** One vitest or world run at a time (4 cores, 15 GB shared); a parallel run is killed.
7. **A merged PR holds the head the desk merged, not your latest commit.** The merge desk merges the branch as it stands and may update it from main first. Push a finished fix before the PR is ready, and after every merge of yours check that main holds your last commit (`git grep` for a line of it on `origin/main`); a fix pushed after the merge needs its own PR. A change that adds a pull to the jobs engine also needs a guard for the fixture worlds that run no economy, or `jobs.test.ts` goes red.
8. **Run the neighbors of a changed behavior before it merges.** A change that makes firms sell to their books (the trade area) broke a test that waited for a payroll shortfall to happen by chance (`residents.test.ts`, the wage credit draw). Search the tests for the thing you made rarer.

- The regional find's market tightness is `pastWorkFindUnemploymentElasticity` alone: openings per unemployed worker follow the unemployment rate (Beveridge reduced form), so do not add a separate openings input; FRED's JOLTS openings are only by Census region and the world simulates its own months (Nov 8).

## Nov 9 lessons

9. **The labor force includes the workers held outside a recorded job.** The opening's employment target puts working-age members of counted households at work with no job record (`unplacedWorkers`); they become commuter jobs when their household is filled in. Divide the out-of-work count by jobs plus these workers, and size opening seekers against them, or every rate reads two to three times too high (Shrewsbury NJ: 768 recorded jobs, 1,245 unplaced).
10. **A flat zero is usually a refill in days, and a stuck pool is usually a silent failure.** Count hires of people separated a median of 3 days earlier (the vacancy lag fixed that), then count seekers whose progress is at or over one for months: `hireRegional` returning early (no role to copy in a place with no private employer: 27,239 calls in one world) and a review that skips a returned-to-the-counts seeker looked like slow finding.
11. **Read the by-reason mix and the age of the open spells before tuning anything.** The seeker rows say why each person looks (`reasonKey`) and since when; a mean spell of 265 days against a CPS mean near 5 months, or a pull row that never grows, names the cause.
12. **Do not switch branches while a background test or proof is running.** The run reads the working tree; a checkout mid-run gave 40 "FAIL file" lines that were not real. Start long runs from a clean tree and leave it alone, or use a second checkout.
13. **The guards run on your data files too.** A new parameter file needs a `role` on every sourced row, and an interpolation written `a + k * (b - a)` is read as steering: write it as a weighted sum.
