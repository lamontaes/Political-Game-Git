# Committee seats, chairs and leadership races (bank id b10, phase P4)

## What the player experiences

When you reach the statehouse or Congress you are not dealt onto committees. You tell your party's leaders which committees you want, and whoever hands them out in your chamber decides from what they know of you: how long you've served, who vouches for you, how you've voted with the party, what your district needs, what you owe each other. Chairs usually go to long-serving majority members, but not always. You can run for whip, floor leader or Speaker by asking colleagues one at a time; they decide from their ties to you and your rivals, your principles and what they think you'll do for them. People remember who backed whom. A chair has real power, because in many chambers a bill the chair won't hear dies. On a council, the council president or mayor pro tem is chosen the same way where the charter has the council choose.

## Owner decisions this rests on

- "Legislature: committee seats, chairs and leadership races earned via relationships and seniority."
- Sept 28 overrule: "Chamber procedure starts as each chamber's real rules and can be changed in game."
- Register (Sept 22): "Party office and committee progression remain in already-approved leadership scope"; party leadership and public authority kept distinct.
- D-9: power at the start is built by running the same hiring and favor rules over the past as in play.
- Party path is its own path (Session 25 queue); one rule for all states.

## Existing code it must use

- `src/simulation/governing/committee-assignment.ts:31 committeeRosters`: round-robin by seniority (`seatingOrder :108`), stores nothing; `:64 committeeRoster`, `:91 committeesForPerson`. Callers: `governing/legislative-clock.ts:849` (committee vote), `:1454`; `presentation/legislation-session.ts:263`; `presentation/legislative-office-context.ts:244`.
- `src/simulation/governing/presiding-officers.ts:64 electPresidingOfficer`: caucus nomination then floor ballot; PLACEHOLDER `CAUCUS_CANDIDATES = 5` (`:45`); says the player cannot run "which no screen offers yet" (`:30–33`). Called from `governing/office-continuity.ts:1087`.
- `src/simulation/governing/joint-assembly.ts:248 castBallots`: reasons own caucus (`:142`), seniority (`:155`), relationship/strain (`:179,183`), principles (`:195`).
- `src/simulation/legislature-game-profile.ts`: read / generated-from-spread / unknown pattern for the 42 unread states. `legislature-rule-packs.ts:182` KY House Rule 37 (Committee on Committees) exists only as source text; `:401`, `:693` "whether a chair may decline to take a bill up ... not resolved".
- `src/simulation/governing/chamber-votes.ts:1065 committeeRecommendation`; `types.ts:4822` action kinds include `committee-not-reported`.
- `src/simulation/living-world/local-council-meetings.ts:510 localCouncilChair`: mayor, else first officer found.
- `src/simulation/favors.ts:82 recordFavor` (an appointment is a favor); b08's commitments (`legislative-politics.ts:555`).
- Missing entirely: committee chairs, majority/minority leaders, whips, party ratios on committees, member committee requests.

## What to change

1. **Leadership rules as data for every chamber.** Extend `legislature-game-profile.ts` (same read/estimated pattern) with: who assigns committees (Speaker, committee on committees, caucus, Senate president), who picks chairs, which leadership posts exist, the party-ratio rule, and whether a chair may decline to hear a bill. One quick research table (one search per state, cite), Congress from its rules, territories and D.C. estimated from similar chambers. Councils: officer selection from `municipal-rule-registry` where stated, else estimated.
2. **Leadership races for every post.** Generalize `electPresidingOfficer` into one `electChamberLeader(post)` used for each post in part 1's data, held on the organizing day from the session calendar. Replace `CAUCUS_CANDIDATES` with members who declare: each decides through `evaluateDecision` from ambition-related traits, seniority, relationships and standing. The player may declare and then canvass colleagues in Session 4 scenes; asks and promises are b08 commitments ("I'll be with you for whip"). Add an owed-commitment reason to `castBallots`.
3. **Committee requests and real assignment.** Each member records committee preferences (computer-run: from their district's economy and their own work and history; player: a short conversation with the assigning leader). The assigning person or committee decides seat by seat through `evaluateDecision`: seniority, the party ratio, relationship, party-line voting from roll calls, favors owed, district fit. Write one assignment record per member per committee with reasons. `committeeRosters` keeps its signature and reads the records; the round-robin is deleted (`Replaces:`).
4. **Chairs.** Chosen by the authority in part 1 from the committee's majority members; seniority custom is a consideration whose importance comes from the chamber's data row, never a fixed rule. Recorded; the chair sits at the head of the committee room scene.
5. **Chair power.** Where the chamber's rules let a chair decline, the chair decides whether a referred bill gets a hearing (`evaluateDecision`: their view of the bill, relationship with the sponsor, leadership's recorded wishes). An unheard bill ends in `committee-not-reported` or dies at adjournment. This is why chairs get courted.
6. **Screens get data only.** Your office lists your committees, chairs and leaders with who decided and why; Sessions 3 and 14 own the screens.

## Must NOT build

Random or list-order assignment; an influence score; a hard seniority rule where the chamber's custom differs; a leader installed without a vote or appointment on record; a second election engine (internal votes reuse `castBallots`; Session 13 owns public elections); place special cases in code; a daily process (all of this happens on organizing days and vacancies).

## Done when (proof in a played game)

Random state; the player wins a House seat. On organizing day each leadership post is filled with named ballots and reasons. The player requested three committees and got some, with the deciding person and reasons on record; a chair declines a bill and it dies; the player runs for whip, canvasses three colleagues, and a promise flips a ballot. Same save, same rosters. Tests: rewritten `committee-assignment.test.ts` (party ratio held in 3 random states; deterministic), new `leadership-race.test.ts`, `chair-hearing.test.ts`.

## Depends on

b08 (commitments), Session 4 (scenes), Session 13 (seating winners), Sessions 3/14 (screens), Session 25 (party path).

## Open questions for the owner

None.
