---
id: press-market-stations-seek-village-candidates
title: "Every TV station in a market seeks out a village council candidate, one a day, because newsworthiness is measured against the town, not the station's audience"
area: elections
kind: bug
priority: 2
size: M
status: claimed
standard: 2
claimed-by: claude/project-thread-sew1gc
pr:
after:
blocked-on:
lead: elections
model: opus
effort: medium
source: "Interview check thread, Nov 15, 2026, from the second reader's played file at Fairmont, Nebraska (seed s03)"
root: none
claimed-at:
---

**What.** At Fairmont, Nebraska (seed s03), three TV stations interview the player for the village board on three days running. Each reporter "walks up to you on the street". A village that size is not news to a market's stations, and three reporters do not each happen upon the candidate in the street.

Creve Coeur, Illinois (seed pl5) shows the same class: four TV stations and two papers, each set up as the town's own outlet. Seen: the player's reporter calls, one a day, each opening with a street meeting.

**Cause.** Found in code: in src/core2/modules/press.ts on train 2190669e,

- Where a town's outlets come from: `openPress` makes every outlet as the played town's own record (its id names the town's jurisdiction; its staff, payroll, revenue and beat are the town's). The counts come from wider areas. Papers are the county's share of the state's papers: Illinois has 246 papers and Tazewell County is 1.02% of the state, which gives 2.5 papers for Creve Coeur. Nebraska has 112, and Fillmore County is 0.27%, which gives 0.3 for Fairmont. TV stations are the state's stations divided by its markets: 55 / 11 = 5 in Illinois and 22 / 7 = 3.1 in Nebraska. Each count is moved by the world's draw and capped at 4. So the outlets that cover a town are real in number, but each one acts as if the town were its whole audience.
- How often one seeks the same race: the weekly seeking loop (`press.ts`, after `forgetOldWire`) lets a station invite any candidate whose `newsworthiness` clears `televisionBar` (0.3). `newsworthiness` is measured against the town: the share of the town's adults who know the candidate (`knownShare`), their share of the race's money, incumbency and office. A village candidate known to a third of 400 adults scores the same as a city candidate known to a third of 400,000. So every station in the market clears its bar on the same village race, each up to `interviewsPerWeek` (2), and the invitations reach the player as one call that is staged as one sitting a day.
- The approach: the invitation scene is set in public, and its arrival line is the one for a person who approaches you in public (`scene-words.arrival-public-other`, "{begins}, {name} walks up to you on the street."), so every reporter's invitation opens with the same street meeting.

**Fix.** Measure a candidate's worth and a story's room at an outlet against the outlet's own audience (lead's ruling, Nov 15, 02:12Z: interviews and printed stories both; a small town's News tab is filled from the county, state and nation records the game already keeps). Each local outlet records the people it serves: a station its state's people over the state's markets, a paper or radio station its county's people over the county's outlets of its kind. A race's share of that audience scales its worth and gives it a turn as often as its share builds to one, kept by seat; each level of the wire (town, county, state, nation) has the room its share of the audience builds each week. The town's outlet of record is the exception (lead's call, Nov 15, 07:23Z, citing docs/coordination/prior-rulings/press.md entry 5, "Your town paper covers your town"): the town's government is its full beat, so its town share is 1. It is one fact, `townOutlet`, settled at the opening (the town's paper, else its widest local outlet) and read by the legal notices (`paperOfRecord`) and the police log too. No dice, one rule for every outlet and place. Staging a reporter's invitation as a call or at the campaign's own event is its own pull request after this one, on the director numbers thread's class B item (where and how a scene happens as one fact).

**Time box.** 4 hours.

**Rules.** No dice. One rule, all 56 places: no named place or size threshold in code. Estimate, never UNKNOWN: market audiences come from the published counts already loaded (data/research/press/local-news-2026.json).

**Done when.** At a village (pinned: Fairmont, Nebraska, seed fair01) the market's stations other than the outlet of record do not seek the village board's races or print its government, and the outlet of record does; at a suburb (pinned: Creve Coeur, Illinois, seed creve01) the same; in a city (pinned: Omaha, Nebraska, seed omaha01) every station still weighs the leading candidates as news. `src/core2/press-audience.test.ts` shows all three. A filed player at a village or suburb still gets an invitation before election day, from the outlet of record. A second session plays a campaign in a drawn place of under 2,000 people on main, names its seed, and sees no run of street meetings with reporters.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/data/press/parameters.json, src/director/data/situation-types.json
