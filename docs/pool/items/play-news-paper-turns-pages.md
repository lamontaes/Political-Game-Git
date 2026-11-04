---
id: play-news-paper-turns-pages
title: "The paper turns pages instead of leaving stories off the front page"
area: play
kind: feature
priority: 3
size: S
status: in-pr
claimed-by: lane-4/paper-pages
pr: #7238
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T11:28:19.884Z
---

**What.** To fit without scrolling (screens-menus-never-scroll), the News front page shrinks its lead photo and, when still too long, hides the last briefs and stories after the lead. Those stories are then not on screen that day. The shared pager (ui/pager.mjs) could turn the paper's pages instead.

**Rules.** Owner, Oct 29: menus never scroll; things inside page. Use the shared pager; replace the hiding step, never add beside it.

**Done when.** In a drawn place whose front page holds more than fits at 1024x768, every story the player heard that day is reachable by the paper's page arrows, and menus-no-scroll.browser.mjs still passes.

**Files.** src/bench/ui/newspaper.mjs

**Notes.** lead: Lane 4. Filed Nov 4.
