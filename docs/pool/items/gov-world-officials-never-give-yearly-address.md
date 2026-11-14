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

**Built.** In the address's season the first of each month, `worldAddresses` (src/core2/office-day-acts.ts, the local kit's `onDay`) weighs it for each world mayor and county executive who has not given it that year: the year's laws made by their town or county body (`1 - 1/(1+n)` times `addressCauseWeight`), against `addressEffort` and their temperament (the `meetings.hold-town-hall` extraversion row stands in), and the yes gives it by the same `state-of-the-city` act the player's character gives. Year 1 at Edmore ND, Odessa WA and Kimberly ID: two addresses each (the mayor and the county executive), on March 1 at Edmore and Odessa; year times 23.1 and 25.0 s with against 25.7 and 24.7 s without at Edmore, 51.4 and 52.4 against 54.2 and 49.7 at Odessa, 124.9 and 131.2 against 133.1 and 142.9 at Kimberly (a slow year on both sides). The paper does not print it yet: no story kind or line is worded; the lines wanted are at /mnt/project-files/words-lead/world-address/needs.md.

**Waits on.** gov-mayor-never-gives-yearly-address-or-town-hall merged.

**Files.** src/core2/modules/meetings.ts, src/core2/office-day-acts.ts, src/core2/modules/news.ts

**Notes.** Filed with the mayor-acts PR as check 2 of the coordinator's request; not built there.
