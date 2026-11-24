# News opens on the same paper every time: before and after

Pool item `play-nov8-news-opens-on-a-different-paper-each-time`, PR #8521. Pictures at 1440x900 on the bench, News on day one and after four weeks of play (dev mode's run, 7 days each), same seed before (`origin/main`) and after (this branch). Replay the after side with `NEWS_SEED=<seed> BENCH_BROWSER=<chromium> node src/bench/news-paper.browser.mjs <shots dir>`; the tab in front is read from the board's `data-outlet`.

| Place                   | Seed                                   | Before                                                          | After                                                         |
| ----------------------- | -------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| Tanacross, Alaska       | `0e4ad72b-7a4c-41bc-ad83-68b522980ae6` | before-tanacross-ak-day-1.png, before-tanacross-ak-week-4.png   | after-tanacross-ak-day-1.png, after-tanacross-ak-week-4.png   |
| Manchester, Connecticut | `f084599d-3f59-428a-876c-07a33fcace33` | before-manchester-ct-day-1.png, before-manchester-ct-week-4.png | after-manchester-ct-day-1.png, after-manchester-ct-week-4.png |
| Amboy, Minnesota        | `563ea746-3723-47e7-aec9-d121caafb058` | before-amboy-mn-day-1.png, before-amboy-mn-week-4.png           | after-amboy-mn-day-1.png, after-amboy-mn-week-4.png           |

## Lines as played

Day one, the page as it opens:

- Before, Tanacross: News opens on the newest story, "New law sets Social Security payroll tax rate at 6.2%", under the outlet that printed it. After: the tab rail "KEEJ-TV, KKYT-TV, KEPK-TV, KETB-TV" with KEEJ-TV (the town's paper of record) in front, and "Nothing in print yet."
- Before, Manchester: "Connecticut minimum wage goes from $15.69 to $16.35". After: "Manchester Chronicle, Manchester Leader, Manchester Enterprise, Manchester Press" first, the Chronicle in front, "Nothing in print yet."
- Before, Amboy: "City of Amboy adopts its budget". After: "Amboy Observer, Amboy Sentinel, Amboy Gazette" first, the Observer in front, "Nothing in print yet."

Week four, the tab rail:

- Before, on main, the rail has changed with whoever printed last: Tanacross "Pinnacle News Network, KEEJ-TV, Compass News Network, Pinnacle News Network"; Manchester "Liberty News Network, Beacon News Network, Manchester Chronicle, Manchester Press, WKMV-TV"; Amboy "Bulwark News Network, The Cornerstone, The Republic Herald, Amboy Sentinel, KIKM-TV".
- After, the front outlet and the tab order are the day-one ones in all three places (the check asserts it each week and passed in all three): KEEJ-TV, the Manchester Chronicle and the Amboy Observer in front.

## The owner's complaint it answers

Owner, Nov 8, 2026, Manchester: "all like the things are changing, like the news outlets" (quoted in the PR body, which dates it).
