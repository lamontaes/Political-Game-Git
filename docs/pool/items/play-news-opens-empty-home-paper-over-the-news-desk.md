---
id: play-news-opens-empty-home-paper-over-the-news-desk
title: "News opens on an empty home paper while every story the player has not read is under the News desk tab"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: "Playtester P3, Nov 13, 2026 (crew line #8928, comment 6844698994)"
checked:
claimed-at:
---

**What.** On the first day and a week later, News opened on 'North Hyde Park Register ... Nothing from North Hyde Park Register yet.' while the Vermont House vote, the new minimum wage, the federal food aid law and fifteen briefs sat under the last tab, named News. A new player reads that there is no news. Seen: the page News opens on in a small town whose paper has not printed yet.

**Cause.** Found in code: the function openingTab in src/bench/ui/news-open.mjs (line 15) skips the 'news' desk and the Nation page (NOT_OUTLETS) when it looks for unread stories, then falls back to the home paper even when the home paper is empty. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026), Jan 20 and Jan 28, 2025.

**Fix.** Keep the order openingTab has, and add one step before the home paper: when no followed outlet has an unread story, open the first tab (the desk included) that has one; open the empty home paper only when no tab has anything unread. Extend its test.

**Time box.** 1 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the change adds no words and only picks the tab. One rule, all 56 places: the test draws its place and names its seed.

**Done when.** A second session starts a new life on main in a drawn small town whose paper has printed nothing, opens News on the first evening, and lands on a page with stories, not an empty paper, while other tabs hold them; the extended test of openingTab passes on main and fails with the new step removed.

**Waits on.** Nothing.

**Files.** src/bench/ui/news-open.mjs
