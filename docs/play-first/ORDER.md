# The play-first order

Current as of 2026-10-29, 16:45 UTC (the CTO on the second account: the owner's Oct 29 play of v0.64.0 goes first as Tier 0; the brackets below Tier 0 are as of Oct 27 and the item file wins)

Numbered in the order the owner will feel them. The bracket after each id is the item's state in the pool when this file was last written (`[open]`, `[open, after <sibling>]`, `[claimed, <branch>]`, `[in PR #N]`, `[done #N]`); the item file wins when they differ. Take the first line marked `[open]`, or `[claimed]`/`[in PR]` whose branch has no push in the last 3 hours and that `PROGRESS.md` does not show as done or as pushed in the last 3 hours. A line whose item waits on another (`after:` in the item) is skipped until that one is done. Each line: number, pool id, time box, what the owner will see, the PRs to adopt or read. The item file (`docs/pool/items/<id>.md`) has the rest; `LAW.md` wins over both.

Blocked parents (`play-stop-01`, `-02`, `-05`, `-07`, `-11`, `-19`, `-22`) are split into `-a` and `-b`; work the parts, never the parent. The CTO sets a parent done when its last part is done.

## Tier 0: the owner's play of v0.64.0 (Oct 29)

Worked before every other line. Numbered from 100 so earlier lines never move.

100. `play-menus-no-continue-back` [open] · 3 h · No menu shows Continue or Back; a news story opens in place on the paper.
101. `play-news-paper-prints-the-stories` [open] · 4 h · News is a front page with every story's text printed on it.
102. `play-person-history-for-everyone-you-open` [open] · 4 h · Click anyone and their card tells their life from the records.
103. `play-faces-show-the-moment-a-menu-opens` [open, after people-pack-v4] · 3 h · Faces are on screen the moment a menu opens.

## Tier 1: the three dead ends

Nothing else matters until these land: the game locks, the ballot never reaches his race, and nobody tells him he won.

1. `play-stop-23-job-offer-hold-locks-the-game` [in PR #5971] · 4 h · A job offer shows the employer, the job and the pay with Take it and Turn it down; either answer and Day and Week work again. · Read #5232 (open): it adds a second job-offer hold (`offer-deadline`); the screen must answer every hold reason, and #5232 merges only after this.
2. `play-stop-21-ballot-stuck-on-first-page` [done #6062] · 3 h · Continue turns the ballot's pages to his own race; he marks it and the game records it.
3. `play-stop-22-election-win-never-shown-a` [done #6041] · 3 h · Election night shows his own race first, every candidate's votes, and whether he won.
4. `play-stop-22-election-win-never-shown-b` [done #6147] · 3 h · The next morning the Journal, News and Government each say whether he won. · Read #5914 (open): household scenes on a win or loss.

## Tier 2: the game's identity

What makes it his game: the people are the ones he made, nobody stands around without a reason, the screens look like the mocks and speak plain English.

5. `play-first-05-v1-figures-removed` [in PR #5898, merged; the owner's installed-build check closes it] · 4 h · No person with arms out like an airplane anywhere; everyone stands from the v2 set or is drawn by the appearance engine. · Adopt #5898 (branch `art/people-whole-out-of-play`; the v2 set from draft #4283).
6. `play-stop-03-player-drawn-as-strangers` [in PR #5898, merged; the owner's installed-build check closes it] · 3 h · In every room the figure named as him is the one he made, and the talk box shows the other person's face. · After 5; #5898 claims this already, check its tests.
7. `play-first-06-created-look-in-every-scene` [open, after 05-v1-figures-removed and 03-player-drawn-as-strangers] · 3 h · His face and clothes from the creator on the card, Who you are, his person card, the opening's family chapter and Continue.
8. `play-first-11-people-web-uses-created-look` [open, after 05-v1-figures-removed] · 2 h · The face at the center of People is the one he made.
9. `play-first-07-no-random-people-in-rooms` [done #6084] · 4 h · Only his household and people with a reason stand in a room; no "X is with you".
10. `play-stop-15-family-unexplained` [open] · 3 h · On the first evening narration says who is in the room and how each is his family.
11. `play-stop-01-talk-says-nothing-a` [done #6078] · 4 h · Talking to his mother she opens from her life or the day, with four replies that move the talk. · Read #5914. (The acceptance requires real choices in every talk.)
12. `play-stop-01-talk-says-nothing-b` [open, after 01-talk-says-nothing-a] · 4 h · A moment that stops him for someone says who they are and why they came, and he answers it.
13. `play-first-01-start-a-life-first` [open] · 3 h · New game opens with Start a life first and one world choice beneath it.
14. `play-stop-13-start-a-life-or-new-world` [open, after 01-start-a-life-first] · 2 h · New game is one button, Start a life; world modes under one Advanced link; dimmed entries say why.
15. `play-first-03-creator-date-fields-aligned` [open] · 1 h · Month, day and year line up in the creator.
16. `play-first-04-town-list-font-and-populations` [done #6088] · 3 h · The town list is in the states' font and shows the population the world opens with.
17. `play-stop-14-town-list-stops-at-400` [done #6069] · 3 h · Every town reachable, each with a count, same-named towns showing their county.
18. `play-stop-17-see-through-panels` [in PR #6066] · 2 h · Panels read cleanly over the busiest room.
19. `play-first-02-panels-gold-box` [open, after 17-see-through-panels] · 2 h · Every panel keeps its slight gold edge, all the time.
20. `play-first-17-buttons-same-size` [done #6090] · 2 h · Buttons in a row share one size.
21. `play-first-15-mark-gap-off-player-screen` [in PR #6058] · 1 h · No Mark gap button in any talk box.
22. `play-stop-02-developer-text-on-play-screens-a` [done #6086] · 3 h · News reads in plain words: no field names, no Press.archived, every record naming who.
23. `play-stop-02-developer-text-on-play-screens-b` [done #6058] · 3 h · Politics and the city secretary speak plain words: no raw dates, percents or "on-ballot".
24. `play-stop-05-politics-lists-wrong-officials-a` [open] · 3 h · His two senators, one representative and his own legislators first; everyone else behind the filter.
25. `play-stop-05-politics-lists-wrong-officials-b` [open, after 05-politics-lists-wrong-officials-a] · 3 h · His mayor, council terms that make sense, every party holding seats.
26. `play-first-12-politics-screen-to-mock-a` [open, after 05-politics-lists-wrong-officials-b] · 4 h · Government drawn as the mock: chamber picture, party split bar, votes as bars.
27. `play-first-12-politics-screen-to-mock-b` [open, after 12-politics-screen-to-mock-a] · 4 h · Issues as law cards, not a list.
28. `play-first-14-budgets-hidden-until-relevant` [done #6097] · 2 h · No Budgets tab at 17; it appears once he holds office, files, or can vote.
29. `play-first-18-politics-guide` [open] · 3 h · A Guide in Politics says what each tab is and how he could run here.
30. `play-stop-18-race-line-unreadable` [open] · 2 h · Campaigns says in a sentence how the race stands and who he is running against.
31. `play-first-13-campaign-screen-to-mock-a` [open, after 18-race-line-unreadable] · 3 h · Campaigns appears once he files, headed in words, standing and polls only, no ON-BALLOT code or stray 0.
32. `play-stop-04-filing-panel-runs-off-screen` [open] · 1 h · The filing panel fits, scrolls inside, party and positions on screen. · #5888 merged after the tested build: verify on main in a drawn place; if it holds, screenshot and hand to the merger.
33. `play-stop-16-identical-council-seat-choices` [open] · 2 h · Each council choice names its seat, its date and who holds it now. · #5888 merged ("Council member (2025, 1)"): finish with the incumbent and plain words.
34. `play-first-08-news-box-fades-or-dismisses` [open] · 2 h · The news toast fades or goes with one click.
35. `play-stop-10-two-unemployment-rates-one-night` [done #6105] · 2 h · Every unemployment rate names where it applies.
36. `play-stop-09-jobs-here-count-too-high` [done #6037] · 3 h · News's jobs line fits the town and matches the Jobs screen.
37. `play-first-10-journal-from-day-one` [open] · 4 h · The Journal opens on day one with his parents, siblings and where the family came from.
38. `play-stop-19-turning-eighteen-and-journal-silent-a` [open] · 3 h · His own 18th birthday is under Coming up and marked on the day.
39. `play-stop-19-turning-eighteen-and-journal-silent-b` [open, after 19-turning-eighteen-and-journal-silent-a] · 3 h · The Journal tells filing and turning 18 inside his story, in the right tense.
40. `play-first-16-title-adds-lincoln-night` [done #6109] · 2 h · The title's rotation includes the Lincoln Memorial at night. · The Firefly painting is in art/incoming/firefly.

## Tier 2, continued: the Oct 26 sitting (owner's stops, in the order he met them)

Filed from `docs/coordination/playtest/2026-10-26-1.md` and its drafts. Numbered from 70 so earlier lines never move; worked right after line 40, before Tier 3. The words items at the end belong to the words-and-scenes lead and are listed so the lane knows what is coming.

70. `play-stop-27-title-motion-and-rotation-restored` [open] · 3 h · The title painting pans, zooms and fades to the next scene again.
71. `play-stop-28-title-panel-header-separated` [open] · 1 h · The game's name is set apart from the menu under it.
72. `play-stop-29-creator-labels-and-fields-share-one-grid` [open] · 2 h · Labels, fields and the gender buttons line up and keep their size.
73. `play-stop-30-creator-age-line-says-what-it-is` [open] · 1 h · The age line says it is his age on the day the game starts.
74. `play-stop-31-creator-search-fields-gold-outline` [open] · 1 h · State and town search fields carry the gold outline.
75. `play-stop-32-town-list-county-label` [open] · 1 h · A same-named town's row names its county without reading as the county's population.
76. `play-stop-33-creator-offers-hair` [open] · 3 h · The creator offers hair, and the chosen hair is on the figure everywhere.
77. `play-stop-34-creator-skin-and-clothes-colors` [open] · 3 h · Skin tones and clothing colors as swatches; the figure shows them.
78. `play-stop-36-opening-starts-with-the-address` [open] · 4 h · The opening starts with the President giving the address, the key people pointed out behind him; home comes later.
79. `play-stop-37-opening-tags-and-highlights-match-the-figure` [open] · 2 h · A name tag, the person drawn and the highlight are the same person.
80. `play-stop-38-figures-framed-whole` [open] · 2 h · No head cut off, no two people standing through each other.
81. `play-stop-35-people-drawn-from-their-own-look` [open] · 3 h · Each person in a room is drawn from their own look; neighbors differ.
82. `play-stop-41-person-card-no-empty-headings` [open] · 2 h · A person card shows no empty heading or floating date.
83. `play-stop-42-news-story-opens-as-the-paper` [open] · 3 h · A news story opens as the paper's front page with its masthead.
84. `play-stop-43-travel-as-place-cards` [open] · 3 h · Travel shows pictured place cards that say who is there and why.
85. `play-stop-44-filing-races-open-as-a-menu` [in PR #6187, screens lead] · 3 h · More than four races open as a menu panel, in plain words.
86. `laws-filing-positions-are-the-seats-own-issues` [open, lead: laws-effects] · 4 h · The positions offered at filing are that seat's own body's issues, not a 13-question state and federal platform for a borough council.
87. `play-stop-45-talk-history-set-apart` [in PR #6188, screens lead] · 2 h · Earlier lines in a talk are set apart from the line being said now.
88. `play-stop-46-calendar-opens-on-today-and-shows-events` [open] · 3 h · The calendar opens on today, marks the days with something, and shows a day's events.
89. `play-stop-47-calendar-skip-forward-on-a-future-day` [open, after 46-calendar-opens-on-today-and-shows-events] · 2 h · Clicking a future day offers the skip-forward and it lands there.
90. `laws-opening-past-fits-the-chosen-age` [open, lead: laws-effects] · 4 h · The family, schooling, work and money drawn for a life fit the age the player chose (no parent 12 years older than him).

Done from the sitting already: `play-stop-39-rail-vertical-round-with-news` (#6185), `play-stop-40-menu-list-drops-its-subheadings` (#6184).

Words-and-scenes lead's items from the sitting, in its own order (`docs/work-orders/lead-words-scenes-2026-10-26.md`): `words-campaign-season-scenes-fill-the-months` (#6201 in review), `words-scene-narration-does-not-restate-where-you-are` (in #6201), `words-household-filing-scene-has-a-purpose`, `words-door-knocking-montage-with-porch-scenes`, `words-news-inauguration-story-reads-as-news`, `words-parent-named-mother-or-father`, `words-traits-middle-reads-as-a-sentence`. The lane does not take these.

## Tier 3: the rest

41. `play-first-09-opening-speech-per-world` [open] · 4 h · Two worlds open with addresses of different shape, each citing its own numbers and its President's issues. · Finishes #5902 (merged after the tested build).
42. `play-stop-26-empty-something-needs-you` [done #6126] · 3 h · Every stop says who or what needs him and how to answer.
43. `play-stop-07-every-day-starts-at-midnight-a` [in PR #6059] · 3 h · Day lands on the next morning; a 3-hour act spends 3 hours.
44. `play-stop-07-every-day-starts-at-midnight-b` [open, after 07-every-day-starts-at-midnight-a] · 3 h · The room's light follows the clock; an office outside its hours is closed.
45. `play-stop-12-status-card-covers-menu-after-canvass` [in PR #6051] · 2 h · After knocking on doors every menu icon opens with one click.
46. `play-stop-card-covers-rings` [open, after 12-status-card-covers-menu-after-canvass] · 1 h · With a stop pending every menu icon opens with one click.
47. `play-stop-08-no-high-school-at-seventeen` [in PR #6038] · 3 h · At 17 he goes to the town's high school, named in full.
48. `play-stop-20-sister-born-a-week-apart-runs-public-works` [claimed, claude/play-stop-20-siblings] · 3 h · Siblings born at least nine months apart; no 18-year-old runs a city department.
49. `play-stop-06-texas-shows-local-income-tax` [open] · 2 h · No income tax line in Texas; each rate names who sets it.
50. `play-stop-11-campaign-actions-do-nothing-visible-a` [open] · 3 h · Call donors names who gave and how much, or why nobody did.
51. `play-stop-11-campaign-actions-do-nothing-visible-b` [open, after 11-campaign-actions-do-nothing-visible-a] · 4 h · Give a speech and Ask for an interview each play as a scene at a place.
52. `play-first-13-campaign-screen-to-mock-b` [open, after 13-campaign-screen-to-mock-a and 11-campaign-actions-do-nothing-visible-b] · 4 h · Doors, an event and the debate start from places as scenes; no act list on the tab.
53. `play-stop-25-door-count-stops-growing` [done #6065] · 3 h · The door count grows each week he knocks; a grayed act says why.
54. `play-stop-24-every-statewide-race-unopposed` [done #6118] · 4 h · Statewide races draw candidates from more than one party, one total each.

## Tier 4: on screen (Oct 25 pool audit)

Backend items whose Done when named no screen; each puts its result where the player looks. Build the screen against what the engine gives today.

55. `play-local-races-on-screen` [open] · 3 h · Before an election, Campaigns lists each local seat in your town and who is running for it.
56. `play-prior-budgets-on-screen` [open] · 3 h · Budgets shows what your town spent last year next to this year, and which lines went up or down.
57. `play-circle-changes-on-screen` [done #6138] · 3 h · After a year, the People web marks who has become close to you and who has drifted away, and why.
58. `play-other-states-news-on-screen` [open] · 3 h · News tells you when another state's jobs picture changes, not only your own.
59. `play-town-moves-on-screen` [open] · 3 h · Your town's population and who moved in or out this year show on Who you are and in the news.
60. `play-local-layoffs-on-screen` [open] · 3 h · When a business in town lays people off or hires, the news says who and how many.
61. `play-home-sales-on-screen` [open] · 3 h · The news tells you which homes in town sold and for how much.
62. `play-official-ties-on-screen` [done #6162] · 3 h · Click an official and see who they know in government.
63. `play-governor-races-on-screen` [done #6159] · 3 h · On election night you also see who won the governor races around the country.
64. `play-town-paper-on-screen` [open] · 3 h · Each local story says which paper ran it, and if the paper closes, the news says so.
65. `play-city-books-on-screen` [open] · 3 h · Budgets tells you how much your town has actually collected and spent so far this year.
66. `play-move-out-on-screen` [open] · 3 h · When you are old enough and can afford it, you can move out of your parents' home.
67. `play-job-openings-on-screen` [open] · 3 h · Out of work, you can see the jobs open in town and apply for one.
68. `play-issue-stances-on-screen` [open] · 3 h · Campaigns tells you which issues your race turns on and which way the town leans.
69. `play-why-they-chose-on-screen` [open] · 3 h · Click someone and read why they made their last big choice.

## When a line is done

The merger flips the item to done when the PR merges (line 1 `Pool item: <id>`). The agent who saw it merge adds `done #N` to `PROGRESS.md`. The CTO removes nothing from this file; a done line stays so the numbering never moves.
