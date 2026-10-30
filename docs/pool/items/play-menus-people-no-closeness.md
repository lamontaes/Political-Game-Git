---
id: play-menus-people-no-closeness
title: "People shows no closeness marks, and its list is face cards, paged"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: done
claimed-by: cto/menus-people
pr: #6885
blocked-on:
milestone: play-first
source: owner, Oct 29 ("none of that how close you are"; "redesign all the menu screens")
claimed-at: 2026-10-30T03:05:16.654Z
---

**What.** The People web marked almost everyone "Closer this year", said "Your five closest are the same as a year ago" when nothing changed, and put the date of the change beside a chosen person, all read from a ranking of the player's ties by closeness; a person's card history also said they "grew closer" or "apart" in a month. The owner ruled on Oct 29 that how someone feels about you is never a meter, scale or mark ("none of that how close you are"), and asked for every menu to be redesigned. This item removes the closeness marks, the line and the date, deletes the five-closest reader and the closer-or-apart history lines, and makes the People list face cards in a paged grid with the chosen one marked.

**Rules.** Replace, never layer: the circle-change reader (`src/bench/circle.ts`), its test, the card's `circle` field, the marks' styles and labels are deleted with the screen's use of them. Screen to mock: the list uses the shared member card and pager, never a one-off renderer. No hand-written player text: every label comes from the controls words.

**Done when.** In a drawn place at 1440 by 900, named with its seed, the people browser check passes with the list as face cards, no "Closer this year" or five-closest line appears on People, no person's card history says closer or apart, and the card tests pass without the circle reader; screenshots land in `docs/play-first/shots/play-menus-people-no-closeness/`.

**Time box.** 1 hour, Opus (CTO).

**You will see.** People with faces and relations only, and a list view of face cards.

**Screenshot.** People's web and list at 1440 by 900.

**Files.** src/bench/ui/people-web.mjs, src/bench/play.mjs, src/bench/play.css, src/bench/card.ts, src/bench/circle.ts, src/bench/circle-changes.test.ts, src/bench/data/controls.json, src/bench/people.browser.mjs

**Notes.** Filed by the CTO, Oct 30 03:35, under the Oct 29 23:00 ruling. Read: OWNER-DECISIONS Oct 29 23:00; DECISION-REGISTER OCD-LIFE-008; the People mock README (no circle marks in the mock); searched the pool: five closest, closer this year (no twin).
