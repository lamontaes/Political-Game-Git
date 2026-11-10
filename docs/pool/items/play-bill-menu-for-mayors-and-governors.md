---
id: play-bill-menu-for-mayors-and-governors
title: "A mayor or governor can propose a bill: today the mayor's Your office shows 'Office: Mayor' and 'Pay: $4,262.00 a year' and nothing else (Davenport, North Dakota)"
area: play
kind: feature
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/pool-play-bill-menu-for-mayors-and-governors
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What a player sees" and "Size of the fix", root cause 7)
model: sonnet
effort: high
root: rc7-player-cannot-drive
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:30:41.538Z
branch: claude/pool-play-bill-menu-for-mayors-and-governors
---

**What.** A player who wins an executive office cannot send a bill to the body that votes. Measured by the Nov 9 audit in Davenport, North Dakota (three seats taken through Advanced, Play as; no seed given): the council member's Your office screen has a Draft a bill list, a state legislator drafts from 152 policies, and the mayor's shows "Office: Mayor" and "Pay: $4,262.00 a year" and nothing else. The engine for an executive's bill already exists and the player's screen never calls it. Build the screen for the class: any single-seat executive whose office has a proposal right gets the same draft card, for the body that votes on their government's bills, and drafting goes through `proposeAsExecutive`, the way real mayors and governors send bills. The member asked decides as anyone asked would; the player sees who was asked and what they said, and follows the bill from there.

**Cause.** Found in code: `bodiesOf` in src/bench/legislature.ts (line 54; `office.seats < 2` returns [] at line 93) gives a single-seat executive no body, so `seatView` builds no draft menus and `seatAct` refuses with "You don't sit on that body." (line 278); `proposeAsExecutive` (src/core2/modules/legislature.ts, line 3431) asks the member most inclined to carry the bill by the office's right in src/core2/data/legislature/executive-proposal.json, and its only caller is the background world (src/core2/modules/world-legislating.ts, line 594). Measured by the Nov 9 audit in Davenport, North Dakota (no seed given).

**Fix.** Give any single-seat executive whose office has a proposal right in executive-proposal.json the same draft card, and route its drafting through `proposeAsExecutive`; show who was asked and what they said, and follow the bill to the executive's desk to sign or veto. Use the one draft card, the one bill catalog and the one bill engine a member uses.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: who may bring an executive's bill and to which body is read from the office's row and the place's own records (the proposal-right table, stopgap SG-GOV-local-executive-proposal where it is an estimate), never from a named town or state. Replace, never layer: the executive uses the one draft card, the one bill catalog and the one bill engine a member uses; no second menu, no second bill writer, no executive-only bill path. No dice: the member asked carries or refuses from their own position on the bill and their tie to the executive, and the screen shows that recorded reason. No hand-written player text: every label is a control name and every line about the ask comes from the English engine. AGENTS.md, early access: "local and state offices playable (council, mayor, county, state legislature, governor), including the executive role." The audit's root cause 7: "A mayor or governor cannot propose a bill."

**Done when.** A second session starts the bench (`npm run bench`, play at /play), begins a new game with the Place field empty so it is a drawn place with an elected mayor (it names any places it drew and passed over for having none), writes down the place and seed, and through Advanced, Play as takes the mayor's office. Your office shows a Draft a bill card with the town's own catalog and what is in force today beside each item. It drafts one bill and takes a screenshot of the result: the member who was asked, their answer, and, when they agree, the bill on the council's agenda marked as brought at the mayor's request (the bill row's requester, by record id). With dev mode's bill card it holds the vote; the bill comes to the mayor's own desk to sign or veto, and after signing the law page shows the new value. It does the same as a governor in a drawn place. Then, in the audit's place, Davenport, North Dakota (typed into the Place field; the audit gave no seed), the mayor's Your office shows the draft card and not only "Office: Mayor" and the pay. A member who refuses is shown with the reason, and no bill appears. A bench test fails when a serving single-seat executive with a "by-request" right gets an empty menu. The owner plays it: as mayor he picks a policy, sends it to the council through a member who agrees to carry it, and signs it when it passes.

**Waits on.** Nothing.

**Files.** src/bench/legislature.ts, src/bench/play.mjs, src/bench/ui/draft-card.mjs, src/bench/handler.ts, src/core2/modules/legislature.ts, src/core2/data/legislature/executive-proposal.json, src/bench/data/controls.json

**Notes.** From the Fable audit, Pillar 2 ("A mayor or governor has no bill menu at all, because only bodies with two or more seats get one, src/bench/legislature.ts:93") and its fix list ("Small: ... a bill menu for single-seat executives"). The audit cites line 64 for the catalog sizes; on Nov 10's main the menus are built in `seatView` (line 191, `menusFor` near line 218) and the two-seat gate is still at line 93.

Look-first, Nov 10: the executive's side of the engine is built (`proposalRight`, `proposeAsExecutive`, `askToCarry`; a carry ask that reaches the player waits on the player, gov-carry-ask-player-decides, done; the scene for the member asked is words-carry-bill-scene, done). What is missing is only the player-as-executive screen. Open and near it: gov-legislature-local-rules-by-place (who may bring an executive's bill under each state's general law), research-legislature-sourced-parameters. The budget is a separate road (office-the-budget-season, open); this item is ordinary bills.

Not verified: I did not open the mayor's screen on Nov 10's main. I did not check whether a town whose mayor also sits on the council as a voting member already gets the council's menu through that seat, or whether `proposeAsExecutive` returns nothing for a body with no other member (it returns null when no member can be asked); the builder says what the screen shows then. The audit did not test a governor or a county executive.

Related: play-repeal-action-on-every-law-page (an executive's repeal goes through this), play-what-this-law-did-page, play-menus-your-office-plates (done; the Your office layout).

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-10 23:26 UTC) on branch claude/pool-play-bill-menu-for-mayors-and-governors.

Released (2026-11-10): Builder stopping for now (usage); not started, no branch work. Continue on branch claude/pool-play-bill-menu-for-mayors-and-governors.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-10 23:30 UTC) on branch claude/pool-play-bill-menu-for-mayors-and-governors.
