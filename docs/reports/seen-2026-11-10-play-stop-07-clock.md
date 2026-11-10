# Replay: Day, closed offices and the 3-hour filing visit (Nov 10, 2026)

Pool item: play-stop-07-every-day-starts-at-midnight. Replayed by sonnet-2698 (a session that did not build the fix), on main at 4da1628283, in the running bench (`npm run bench`, `/play`) at 1440x900 with Playwright. Screenshots were taken at each step and are not committed.

**For the owner, in plain words.** Pressing Day now works: you wake the next morning. Going to an office that is closed waits for it to open and says when. The three-hour visit to the clerk to file does not move the clock: it still reads 8:00 AM after you file, and the scene drops you in your kitchen.

| Done-when clause                                              | Place and seed                                                                                      | Seen                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Day from an evening lands on the next morning, no skipped day | Anson, Texas, 670bd1f7-66a4-4345-9ccd-98b9cdc7e213 (the Oct 24 repro place)                         | Mon Jan 20 8:30 PM, then Tue Jan 21 7:00 AM, then Wed Jan 22 7:00 AM. Pass.                                                          |
| Same, in a drawn place                                        | Drawn by "Random place": seed aa7a3455-b0ca-47ea-947d-8c3b4ee8cdf9 (place not recorded by that run) | 8:30 PM, then Tue 7:00 AM, Wed 7:00 AM, Thu 7:00 AM. Pass.                                                                           |
| Travel to an office outside its hours waits or says closed    | Newbury, Vermont, seed 7c0de5ee-1111-4222-8333-444455556666                                         | Travel card read "Closed now. Opens Tuesday, January 21, 2025 at 8:00 AM." Go moved the clock from Mon 8:30 PM to Tue 8:00 AM. Pass. |
| A 3-hour campaign action moves the clock by 3 hours           | Newbury, Vermont, seed 7c0de5ee-1111-4222-8333-444455556666                                         | Filed for Council member at the town clerk. Clock before: Tue 8:00 AM. Clock after: Tue 8:00 AM. **Fail.**                           |
| Same, second place                                            | Benson, Pennsylvania, seed 5b7cd44f-fa1a-490f-be08-7ae9bb4f3288                                     | Same steps: 8:00 AM before and after filing. **Fail.**                                                                               |

**Cause to check (not confirmed).** `src/bench/handler.ts` (`/api/filing/choose`, about line 1855) spends `filingVisitHours` through `state.player?.spend(...)`, and `BenchPlayer.spend` in `src/bench/player.ts` (about line 236) returns nothing while the packet is not `complete` (the clerk's scene is an open stop). When that happens the handler sends no packet and the clock card never moves. `src/bench/player-first-act.test.ts` covers `spend` from a fresh clock only, so it would not catch this.

**Next.** The item goes back to open with this line. A builder takes the filing-visit clock as its own item and proves it with `filing.browser.mjs` in two drawn places.

Seen cases beyond the item: at Cinco Bayou-style first stops the card said "Open now" for a market at 8:30 PM, and Go started the visit at 8:17 AM next day. That is consistent with the first act running from the morning, but the "Open now" label reads the evening clock. Not filed.
