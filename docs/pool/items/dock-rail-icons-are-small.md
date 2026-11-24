---
id: dock-rail-icons-are-small
title: "The menu rail's icons are 40 px circles with 22 px icons, small beside the controls"
area: play
kind: bug
priority: 3
size: S
status: claimed
standard: 2
claimed-by: claude/pt-carryover-n8-p11
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Carryover screens, Nov 23 sitting (N8-P11)
---

**What.** The owner, Nov 8: "the UI is not resizing. I mean, look at this. It's so small." and the rail icons are tiny. The window scaling above 1440x900 is on main and works; at 1440x900 the rail is still 40 px circles with 22 px icons.
Seen: Nov 23, a played life, 1440x900.

**Cause.** Found in code: the rules `.ring` and `.ring svg` (about lines 762 and 777 of src/bench/play.css) fix the rail at 40 px and 22 px at the base size, which the window scale then only multiplies.

**Fix.** The rail's circles are 52 px with 28 px icons, and the unread dot grows to match. The size reads like the other controls (MENU-LOOK, readable controls). No player text changes.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** Wire to the world: the one `.ring` rule sets every rail icon, so all nine grow together and nothing is sized per icon, and no player text is added.

**Done when.** In a played life at 1440x900 the nine rail circles are 52 px with 28 px icons and clear of every open panel. A second session starts a new life and sees the larger rail in the running game, then opens a screen and sees it does not touch the panel.

**Waits on.** Nothing.

**Files.** src/bench/play.css

**Notes.**
