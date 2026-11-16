---
id: play-first-year-politics-with-no-race-open
title: "A player with no race open can work for a campaign, a party committee or an appointed board"
area: play
kind: wiring
priority: 1
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lane
milestone: play-first
model: sonnet
effort: high
root: none
source: owner, Nov 16 2:45 p.m., desk answer; filed by hand
claimed-at:
checked: fable 2026-11-16
---

**What.** The owner played v0.112.0 (main ca195112) and said: "There's not much I can do since I can't run for anything." His desk answer for a first year with no race open: "Work for someone else's campaign, a party committee or an appointed board until a race opens". These are examples of a class: everything a person does in politics without holding or seeking an office. The player sees it on the Elections page and the Politics page on day one, and in the scenes that follow.

**Cause.** Read from the code on main ca195112. The engines for all three already exist and each one passes over the player by an explicit check, so the world's people do these things and the player is never asked and has no control to offer.

1. Someone else's campaign. `askForSupport` (src/core2/modules/campaigns.ts, about line 7280) builds its pool with `id !== playerId`, so no world candidate ever asks the player for evenings or an endorsement. `castVolunteer` (about line 2330) already keeps "a decision cast for a person on a campaign's volunteer ask (the player's, or a dev pick)" and `askToVolunteer` reads it, so the player's yes or no has a place to live; nothing in src/bench writes it for the player outside dev mode. The volunteer shift scene (src/bench/volunteer-shift.browser.mjs, kind `volunteer` in play.mjs about line 2097) exists only for the player's own campaign.
2. A party committee. `joinParty` is reachable (src/bench/government.ts `joinPartyAs`, handler.ts about line 2563), but the party's monthly recruiting skips the player (src/core2/modules/parties.ts about line 981: "The player ties themselves") and the committee's leader picks skip the player (lines 387 and 392: `members.find((m) => m.id !== core.playerId)`). `chooseChair` (line 667), `attendCase` (line 792) and `partyMeetings` (line 1050) have no bench control for the player: a member who joined has no meeting to go to and can hold no committee seat.
3. An appointed board. The world's appointers skip the player (src/core2/modules/executive.ts line 646: `p.id !== playerId` in the candidate filter; offices.ts line 516). `serve-asks.ts` runs only one way: the player asks someone to serve in a seat the player fills. Nobody asks the player, and the player cannot put their name in.

**Fix.** No new engine. Three wirings, each its own pull request, in this order (the first is the smallest and gives the owner something to do on day one):

1. Campaign: let a world candidate's `askForSupport` reach the player as an ask that waits for an answer instead of skipping them. The ask becomes a scene from the existing `asked` record (the candidate or their volunteer at the door or by phone), the player's press writes `castVolunteer`, and a yes puts the player in `campaign.volunteerIds` so the existing volunteer evening (`askToVolunteer`, the doors rule at about line 3575) and the shift scene run for the candidate's campaign with the player as the volunteer. Add the player's own offer: on a race page for a race the player is not in, a control "Offer to help" per filed candidate, which writes the same cast and record. Nothing is cast for the player without their press (lead's ruling, Nov 16).
2. Party committee: after `joinParty`, list the party's next meeting from `partyMeetings` on the Politics page and let the player attend through `attendCase`; let `chooseChair` and the leader picks at parties.ts 387 and 392 count the player as a member like any other (the members choose by their own records; the player stands only by pressing "Put my name in").
3. Appointed board: run `serve-asks.ts` the other way. Where executive.ts line 646 filters the player out, keep the player in the candidate list, and when the appointer's own ranking picks the player, write a serve ask addressed to the player and play `ask-to-serve` with the player answering (a person asked to serve can say no). Add "Ask to be considered" on a board's page with an open seat, which records the player's interest for the appointer's read; the appointer still decides from their record of the player (closeness, party, work).

The Elections page, when no race is open to the player, shows these three as the things to do, each from records (filed candidates in the player's district, the parties here, boards with an open or soon-open seat), in place of an empty list.

**Time box.** Three Sonnet sessions, 4 hours each, one per wiring. If a wiring runs over, push what is built with its test and put what is left in Notes.

**Rules.** No dice: the candidate asks whoever its reach already names; the appointer picks by its own ranking. One engine per mechanic: campaigns.ts, parties.ts, executive.ts and serve-asks.ts stay the only engines. Day one in motion: filed campaigns, party committees and seated boards already exist at the opening. Every new player-facing line goes to the Words lead to sign and is listed in the pull request. No expected-failure marks and no moving a test to a town that passes. Each effect gets a dev mode control and trace.

**Done when.** A second session, on main, in a place and seed nobody chose, starts a new life at 18 with no race open and (1) gives an evening to a filed candidate's campaign and sees that candidate's door count and the tie to the candidate move, by record id; (2) joins a party, attends its meeting and sees the attendance on the party's record; (3) asks to be considered for a board with an open seat and receives the appointer's yes or no with its reason from the record. The Elections page names all three when no race is open.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/parties.ts, src/core2/modules/executive.ts, src/core2/modules/serve-asks.ts, src/bench/handler.ts, src/bench/government.ts, src/bench/campaign.ts, src/bench/play.mjs (held by the filing-counter builder for the Elections page; ask before editing), src/director/data/situation-types.json, data/english banks through the Words lead.

**Notes.** Filed Nov 16 21:45Z by the thread "Give the first year something to do" on branch claude/project-thread-4sfzbj, minutes before this account's reset. Nothing is built: this item is the finding and the plan. Not checked before the reset: open pull requests for the same work (the Elections page builder's branch may already list "own offices first"), and docs/coordination/OWNER-DECISIONS.md for an earlier ruling on the player volunteering; run look-first before building. Line numbers are from main ca195112.
