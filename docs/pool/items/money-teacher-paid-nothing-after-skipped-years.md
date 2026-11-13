---
id: money-teacher-paid-nothing-after-skipped-years
title: 'After six skipped years a teacher with a job is paid nothing: $0 cash, every bill "left unpaid", and the mortgage grows from $111,000 to $133,000'
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: money
model: opus
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Newfane, Vermont, seed 0e42f123-46b7-4dd2-b036-9bdff22447de)
---

**What.** On main 596d5127, an Advanced start in Newfane, Vermont (seed 0e42f123-46b7-4dd2-b036-9bdff22447de) as Council member Chad McKenzie, a teacher at Butler Academy who lives alone. Six years were run with dev mode's run-year.

- **What Money said.** In January 2026, "Cash available $0". In January 2028, "Everyday living $0.00 paid · $1,394.92 left unpaid". In February 2031, three lines of "Loan payments $0.00 paid · … left unpaid" and a mortgage of $133,000, up from $111,000 at the start.
- **The record.** On the bench, `/api/dev/person?id=person_f21ffd1c00b78b27` shows a current job ("Teacher", `wageDailyMinor` 21701, about $217 a day, 5.75 hours) with no end, `liquidMinor` 0 and `payments` empty.
- **Played days too.** After `/api/dev/run-until` for 16 ordinary days (February 9 to 25, 2031), cash is still $0 and no payment is recorded.
- **Not the same as a played year.** In a life played with Week (El Rancho, Wyoming), cash moved every month.

Seen: Money, and the card's cash, for anyone whose world went through skipped years.

**Cause.** Needs cause. Looked at:

- The fast clock's results mode runs each engine's dated work only. `settleDueFinance` in `src/core2/modules/finance.ts` runs due contracts and business reviews but not the daily household work ("results mode's month passes none").
- Not yet read: whether the teacher's wage is a finance contract that ended or lapsed in skipped time, whether Butler Academy (`organization_cdb2cf89fd2d9174`) still has money to pay, and whether wages go first to the unpaid loans so cash never shows.

The finder reads `/api/dev/person` and the employer's books for one month before and after a run-year.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session to find the cause and write it here.

**Rules.** Wire to the world: a wage moves money from the employer to the person every pay day, in skipped and played time alike. One rule, all 56 places: the check draws its place and names it with its seed.

**Done when.** The cause is written here, and a test in src/core2 builds a drawn world, runs one skipped year, and finds the wage earners still paid. A second session then sees, on the bench on main, a drawn life five years on with cash that moves month to month (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/core2/modules/finance.ts, src/core2/life.ts, src/bench/dev-api.ts

**Notes.** The same life never held a council election in six years: each March the player's seat read "No one has filed / Last time January 31, 2021", and it held over. That is added to `elections-local-races-too-uncontested`.

A second case (Playtester P2, Millville, New Jersey, seed 47dea119-87db-4b1f-b3e6-9d5843f7a2e5, seven run-years to January 2032, council member Brittany Ellis, a commuter living with three others). Money reads "Jul / $0 / Aug / $0 / Your household's last month · $0 / Purchases / $0.00 paid · $5,069.36 left unpaid" beside "Savings · Millville Community Bank / $545,000". Cash is back to $7,201 today (`/api/dev/person?id=person_01bcb0327c7d7c4f`). In skipped time the household let its purchases go unpaid instead of drawing on half a million in savings. The finder checks both lives with one look at how a household covers a short month in results mode; `core-results-catch-up-reuses-a-savings-draw-id` is the employer side of the same draw.

A third case (Playtester P2, Lynndyl, Utah, seed 3efdc66d-7643-4ea7-b35f-d18500aee947, six run-years to January 2031, Council member Clara Moon, who also works as an aide). Money reads "Cash available · Lynndyl Community Bank / $0 … Nov / $0" with three lines of "Loan payments / $0.00 paid · … left unpaid", after months of $6,350 to $6,630.
