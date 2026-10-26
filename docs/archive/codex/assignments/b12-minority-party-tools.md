# Minority-party tools: delay, filibuster, amendments, messaging votes, deals with moderates (bank id b12, phase P4 build; unlocks playing the minority and the computer-run minority)

Verified against origin/main ec9a9601a (Oct 5). Bank spec: docs/codex/specs/bank/b12-minority-party-tools.md.

## What the player experiences

In the minority you cannot pass much alone, but you are not powerless. You slow things with whatever your body's rules allow: demand the full readings, call for a recorded vote, move to send a bill back to committee, stay away to break a quorum where the quorum rule makes that work, or hold the floor in a senate with unlimited debate. Slow a bill long enough and the session ends before it passes. You offer amendments meant to fail, to put the majority on the record. You make deals with majority moderates unhappy with their own leaders. Every tool costs something: colleagues remember, the paper writes it up, voters at home judge it. The majority can answer with a rules vote. Computer-run minorities use the same tools.

## Owner decisions it rests on

- "Minority tools: delay, filibuster where rules allow, amendments, messaging votes, deals with moderates."
- Sept 28 overrule: "Chamber procedure starts as each chamber's real rules and can be changed in game (rules votes, the nuclear option and similar)."
- D-5: computer-run lawmakers amend "to... force a recorded vote."
- Fixed rules: zero dice; nothing blank or placeholder (estimate from similar chambers and mark it); one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (verified on ec9a9601a)

- `src/simulation/congress-rule-pack.ts:404-428`: Senate "cloture" floor stage, three-fifths of senators chosen and sworn (:417), amendment-under-consent notes at :409 and :428; unanimous consent not modeled (:36 header note; spec says :523).
- `src/simulation/governing/legislative-clock.ts:970-976`: PLACEHOLDER, a cloture vote divides by party (passes `true` for the party-line flag on any Congress "cloture" stage). Banned; this is the line to replace. Open research request behind it: `docs/research/requests/how-congress-moves-bills.json` item (6), plus `us-congress-rules-verification` in `docs/research/OPEN-QUESTIONS.md`.
- `governing/chamber-procedure.ts:199 amendmentAccessRule`, `:386 recordChamberRuleChange` (input takes `value: GermanenessSetting | AmendmentAccess` only; `rule` is `ChamberProcedureRuleKey`).
- `governing/amendment-authors.ts:378 planFloorAmendment`, "record" motive for computer-run members.
- `src/simulation/legislation.ts:2214 takeFloorVote`, quorum check ending at :2296 ("cannot transact business"). Councils: `src/simulation/municipal-ordinance-procedure.ts:568` (time between readings), `:592-645` (charter quorum text via `reading.procedure.quorumRule`). Note: that file is in `src/simulation/`, not `governing/`.
- `types.ts:4822 LegislativeActionKind`: 24 kinds, none for tabled, postponed, recommitted, quorum not present or debate extended. `died-on-adjournment` exists (`legislation.ts:678`).
- `governing/chamber-votes.ts:840 decideChamberVote` (one vote engine; callers listed in b08). Absences: `legislative-clock.ts:462,488`.
- `legislature-game-profile.ts` and `legislature-rule-packs.ts` (read/estimated pattern; `:401,:693` "not resolved" notes).
- Dependencies: b08 `presentation/legislative-bargaining.ts` for deals; b09 part 1 for the player's own amendments; b10 for leaders. None of b08, b09, b10 is merged yet.

## Build steps (one PR each, in this order)

1. **Delay rules as data for every body.** Extend rule packs and `legislature-game-profile.ts`: which motions exist (table, postpone, refer back/recommit, demand recorded vote, demand full reading, suspend the rules and its bar), whether debate is unlimited and the cloture bar, quorum (exists). One research table per field, one search per state; Congress from its rules; councils from charters where stated, else estimated from similar bodies and marked. Must NOT: leave a body without a row.
2. **Procedural motions are recorded votes.** Add action kinds (tabled, postponed, recommitted, quorum-not-present, debate-extended) written by `legislation.ts`. Each motion goes through `decideChamberVote` with a procedural purpose; reasons read party cue, own view of the bill, leadership's recorded wishes. A bill pushed past adjournment ends in `died-on-adjournment`.
3. **Filibuster where rules allow.** `Replaces:` the PLACEHOLDER at `legislative-clock.ts:970-976`. Each senator decides cloture from own reasons; a minority member decides whether to hold the floor (`evaluateDecision`: how strongly they hold the question, leadership's request, home opinion, traits). Bodies without unlimited debate never get one. The US Senate is a data row, not a code branch.
4. **Breaking a quorum.** Members decide whether to stay away (player: a choice; computer-run: `evaluateDecision`, including a minority leader's recorded request from b10). The existing quorum check blocks business and records "quorum not present". Compel-attendance rules and absence penalties are rule rows read the same way everywhere.
5. **Messaging votes for the player.** Through b09 part 1 the player offers an amendment meant to fail and demands a recorded vote. The motive stays in the player's own record. No new amendment code.
6. **Deals with moderates.** b08 bargaining across party lines. Add one member reason: recorded strain with their own leaders (relationship strain plus leader wishes they disliked).
7. **Rules changes.** Extend `recordChamberRuleChange` so cloture bar and motion availability can change. A majority leader proposes a change when a rule has blocked their priority on record; the vote goes through `decideChamberVote` at the body's data threshold.
8. **Every tool has a cost.** Each delay writes knowledge for colleagues and the press beat; reactions use existing relationship writers (strain with the majority, gratitude in your caucus); news reaches voters through existing reading habits.

## Must NOT build

An obstruction meter; a filibuster chance; a Senate-only code branch; a second vote engine; a scripted shutdown or standoff; dice; place special cases (state differences are data rows).

## Research tables

Needed per body: motions available, unlimited debate yes/no, cloture bar, quorum-compel and absence-penalty rules. Look first in `data/research/legislative-procedure/` (germaneness rows are the model for citation shape), `data/source/state-legislatures/`, the open items named above. Then ONE search per state, 10 minutes, summary table with source. Never invent a bar or count; estimated rows come from the spread of read chambers and are marked.

## Done when (played-game proof)

- Random state with the player in the minority: the player moves to postpone a measure; the motion's roll call is recorded and the bill dies at adjournment. A US Senate bill backed by 55 senators fails cloture, each senator's reason on record. A quorum walkout stops business where the quorum rule allows it and changes nothing where it does not, same code. A rules vote lowers the cloture bar and a later bill passes. Same save, same result.
- Same flow in a council and a territory/D.C. place.
- Tests: `procedural-motions.test.ts`, `cloture-member-decisions.test.ts`, `quorum-denial.test.ts` (two data rows, one path), `chamber-rule-change-cloture.test.ts`.

## Proof to post

PR comment per step: place and seed, motion roll calls with reasons, the delete list for the PLACEHOLDER, a grep showing no "senate" branch, `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

- No open owner questions. Switches: which motions a body has = a data row of motion kinds per body; the cloture bar and unlimited-debate flag = data rows (default from research; estimated rows marked).
