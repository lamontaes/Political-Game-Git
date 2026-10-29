---
id: play-browser-checks-open-on-the-address
title: "Browser checks that start a life time out since the opening became the President's address"
area: play
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Since the merge of #6568 (commit 5bd41f4616, found by bisecting main on src/bench/person-card.browser.mjs: passing at 5d67d39cf2, failing from 5bd41f4616) a new life opens on the President's address, one talk with Continue. The older browser checks start a life and then wait for the home screen or a news reader, never press Continue on the address, and time out after 60 seconds. On clean main at 2abf75bc6a, person-card, continue-news, plain-text and talk-history all fail this way in four different drawn places (Fenwick Island, Delaware; Montalvin Manor, California; Rockingham, North Carolina and others); the golden path runner's 19 accepted rows still pass, so the damage is to the browser checks, not the game. About 45 files in src/bench match *.browser.mjs and most of them start a life the same way, so the player-screen checks the merger skill relies on are blind until this is fixed.

**Rules.** Wire to the world: the check must press the address's Continue the way a player does, never skip the opening or hide it. One rule, all 56 places: the shared start-a-life step must work in a place drawn from all 56, named with its seed. Replace, never layer: one shared helper in the browser checks, not a copy of the same lines in each file. Not a game change: nothing in src/director or the opening may be edited to make a check pass.

**Done when.** A shared helper in src/bench starts a life, presses Continue on the opening address until the home screen shows, and returns; every *.browser.mjs that starts a life calls it. Run person-card, continue-news, plain-text, talk-history and panels against a fresh bench in three drawn places, naming each place and seed; each prints PASS on the same commit where it failed before, and src/bench/opening-address.browser.mjs still passes. Release check and eslint on the changed files pass.

**Files.** src/bench/person-card.browser.mjs, src/bench/continue-news.browser.mjs, src/bench/plain-text.browser.mjs, src/bench/talk-history.browser.mjs, src/bench/opening-address.browser.mjs, src/bench/panels.browser.mjs

**Notes.** Merger 0, Oct 28 17:50 UTC, found while gating #6640. Separate, smaller reds in the same files, not this item: birthday.browser.mjs is flaky about a third of the time on main (it presses Week before a stop's Continue appears, and does not know #talk-next); calendar.browser.mjs waits for #talk-leave or #continue and never sees #talk-next; budgets.browser.mjs and filing.browser.mjs wait for a Go button in the sheet that a few places do not show. Time box: 3 hours for one Sonnet session; push the helper and the five check runs.
