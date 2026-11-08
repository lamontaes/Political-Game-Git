You are Legislation for lamontaes/Political-Game-Git: how a bill moves at every level, the engine and the screens. Common rules: `docs/coordination/night-2026-11-08/README.md` ("Rules for every session"); read it first.

## Read first (added Nov 8, 2:55 a.m.)

`rulings-legislation.md` in this folder extends `legislation-record.md` with rulings the record lacked and checks every one against main (a1124e0e6, with your #7369): seven conflicts and which ruling is newer, then an order of work. The engine already covers most of a bill's life at every level (committees, markup, poison pills, the sponsor's asks, members' reasons, ties, cloture, the desk's real signing windows, item veto); what's missing is mostly what the player can reach and see. In order:

1. **The player's own vote at the state legislature and in Congress.** Only the town meeting and the desk open (`src/bench/play.mjs` around lines 579 to 580); federal floor and whip stops are off by default (`office-day-federal.ts` around lines 101 to 102); state floor days have no stop kind; and `ownVote` (`office-day.ts` around line 625) casts the character's vote with no screen, against Oct 29 ("any vote where yours could decide it").
2. **Two shown items break his rulings:** the bill paper and Your office show exact for, against and undecided counts (`play.mjs` around lines 2288 and 2417; Oct 29: no exact count, what members have told you instead), and the bill paper prints every roll call as one string of plain names (around line 2296; Nov 7: click and view the bill or the person).
3. **Engine gaps:** the override runs at the same moment as the veto with no player vote and one two-thirds share for every state (the 51-place research sits unused); amendments are added automatically with no roll call and none offered by the player; the second chamber votes the same day as the first, with no conference (`SG-GOV-later-chamber-same-day`); no cosponsors; a governor's budget proposal never stops the player (Oct 29).
4. **Then the seven screens** to the mocks, without subtexts.
5. **Later, executive actions:** executive orders, nominations and emergencies have engines but no screens; build them in the same look after 1 to 4. If that is too much for one session, the coordinator splits it off.

Congress acting on more than about one policy question belongs to Laws and effects; coordinate through the coordinator.

## The owner's words

- Nov 7: "i want to do legislation first" and "i have already described legislation multiple times." Every description he gave, quoted with dates, is in `docs/mocks/2026-11-08-legislation/legislation-record.md` (Sept 21 to Nov 7; the core ones are Sept 25 REG:422, Oct 14 OD:743 and OD:695, and three Oct 26 sitting quotes). Read it before anything else.
- Nov 8: he conditionally approved the seven legislation mocks (`docs/mocks/2026-11-08-legislation/`): writing the bill, committee, amendment, floor vote, the executive's desk, override, and following a bill. Build to them.
- Nov 8: "I'm completely fine with starting stuff underneath."
- Oct 26: "nor should any body only vote yearly unless that's what it specifically says... people need to be like bargaining." Oct 29: no exact vote count shown before a vote; what each member has told you instead.
- Nov 8: think "at every playable level of the game, local, state, federal, executive, and legislative."

## Found on main (Nov 8)

- Writing a bill in play is one dropdown, one number box and a Draft button (Your office, Drafts). The bill paper prints every member's vote as one paragraph (535 names for Congress) with blank chamber names. Committee, amendments, the state and federal floor and veto overrides have no screen; a member of Congress has their vote cast for them (Oct 26 sitting). The council meeting and the executive's desk are a side panel of seven stacked buttons with green and red tally bars. (Nov 7 audit, `docs/mocks/2026-11-08-legislation/README.md` quotes the rows.)
- The engine has more than the screens show: `src/core2/modules/legislature.ts` (about 6,000 lines) has `draftBill`, `reviseBill`, `castMemberVote`, `holdVote`, `executiveDecision`, committee rosters (`registerCommitteeRosterProvider`), budget hearings, `memberPosition`, bodies for every level including both chambers of Congress.
- The Dev Mode session (CTO's account, `devmode/`) is adding dev controls tonight that call these same functions from the game's screens (introduce at any body, pass at a chosen margin, sign, veto, override). Coordinate through the coordinator; never duplicate a control.

## Done when, each shown in a played game at a town council, a county board, a state legislature and Congress (through dev mode as it lands), with place, seed and screenshots

1. **Writing a bill** is the bill on paper as the mock shows: subjects for getting around, the typed bill as the workspace, every changeable term lit, a term opens only what that part can do, a staff redraft shown as strike and insert, the clerk's or budget office's estimate recalculating, and "who's with me" from what members have actually told you.
2. **Committee**: referral, a hearing with witnesses as minutes, markup, and the committee's vote by name.
3. **Amendments** as strike and insert with their own estimate and vote.
4. **The floor**: what each member has told you, your vote, the result in numbers and words with each name; members bargain and are asked before the roll.
5. **The executive's desk**: sign or veto with reasons, and the **override** vote.
6. **Following a bill** at another level (your state legislature, Congress): where it is, how your members voted, what it means for your place.
7. Bodies meet when real bodies meet (sessions, calendars), never once a year unless the law says so, and the player's own seat at every level can do all of the above.

Build the engine pieces each screen needs first (what members have told you, stages, amendments, overrides at every level), then the screens to the mocks with the shared look (`MENU-LOOK.md`, `ui/strips.mjs`).

## Files

Yours: `src/core2/modules/legislature.ts` and what it calls for stages, members' positions and votes; the bill screens in `src/bench` (new files of your own where you can, for example `src/bench/ui/bill-*.mjs`; mount them in `play.mjs` with small edits and merge main often, because the Fixer builds other menus there). Laws and effects owns what a law does once enacted and which policies exist; Story owns the scenes around a bill (asks, hallway bargains, the press); Dev Mode owns the dev controls.

Keep going until 1 to 7 hold on main; report what you proved and what you left open.
