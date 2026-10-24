# The play-first order

Current as of 2026-10-24, 20:30 UTC (the acting CTO, from the Oct 24 playtest, the owner's read of its screenshots and main at this hour; replaces the order in docs/work-orders/play-first-2026-10-24.md)

Numbered in the order the owner will feel them. Take the first line that `PROGRESS.md` does not show as done, or as pushed in the last 3 hours. A line whose item waits on another (`after:` in the item) is skipped until that one is done. Each line: number, pool id, time box, what the owner will see, the PRs to adopt or read. The item file (`docs/pool/items/<id>.md`) has the rest; `LAW.md` wins over both.

Blocked parents (`play-stop-01`, `-02`, `-05`, `-07`, `-11`, `-19`, `-22`) are split into `-a` and `-b`; work the parts, never the parent. The CTO sets a parent done when its last part is done.

## Tier 1: the three dead ends

Nothing else matters until these land: the game locks, the ballot never reaches his race, and nobody tells him he won.

1. `play-stop-23-job-offer-hold-locks-the-game` · 4 h · A job offer shows the employer, the job and the pay with Take it and Turn it down; either answer and Day and Week work again. · Read #5232 (open): it adds a second job-offer hold (`offer-deadline`); the screen must answer every hold reason, and #5232 merges only after this.
2. `play-stop-21-ballot-stuck-on-first-page` · 3 h · Continue turns the ballot's pages to his own race; he marks it and the game records it.
3. `play-stop-22-election-win-never-shown-a` · 3 h · Election night shows his own race first, every candidate's votes, and whether he won.
4. `play-stop-22-election-win-never-shown-b` · 3 h · The next morning the Journal, News and Government each say whether he won. · Read #5914 (open): household scenes on a win or loss.

## Tier 2: the game's identity

What makes it his game: the people are the ones he made, nobody stands around without a reason, the screens look like the mocks and speak plain English.

5. `play-first-05-v1-figures-removed` · 4 h · No person with arms out like an airplane anywhere; everyone stands from the v2 set or is drawn by the appearance engine. · Adopt #5898 (branch `art/people-whole-out-of-play`; the v2 set from draft #4283).
6. `play-stop-03-player-drawn-as-strangers` · 3 h · In every room the figure named as him is the one he made, and the talk box shows the other person's face. · After 5; #5898 claims this already, check its tests.
7. `play-first-06-created-look-in-every-scene` · 3 h · His face and clothes from the creator on the card, Who you are, his person card, the opening's family chapter and Continue.
8. `play-first-11-people-web-uses-created-look` · 2 h · The face at the center of People is the one he made.
9. `play-first-07-no-random-people-in-rooms` · 4 h · Only his household and people with a reason stand in a room; no "X is with you".
10. `play-stop-15-family-unexplained` · 3 h · On the first evening narration says who is in the room and how each is his family.
11. `play-stop-01-talk-says-nothing-a` · 4 h · Talking to his mother she opens from her life or the day, with four replies that move the talk. · Read #5914. (The acceptance requires real choices in every talk.)
12. `play-stop-01-talk-says-nothing-b` · 4 h · A moment that stops him for someone says who they are and why they came, and he answers it.
13. `play-first-01-start-a-life-first` · 3 h · New game opens with Start a life first and one world choice beneath it.
14. `play-stop-13-start-a-life-or-new-world` · 2 h · Each choice left under New game says in one line what it starts; dimmed entries say why.
15. `play-first-03-creator-date-fields-aligned` · 1 h · Month, day and year line up in the creator.
16. `play-first-04-town-list-font-and-populations` · 3 h · The town list is in the states' font and shows the population the world opens with.
17. `play-stop-14-town-list-stops-at-400` · 3 h · Every town reachable, each with a count, same-named towns showing their county.
18. `play-stop-17-see-through-panels` · 2 h · Panels read cleanly over the busiest room.
19. `play-first-02-panels-gold-box` · 2 h · Every panel keeps its slight gold edge, all the time.
20. `play-first-17-buttons-same-size` · 2 h · Buttons in a row share one size.
21. `play-first-15-mark-gap-off-player-screen` · 1 h · No Mark gap button in any talk box.
22. `play-stop-02-developer-text-on-play-screens-a` · 3 h · News reads in plain words: no field names, no Press.archived, every record naming who.
23. `play-stop-02-developer-text-on-play-screens-b` · 3 h · Politics and the city secretary speak plain words: no raw dates, percents or "on-ballot".
24. `play-stop-05-politics-lists-wrong-officials-a` · 3 h · His two senators, one representative and his own legislators first; everyone else behind the filter.
25. `play-stop-05-politics-lists-wrong-officials-b` · 3 h · His mayor, council terms that make sense, every party holding seats.
26. `play-first-12-politics-screen-to-mock-a` · 4 h · Government drawn as the mock: chamber picture, party split bar, votes as bars.
27. `play-first-12-politics-screen-to-mock-b` · 4 h · Issues as law cards, not a list.
28. `play-first-14-budgets-hidden-until-relevant` · 2 h · No Budgets tab at 17; it appears once he files or holds a seat.
29. `play-first-18-politics-guide` · 3 h · A Guide in Politics says what each tab is and how he could run here.
30. `play-stop-18-race-line-unreadable` · 2 h · Campaigns says in a sentence how the race stands and who he is running against.
31. `play-first-13-campaign-screen-to-mock-a` · 3 h · Campaigns appears once he files, headed in words, standing and polls only, no ON-BALLOT code or stray 0.
32. `play-stop-04-filing-panel-runs-off-screen` · 1 h · The filing panel fits, scrolls inside, party and positions on screen. · #5888 merged after the tested build: verify on main in a drawn place; if it holds, screenshot and hand to the merger.
33. `play-stop-16-identical-council-seat-choices` · 2 h · Each council choice names its seat, its date and who holds it now. · #5888 merged ("Council member (2025, 1)"): finish with the incumbent and plain words.
34. `play-first-08-news-box-fades-or-dismisses` · 2 h · The news toast fades or goes with one click.
35. `play-stop-10-two-unemployment-rates-one-night` · 2 h · Every unemployment rate names where it applies.
36. `play-stop-09-jobs-here-count-too-high` · 3 h · News's jobs line fits the town and matches the Jobs screen.
37. `play-first-10-journal-from-day-one` · 4 h · The Journal opens on day one with his parents, siblings and where the family came from.
38. `play-stop-19-turning-eighteen-and-journal-silent-a` · 3 h · His own 18th birthday is under Coming up and marked on the day.
39. `play-stop-19-turning-eighteen-and-journal-silent-b` · 3 h · The Journal tells filing and turning 18 inside his story, in the right tense.
40. `play-first-16-title-adds-lincoln-night` · 2 h · The title's rotation includes the Lincoln Memorial at night. · The Firefly painting is in art/incoming/firefly.

## Tier 3: the rest

41. `play-first-09-opening-speech-per-world` · 4 h · Two worlds open with addresses of different shape, each citing its own numbers and its President's issues. · Finishes #5902 (merged after the tested build).
42. `play-stop-26-empty-something-needs-you` · 3 h · Every stop says who or what needs him and how to answer.
43. `play-stop-07-every-day-starts-at-midnight-a` · 3 h · Day lands on the next morning; a 3-hour act spends 3 hours.
44. `play-stop-07-every-day-starts-at-midnight-b` · 3 h · The room's light follows the clock; an office outside its hours is closed.
45. `play-stop-12-status-card-covers-menu-after-canvass` · 2 h · After knocking on doors every menu icon opens with one click.
46. `play-stop-card-covers-rings` · 1 h · With a stop pending every menu icon opens with one click.
47. `play-stop-08-no-high-school-at-seventeen` · 3 h · At 17 he goes to the town's high school, named in full.
48. `play-stop-20-sister-born-a-week-apart-runs-public-works` · 3 h · Siblings born at least nine months apart; no 18-year-old runs a city department.
49. `play-stop-06-texas-shows-local-income-tax` · 2 h · No income tax line in Texas; each rate names who sets it.
50. `play-stop-11-campaign-actions-do-nothing-visible-a` · 3 h · Call donors names who gave and how much, or why nobody did.
51. `play-stop-11-campaign-actions-do-nothing-visible-b` · 4 h · Give a speech and Ask for an interview each play as a scene at a place.
52. `play-first-13-campaign-screen-to-mock-b` · 4 h · Doors, an event and the debate start from places as scenes; no act list on the tab.
53. `play-stop-25-door-count-stops-growing` · 3 h · The door count grows each week he knocks; a grayed act says why.
54. `play-stop-24-every-statewide-race-unopposed` · 4 h · Statewide races draw candidates from more than one party, one total each.

## When a line is done

The merger flips the item to done when the PR merges (line 1 `Pool item: <id>`). The agent who saw it merge adds `done #N` to `PROGRESS.md`. The CTO removes nothing from this file; a done line stays so the numbering never moves.
