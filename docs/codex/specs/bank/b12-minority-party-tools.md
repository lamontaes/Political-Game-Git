# Minority-party tools: delay, filibuster, amendments, messaging votes, deals with moderates (bank id b12, phase P4)

## What the player experiences

In the minority you can't pass much on your own, but you aren't powerless. You can slow things down with whatever your body's rules allow: demand the full readings, call for a recorded vote, move to send a bill back to committee, stay away to break a quorum where the quorum rule makes that work, or hold the floor in a senate that allows unlimited debate. Slow a bill long enough and the session ends before it passes. You can offer amendments meant to fail, to put the majority on the record. You can make deals with majority moderates who are unhappy with their own leaders. Every tool costs something: colleagues remember, the paper writes it up, voters at home judge it. The majority can answer by changing the rules with a rules vote. Computer-run minorities use the same tools.

## Owner decisions this rests on

- "Minority tools: delay, filibuster where rules allow, amendments, messaging votes, deals with moderates."
- Sept 28 overrule: "Chamber procedure starts as each chamber's real rules and can be changed in game (rules votes, the nuclear option and similar)."
- D-5: computer-run lawmakers amend "to... force a recorded vote."
- One rule for all states; nothing blank (estimate from similar chambers).

## Existing code it must use

- `src/simulation/congress-rule-pack.ts:404–422` a Senate "cloture" floor stage at three-fifths of senators chosen and sworn, on every Senate bill (`:523` unanimous consent not modeled).
- `src/simulation/governing/legislative-clock.ts:970–976` PLACEHOLDER: a cloture vote divides by party.
- `src/simulation/governing/chamber-procedure.ts:199 amendmentAccessRule`, `:386 recordChamberRuleChange`; only germaneness and amendment access can change (`VALUES` ~`:371`).
- `src/simulation/governing/amendment-authors.ts:378 planFloorAmendment`, "record" motive (messaging amendments) for computer-run members.
- `src/simulation/legislation.ts:2214 takeFloorVote`, quorum check `:2276–2296` ("cannot transact business"); councils `municipal-ordinance-procedure.ts:568` (time between readings), `:592–645` (charter quorum).
- `src/simulation/types.ts:4822 LegislativeActionKind`: no tabled, postponed, recommitted or quorum-failed kinds; `died-on-adjournment` exists.
- `src/simulation/governing/chamber-votes.ts:840 decideChamberVote`; absences at `legislative-clock.ts` ~`:462`, `:488`.
- `src/simulation/legislature-game-profile.ts` (read / estimated pattern) and `legislature-rule-packs.ts`.
- b08 bargaining (`presentation/legislative-bargaining.ts`) for deals; b09 part 1 for the player's own amendments; b10 for leaders.

## What to change

1. **Delay rules as data for every body.** Extend the rule packs and `legislature-game-profile.ts`: which motions exist (table, postpone, refer back or recommit, demand a recorded vote, demand full reading, suspend the rules and its bar), whether debate is unlimited and the cloture bar, and quorum (already data). Quick research table (one search per state, cite); Congress from its rules; councils from charters where stated, else estimated from similar bodies.
2. **Procedural motions are recorded votes.** Add action kinds (tabled, postponed, recommitted, quorum not present, debate extended) written by `legislation.ts`. Each motion is put through `decideChamberVote` with a procedural purpose; members' reasons read their party cue, their own view of the bill and leadership's recorded wishes. A bill pushed past adjournment ends in `died-on-adjournment`; that is why delay matters.
3. **Filibuster where rules allow.** Replace the PLACEHOLDER at `legislative-clock.ts:970`: each senator decides the cloture vote from their own reasons, and a minority member decides whether to hold the floor (`evaluateDecision`: how strongly they hold the question, leadership's request, home opinion, traits). Bodies without unlimited debate never get one; the US Senate is a data row, not a code branch.
4. **Breaking a quorum.** Members decide whether to stay away (player: a choice; computer-run: `evaluateDecision`, including a minority leader's recorded request from b10). The existing quorum check blocks business and records "quorum not present". Where rules let the majority compel attendance, or a state's law penalizes absences, those are rule rows read the same way everywhere.
5. **Messaging votes for the player.** Through b09 part 1 the player can offer an amendment meant to fail, and demand a recorded vote. The motive stays in the player's own record only. No new amendment code.
6. **Deals with moderates.** Use b08 bargaining across party lines. Add one member reason: recorded strain with their own leaders (relationship strain plus the leader's recorded wishes they disliked), so a frustrated moderate is more open. Nothing scripted.
7. **Rules changes.** Extend `recordChamberRuleChange` so the cloture bar and motion availability can change. A majority leader proposes a change when a rule has blocked their priority on record (`evaluateDecision`); the rules vote goes through `decideChamberVote` at the threshold the body's data sets.
8. **Every tool has a cost.** Each delay writes knowledge for colleagues and the press beat; reactions use existing relationship writers (strain with the majority, gratitude in your caucus); the news reaches voters through existing reading habits.

## Must NOT build

An obstruction meter; a filibuster chance; a Senate-only code branch; a second vote engine; a scripted shutdown or standoff; dice; place special cases in code (state differences are data rows).

## Done when (proof in a played game)

Random state with the player in the minority: the player moves to postpone a measure; the motion's roll call is recorded and the bill dies at adjournment. A US Senate bill backed by 55 senators fails cloture, each senator's reason on record. A quorum walkout stops business in a state whose quorum rule allows it and changes nothing in one whose rule doesn't, through the same code. A rules vote lowers the cloture bar and a later bill passes. Same save, same result. Tests: `procedural-motions.test.ts`, `cloture-member-decisions.test.ts`, `quorum-denial.test.ts` (two data rows, one path), `chamber-rule-change-cloture.test.ts`.

## Depends on

b08 (deals), b09 (player amendments), b10 (leaders), Session 21 (vote moment), Session 4 (scenes), Session 13 (seating).

## Open questions for the owner

None.
