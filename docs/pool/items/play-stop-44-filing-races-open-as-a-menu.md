---
id: play-stop-44-filing-races-open-as-a-menu
title: "When a clerk offers more than four races, they open as a menu panel, in plain words with no codes"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6187
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** At the county board of elections the clerk's talk box lists six numbered replies, each with a sub-line: "I want to run for Council member (2025, 1)" with "Seat 1 · November 4, 2025 · Held by Travis Pierce", two more council seats, "I want to run for Mayor" and two 2027 seats. The owner: "Okay, this menu is terrible. Why are there so many like subs? ... If there's this many options, it should open an actual menu. It shouldn't just be in the chat." The "(2025, 1)" comes from filing.ts joining the year and seat number into the title. This item keeps the talk box at four replies and, when the counter has more than four races, opens the races as a menu panel listing each race's office, seat, election date and who holds it, with no parenthetical codes in any filing line.

**Rules.** Serves LAW.md §4, Scenes and conversations (four dynamic choices in a conversation, OD:209: the races are a choice among records, not a reply in the talk) and LAW.md §8, Dev-speak. No hand-written player text. This is a game, not a spreadsheet. Replace, never layer: the long numbered list in the talk box is replaced by the panel. Introduce people before they speak (OD:345): the clerk is named and placed before the first line.

**Done when.** In a drawn place whose filing office has more than four open races, the clerk's talk box shows no more than four numbered replies and the races open as a menu panel with one row per race (office, seat, election date, who holds it now); a test over the counter packet fails on any filing line matching a year-and-number parenthesis; the clerk is introduced before speaking; shown by a screenshot of the panel, the talk box and the clerk's introduction with the place and seed named, checked in src/bench/seat-choices.browser.mjs.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Going to run for office, you see the races in a proper menu with each seat, date and who holds it, and the talk with the clerk stays short.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/filing.ts, src/director/filing-visit.ts, src/bench/play.mjs, src/bench/play.css, src/bench/seat-choices.browser.mjs, src/bench/filing.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "If there's this many options, it should open an actual menu. It shouldn't just be in the chat." New owner instruction in playtest; CTO to record in OWNER-DECISIONS.md. LAW.md §4 says four choices always in a conversation; this item reads the owner's menu instruction as applying to a choice among races, not to a conversational reply, and the CTO should confirm. play-stop-16 (done) added the seat, date and holder lines; the codes and the six-line list remain. The clerk, Laura Pierce, spoke without being introduced. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
Sent back 2026-10-27 from PR #6187 (branch claude/screens-filing-menu): its seat-choices check fails in Waverly, Ohio on a 'Council member (2025, 1)' code; finish on that branch, merge main into it first.

Sent back 2026-10-27 from PR #6187 (branch claude/screens-filing-menu): SEED replay and fresh-server Waverly repair acknowledged. Done-when clerk introduction explicitly Not done here and screenshot lacks required introduction; finish row or bound menu implementation keeping original acceptance open. Browser test116-132 accepts2choices and conditionally skips all >4race menu assertions; require positive bounded >4race witness. No own runtime failure or gate claimed; finish on that branch, merge main into it first.
Sent back 2026-10-27 from PR #6187 (branch claude/screens-filing-menu): see Merger 3's introduction-row point; my earlier 'Council member (2025, 1)' report was a stale bench server and is withdrawn; finish on that branch, merge main into it first.
Merged Oct 27 in PR #6187; awaiting the owner's installed-build check (clerk introduction row bounded out to the Words line)
