# News opens on the outlet with something unread, as played

Words builder W3, Nov 13, 2026. Pool item `play-news-opens-on-the-outlet-with-unread-stories`. The check is `src/bench/printed-news.browser.mjs`: a new life in a drawn place, the calendar jumped to June 1, 2025, then News is opened. Pictures are at 1440x900. "Before" is main 96fb406aa7; "after" is this branch.

| Place                             | Seed                              | Before: News opens on                                             | After: News opens on                                           | Check before / after               |
| --------------------------------- | --------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------- |
| Arial, South Carolina (4502440)   | NEWS_SEED=484cc751bef6ccc5        | Arial Leader, empty: "Nothing in print yet." (`arial-before.png`) | WESN-TV, with its stories (`arial-after.png`)                  | fails "News lists no story" / PASS |
| Lakeville, Connecticut (0941830)  | NEWS_SEED=w3-open-fresh-1 (fresh) | Lakeville Chronicle, empty (`lakeville-before.png`)               | Compass News Network, with its stories (`lakeville-after.png`) | fails "News lists no story" / PASS |
| Lake Minchumina, Alaska (0242820) | NEWS_SEED=b6d227a6f3bb7531        | KRBC-TV                                                           | KRBC-TV, unchanged (`lake-minchumina-after.png`)               | PASS / PASS                        |

Lakeville also showed why the page on screen must stay put: before that fix, News opened on Compass News Network, then the day's redraw counted its stories as read and moved the page to the empty home paper.
