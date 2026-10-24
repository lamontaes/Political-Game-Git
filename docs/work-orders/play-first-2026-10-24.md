# Play first: the order the owner will feel (Oct 24, 2026)

Current as of 2026-10-24, 19:30 UTC (written by the acting CTO from the Oct 24 playtest, docs/reports/playtest-2026-10-24.md, and main at the sha the report and its 26 items landed)

The owner: "Only the bare minimum needs to be put in the game right now. I still can't play the game."

The playtest's headline: **Not tonight: he can file for council and campaign, but the ballot won't reach his own race, no screen says he won, and six weeks later the game locks on December 14, 2026.**

Owner, Oct 24: no new sessions; every lead takes its play-stop items from the pool before anything else it has open; the `lead:` field names the owner.

Build tested: v0.22.10 (4c943f3), Anson, Texas, seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. 55 minutes of play; no crash; three stoppers; 26 pool items, all `play-stop-*`. PR #5956 stays open as the record; its items and report are on main.

## How this order is used

- The three Tier 1 items are the only thing that matters until they land. Tier 2 is what he will call broken in his first half hour. Tier 3 is what he will ask about.
- Every other open p1 item is frozen (`play-first-freeze`, blocked-on on each). Exceptions: `jobs-counted-hire-other-employer-calendar`, `release-*`, the `laws-nine-links-*`, `traits-wire-*` and `web-reach-*` items already in a PR, `words-scene-talk-in-play` (the route for play-stop-01), and anything already claimed or in a PR.
- One PR per item, body line 1 the item id. Mergers take `play-stop-*` PRs first (`docs/coordination/MERGE-FIRST.md`, line 1).
- Never dev mode to get past something. The Done-when of every item is the owner doing the same steps on the next Mac build and not being stopped, with a screenshot from the installed build in a drawn place, place and seed named.

## Tier 1: ends play (3)

In fix order:

| # | Item | What he sees |
|---|------|--------------|
| 1 | `play-stop-23-job-offer-hold-locks-the-game` | SOMETHING NEEDS YOU with nothing to answer; Day and Week gray; Continue loops; Quit and CONTINUE return to the lock. A `job-offered` hold (Janitor, $13.48/hour) the play screen never shows. |
| 2 | `play-stop-21-ballot-stuck-on-first-page` | The ballot shows five county races; Continue does nothing; the other 20 races, his own council race among them, never come. |
| 3 | `play-stop-22-election-win-never-shown` | He won 448 to 246 in the records; election night runs out after eight statewide races; Journal, News, Who you are and Government never say. |

**Tier 1 done when:** the owner, on the next Mac build, from a new life in a drawn place, reaches election night, votes in his own race, is told he won or lost on screen, and the game never locks on a hold the screen cannot show (every hold reason has a screen or is auto-resolved).

## Tier 2: makes it feel broken (16)

The "wrong on its face" list, in the order he meets them.

| Item | What he sees |
|------|--------------|
| `play-stop-01-talk-says-nothing` | Every conversation is a greeting and a goodbye; no reply choices; his mother runs the city's money and he can't ask her a thing. The single most-felt defect. |
| `play-stop-02-developer-text-on-play-screens` | Mark gap in every talk box; "unemploymentPct 4.4 · jobsThousands 6909.0"; "Press.archived"; "FILING-DEADLINE 2025-02-08 / 2026-08-17"; the clerk says "on-ballot". |
| `play-stop-03-player-drawn-as-strangers` | Never drawn as the character he made; a different person in each scene. |
| `play-stop-04-filing-panel-runs-off-screen` | The filing panel is 3,117 pixels tall in a 900-pixel window and does not scroll; he filed as a Republican without seeing the party picker. |
| `play-stop-05-politics-lists-wrong-officials` | Three U.S. senators for Texas, the New York Speaker as his congressman, 180 state legislators, no mayor, 28-year council terms, one party. |
| `play-stop-06-texas-shows-local-income-tax` | "Local income tax rate 37% top rate" in Texas. |
| `play-stop-07-every-day-starts-at-midnight` | Day skips Tuesday; every day is 12:00 AM in the bedroom; a 3-hour action moves the clock 0 hours; the city office is open in daylight at midnight on a Sunday. |
| `play-stop-08-no-high-school-at-seventeen` | A 17-year-old lists "Anson Middle" and "Anson El"; no high school. |
| `play-stop-09-jobs-here-count-too-high` | "2036 employed · 23 looking · 0 open" in a town of 2,570. |
| `play-stop-10-two-unemployment-rates-one-night` | 4.1 and 4.4 percent the same evening, unlabeled. |
| `play-stop-11-campaign-actions-do-nothing-visible` | Give a speech, Ask for an interview and Call donors show nothing; $0.00 raised in 21 months. |
| `play-stop-12-status-card-covers-menu-after-canvass` | After Knock on doors the status card covers the six menu icons. |
| `play-stop-20-sister-born-a-week-apart-runs-public-works` | His sister was born seven days after him and is the city's Public Works Director at 18. |
| `play-stop-24-every-statewide-race-unopposed` | Every 2026 Texas statewide race an unopposed Republican; the House result shows two totals. |
| `play-stop-25-door-count-stops-growing` | The door count stops at 1,080 from September 2025 to election day though he knocked every week. |
| `play-stop-26-empty-something-needs-you` | SOMETHING NEEDS YOU with an empty box, seven times in 2026. |

## Tier 3: confusions (7)

| Item | What he sees |
|------|--------------|
| `play-stop-13-start-a-life-or-new-world` | New Game opens Custom world / Start a life / New world with no description. |
| `play-stop-14-town-list-stops-at-400` | The Texas town list stops at the 400th town; 10 towns have no count; two appear twice. |
| `play-stop-15-family-unexplained` | He is Bo Snider; everyone at home is a Stein; nothing says who they are. |
| `play-stop-16-identical-council-seat-choices` | "I want to run for Council member." five times, identical. |
| `play-stop-17-see-through-panels` | The room shows through the text of every panel. |
| `play-stop-18-race-line-unreadable` | "Doors 172 · +105 · −67 · Retold 86 · +57 · −16". |
| `play-stop-19-turning-eighteen-and-journal-silent` | Turning 18 passes silently; the journal is empty for three weeks; his birthday is not on the calendar. |

## Assignments

Owned by the files each item names. Each play-stop item carries `lead: <name>` in its front matter (`m0-m2`, `laws`, `words`, `effects`) and `milestone: play-first`; the Notes line repeats it.

| Owner | Session | Items | Area |
|-------|---------|-------|------|
| **Words lead** (src/director/conversation.ts, scene-talk.ts, journal.ts) | existing | 01; 19 (journal lines) | words |
| **M0–M2 lead** (src/core2/player-v1.ts, deep-past.ts, town-households.ts, opening-employment.ts, modules/jobs.ts, modules/campaigns.ts, modules/residents.ts; play screen: src/bench/play.mjs, play.html, play.css, handler.ts, scene.ts, calendar.ts) | existing | play-stop first, in order: 23, 21, 22 (Tier 1); then 03, 04, 07 (screen half), 12, 26, 02; then 13, 14, 15, 16, 17, 18, 19 (calendar and birthday screen); also 08, 09, 20, 25 | core, play |
| **Laws lead** (src/bench/government.ts, results.ts, campaign.ts; src/core2/opening-key-people.ts, modules/offices.ts, candidacy.ts, elections.ts, campaigns.ts) | existing | 05, 24, 11 | gov, elections |
| **Effects lead** (src/core2/modules/laws.ts, data/legislature/bill-catalog.json, data/laws/starting-law.json; src/director/opening-story.ts, src/bench/economy.ts) | existing | 06, 10 | laws, world |

Split items:

- **07** (every day at midnight): the M0–M2 lead owns the clock (`advancePlayerV1` in src/core2/player-v1.ts lands every advance at `minuteOfDay: 0` of the next day, and a 3-hour act does not spend 3 hours); the M0–M2 lead owns the screen half (the office open at midnight, the scene's time of day in src/bench/scene.ts and play.mjs). Two PRs, both body line 1 `play-stop-07-every-day-starts-at-midnight`; the item closes on the second.
- **19** (turning 18 and journal): the M0–M2 lead owns the calendar entry and the birthday moment on screen (src/bench/calendar.ts, play.mjs); the Words lead owns the journal lines (src/director/journal.ts, present tense "I filed to run for..."). Two PRs, same rule.

Priorities in the pool: Tier 1 and Tier 2 are p1; Tier 3 is p2.

## Where the defects live (from the lookup)

- Holds and SOMETHING NEEDS YOU: the hold is registered in src/core2/modules/jobs.ts (`registerModuleStopV1`, `hold: true`, reason `jobsData.reasons.offered` = `job-offered`); the play screen's words for a stop's reason come from `controls.moment` in src/bench/data/controls.json ("Something needs you") looked up at src/bench/play.mjs line 587; the offer card with Accept and Decline exists only inside Jobs and study (src/bench/play.mjs, `className: "job-offer"`), never at the hold.
- Ballot: src/bench/play.mjs lines 823 to 889 render `ballot-races`; `pageWhenChanged($("ballot-races"), $("ballot-pager"))` at line 4014 is the pager that never pages; src/bench/polling.ts builds the scene; src/director/polling-place.ts stages it.
- Election night: src/bench/results.ts (`electionResults`, `resultsScene`; `unopposed` at line 64 is "one total"); the player's own contest is `contest:seat:gus2025:205462:council:0:2026-11-03`.
- Talk: src/director/conversation.ts (`openConversation`, `say`, `sayNothing`) through src/bench/handler.ts `/api/talk/*`; Mark gap is src/bench/play.html line 672 and `/api/talk/gap` in handler.ts.
- Politics lists: src/bench/government.ts `governmentView` reads `keyPeopleOf` (src/core2/opening-key-people.ts) and `townSeats` (src/core2/modules/offices.ts).
- Filing panel: src/bench/play.mjs `renderFiling` (line 1063 on), `filing-overlay` in play.html, sizing in play.css; "FILING-DEADLINE" is a record kind rendered raw where `kindName` (play.mjs line 1924) is not applied.
- Texas income tax: the row comes from `lawHere` in src/core2/modules/laws.ts labeled by src/core2/data/legislature/bill-catalog.json ("Local income tax rate", line 286); the 37 is a federal starting-law value shown under a local label.
