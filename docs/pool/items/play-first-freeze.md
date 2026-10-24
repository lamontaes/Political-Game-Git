---
id: play-first-freeze
title: "Play first: every open p1 item outside the playtest's stoppers is frozen until the owner can play"
area: release
kind: cleanup
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner, Oct 24: "Only the bare minimum needs to be put in the game right now. I still can't play the game." The Oct 24 playtest (docs/reports/playtest-2026-10-24.md) found three stoppers that end play and 23 more defects the owner would feel in his first half hour. Until he can start a life, reach election night, vote in his own race and see the result on a Mac build, no other p1 item is claimable. This item is the freeze: every frozen item carries blocked-on: play-first-freeze and a Notes line naming the date, and only the CTO lifts it.

**Rules.** This is a game, not a spreadsheet: the owner playing the game is the one measure, and work that does not unblock his play waits behind the play-stop-* items. Look before you ask: a session that finds a frozen item reads docs/work-orders/play-first-2026-10-24.md for what to take instead.

**Done when.** The owner, on the next Mac build, from a new life in a drawn place with the place and seed named, reaches election night, votes in his own race, is told on screen whether he won or lost, and the game never locks on a hold the screen cannot show; then the CTO lifts the freeze by clearing blocked-on on each frozen item and marking this one done, with a screenshot of the result screen in the report.

**Files.** docs/work-orders/play-first-2026-10-24.md, docs/coordination/MERGE-FIRST.md, docs/pool/items/play-first-freeze.md

**Notes.** CTO, Oct 24. Exceptions kept unblocked: play-stop-*, jobs-counted-hire-other-employer-calendar, release-* (main-red type), laws-nine-links-*, traits-wire-*, web-reach-* already in a PR, words-scene-talk-in-play (the route for play-stop-01), and any item already claimed or in a PR.
