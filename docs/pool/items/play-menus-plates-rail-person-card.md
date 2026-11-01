---
id: play-menus-plates-rail-person-card
title: "Menus sit on framed plates, tabs sit on a rail, and the person card tells a life as a timeline"
area: play
lead: cto
kind: bug
priority: 1
size: M
status: done
claimed-by: cto/menus-person-card
pr: #6844
blocked-on:
milestone: play-first
source: owner, Oct 29 ("redesign all the menu screens... So they're not blocks of text anymore with random buttons")
claimed-at: 2026-10-29T22:58:56.998Z
---

**What.** The owner, Oct 29, with a screenshot of a person card's History: "One thing I really don't like is text when it's just laid out like this... I don't like that at all. And another thing I don't like is just the black or gray just background, like stuff sitting on it... buttons sitting there but without a railing to sit on or something, and something to delineate that that's the one that's selected." He chose framed plates, a vertical timeline and a tab rail. This item builds the three shared parts, puts every record section on a plate and every tab bar on the rail, and redraws the person card to the Oct 14 mock with its history as a timeline.

**Rules.** Screen to mock: the card follows `docs/ui/mocks/screens-2026-10-14/shots/person.png` and the shared kit parts, never a one-off renderer. Replace, never layer: the old card renderer and the old tab looks are deleted. No hand-written player text: every label comes from the controls words.

**Done when.** In a drawn place at 1440 by 900, named with its seed, a person card shows their figure on a framed plate, small fact plates, the closeness meter when there is a tie, a tab rail, and their history as a paged timeline with an icon per record, with nothing scrolling; screenshots beside the mock, and one textured-material example of the same card, land in `docs/play-first/shots/play-menus-plates-rail-person-card/`.

**Time box.** 4 hours, Opus (CTO).

**You will see.** A person card that reads like a game's character sheet: the figure framed, plates for work and home, a timeline of their life with years and icons, tabs on a rail.

**Screenshot.** The card before and after at 1440 by 900, beside the mock.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/plate.mjs, src/bench/ui/timeline.mjs, src/bench/ui/meter.mjs, src/bench/ui/tab.mjs, src/bench/ui/section.mjs, src/bench/card.ts

**Notes.** Filed by the CTO, Oct 29 23:30, from OWNER-DECISIONS Oct 29 22:45. Read: OWNER-DECISIONS Oct 29 22:45, 22:10 and 22:15; prior-rulings/screens.md 20 (full-body records); Oct 27 (no Talk button). Searched the pool: menus, plate, timeline (no twin; `play-menus-fixed-panels` stays for the menu-wide no-scroll check).
