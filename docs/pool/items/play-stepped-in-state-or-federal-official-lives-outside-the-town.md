---
id: play-stepped-in-state-or-federal-official-lives-outside-the-town
title: 'Stepping in as a state or federal official leaves the player living in the state''s record, not the town: no paper all year, an empty Travel and a blank Journal'
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
after:
blocked-on:
lead: play-first
model: opus
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Chalan Laulau, Northern Mariana Islands, seed fe27aa8b-db0e-4fc8-aff9-fc871d441c15)
---

**What.** On main 596d5127, an Advanced start in Chalan Laulau, Northern Mariana Islands (seed fe27aa8b-db0e-4fc8-aff9-fc871d441c15). Play as offered 36 people, all territorial or federal: the President, Vice President, Delegate, 20 Representatives, 9 Senators, the Governor and others. Stepping in as President Steven McCoy and pressing Week for a year:

- **The card and Money.** The card reads "Chalan Laulau, Northern Mariana Islands", and Money names "Chalan Laulau Community Bank".
- **News.** It reads "You don't follow a paper or a station." on April 26, July 26 and October 25, 2025.
- **Travel.** It lists nothing.
- **Journal.** It says "Nothing is written here yet." through week 26, then holds two lines about H.R. 6.
- **People.** The household is the President alone.
- **The record.** On the bench, `/api/dev/person?id=official:term:seat:US:president:2025-01-20` answers `placeId: "US-WY"` and a one-person household in `US-WY`. The territory's Governor, its Delegate and a Representative answer `placeId: "US-MP"`.

Seen: every screen of a life started through Play as on a state or federal office (Travel, News, People, the Journal).

**Cause.** Found in code:

- **The record.** Officials outside the town are built with their home state's record as their place (`src/core2/modules/officials.ts`, the officials' households, "Fictional officeholder seated in the party that really holds the seat").
- **Play.** `/api/play` (`src/bench/handler.ts`, line 2481) calls `personOrFillIn` and `state.player.select(id)` and never gives the person a home in the town.
- **The card.** The client's `enterAs` (`src/bench/play.mjs`, line 6630) sets the card's place from the new life's `placeName`, not from the person.
- **The views.** Every view that reads the person's place finds no town: the news board's `outletsForPlayer` (`src/bench/archive-words.ts`, filter `row.placeId === placeId`), Travel (`src/bench/places.ts`, line 115), and the people and scenes around a home.

**Fix.** One decision, then one change. Either:

- Play as lists only people whose `placeId` is the town (the town's own officeholders, and state and federal officials who live there), so the life's place and the person's agree; or
- `/api/play` gives a stepped-in official a home in the town through the engine that moves households (the same path an arrival takes), so their place, their bank and the card agree.

The second keeps "playing as a governor or President" open from any drawn place. The first is a two-line filter beside the `isOutsideOffice` skip of `play-bill-page-cuts-off-the-vote-and-play-as-offers-empty-offices`. Either way, the card's place is read from the person, not the life.

**Time box.** 3 hours

**Rules.** The simulation is the one layer that knows anything; every screen is a view of the same records (owner, Oct 28): the card and the views must read one place. One rule, all 56 places: the check draws its place. The golden path starts in a town (AGENTS.md, Where the game is going).

**Done when.** A browser check in src/bench draws a place, steps in as its Governor through Play as, presses Week four times, and finds a non-empty Travel list and a News page that is not the follows-none line. A second session then sees the same on the bench on main for a drawn place's Governor and for the President (screenshots with the place and seed).

**Waits on.** Nothing.

**Files.** src/bench/handler.ts, src/bench/officeholders.ts, src/bench/play.mjs, src/bench/player.ts, src/bench/play-as-lives-in-town.browser.mjs (new)

**Notes.** Found by Playtester P2 playing a year as President. The cabinet desk and the budget request both worked (fifteen posts nominated or left open on January 22, the request sent on February 3, and H.R. 6 failed in the House). The rest of the year had two scenes, both of new House members greeting the President as a coworker (`play-office-jobs-show-the-raw-office-kind`).

Seen again in a state (Playtester P2, same day, main 596d5127): Prairie City, Oregon (seed 70457df0-607e-4349-8f0a-b255747c6765), stepping in as Governor Paul Oliver. The card reads "Prairie City, Oregon", but `/api/dev/person` answers `placeId: "US-OR"`, the Journal reads "Nothing is written here yet." and Your office is blank.

A third: Inarajan, Guam (seed db11f543-5a3e-4bcb-b4be-2e6384c8ea3d), stepping in as Derek Cox of the Consolidated Commission on Utilities, played a year by Week. Travel and Your office were empty all year, and News said "You don't follow a paper or a station." on the first day.
