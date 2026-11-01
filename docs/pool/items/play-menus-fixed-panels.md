---
id: play-menus-fixed-panels
title: "Every menu is a fixed panel: nothing scrolls as a page, long lists page or scroll inside their own box"
area: play
lead: play-first
kind: bug
priority: 1
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone: play-first
source: owner, Oct 29 ("The main menu shouldn't really be scrolling. It should be things inside.")
---

**What.** The owner, Oct 29: "I don't want you to have to, like, just scroll infinitely... it shouldn't be like a HTML thing. The main menu shouldn't really be scrolling. It should be things inside. But again, look at other games." Since #6768 every sheet body scrolls as a page under the gold scroller. Each menu becomes a fixed panel that fits the window, and what does not fit is a bounded box inside it that pages with arrows or tabs (`src/bench/ui/pager.mjs`, from #6832) or scrolls within its own box. Order: the Politics tabs (Campaigns, Parties, Issues), the person card, Calendar, People, the News reader, the Guide, then the meeting agenda.

**Rules.** Screen to mock: each menu follows its Oct 14 mock and the shared parts, never a one-off renderer. Replace, never layer: the page-wide scroller for a menu is deleted when its panel is fixed. No hand-written player text: page and arrow labels come from the controls words.

**Done when.** A browser check at 1440 by 900 and at 1280 by 720 in a drawn place, named with its seed, opens every menu in the order above and fails if any `#sheet-body` scrolls (its scrollHeight beyond its height), and screenshots of each menu land in `docs/play-first/shots/play-menus-fixed-panels/`.

**Time box.** 4 hours per two menus, Sonnet; one PR per menu or pair.

**You will see.** No menu scrolls as a whole; long lists turn pages inside their own box.

**Screenshot.** Each menu before and after at 1440 by 900 from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/pager.mjs, src/bench/ui/split-screen.mjs

**Notes.** Filed by the CTO, Oct 29 22:15, after the lane asked whether to keep scroll-in-panel (it built #6768 on the CTO's earlier word). Politics → Government (#6832) is the first fixed panel. Read: OWNER-DECISIONS Oct 29 22:10 and 22:15; searched: scroll, pager, fixed panel.
