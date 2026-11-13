---
id: play-bills-is-a-column-of-boxes-with-a-read-button-each
title: "Politics, Bills is a column of boxes with a Read the bill button each, beside an empty half of the sheet"
area: play
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/fable-b-bills-list-beside-page
pr: #8556
after: play-bill-page-cuts-off-the-vote-and-play-as-offers-empty-offices
blocked-on:
lead: screens
source: "Fable B, Nov 11, 2026: a walk of every menu at 1440x900 in Blawnox, Pennsylvania, after the screens stack merged"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-11
---

**What.** Politics, Bills lists the bills a player follows as a column of boxes down the middle of the sheet, each with its number and title as a heading, a line of facts and a Read the bill button. The left third of the sheet holds the word "Bills" and nothing else. Reading a bill replaces the whole screen, so the player loses the list and comes back by a tab. The owner's rule for a long list is a list beside its detail (Nov 5 and Nov 8), every bill on a menu opens its page, and no screen is "a list of stuff on a background" (Nov 7). Seen: Politics, Bills, on every life.

**Cause.** Found in code: `bills()` in `sheets` in src/bench/play.mjs builds a `stripScreen` with an empty left column and one `stripSection` per bill, each holding a button that calls `openBillPaper` with a `show` that replaces `#sheet-body`. It never uses `rosterScreen` (src/bench/ui/roster-screen.mjs), the one list-beside-page part Elections, Parties, Issues and the Guide use.

**Fix.** Build Bills on `rosterScreen`: the bills at the left, grouped by where each stands (the words in `controls.floor.status`), each row the bill's title with its number at the right, and the chosen bill's page at the right. Give `rosterScreen`'s `render` a `show` to call, so a page that redraws itself after a vote stays beside its list. Give Bills the full sheet. Delete the Read the bill button, the per-bill boxes and the labels only they used. Let a list whose rows wrap use its whole allowance before it scrolls (src/bench/ui/pager.mjs). Point the browser checks that open a bill from Bills at the bill's own row.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the boxes and their button are deleted in the same change, and the PR body counts what was removed. No hand-written player text: the list's group names are the status words the game already has. A menu never scrolls as a page: the list and each column of the bill's page scroll inside themselves.

**Done when.** A second session, not the builder, starts the bench on main at 1440x900 in a drawn place (named, with its seed), opens Politics, Bills and takes a screenshot: the bills are a list at the left grouped by where each stands, the first bill's page is beside it, and there is no Read the bill button and no Back. It clicks a second bill and its page replaces the first with the list still on screen. In a world where dev mode sends a vetoed bill back, it votes on the override from that page and the page redraws beside the list.

**Waits on.** play-bill-page-cuts-off-the-vote-and-play-as-offers-empty-offices (#8542), whose bill page this screen holds.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/roster-screen.mjs, src/bench/ui/pager.mjs, src/bench/data/controls.json, src/bench/bill-stage.browser.mjs, src/bench/bill-committee.browser.mjs, src/bench/bill-override.browser.mjs, src/bench/bill-state.browser.mjs, src/bench/dev-acceptance.browser.mjs
