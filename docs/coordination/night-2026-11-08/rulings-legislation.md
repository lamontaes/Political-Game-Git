# Legislation: the owner's rulings, checked against main (Nov 8, 2026)

Written Sunday, Nov 8, 2026, about 2:20 a.m. Eastern, for the Legislation session (brief `docs/coordination/night-2026-11-08/legislation.md`). Read-only sweep. Main was `a1124e0e6` (07:05 UTC). That includes the session's own #7369, the bill stage view.

This extends `docs/mocks/2026-11-08-legislation/legislation-record.md` (branch `docs/night-2026-11-08`). It does not repeat that record's quotes in full. Items marked **NEW** are rulings the record lacks.

**How to read it.** A quote in "double quotes" is his exact words. "Recorded" means the CTO's or the register's record of his choice, not his own words. OD is `docs/coordination/OWNER-DECISIONS.md` on main, by line. REG is `DECISION-REGISTER.md`. S26 is the Oct 26 sitting log, `cto-notes/playtest/2026-10-26-1.md`. File and line refer to main unless noted. `legislature.ts` means `src/core2/modules/legislature.ts`.

**Sources read.** OD in full, by section. REG lines 195-300, 384-420, 920-1036. `docs/play-first/LAW.md`. `docs/packages/M3-legislating.md` and `office-play.md`. `docs/coordination/prior-rulings/laws-and-money.md` and `justice-officials-population.md`. Every file in `docs/coordination/voice-notes/` (main and the night branch). `docs/coordination/playtest/` (Oct 26 to 28). `rulings-nov8.md`. `cto-notes/menus/RULINGS-nov5.md`. The memory files that name bills, Congress, councils, governors, mayors or vetoes.

**Code read.** `legislature.ts`, `executive.ts`, `leadership.ts`, `meetings.ts`, `world-legislating.ts`, `office-day.ts`, `src/core2/office-day-{calendar,state,federal,federal-president}.ts`, `state-session-calendar.ts`, `src/bench/{legislature,office,bill-stage,calendar,handler,dev-api}.ts`, `src/bench/play.mjs`, `src/bench/ui/{bill-paper,draft-card,meeting-item}.mjs`.

---

## The short version

- The engine already does most of a bill's life at every level: committees with chairs who hear or bury, witnesses, markup trades, poison pills, the sponsor's asks the night before, every member's reasons, tie rules, Senate cloture, the desk with real signing windows, line-item vetoes, overrides, pork, carrying a bill, outside states as results only.
- What is missing is mostly what the player can reach and see. There are no state or Congress floor screens. The desk is three buttons. Drafting is one dropdown. The player shows exact whip numbers he ruled out. The player can't vote on an override or offer an amendment. No page follows a bill.
- Three engine gaps matter most. (1) Nothing stops the player for a vote they could decide, so the character votes for them at the state and federal level. (2) An override happens the moment the veto lands, with one two-thirds share for every state. (3) The second chamber votes the same day as the first, with no conference.

---

## 1. Not done (most important first)

**N1. The player's own vote at the state legislature and in Congress.**

- Oct 13 (OD:682, recorded with his words): "you should be able to cast your vote"; "the engine never votes for the player".
- Oct 26 (S26): "Yeah, it says I voted for HR2. When? How? Who else?"
- Oct 29 (OD:258, recorded): "What stops you in office: your own bills, any vote where yours could decide it, your desk, and scenes, by default; you can customize it."
- **NEW** Oct 29 (OD:238): "Why not federal legislator and president? Again, these all use the same engine. It shouldn't be that hard."
- **NEW** Oct 14 (OD:713, recorded): "Congress is in early access. Same engines as every other level."
- **Main:** not done. `play.mjs:579-580` opens a screen only for `office-day.meeting` (town and county) and `office-day.desk`. Federal `floor-vote` and `whip-ask` stops default to off (`office-day-federal.ts:101-102`). A state floor session has no stop kind at all (`office-day-state.ts:502-510`). No stop kind exists for "a vote where yours could decide it" (`office-day.ts:87-92` has only own bill, every meeting, desk). With no stop, `ownVote` casts the character's vote (`office-day.ts:625-653`). So a state legislator or member of Congress still has votes cast for them, with no screen.
- **Do:** add a "close vote" stop kind, on by default at every level. Give the state and federal floor holds the floor-vote mock screen (the same screen the council uses). The journal line names the bill, the day and how the body voted.

**N2. No exact count before a vote: what members told you, plus an aide's estimate.**

- Oct 29 (OD:257, recorded): "Before a vote you see what colleagues told you plus your aide's estimate, marked as an estimate that can be wrong. No exact count."
- **Main:** not done. The bill paper and Your office print each chamber's exact count: "N for, N against, N undecided" (`play.mjs:2288-2291` and `2417-2421`). It comes from `whipCount` (`legislature.ts:5869`), which reads every member's true position. #7369 added `told` from learned stakes (`src/bench/bill-stage.ts:119`). No screen reads it yet, and there is no aide's estimate record.
- **Do:** take the whip numbers off every player screen. Show `told` per member in words. Add an aide's estimate as a record, worked from what the aide could know and marked as an estimate.

**N3. The override: its own vote, the player's vote in it, each state's real share.**

- Sept 26 (memory `project-history-and-context`): the sequence hearing → amendment → passage → veto → override "feels like a real game".
- Oct 14 (OD:685, recorded): the executive "signs or vetoes everywhere (owner: "all of them")".
- **NEW** Sept 28 (prior-rulings `laws-and-money.md` item 17, recorded): "Sept 28 overrule: chamber procedure starts as each chamber's real rules and can be changed in game."
- **Main:** not done for the player. `decideAtDesk` runs `overrideVote` in the same call as the veto, the same day (`legislature.ts:4884-4895`). The player abstains unless a choice keyed `billId|player|override` exists (`legislature.ts:5065-5075`). Nothing writes that key: `castMemberVote` writes only `billId|member` (`legislature.ts:5187-5198`). Every governor and Congress use one `vetoOverrideShare`. Only mayors read their state's rule (`mayor-veto-2026.json`). The 51-place research (`docs/research/veto-research-51.json`) is unused.
- **Do:** put the override on the body's next sitting as its own item. Let the player cast it from the override mock. Read each state's override share from the research.

**N4. Amendments the player offers and votes on, as strike and insert.**

- Sept 21 (REG:420): "The same compatible policy components produce initial law, new proposals, amendments and repeal".
- Oct 14 (OD:761, recorded): "a member may trade a vote for support of an amendment, add a poison-pill amendment, or ask a favor through the deals engine."
- Oct 14 (OD:806, recorded): "a tense floor vote where the goal is to convince one member to vote no on the amendment".
- **Main:** not done for the player. `floorAmendments` (`legislature.ts:4220`) adds sections for other members (trades and poison pills). It leaves the player out of the roll (`4229`). It only adds, never strikes or replaces. The amendment itself gets no roll call; it is adopted when it raises support. `reviseBill` (`2469`) can add, replace or strike, but only on a draft, and no screen calls it.
- **Do:** make an amendment its own record: mover, strike and insert, its own estimate, its own vote by name. Any member may offer one, the player included.

**N5. Writing the bill on paper, every term clickable.**

- Sept 25 (REG:422), Oct 14 (OD:743, 763), Oct 26 (S26): already in the record.
- **Main:** not done. Drafting is `draftCard` (`src/bench/ui/draft-card.mjs:13`): one dropdown, one amount box, one section per bill. Multi-section bills, phase-ins (`seatAct` takes `steps`) and `reviseBill` exist in the engine, but no screen reaches them.
- **Do:** build the writing mock on `billForm`, `composeBill` and `reviseBill`. Each lit term opens only what that part can do.

**N6. Following a bill at another level.**

- Oct 26 (S26) "When? How? Who else?"; Nov 5 (OD:14); Oct 29 "they need to be tied to places": all in the record.
- **NEW** Oct 12 (memory `political-process-is-the-systems-model`): "I'm not reinventing the wheel here. Look at the political process, the game, and I'm just adding more visually to it."
- **Main:** not done. A bill shows up only after it is law: Issues, then the law, then "enacted by", then the bill paper (`play.mjs` around 4395-4420). No page shows a bill still moving in the player's state legislature or Congress. No line says how the player's own member voted.
- **Do:** a follow page read from `billStage`, for the player's own state and Congress. Another state's bill gets the result, with detail built on demand (Nov 5).

**N7. Every vote and name opens its card; no wall of names.**

- **NEW** Nov 7, about 2:45 p.m. (R36, verbatim): "none of this stuff on here allows me to click and view information about the bill or the person." The CTO's note under it: "For the game: every person, bill and vote on any menu opens its card or page."
- **NEW** Nov 7 (R55, Government): "These are acceptable." Approved: "every name and vote opening its card."
- **Main:** not done on bill screens. The bill paper joins every roll call into one plain string (`play.mjs:2296`), 535 names for Congress.
- **Do:** the result in numbers and words. Names grouped by vote, each opening its card (the floor-vote mock).

**N8. Co-sponsors.**

- Oct 29 (OD:260): in the record.
- **Main:** not done. `BillRow` has no cosponsors (`legislature.ts:189-271`), and nothing in the bench mentions them.
- **Do:** cosponsors as promises, firm or vague, that can be broken. They go on the bill and on the member's record.

**N9. The governor's and mayor's budget stops the player by default.**

- **NEW** Oct 29 (OD:245): "Your character sends the budget without you" (objecting). Recorded: "the budget is a desk stop by default."
- **NEW** Oct 5 (prior-rulings `laws-and-money.md` item 8, snippet): "a governor 'priority' that only reorders budget options is not acceptable. It must drive what the desk opens or be deleted."
- **Main:** done for the President (`budget-request` stops by default, `office-day-federal.ts:104`). Not done for a governor: the `budget-proposal` entry has no stop kind (`office-day-state.ts:502-510`, `809-830`), so the character proposes it. Not done for a mayor: `budgetDesk` returns null when the player holds the office. Its comment says "a desk for it is a separate piece of work."
- **Do:** a budget stop, on by default, for governor and mayor, opening the approved Budgets screen.

**N10. The second chamber on its own day, and the two chambers settling differences.**

- **NEW** Oct 14 (OD:749, recorded): "Legislatures meet on their calendar. Bills are heard and voted across the session days the state's calendar gives (#4173), never all on one day."
- **NEW** Oct 14 (OD:746, recorded): "Why, every time." A list of defects "until the record answers why," including "a legislature passing its whole year on one day".
- **Main:** not done. A bill's later chamber votes the same floor day as the first (stopgap `SG-GOV-later-chamber-same-day`, `legislature.ts:575-580`). There is no conference or second-chamber committee day.
- **Do:** send a passed bill to the other chamber's next floor week, with its own committee. A changed bill goes back (or to conference, where the body has one).

**N11. Citations open the game's own page for that law.**

- Oct 26 (S26, OD:522): in the record.
- **Main:** not done. The estimate prints "amends <statute>" as plain text (`play.mjs:2199`).
- **Do:** make the citation a link to the Issues law page for that series.

**N12. Chamber rules a body can change by vote (the nuclear option).**

- **NEW** Sept 28 (M3-legislating.md, recorded): "Real chamber rules, changeable in play, including the nuclear option (Sept 28)."
- **Main:** not done. Cloture is one fixed share (`senateClotureShare`, `legislature.ts:4615-4622`). No vote changes a rule.
- **Do:** file a pool item; this comes after the seven screens.

**N13. Bill monikers.**

- Oct 14 (OD:770) and Oct 15 (OD:867, 909): in the record.
- **Main:** not done. No moniker field or reader exists.
- **Do:** leave the name engine-written for now (see conflict C2). Words gives the press and scenes the moniker.

---

## 2. Partly done

**P1. Bodies meet when real bodies meet.**

- Oct 26 (S26): "nor should any body only vote yearly unless that's what it specifically says." In the record.
- **NEW** Oct 29 (OD:244, recorded): "The vote is not locked to 6 PM. Every town body meets at one tunable evening hour today (`office-day-calendar.ts` line 100); each body's real day and hour come from data."
- **NEW** Sept 23 (prior-rulings item 20, read): "All 50 states send bills with the full chain of decisions, each on its own independent calendar."
- **Main:** state sessions come from the table (`state-session-calendar.ts`). Congress comes from `congress-sessions.json`. The floor sits weekly through the session. Bills drafted after a session opens are taken up, the player's included (`world-legislating.ts:11-16`). That is the Oct 26 H.R. 1 bug, fixed in code but not proven in play. Town and county bodies get a real interval by size band. But every body meets on one weekday at one hour (`office-day-calendar.ts:97-100`). The second chamber votes the same day (N10).
- **Do:** read a body's own day and hour where its records have them. Prove that a player's bill reaches a vote at a state legislature and in Congress (place, seed, dates).

**P2. A fiscal note on every bill, at every level.**

- Sept 26 (REG:243): in the record.
- **NEW** Oct 6 (prior-rulings `laws-and-money.md` item 9, snippet): "Economy visibility scales with office." The same doc: "as a legislator, the state budget and the cost of every state bill".
- **Main:** `costOf` (`legislature.ts:1626-1650`) costs only minimum-wage bills. Every other bill shows today against proposed (`play.mjs:2192-2226`) with no cost or revenue.
- **Do:** estimate every section from what the law effects read (a tax is rate times base). The clerk or budget office signs it, and it recalculates as terms change.

**P3. Committee: referral, hearing, markup, the vote by name.**

- Oct 12 (M3) and Oct 14 (OD:743): in the record.
- **NEW** Oct 20 (OD:627, recorded): "A new minority-party member's bill (#5141): it can reach the floor the normal way, if it gets through committee."
- **NEW** Sept 17 rule, restated in M3 (recorded): "Committee seats, chairs and leadership are earned through relationships and seniority, not points."
- **Main:** the engine does it. `committeeStage` (`legislature.ts:3921`) refers a bill by subject. The chair hears or buries it by position and temperament (`chairHearsBill`, `3626`). Witnesses carry their stakes. The committee votes by member. Markup trades are recorded (deal stage `committee`). Rosters come from `leadership.ts` (`organize`, `332`). #7369's `billStage` exposes all of it. No screen shows it, and members' questions to witnesses are not recorded.
- **Do:** the committee mock screen. Add each member's question as a record so the minutes can show it.

**P4. The executive's desk at every level.**

- Oct 14 (OD:685, 696): in the record.
- **NEW** the same line, OD:685 (recorded): "The executive proposes where the place's charter or constitution allows it (data)".
- **Main:** `decideAtDesk` (`legislature.ts:4864`) covers a mayor, county executive, governor and President. It uses each state's signing window (Book of the States) and the President's ten days, Sundays excepted (`5657-5700`). A mayor's veto follows state law. `proposeAsExecutive` exists (`3353`), and so does the item veto (`executiveItemVeto`, `5221`, stopgap). The screen is the side panel's Sign, Veto and own-choice buttons (`play.mjs:722`). It has no reasons, no veto message and no item veto. There is no pocket veto: doing nothing always becomes law (`5663`).
- **Do:** the desk mock. Record a veto message. Put the item veto on the governor's desk. Add the pocket veto where the law has it.

**P5. Bargaining and asking before the roll.**

- Oct 26 (S26), Oct 14 (OD:806), Sept 28 (no "you owe her" menu): in the record.
- **NEW** Oct 19 (OD:904, recorded): "Say why. A plea gives its stake ... a bargain names the trade ("this is a two-way street", "I'll need your vote on my bill")".
- **NEW** Oct 19 (OD:941, recorded): ""Why?" is always there when someone asks something of you (the floor switch had no "Why?")."
- **NEW** Oct 19 (OD:1016, recorded): ""can't afford a yes" sounds like a bribe and should be a real trade from the district's interests (its industries, its employers)."
- **Main:** in the engine. The sponsor asks the soft members the evening before (`askBeforeTheRoll`, `legislature.ts:552`). Members trade (`offerDeal`, `3399`). Replies in scenes move positions (`keepReply`, `405`). A yes the player gives becomes their vote until they change it (`438-447`). The player reaches only the town meeting and Your office's deal button. State and federal asks have no screen.
- **Do:** "Talk to her" on the vote screens opens Story's ask scene. Story owns the words.

**P6. Choosing what stops you, and voting one by one, in batches, or by standing instructions.**

- Sept 22 (M3): in the record.
- **NEW** Oct 14 (OD:754, recorded): "The player chooses what stops them; the important few stop by default, everything else runs in the background and still counts. Any act of office can be done or simulated".
- **Main:** the engine keeps stop settings (`office-day.ts:87-104`). No route or screen sets them (none in `src/bench/handler.ts`). The meeting takes items one at a time, with an own-choice button.
- **Do:** a small "What stops me" panel in Your office, then batch and standing votes later.

**P7. Leadership, chairs, whips and party pressure.**

- **NEW** Sept 23 (prior-rulings item 20, read): "Legislators, including in Congress, want laws for intrinsic reasons; a party does not decide for its members (D-093)."
- **NEW** Oct 14 (`office-play.md`, the owner's package, recorded): the state day has "caucus and leadership"; the federal day has "committees and subcommittees; the whip".
- **NEW** Oct 15 (OD:846, recorded): the opening's key people include "the most powerful person in each chamber".
- **Main:** `leadership.ts` has each body elect its presiding officer and caucus leaders, and assigns committees by rating, with no points. Officials carry party, wing, ambition and press terms in their reasons (`legislature.ts:284-291`). The federal whip asks (`office-day-federal.ts:317-352`, its stop off by default). The player may stand for a post (`standForPost`, `leadership.ts:658`), but no screen offers it.
- **Do:** name the chair, leaders and whip on the committee and floor screens. Standing for a post can wait.

**P8. The player's Calendar shows their own body.**

- Oct 26 (S26): "I've already made my gripes with the calendar known." In the record.
- **NEW** Oct 27 (OD, screens rulings, recorded): "the player's own deadlines first".
- **Main:** the Calendar lists only the town and county bodies' next meetings (`src/bench/calendar.ts:175-200`). It has no state or federal session days, no floor date for the player's bills and no committee days.
- **Do:** add the player's own bodies' sittings and their bills' dates. The Calendar session owns the look.

**P9. Executive acts beyond the desk.**

- Oct 14 (OD:696): "appointments, the budget, vetoes, emergency decisions". In the record.
- **NEW** Oct 14 (`office-play.md`, recorded): the governor's "appointments, executive orders, budget proposal, line-item veto where the state has it, emergencies and the Guard, clemency". The President's "cabinet and nominations with confirmation, executive orders, the budget request".
- **Main:** engines exist: `appoint` (`executive.ts:563`), `issueOrder` (`1117`), `declareEmergency` (`1197`), clemency, and the President's day (`office-day-federal-president.ts`). On screen there are only town department heads (Your office) and the desk.
- **Do:** Legislation owns the desk only. Flag executive orders, nominations and emergencies to the coordinator as a separate screen job.

**P10. Real bill numbers.**

- **NEW** Sept 27 (REG:197): bills "numbered as in real life, with the first bill of a session being HB 1 of 2026, "or whatever it's called in that jurisdiction."" Sept 27 (REG:1036): each state starts "at that recorded number".
- **Main:** done for states and Congress (`numberAndForm`, `legislature.ts:1591`). Every town shares one national ordinance numbering (stopgap `SG-GOV-local-bill-numbering`, `1598`).
- **Do:** low priority. Read local numbering where the place's records have it.

**P11. Every law reversible, at every level.**

- Nov 7 (memory `laws-reversible-nov7`): "And these should all be able to be reversed as well." In the record.
- **Main:** the state and local tiers can repeal. The Nov 7 check found Congress can act on 1 policy question and about 10 money lines, so it can't repeal the federal Medicaid work requirement.
- **Do:** Laws and effects owns which policies Congress has. Legislation makes sure the writing screen offers repeal wherever a law row exists.

---

## 3. Done on main (keep; don't rebuild)

- **The game never casts the player's ballot at the roll.** Oct 13 (OD:682). With no choice, the player abstains (`legislature.ts:3768-3779`; override `5070-5075`). But see C1: `ownVote` fills the choice first.
- **Each member votes for their own reasons, no dice.** Sept 27 (prior-rulings item 18, read): "Legislators vote for reasons ... Never coin flips." See `MemberPosition` (`legislature.ts:273-312`).
- **Every recorded vote keeps which sections were on the table.** **NEW** Sept 28 (prior-rulings item 17, recorded, D-5): "Every recorded vote keeps exactly which provisions were on the table." Vote rows hold the position and the trades, and `recordVote` runs per section (`legislature.ts:3796-3830`).
- **No caps on how many bills pass.** **NEW** Oct 13 (memory `owner-rulings-oct13`): "State legislatures are only passing three bills? ... where are these dumbass caps?" `world-legislating.ts:24`: "No count of bills is set anywhere".
- **Quorum is not a mechanic.** **NEW** Oct 29 (OD:247): "It should always make quorum... relatively irrelevant, aside from maybe some dialogue every now and then." There is no quorum code.
- **Ties broken only as the law says.** **NEW** Oct 9 (M3, recorded): "Lotteries only where the law requires." See `tieBreaker` (`legislature.ts:2822`): the Vice President, or a lieutenant governor where state law gives the vote.
- **One engine for every level.** **NEW** Sept 30 (memory `level-generic-engines`): "A legislative engine should work for all three levels of government. An executive engine should work for all three levels." Done: one `legislature.ts`, one `executive.ts`.
- **The city attorney warns on disputed authority; a level can't pass what it has no power over.** **NEW** Sept 22 to 24 (M3, recorded): "the city attorney warns you when the authority is disputed." See `authorityFor` (`legislature.ts:1513`), `beyondPower`, `disputedWarning` (`src/bench/legislature.ts:328`).
- **Carrying a bill only for someone who matters.** **NEW** Oct 16 (OD:989): "sure, I guess" and "only if they're important." See `askToCarry` (`legislature.ts:3163`).
- **Pork and poison pills in the background.** Oct 26 (S26) and Sept 28: in the record. See `requestProject` (`2210`) and `movesPill` (`4412`).
- **Other states keep only results; detail is built on demand.** Nov 5 (OD:14). See `openOutsideSession` (`world-legislating.ts:1079`), stopgap `SG-GOV-outside-session-result-only`.
- **Laws work federally, and all 50 states sit.** **NEW** Oct 29 (OD:246): "No, laws need to work federally. Other states and towns never sit. No, all 50 states need to." States sit (#7290). Congress's policy list belongs to Laws and effects (P11).
- **A bill reads as a real bill.** Oct 14 (OD:743, 763): `billForm`, `composeBill`, each body's enacting clause.
- **The paper prints what a body did, not that it sat.** **NEW** Nov 1 (OD:123, a CTO ruling under his words): "a sitting prints as a story only when the body took something up (a bill, a vote, a hearing)". Done in `press.ts` (Words).

---

## 4. New rulings the session should hold in mind (no code needed yet)

- **NEW** Oct 29 (OD:197): "City council is, you know, whatever the equivalent is." The CTO's ruling under it: an unincorporated place's "city council" is the county board (OD:198). Name the body the way the place does. Nov 1 (OD:67): "What do you mean, whatever the board? Do you mean city council? ... I'm in Northampton, Massachusetts."
- **NEW** Oct 29 (OD:239): "The player only runs for city council, state legislator, mayor, governor, Congress, and president." These are the seats the seven screens must serve.
- **NEW** Oct 19 (OD:958, recorded): "a governor on the phone is "the governor", not "the executive"." Bill screens name the office ("the mayor's desk"), never "the executive".
- **NEW** Oct 14 (OD:745, recorded): "A legislative vote shows each member's reasons" in dev mode. The positions are on every vote row, so Dev Mode can show them.
- **NEW** Oct 14 (OD:731, recorded): "One elected seat and one appointed post at once: the law of the place decides".
- **NEW** Sept 26 (REG:281, recorded): "Bills keep advancing and are negotiated, but the simulation resolves them from the members' saved positions, stakes and relationships instead of playing each member's day."
- **NEW** Sept 22 (REG:992, recorded): the outside observer "learns what actually becomes public through news, announcements, published records". A follow page shows what is public, not a member's private lean.
- **NEW** Sept 26 (REG:227): "As governor or president the player sets priorities and lives with the results, with advice from staff; going line by line, or anything in between, is optional depth."

---

## 5. Conflicts, and which is newer

**C1. Who casts the player's vote.**

- Oct 13 (OD:682): "the engine never votes for the player."
- Oct 14 (OD:754, newer): "Any act of office can be done or simulated."
- Oct 26 (S26) complains the game cast his House vote. Oct 29 (OD:258, newest) sets what stops by default, including "any vote where yours could decide it."
- The code does both. The player abstains at the roll, but `ownVote` casts the character's vote first when the player didn't stop.
- **Reading:** the character may vote, but a close vote stops by default (N1), and the record says which vote, when and who else.

**C2. The bill's name.**

- Oct 14: the player edits only the terms.
- Oct 26: "you can't change the bill name or anything."
- Oct 15: "A bill has a real name, not a description."
- The record and the mocks README already flag this. Newer is Oct 26, but the README says treat the name as engine-written until he rules.

**C3. How a chamber's makeup shows.**

- Oct 29, 22:10 (OD:221): "a half-circle seat chart of party-colored dots".
- Nov 5 to 7 (LAW.md:14, newer): "no bars; data shows as numbers and words". Government approved Nov 7 with "seats as big party-color numbers".
- **Newer wins:** numbers and words, no dot chart.

**C4. "How they feel about you" on a member card.**

- Oct 29, 22:10 (OD:222) offered it.
- Oct 29, 23:00 (OD:190, newer): "No scale like that." It supersedes the 22:10 line.
- **Reading:** "Who's with me" shows what a member told you, in words. Never a meter, dot or band.

**C5. The override share.**

- The code comment and the CTO's Oct 14 default: "two thirds" (`legislature.ts:4885-4886`, `5205`).
- The owner's Sept 28 overrule: each chamber's "real rules."
- **The owner's ruling wins** over the CTO's default (N3).

**C6. How much detail other legislatures keep.**

- Sept 23: "All 50 states send bills with the full chain of decisions".
- Sept 26 (REG:281): other councils' members each vote "from their own saved record".
- Nov 5 (OD:14, newest): "keep only the result ... no filing, per-member vote, event or reason rows; the player's own state and Congress keep full records."
- **Newer wins.** The code follows it for other states.

**C7. Party or principle in votes (open, the owner's call).**

- D-093 (Sept 23): "a party does not decide for its members."
- The CTO, Sept 29: calibrate party against real roll calls (prior-rulings, Conflict 1).
- The code gives officials a party term among their reasons. Don't change it without the owner.

---

## 6. Order for the session, from the above

1. Engine pieces first: the close-vote stop (N1), the override as its own sitting with the player's vote and real shares (N3), amendments as records with their own vote (N4), the second chamber on its own day (N10), the aide's estimate (N2), cosponsors (N8).
2. Then the screens, to the seven mocks: floor (N1, N2, N7), committee (P3), amendment (N4), desk (P4, N9), override (N3), writing (N5, N11, P2), following (N6).
3. Prove each one at a town council, a county board, a state legislature and Congress, with place and seed, through Dev Mode as it lands.
