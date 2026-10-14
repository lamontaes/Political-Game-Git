# A cafe's year: steady sales, constant churn, and an economy that barely touches it

Five questions need your ruling first. They are listed in "Your decisions", the first section. Two are the largest: should businesses pay employer payroll tax and profit tax as money flows, and should a player who owns or meets a business see its books? Wynn's Cafe in Woodhaven, Michigan sold $12.49 million of meals in a year and stayed open. Its servers kept trading one $15.00 job for another: 79 of the 83 "better offers" they left for paid $15.00 or less. Of the four routes from the national economy to the cafe, only one moved its books. The audit confirmed 23 defects, all open.

## Your decisions

1. **Business taxes.** The cafe pays no employer share of payroll tax and no unemployment insurance. No business pays tax on profit, or property tax on its premises. Should these exist as money flows, with no new step for the player?
2. **Seeing a business's books.** No player screen shows a business's sales, wages, profit, loan or owner. Only a developer panel does. Should a business's owner, or a player who meets one, see its books?
3. **Costs that leave town.** Part of the cafe's costs is paid to the outside market, the account that stands for the world beyond the town, and the run does not record how much. Should those costs be shown, and paid to a business in town where one sells the goods?
4. **Why counted workers quit.** The rules keep reasons only for people the player deals with, so a counted worker's quit records no reasons. Should quits keep them?
5. **New openings' wages.** Every new opening paid the median wage of the cafe's current staff, so the wage never moved all year. Should new openings read the region's pay level directly?

"Counted" workers are the modeled population: they exist as numbers until the player meets one. "Named" people are full individuals with a history.

## The cafe's year

Wynn's Cafe opened the game with 104 workers, all counted. On its second day, January 21, its owner was chosen from them: the server with the highest wage, $15.47 an hour, who then became a named person (measured; a registered stopgap picks the owner, `business.ts:155`). Several other opening servers earned the same $15.47.

Over the year the cafe's customers paid it $12.49 million, about $120,000 for each of its 104 opening workers (measured). That is high for a restaurant; the size comes from the opening spending estimates and was not traced further. The cafe paid $2.24 million in wages and $4.89 million to the town's wholesale food supplier (measured). Its other costs went to the outside market. The owner drew $834,134 in 12 monthly draws, the largest $142,587 on January 1, 2026 (measured). Draws are the owner's profit, separate from the owner's wage as a server. The cafe ended the year with $1.07 million in cash and never closed, drew on its credit line or laid anyone off (measured).

Its staff never settled. The cafe opened 140 server positions, all at $15.00 an hour, and hired 140 people. In the same year 126 servers quit and 7 retired (measured). Of the 126 quits, 83 were recorded as leaving for a better offer, and 79 of those 83 offers paid $15.00 or less (measured; table row 1). The cafe never hired a cook, a dishwasher or a manager, because every opening copied a named server's job (measured; row 11). Five of the 140 hires were named people, among them one member of the household below.

On January 21 the cafe asked the town's bank for a credit line. It was approved for $155,060 at 9.92% a year. The line was repriced eight times as the Federal Reserve moved, ending at 8.42%. Not one dollar was ever drawn on it (measured; row 12).

## How the national economy reached the cafe

The Federal Reserve's 12 voting members each voted from their own reading of inflation and jobs, with no dice. The committee cut its rate from 4.375% to 2.875% over eight meetings: seven cuts and one rise, in November (measured). National unemployment rose from 4.14% to 4.31%, inflation eased from 2.85% to 2.68%, and average hourly pay rose from $35.78 to $36.81 (measured).

The economy had four routes to the cafe's books, and one carried money:

- **Customer demand** moved the cafe's internal estimate of its sales and staffing, which set its staffing target and so its hiring (inferred from the code, `jobs.ts:467-476`). This is the one route that worked.
- **Interest rates** repriced a credit line that never held any debt, so they changed nothing (measured; row 12).
- **Prices.** Inflation moved the cafe's internal price, but named households never read that price. Each household's monthly spending at each seller was fixed on the first day (confirmed in code; row 19).
- **Unemployment** never changed how many of the cafe's counted servers quit, were hired or looked for work (confirmed in code; row 18).

The Detroit region's price level stayed at exactly 100.298 all year. No part of the simulation reads it, though the player's economy screen shows it (measured; row 16). The town also never fed the national model. The national model has a slot for the town's own income growth, but for the first two years it holds a neutral stand-in value, so the town's economy added nothing (measured; row 17).

## The household's side

One household shows both sides of the cafe. Its younger adult, born in 2006, worked as a server at another restaurant in town from April. That adult's payments to Wynn's appear on 4 of the household's 12 monthly bills, the only ones kept in its records, at $7.50 to $25.04 each (measured).

In May the household asked the bank for a $5,042.75 personal loan and was turned down. Its income then was the younger adult's pay alone (measured). In August the other adult was hired at Wynn's at $15.00 an hour. On September 1 the bank approved a $4,618.23 loan at 12.205%. The bank counted the new server's pay as a full-time wage of about $2,607 a month (measured; row 20). The server was actually paid for 88, 72, 56, 32 and 80 hours on five paydays, $480 to $1,320 gross (measured).

Both sides of every payday and every meal posted to the books and balanced (measured). The new job did not change what the household spent at the cafe, because that amount was fixed on the first day (confirmed in code; row 19). The household's mortgage balance fell by its scheduled amount each month in which no arrears were recorded, whatever was actually paid (confirmed in code; row 21).

## Confirmed defects

"Measured" means the run's records show the defect. "Code" means the code path is confirmed but did not fire in this run.

| #   | Rule broken                 | Where                                                         | Record                                                          | The bug                                                                                                                                                                            |
| --- | --------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Records match               | `jobs.ts:984-1000`, `jobs.ts:1087-1099`                       | `job-change:2026-01-05:work-relationship_8c473d3a3b737c56:quit` | Counted workers take offers at the same or lower pay, and the quit is labeled "better-offer": 79 of 83 at the cafe, 444 of 623 in town (measured).                                 |
| 2   | No dice                     | `jobs.ts:1305`, `jobs.ts:1148`                                | 43 "left-job" quits at Wynn's                                   | A fixed industry quit rate sets how many counted workers quit each month; pay only ranks who goes (measured).                                                                      |
| 3   | Registered stopgap          | `stopgaps.json:2408`                                          | row SG-WORLD-jobs-counted-choices                               | The stopgap row names retirement and hiring and points at line 902, while the call now sits at line 1142; quits and counted closures also run through it and are not named (code). |
| 4   | No dice                     | `business.ts:579`                                             | `closure:organization_56f7c2db924977d5`                         | Where the owner is counted, a fixed baseline sets how many businesses close each month (measured).                                                                                 |
| 5   | Sliding scales and causes   | `business.ts:543`, `business.ts:595`                          | `closure:organization_56f7c2db924977d5`                         | "Losses" means cash below opening cash, so a phone company still holding about $2.07 million closed for losses (measured).                                                         |
| 6   | Records match               | `business.ts:1485`                                            | `closure:organization_56f7c2db924977d5`                         | The closure records 0 workers affected while 24 counted workers lost their jobs in it (measured).                                                                                  |
| 7   | Two-level population        | `jobs.ts:1126`, `jobs.ts:1622`                                | named hires at Wynn's                                           | A named hire is recorded as decided by the business, a counted hire by the owner: one event, two models (measured).                                                                |
| 8   | Two-level population        | `budgets.ts:924-926`, `group-a-money.ts:126`                  | 33 withholding rows for 6 people at Wynn's                      | Only named workers have taxes and the leave premium taken from pay; of the cafe's $2.24 million in wages, the counted workers' share carried none (measured).                      |
| 9   | Two-level population        | `scene.ts:445-459`, `places.ts:182-187`                       | Wynn's staff                                                    | A work scene shows every named coworker, a visit shows only those on shift: two staff lists for one room (code).                                                                   |
| 10  | Sliding scales and causes   | `jobs.ts:485-491`                                             | any employer                                                    | Every open position is withdrawn at once when staff reach the target (code).                                                                                                       |
| 11  | Wire to the world           | `jobs.ts:497-499`                                             | 140 Server positions at Wynn's                                  | New positions copy only named workers' jobs, so a restaurant never hires a cook or dishwasher; no stopgap row (measured).                                                          |
| 12  | Effect is a read            | `state.ts:990`                                                | the Wynn's credit line                                          | Nothing calls the function that draws a business credit line, so an approved line can never be used (measured).                                                                    |
| 13  | Records match               | `credit.ts:383`, `macro.ts:403-405`                           | `application:2025-01-21:organization_2d0187dc76d0d916`          | The owner weighs the loan at 6.125% while the bank charges 9.92% (measured).                                                                                                       |
| 14  | Registered stopgap          | `credit.ts:438-441`                                           | same application                                                | With no wages paid yet, sales-to-wages falls back to exactly 1, which sets the limit and the spread; no stopgap marker (measured).                                                 |
| 15  | Effect is a read            | `business.ts:1526`                                            | Wynn's compliance rows                                          | Nothing calls the compliance-cost function, so laws binding businesses never cost them; the stopgap row describes a cost never charged (measured).                                 |
| 16  | Effect is a read            | `regional-model.ts:201`                                       | `region:26:metro:19820`                                         | The regional price level is set once, never updated and read by no engine, yet the player is shown it (measured: 100.298 every month).                                             |
| 17  | Wire to the world           | `macro.ts:195-200`                                            | national month rows                                             | The town's income growth is a neutral stand-in for the first two years, so the town never feeds the national model; no stopgap row (measured: 4.933% every month).                 |
| 18  | Wire to the world           | `jobs.ts:380-397`                                             | Wynn's quits                                                    | Unemployment is read only on the opening day, never by counted quits, entry or job search (code).                                                                                  |
| 19  | Effect is a read            | `opening-customers.ts:1597-1599`, `cost-of-living.ts:186-190` | `living:household_2630cb4fc589a32d:*`                           | A named household's spending is split equally among sellers on the first day and never reads price, inflation or income; the record's source claims capacity weights (code).       |
| 20  | Wire to the world           | `credit.ts:705-726`                                           | `application:2025-09-01:household_2630cb4fc589a32d`             | The bank counts a full-time calendar wage, not the hours worked and paid, so a part-time server is approved as if full time (measured).                                            |
| 21  | Every dollar balancing      | `housing.ts:634-645`                                          | `mortgage:household_2630cb4fc589a32d`                           | The mortgage balance falls on schedule whenever no arrears are recorded, without reading what was paid (code).                                                                     |
| 22  | Every dollar balancing      | `residents.ts:443`, `business.ts:595`                         | Wynn's owner row                                                | Business books carry fractions of a cent: kept earnings of 4,752,898.96 cents (measured). Kept earnings are profit kept since the opening day, not cash on hand.                   |
| 23  | No hand-written player text | `play.mjs:949`, `play.mjs:1256`, `play.mjs:1262-1265`         | the economy screen                                              | Labels such as "Unemployment", "Policy rate" and "Jobs here" are typed in the screen code, and the region row prints raw field names (code).                                       |

## The paths that came back clean

- **Payroll.** Every paycheck to a named worker, and the counted workers' wage payments, moved money from the cafe's account to the worker's, and both sides balanced.
- **Customers paying the cafe.** Every meal purchase posted on both sides at the same cents.
- **The Federal Reserve.** Each member's vote came from their own traits and experience of inflation, with no roll and no schedule. Every number in the national model has a parameter row.
- **Loan pricing.** The household loan's 12.205% is the policy rate plus the prime spread plus a personal spread, and its balance re-derives to the cent.
- **Supplier payments.** The cafe paid the town's wholesaler in step with its own sales, and the wholesaler was credited.
- **Sales tax.** Michigan's 6% was in force from the game's first day through a law row carried back from 2026. The state treasury's monthly inflow is consistent with its collection.
- **Place rules.** No state, city or place code is named in any of the logic traced.
- **Choices.** Named people chose jobs and the owner chose to borrow through the shared chooser, with no seeded roll.

## What happens next

All 23 defects are open and none is fixed. They go to the CTO to assign, one per fixer pull request, by the session that owns the code:

- **OPUS-WORLD** (jobs, business, credit, housing, prices): rows 1, 2, 4, 5, 6, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21 and 22.
- **OPUS-GOV** (taxes): row 8.
- **OPUS-CORE** (the two-level population and the stopgap registry): rows 3 and 7.
- **OPUS-PLAY** (screens): rows 9 and 23.
- **OPUS-WORLD with OPUS-CORE** (the national and regional model): rows 16 and 17.

The five questions in "Your decisions" wait on your ruling. Two defects also turn on them: row 8 grows if employer taxes are added, and row 23 matters more if business books reach the screen.

What the audit could not reach:

- Each customer's full monthly spending at the cafe. Detailed receipts are kept only for people in the player's view, so the household's meals are a sample.
- The cafe's internal price and demand by month, which the run's tables do not save.
- The exact sales-tax dollars collected.
- Clicking a counted worker in a live game to watch them become a named person. Only the five named servers hired in the year were checked against their position rows, and all five matched; the owner's row was not checked.

## Method and usage

One played world with every module installed, from January 20, 2025 to January 20, 2026. Place: Woodhaven, Michigan, GEOID 2688380. The seed, drawn from the clock, was `1791949233826-bf15520810d2`, on head `fd3574c9`. The world built in 49 seconds and ran the year in 115 seconds.

Targets: Wynn's Cafe (`organization_2d0187dc76d0d916`), the national and Detroit month rows, and household `household_2630cb4fc589a32d`.

| Model  | Role                            | Tokens  | Tool calls | Time       |
| ------ | ------------------------------- | ------- | ---------- | ---------- |
| Haiku  | hiring                          | 134,731 | 38         | 3 min 20 s |
| Haiku  | quits, retirements and closures | 154,130 | 39         | 4 min 4 s  |
| Haiku  | payroll against revenue         | 123,295 | 29         | 2 min 54 s |
| Haiku  | prices                          | 123,585 | 28         | 3 min 42 s |
| Haiku  | costs and suppliers             | 157,950 | 38         | 3 min 10 s |
| Haiku  | borrowing                       | 126,204 | 25         | 2 min 27 s |
| Haiku  | taxes                           | 179,978 | 40         | 5 min 8 s  |
| Haiku  | the national economy            | 159,127 | 26         | 2 min 59 s |
| Haiku  | the household                   | 169,268 | 42         | 4 min 39 s |
| Haiku  | counted employees               | 134,186 | 27         | 2 min 35 s |
| Haiku  | the owner's screens             | 120,159 | 20         | 2 min 6 s  |
| Sonnet | verifier, 31 claims             | 152,437 | 77         | 4 min 19 s |

The Haiku agents used 1,582,613 tokens in all. Ten ran at once, and the eleventh started when the first finished. A first launch of the eleventh was stopped within a minute to keep to ten. The Opus planner cannot see its own usage. Of 31 claims, the verifier confirmed 24 in full, 4 in part, and did not reproduce 3. Three verdicts were checked again by hand. The "better-offer" quits were confirmed and are wider than first reported. The flat regional price level was confirmed. The claim that no sales tax was collected in 2025 was wrong.
