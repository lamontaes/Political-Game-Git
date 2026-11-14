---
id: gov-world-officials-never-give-yearly-address
title: "No world official ever gives a yearly address: only the player's own character can"
area: gov
lead: laws
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 14 (mayor-acts check 2)"
checked:
---

**What.** The state of the city (and the matching state and national addresses) is offered only to the character the player controls (`officeActProviders`, src/core2/office-day-acts.ts). Other towns' mayors, governors and legislative leaders never give one, so no press story or scene reads an address from the world's officials. Town halls by world officials do happen (the cause-driven `meetings.hold-town-hall` decision); budgets are proposed by rule; the address has no world path. Seen: the news story for a world mayor's address in January.

**Cause.** Found in code: in `officeActProviders` the address is an offer for the controlled actor only and is handled by the office-day acts handler; no decision in src/core2/modules/meetings.ts or the executive engine holds one for an uncontrolled office holder.

**Fix.** Let the same engine that holds world town halls hold the address in its season, chosen by the official's traits, the year's record and the place's conditions (no dice), and write the same record the player's address writes so the news and scenes read it. Prove it in a one-year world at three drawn places with and without the change, with a speed check (one act per official per year, never a daily scan).

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; one engine per mechanic; cadence-and-summaries (the address is a yearly event, not a daily step).

**Done when.** A one-year world at three drawn places (names and seeds in the PR) shows world mayors giving the address in its season, each by record id, with news or a journal line reading it, and the year no more than 20% slower. A second session plays a world year and sees a world mayor's address in the news in its season.

**Built.** In the address's season, the first of each month, `worldAddresses` (src/core2/office-day-acts.ts, the local kit's `onDay`) weighs it for each world mayor and county executive who has not given it that year. The address is the office's custom (`addressCustomWeight`, ESTIMATED from the season's citation), given whether or not the year was busy; the custom's pull grows through the season against `addressEffort`, and the speaker's temperament (the `meetings.hold-town-hall` extraversion row stands in) moves the day or, rarely, past the season's end. A yes gives it by the same `state-of-the-city` act the player's character gives. The paper does not print it yet: no story kind or line is worded; the lines wanted are at /mnt/project-files/words-lead/world-address/needs.md. Governors and the President: gov-world-governors-and-president-never-give-their-address. Last year's address on day one: gov-opening-lacks-last-years-address. Year 1 with and without, two runs each: Edmore ND 23.0 and 23.1 s against 23.6 and 23.7 s, Odessa WA 49.7 and 51.9 against 53.5 and 52.7, Kimberly ID 140.9 and 130.1 against 131.0 and 130.2 (a slow year on both sides); one address each on 2025-02-01 (Kimberly's second is 2026-01-01, the next season), none without.

**Waits on.** gov-mayor-never-gives-yearly-address-or-town-hall merged.

**Files.** src/core2/modules/meetings.ts, src/core2/office-day-acts.ts, src/core2/modules/news.ts

**Notes.** Filed with the mayor-acts PR as check 2 of the coordinator's request; not built there.
