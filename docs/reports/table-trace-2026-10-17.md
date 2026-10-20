# Table trace: module tables no other engine read in a played year

In one played year, 44 of 250 engine tables held rows that no other engine read. Eight items are filed from this, and the rest were checked by hand and left: they are logs an engine keeps for its own books, or tables a screen reads. A table nobody reads is a record that does nothing, so each filed item asks for a reader or for the table to be removed.

## Method

**Place and seed:** Parrott, Virginia (5160840), seed 0ad0af8699c4 (place seed fdfc1f7163c3cbe36628a475f8f10bdc6743725e0de4d9034dfeeaf105463a1e), 365 days from the opening, bookkeeping off.

Run: `node --import tsx scripts/core2-year/table-trace.ts <seed> 365 <out.json>`. The script hooks every module-table read and write (`setTableTrace` in `src/core2/module-state.ts`, off unless set), attributes each call to the engine that made it by the file on the call stack, and lists tables that hold rows but were read by no other engine during the year.

**Result:** 250 module tables; 44 hold rows that no other engine read.

**How to read this.** A played year run without screens opens none, so a table that only a screen reads (the bench views) appears here; each item filed from this report starts by checking that. Tables with `0 writes in the period` are static data loaded at the opening (past bills and elections, the ballot measures, the press archive); they have no writer to remove and are not filed.

| Table                                     | Rows | Writes | Item                                                      |
| ----------------------------------------- | ---- | ------ | --------------------------------------------------------- |
| `business/choices`                        | 1    | 1      | checked by hand, not filed: a screen or an own-engine log |
| `business/closures`                       | 1    | 1      | checked by hand, not filed: a screen or an own-engine log |
| `business/draws`                          | 308  | 308    | checked by hand, not filed: a screen or an own-engine log |
| `business/outsideCosts`                   | 274  | 274    | checked by hand, not filed: a screen or an own-engine log |
| `business/successions`                    | 2    | 2      | checked by hand, not filed: a screen or an own-engine log |
| `core2-ballot-measures-v1/measures`       | 2    | 0      | static loaded data                                        |
| `core2-budgets-v1/outsideRevenue`         | 36   | 36     | checked by hand, not filed: a screen or an own-engine log |
| `core2-budgets-v1/spendingPayments`       | 1143 | 1143   | checked by hand, not filed: a screen or an own-engine log |
| `core2-budgets-v1/taxPayments`            | 92   | 92     | checked by hand, not filed: a screen or an own-engine log |
| `core2-budgets-v1/treasuryMonths`         | 36   | 36     | checked by hand, not filed: a screen or an own-engine log |
| `core2-budgets-v1/withholding`            | 79   | 79     | checked by hand, not filed: a screen or an own-engine log |
| `core2-campaigns-v1/causes`               | 509  | 509    | checked by hand, not filed: a screen or an own-engine log |
| `core2-counted-moves-v1/moves`            | 140  | 140    | table-unread-counted-moves-states                         |
| `core2-counted-moves-v1/pulls`            | 62   | 644    | table-unread-counted-moves-states                         |
| `core2-counted-moves-v1/states`           | 56   | 672    | table-unread-counted-moves-states                         |
| `core2-executive-v1/desk`                 | 16   | 16     | checked by hand, not filed: a screen or an own-engine log |
| `core2-law-reach-b-v1/services`           | 9    | 83     | checked by hand, not filed: a screen or an own-engine log |
| `core2-legislature-v1/committees`         | 44   | 44     | checked by hand, not filed: a screen or an own-engine log |
| `core2-officials-v1/loaded`               | 1    | 0      | static loaded data                                        |
| `core2-outcome-web-v1/laws`               | 35   | 35     | checked by hand, not filed: a screen or an own-engine log |
| `core2-parties-v1/meetings`               | 24   | 24     | checked by hand, not filed: a screen or an own-engine log |
| `core2-past-v1/bills`                     | 48   | 0      | static loaded data                                        |
| `core2-past-v1/elections`                 | 22   | 0      | static loaded data                                        |
| `core2-past-v1/loaded`                    | 1    | 0      | static loaded data                                        |
| `core2-press-v1/archive`                  | 107  | 0      | static loaded data                                        |
| `core2-renewal-v1/births`                 | 26   | 26     | core-unread-renewal-births-plans                          |
| `core2-renewal-v1/counts`                 | 36   | 36     | table-unread-renewal-counts-parameters                    |
| `core2-renewal-v1/parameters`             | 25   | 25     | table-unread-renewal-counts-parameters                    |
| `core2-renewal-v1/plans`                  | 16   | 16     | core-unread-renewal-births-plans                          |
| `core2-staff-v1/work`                     | 51   | 51     | table-unread-staff-work                                   |
| `core2-voting-v1/ballots`                 | 304  | 304    | checked by hand, not filed: a screen or an own-engine log |
| `core2-voting-v1/countedBallots`          | 4    | 4      | table-unread-voting-counted-places                        |
| `core2-voting-v1/places`                  | 400  | 400    | table-unread-voting-counted-places                        |
| `core2-world-legislating-v1/nextMeetings` | 1    | 25     | checked by hand, not filed: a screen or an own-engine log |
| `core2-world-races-v1/places`             | 99   | 99     | checked by hand, not filed: a screen or an own-engine log |
| `credit/books`                            | 13   | 13     | table-unread-credit-books-households                      |
| `credit/households`                       | 363  | 363    | table-unread-credit-books-households                      |
| `credit/payments`                         | 26   | 26     | table-unread-credit-books-households                      |
| `housing/statusByPerson`                  | 1    | 1      | checked by hand, not filed: a screen or an own-engine log |
| `macro/repricings`                        | 16   | 16     | table-unread-macro-repricings                             |
| `macro/votes`                             | 96   | 96     | checked by hand, not filed: a screen or an own-engine log |
| `moves/departures`                        | 16   | 16     | table-unread-moves-departures                             |
| `regional/regions`                        | 132  | 132    | table-unread-regional-regions                             |
| `speech/retellings`                       | 314  | 314    | checked by hand, not filed: a screen or an own-engine log |

Tables not filed are logs or ledgers an engine keeps for its own books (`business/*`, `core2-budgets-v1/*`, `core2-campaigns-v1/causes`, `core2-voting-v1/ballots`, `speech/retellings`, `macro/votes`, `core2-legislature-v1/committees`, `core2-parties-v1/meetings`, `core2-executive-v1/desk`, `core2-world-races-v1/places`, `core2-outcome-web-v1/laws`, `core2-law-reach-b-v1/services`, `core2-world-legislating-v1/nextMeetings`, `housing/statusByPerson`). The bench and director read several of them from screens the run does not open: for example the campaigns sheet reads `causes` and the results sheet reads `ballots`. They are for a second pass with the screens driven.
