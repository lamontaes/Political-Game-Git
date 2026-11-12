---
id: play-stop-card-covers-rings
title: "A pending stop's card covers the ring icons, so the rings take no click until Continue"
area: play
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: haiku
effort: low
root: none
source: added with npm run pool -- add
lead: play-first
milestone: play-first
after: play-stop-12-status-card-covers-menu-after-canvass
checked: fable 2026-11-10
---

**What.** When a stop is pending (for example Shift ends with Continue), the card panel was seen growing over the six ring icons, so a pointer click on the Politics ring landed on the card instead and the player had to press Continue before any ring worked (the PR 5533 browser run). The layout has been reworked since: the rings and the card are hidden while a talk, meeting or desk is open, so whether a pending stop still covers the rings is unknown. This item also absorbs play-story-replies-covered-by-player-card: the filing story's reply row must be clear of the player card at 1440x900 and 1024x768 after a campaign outing, reachable by pointer and keyboard (Cacao, Puerto Rico, seed b32f52ab-ec06-46ae-8e53-7482696bb81a).

**Cause.** Measured: `npm run bench` on main 8c980a59, Start a life with Random place, Christiansted, U.S. Virgin Islands (the bench draws its own seed), at 1440x900: the rings half no longer reproduces. A Playwright script pressed Week until the clock showed Continue (Friday, January 31, 2025, 8:00 AM, a stop pending). For each of the nine rings it read `document.elementFromPoint` at the ring's center, and every one returned the ring itself, not the card. A real pointer click (`page.mouse.click` at the center) on each ring opened its screen, Politics included, with no press of Continue first and no console error. At 1024x768 (Tesuque Pueblo, New Mexico) the stop came as a talk with replies, and the rings are hidden by design while a talk is open (the `:has()` rule in src/bench/play.css). The second half, the filing story's replies clear of the player card after a campaign outing (absorbed from play-story-replies-covered-by-player-card), was not reached: no outing was played.

**Fix.** Nothing to fix for the rings; proposed for the CTO: drop the rings half. Keep the item only for the replies half: one Haiku session plays a campaign outing until the filing story stops, then reads `elementFromPoint` on each reply at 1440x900 and 1024x768 and clicks it with a real pointer and with Tab and Enter. If every reply is clear and works, close the item with the screenshots. If one is covered, write the covering element and its rule in src/bench/play.css into this item.

**Time box.** 1 hour for one Haiku session, the replies check only. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the screen must stay usable at a stop, and a check uses real pointer and keyboard input, never forced or DOM clicks. Ask why: if the overlap is not reproduced, the finding says what was tried and the item is closed with that.

**Done when.** A second session (not the builder) starts the bench in a drawn place (place and seed named), makes a stop pending (a Shift that ends with Continue, and a campaign outing that stops for a filing story), and with a real pointer clicks each of the six rings and each filing-story reply at 1440x900 and 1024x768, with Tab and Enter or Space for the replies: every ring opens with one click, every reply is clear of the player card and activates, with screenshots inspected and no console errors. If nothing overlaps, the session writes where the cause was found, or that it is gone, and the item is rewritten or dropped.

**Waits on.** Nothing. (play-stop-12-status-card-covers-menu-after-canvass, which it once waited on, is done.)

**Files.** src/bench/play.css, src/bench/play.mjs, src/bench/play.html, src/bench/clock.browser.mjs

**You will see.** With a stop pending, each icon in the menu rail opens with one click, without pressing Continue first.

**Screenshot.** The rail with a stop pending, from a drawn place, with the place and seed under it.

**Notes.** Found by the browser run on PR #5533; screenshot defect-card-covers-rings-at-stop.png in that session. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

Cause looked for (Nov 11, 2026, cause finder for Fable B): the rings take every click with a stop pending at 1440x900 (screenshot stop-pending-christiansted-1440x900.png in this session's scratch folder). The replies half still needs its check.
