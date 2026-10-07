# Committee seats, chairs and leadership races (bank id b10, phase P4 build, in 1.0; unlocks chair power and the party-leadership path)

Verified against origin/main ec9a9601a (Oct 5). Bank spec: docs/codex/specs/bank/b10-committees-chairs-leadership.md.

## What the player experiences

When you reach the statehouse or Congress you are not dealt onto committees. You tell your party's leaders which ones you want, and whoever hands them out in your chamber decides from what they know of you: how long you have served, who vouches for you, how you vote with the party, what your district needs, what you owe each other. Chairs usually go to long-serving majority members, but not always. You can run for whip, floor leader or Speaker by asking colleagues one at a time. They decide from their ties to you and your rivals, your principles and what they think you will do for them. People remember who backed whom. A chair has real power: where the rules allow, a bill the chair will not hear dies. On a council, the president or mayor pro tem is chosen the same way where the charter has the council choose.

## Owner decisions it rests on

- "Legislature: committee seats, chairs and leadership races earned via relationships and seniority." (in 1.0)
- Sept 28 overrule: "Chamber procedure starts as each chamber's real rules and can be changed in game."
- Register (Sept 22): "Party office and committee progression remain in already-approved leadership scope"; party leadership and public authority stay distinct.
- D-9: power at the start is built by running the same hiring and favor rules over the past as in play.
- Fixed rules: zero dice; nothing blank or placeholder (estimate from similar chambers and mark it); one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (verified on ec9a9601a)

- `src/simulation/governing/committee-assignment.ts:31 committeeRosters` (round-robin by seniority via `:108 seatingOrder`, stores nothing), `:64 committeeRoster`, `:91 committeesForPerson`. Callers: `governing/legislative-clock.ts:849` and `:1454`, `presentation/legislation-session.ts:263`, `presentation/legislative-office-context.ts:244`. Keep the signatures; the body reads records.
- `src/simulation/governing/presiding-officers.ts:64 electPresidingOfficer`: caucus nomination then floor ballot through `castBallots`. Banned hand-set line: `:45-46 CAUCUS_CANDIDATES = 5` (marked PLACEHOLDER, used at :95) and the GAME ASSUMPTION note near :30. Caller: `governing/office-continuity.ts:55` import (called ~:1087).
- `src/simulation/governing/joint-assembly.ts:248 castBallots`: reasons own caucus, seniority, relationship/strain (strain reason at :182), principles. Add the owed-commitment reason here.
- `src/simulation/legislature-game-profile.ts`: read / generated-from-spread / unknown pattern for the 42 states not read. `legislature-rule-packs.ts:182` has KY House Rule 37 (Committee on Committees) as source text only; :401 and :693 say whether a chair may decline a bill is "not resolved".
- `governing/chamber-votes.ts:1065 committeeRecommendation` (private function, used at :780); `legislation.ts:265,372,1968` handle `committee-not-reported`. The unheard-bill ending exists; nothing writes it from a chair's choice.
- `living-world/local-council-meetings.ts:510 localCouncilChair`: mayor, else first officer found. Replace with the charter's rule.
- `favors.ts:82 recordFavor` (an appointment is a favor). b08 commitments: `legislative-politics.ts:555 recordLegislativeCommitment`.
- Missing entirely: committee chairs, majority/minority leaders, whips, party ratios on committees, member committee requests.
- Research already queued: `docs/research/OPEN-QUESTIONS.md` question `legislative-committees-and-assignment-by-chamber` (line ~389, P1, still open). Read it before searching.

## Build steps (one PR each, in this order)

1. **Leadership rules as data for every chamber.** Extend `legislature-game-profile.ts` (same read/estimated pattern): who assigns committees (Speaker, committee on committees, caucus, Senate president), who picks chairs, which posts exist, the party-ratio rule, whether a chair may decline a bill, how much seniority custom counts (an importance level, not a number). One research table per field. Congress from its rules; territories and D.C. estimated from similar chambers and marked. Councils from `municipal-rule-registry` where stated, else estimated by form of government. Must NOT: leave any chamber without a row.
2. **One `electChamberLeader(post)`.** Generalize `electPresidingOfficer` for every post in the data, held on the organizing day from the session calendar. Members declare through `evaluateDecision` (ambition-related traits, seniority, relationships, standing). The player may declare, then canvass colleagues in Session 4 scenes; asks and promises are b08 commitments. Add the owed-commitment reason to `castBallots`. `Replaces:` `CAUCUS_CANDIDATES` and the "which no screen offers yet" refusal for the player.
3. **Committee requests and assignment.** Each member records preferences (computer-run: district economy plus own work and history; player: a short conversation with the assigner). The assigner decides seat by seat through `evaluateDecision`: seniority, party ratio, relationship, party-line voting from roll calls, favors owed, district fit. One assignment record per member per committee with reasons. `Replaces:` the round-robin in `committeeRosters` and `seatingOrder`.
4. **Chairs.** Chosen by the authority from part 1 out of the committee's majority members. Recorded. The chair sits at the head of the committee-room scene.
5. **Chair power.** Where the data lets a chair decline, the chair decides each referred bill (own view of it, tie to the sponsor, leadership's recorded wishes). Unheard ends as `committee-not-reported` or dies at adjournment. Where a chamber discharges by petition or rule, read that row.
6. **Screens get data only.** Your office lists committees, chairs and leaders with who decided and why. Sessions 3 and 14 own the screens.

## Must NOT build

Random or list-order assignment; an influence score; a hard seniority rule where the chamber's custom differs; a leader installed without a vote or appointment on record; a second election engine (internal votes reuse `castBallots`, Session 13 owns public elections); place special cases; a daily process (organizing days and vacancies only).

## Research tables

One table per field in part 1, one search per state/chamber, 10 minutes each, source cited, estimated rows marked. Check the open question above and `data/source/state-legislatures/` first. Nothing yet on file gives real party ratios or chair rules, so none are guessed here. Seniority importance: do not invent a number; use the engine's ordinal levels.

## Done when (played-game proof)

- Random state; the player wins a House seat. On organizing day each post is filled with named ballots and reasons. The player requested three committees and got some; the deciding person and reasons are on record. A chair declines a bill and it dies. The player runs for whip, canvasses three colleagues, and a promise flips a ballot. Same save, same rosters.
- Same flow in a random territory/D.C. place and a council that elects its own president.
- Tests: rewritten `committee-assignment.test.ts` (party ratio held in 3 random states, deterministic), new `leadership-race.test.ts`, `chair-hearing.test.ts`.

## Proof to post

PR comment per step: place and seed, each post's ballots with reasons, the player's request and result records, the chair's decline record, delete list per "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

- No open owner questions. Switches: how much seniority custom counts = one importance level per chamber in the part 1 data row (default from the research table; estimated rows marked); whether a chair may decline = a boolean data row per chamber.
