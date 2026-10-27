---
id: play-stop-43-travel-as-place-cards
title: "Travel shows pictured place cards that say who is there and why each is listed"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/play-stop-43-travel-as-place-cards
pr: #6225
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T05:33:52.751Z
---

**What.** Travel in v0.34.0 is a plain list of five names with Go buttons: "County board of elections (counter: chief clerk)", "Pennsylvania Department of State", "Erie County Farm Supply" (Daniel Valdez), "Borough of Albion" and "Albion Public Works Department". The owner: "Why have to travel farm supplied borough of Albion? What are you talking about? Public Works Department? Why?" The approved Travel screen (Oct 14, "Approved as is") is a grid of place cards, each with the room's picture, its name and who is there now, under "You are at home, <street>". This item draws that grid, drops the "(counter: ...)" text from filing-office names, and gives every card a short reason it is listed, read from the record that qualified it.

**Rules.** Serves LAW.md §1, Screens and menus (the Oct 14 mocks; OD:76: "Actions start from people, places and scenes, not menu lists") and LAW.md §8, Dev-speak. Ask why: every card cites the record that is its reason. Wire to the world: places and who is there come from the world's organizations and staff. This is a game, not a spreadsheet. Replace, never layer: the list with pager is replaced by the card grid.

**Done when.** In a drawn place, Travel opens as a grid of place cards matching docs/ui/mocks/screens-2026-10-14/shots/travel.png in layout, with home as the first card; a browser check in src/bench/travel.browser.mjs asserts that every card has a picture, a name, a who-is-there line and a reason from one of: you work or study here, someone you know works here (named), a body you may file with or serve meets here, something you can do here now; no card is listed on the generic adult-and-civic rule alone; no name contains a parenthetical; and there is no five-per-page pager, shown by a screenshot and the record id behind each card's reason.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Travel is a grid of pictured places, each telling you who is there and why it is on your list, and the filing office is named plainly.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/places.ts, src/bench/filing.ts, src/bench/play.css, src/bench/data/controls.json, src/bench/travel.browser.mjs, art/ui-kit13/travel/thumb-frame.png

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "Why have to travel farm supplied borough of Albion? ... Public Works Department? Why?" townPlaces in src/bench/places.ts already requires a reason (own work, school, someone known, an offered action, or "an adult and a civic office"); the last clause admits every town department, which is likely why Public Works shows. The reason is computed but never shown. The "(counter: chief clerk)" text comes from the filing-office record's filedWith string shown by travel(). Going to the filing office took no time on the clock (play-stop-07-every-day-starts-at-midnight-a). Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
