---
id: screens-menus-never-scroll
title: "No menu scrolls at 1440x900 or 1024x768: Parties, News and Government run past their foot"
area: play
kind: bug
priority: 2
size: S
status: claimed
claimed-by: lane-4/menus
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T09:44:51.986Z
---

**What.** Path 11 (docs/lanes/lane-4.md): every rail menu at 1440x900 and 1024x768, no scrolling. Measured on main Nov 4 in Meadow Lakes AK, Storrs CT, Murray NE and Haleyville AL: Parties' side (In office pushed under a tray of join buttons) and Government's side (recent votes over the mayor) run past their foot at 1024x768; News' paper scrolls at both sizes (the lead's photo, body and briefs); Issues at 1024x768 in some towns. Budgets at 1024x768 runs over by 13px, but its layout waits on the owner's answer to the Nov 1 mocks.

**Rules.** Owner, Oct 29: menus never scroll; things inside page. Use the shared pager and controls (screen-to-mock); replace, never layer: one fit for every sheet, not one per screen.

**Done when.** src/bench/menus-no-scroll.browser.mjs passes in three towns twice each: every rail menu and tab at 1440x900 and 1024x768, nothing running past its foot (Budgets reported until the owner answers); screenshots of Parties, Government and News at both sizes.

**Files.** src/bench/play.mjs, src/bench/ui/newspaper.mjs, src/bench/menus-no-scroll.browser.mjs

**Notes.** lead: Lane 4 (path 11).
