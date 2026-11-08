# One data API the screens read (Slim down plan)

Owner, Nov 8: "make stuff read and display differently." Audit step 5 of the slim-down list. Structure only: no screen shows a different number because of this plan; the screens that compute their own figures change in the owning session's PR, not here.

## Where it stands

- `src/bench/handler.ts` answers 106 routes as one ordered table (branch `slim/route-table`): each route is a `match` and a `run`, tried in order, first match answers.
- The server's state lives in module variables at the top of `handler.ts` (`core`, `director`, `player`, `conversation`, `filingVisit`, `nightsWatched`, `canvassedOn`, `opening`, `buildProgress`). Every route body reads them directly, so the table cannot be split into files until they sit behind one object.

## Steps, in order, each its own PR

1. **Route table** (built): one table, same routes, same order.
2. **Server state in one object.** Move the module variables into one `ServerState` with get/set helpers in `src/bench/server-state.ts`; routes read it. No route changes behavior. Proof: `new-game-check` and `mark-gap` tests, and a record-for-record compare of a played day before and after.
3. **Split the table by area** into `src/bench/routes/*.ts` (talk, journal, card, government, office, election, bill, budget, dev), each exporting its routes; `handler.ts` concatenates them in the current order. Order matters where a prefix route sits before an exact one, so keep today's order and add a test that lists the order.
4. **Fold the four identical list-then-decide routes** (`/api/desk`, `/floor`, `/orders`, `/nominations`) into one route shape and the two budget-change routes into one. This changes the routes' paths for the screen code in `play.mjs`, so it ships with the screen change, in one PR.
5. **Finished figures from the server.** Screens that compute (Money row sums, vote counts, seat holders, the News lead) read a server field instead. Each is a behavior change only if the screen's figure was wrong; the PR says which. Owners: Money for cash, Legislation for vote counts, Story for the News lead.
6. **State outside the save** (watched nights, canvassed mornings, the open conversation, filing visit, speech in progress) goes into the director's saved ledger so a resumed game remembers it. Owned by the Director line; this plan only names it.

## Not in this plan

The screen kit (one section, row, card and self-fitting pager) and finance into budgets are held until the Coordinator lifts them.
