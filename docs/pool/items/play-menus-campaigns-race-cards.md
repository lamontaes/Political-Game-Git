---
id: play-menus-campaigns-race-cards
title: "Campaigns shows the coming ballot as race cards on a plate, each opening its race's page"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: cto/menus-campaigns
pr: #6868
blocked-on:
milestone: play-first
source: owner, Oct 29 ("redesign all the menu screens... So they're not blocks of text anymore with random buttons")
claimed-at: 2026-10-30T02:25:56.025Z
---

**What.** Politics → Campaigns printed each race on the coming ballot as a large heading followed by a line of body text ("No one has filed November 4, 2025"), with candidates and their stances folded under each heading, a long column that ran down the panel. The owner asked for every menu to be redesigned like Government (Oct 29, 22:45). This item shows the ballot as race cards on a framed plate, paged to fit the window, each card naming the office, who is running, election day and when filing closes, and opening the race's own page: who is running as face cards with where each stands, the race's dates beside them, and File for it in a tray.

**Rules.** Screen to mock: the cards and the race page use the shared kit parts (plate, pager, member card, date list, split screen, tray), never a one-off renderer. No hand-written player text: every label comes from the controls words and every date is worded, never an ISO date. Replace, never layer: the folded heading list is deleted.

**Done when.** In a drawn place at 1440 by 900, named with its seed, the campaigns-ballot browser check finds one card per race on the ballot across every page, each a control with its contest record, opens a race and finds one face card per candidate and File for it exactly when the race's filing is open, with nothing scrolling; screenshots land in `docs/play-first/shots/play-menus-campaigns-race-cards/`.

**Time box.** 2 hours, Opus (CTO).

**You will see.** Campaigns as a grid of race cards; click one to see who is running, their faces and stances, and when filing closes.

**Screenshot.** Campaigns and a race's page at 1440 by 900 from a drawn place.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/list-row.mjs, src/bench/data/controls.json, src/bench/campaigns-ballot.browser.mjs

**Notes.** Filed by the CTO, Oct 30 04:00, the sixth screen of the menu redesign. Read: OWNER-DECISIONS Oct 29 22:45; searched the pool: campaigns screen, ballot (no twin).
