---
id: play-bill-numbers-and-dates-said-in-words
title: 'A bill''s number and a date reach the player''s screens as bare digits ("2025-8", "2026-10-20")'
area: play
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/pool-play-bill-numbers-and-dates-worded
pr: #8856
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
lead: screens
source: owner, Nov 11, 2026, on a picture of the council meeting, relayed by Fable B
---

**What.** The owner, Nov 11, 2026, on a picture of the council meeting: "Rule: don't let dates go 2025-8 like how they are in the council member thing. Like, have August 2025 or something." What he saw was an ordinance's bare number, "2025-8", under its name; it reads as a date. #8848 worded it at the meeting and the desk's agenda item. The same bare number still reached Your office (the desk's title, the deals heading, the seat's result line), the Bills list and the bill's page, and two dates reached a screen as digits: the debate card's heading ("Debate invitation · 2026-10-20") and Your office's line for a seat the law made you leave. Seen: Your office's desk and deals, the Bills list beside each bill, the bill's page, and the debate card's heading.

**Cause.** Found in code: the server views hand the page the record's own number: `billStage` and `followedBills` and `billPageView` in src/bench/bill-stage.ts (`number: bill.number`), `seatView`'s bills and `seatAct`'s result in src/bench/legislature.ts (the raw bill row), and `officeView`'s deals in src/bench/office.ts; src/bench/play.mjs joins them into the desk title, the deals heading and the seat's result. `debateCard` in src/bench/ui/campaign-acts.mjs prints `debate.date` as given, and play.mjs printed `l.date` for a left seat raw. src/bench/government-bodies.ts (Coming up) and `billPaper` already word the number through `spokenDesignation` (src/english/bill-names.ts).

**Fix.** Word the number at each server view through `spokenDesignation(bill.number, bill.form.kind)` ("Ordinance 2025-8"), keeping the raw row where code reads it and adding `spoken` beside it, and let the page show the worded one; `spokenDesignation` leaves a number that already has a word alone, so nothing reads "Ordinance Ordinance". Put the debate's day and the left seat's day through the page's `dateWords`. Add a guard test over the bench views a bill appears in that fails on a bare year, dash and number.

**Time box.** 2 hours.

**Rules.** No hand-written player text: the word is the form's own, from the English engine's bill names. One rule, all 56 places: the guard draws its place and names it with its seed. Replace, never layer: the page stops joining the number itself.

**Done when.** A second session, on main, in a drawn place, steps in as a local body member (Advanced), drafts a bill from Your office and sees "Ordinance …" (or the form's word for that body) on the desk, in the deals heading, beside the bill in Bills and on its page, never a bare "2025-1"; and a campaign's debate card reads its day in words. `src/bench/bill-numbers-worded.test.ts` passes in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/bill-stage.ts, src/bench/legislature.ts, src/bench/office.ts, src/bench/play.mjs, src/bench/bill-numbers-worded.test.ts (new)
