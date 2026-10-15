# Vote bargaining at the council table (bank id b08, phase P4 build; first used in the council journey step "negotiates -> vote as a played moment")

Verified against origin/main 1ee0abcda (Oct 5). Bank spec: docs/codex/specs/bank/b08-vote-bargaining.md.

## What the player experiences

Your ordinance is one vote short. You find the members on the fence: at city hall, the diner, after a meeting. Each wants something for their own reasons: money in her ward, your vote on his item next month, you at his kickoff, a debt you owe or that he owes you. You can offer to change the bill, back their item, call in a favor, offer your endorsement, warn them what you will do if they cross you, or get their neighbors to call them. What they say back is a promise on the record (firm, hedged, "we'll see"), and promises come due at the roll call. Some keep their word, some do not, and people remember. Talking never changes the bill; only an amendment the body adopts does. The same moves work in the statehouse and Congress, and computer-run members bargain with each other the same way.

## Owner decisions it rests on

- "Negotiation: everything tradeable: amend the bill, support their item, favors, endorsements, threats, public pressure."
- "Endorsements are NOT transactional by default... Anyone wanting something wants it for their own reasons."
- D-2: "make sure there isn't some % that won't do it. Depends on the people and the personalities."
- Golden path: "proposes an ordinance... -> negotiates -> vote as a played moment."
- "Lies: recorded; found out by anyone with contradicting facts."
- Rules fixed by the owner: zero dice; nothing blank or placeholder; one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (all verified on 1ee0abcda)

- `src/presentation/legislative-bargaining.ts`: `LEGISLATIVE_BARGAINING_INTENTS` at :75 (8 moves: ask-what-they-want, request-support, offer-targeted-provision, counter-with-cap, refuse-request, ask-for-analysis, offer-private-inducement, remind-of-commitment); `availableBargainingIntents` :192; `resolveBargainingResponse` :321; `recordBargainingConsequences` :744. Header rule at :69: "talking never legislates". `legislativeMotifLine` (fixed text) is called at :306 and :894 and defined in `presentation/legislative-dialogue-motifs.ts:139`; its only other users are tests (`legislative-cost-objection-english.test.ts`).
- `src/simulation/legislative-bargaining-decisions.ts:31,38`: the two decisions trait packs lean on (commit/hold-off; take-offer/hold-off).
- `src/presentation/legislative-bargaining-world.ts:106 openLegislativeBargaining`. Seam: `:141` returns "unavailable" for any seat whose key starts `institution:` (council seats); `:147-153` without a `docketKey` it demands `bargainingBriefSupports(scenarioKey)`. Real callers: `src/player/PlayerGame.tsx:2154` (`goToTheFloor`) and `:2168` (`goToTheFloorFor(bill)`), both just show the refusal in `setFloorNote`.
- `src/presentation/legislative-bargaining-brief.ts`: `BARGAINING_BRIEF_SCENARIO_KEY = "kentucky"` :36, `PROGRAM_AMOUNT_MINOR_UNITS` :58, `REQUESTED_AMOUNT_MINOR_UNITS` :59, `CAPPED_AMOUNT_MINOR_UNITS` :60, an "Ashland" label (comment at :65), and `bargainingSubjectFactsForDraft` at :506 (already used by `-world.ts:344` for a real draft; this is the right replacement path).
- `src/presentation/legislative-bargaining-actions.ts:179 offerNegotiatedAmendment`, `:292 takeNegotiatedFloorVote`.
- `src/simulation/legislative-politics.ts`: `recordLegislativeCommitment` :555, `commitmentsHeldBy` :654, `assessCommitment` :782, `recordLegislativeNegotiation` :912.
- `src/simulation/types.ts`: `LegislativeCommitmentStance` :5410 (includes `reciprocal-support`); `LegislativeCommitmentCondition` union :5440-5490 (kinds: provision-adopted, scope-narrowed, fiscal-ceiling, analysis-delivered, reciprocal-support, procedural); `LegislativeExchangeCharacter` :5562 (policy-bargaining, targeted-benefit-request, reciprocal-support, coalition-coordination, constituent-advocacy, public-interest-appeal, personal-inducement); `LegislativeNegotiationDisposition` :5571; `LegislativeNegotiationRecord` after it. The comment above the condition union says a condition the world cannot decide is worse than none: every new condition kind must be provable (see step 2).
- `src/simulation/legislative-member-decisions.ts:205 memberVoteConsiderations`. Inside it: owed commitments ~:237-300; formed views ~:317-375 (`PLACEHOLDER(overnight)` at :349); blame/credit and group members ~:379-432 (`PLACEHOLDER` at :405 and :419); working relationship ~:505-530; favor owed to sponsor ~:535-547. These four PLACEHOLDER comments are owner-banned ("nothing placeholder"); a PR touching those blocks must not leave them.
- One vote engine: `src/simulation/governing/chamber-votes.ts:840 decideChamberVote`; `governing/council-lawmaking.ts:77 decideCouncilVote`; `municipal-ordinance-procedure.ts:348` calls `decideChamberVote`. Other callers (do not fork): `dc-council-sittings.ts:226`, `living-world/federal-reform.ts:346,460`, `governing/governor-bill-decision.ts`, `governing/supreme-court-appointments.ts:498,532`.
- `src/simulation/favors.ts`: `RecordFavorInput` :38 (has `inReturnForFavorId` :56), `recordFavor` :82, `favorStandingBetween` :339, `favorsBetween` :391, `feltDebtConsiderations` :421. Endorsement kind `political:endorsement` is documented at `types.ts:1864`.
- `governing/constituent-views.ts:39 constituentsConsideration`; `provision-public-face.ts:89 whoCaresAbout`; `trait-readings.ts:154 registeredTraitConsiderations`; `presentation/english-composition.ts:215 composeGroundedLine`; `political-belief-formation.ts:312 applyNpcPoliticalBeliefFormation`.
- Testing helper for random places: `tests/support/random-place.ts` (exists).

Corrections to the bank spec: its line cites are right; its "~" cites for member decisions are now pinned above. Newer code: nothing on main yet covers council bargaining, endorsement/threat moves or public pressure. `legislative-bargaining-world.ts` already supports any `docketKey` bill for non-council legislatures, so step 1 is mostly removing two gates.

## Build steps (one PR each, in this order)

1. **One door for every body.** Files: `legislative-bargaining-world.ts`, `legislative-bargaining-brief.ts`, `PlayerGame.tsx` (the two callers). Allow `institution:` seats and any measure on the body's agenda (the player's docket bill or a measure another member put up). Delete the `bargainingBriefSupports` refusal; subject facts come from `bargainingSubjectFactsForDraft` for the real measure. Move the Kentucky constants into the developer fixture file only (the one tests import). `Replaces:` the `institution:` refusal at :141, the brief gate at :147-153 and the Kentucky constants in play code. Must not: add a council-only branch; the council uses the same vote function as every body.
2. **Three new moves** in `legislative-bargaining.ts` (add to `LEGISLATIVE_BARGAINING_INTENTS`): offer-endorsement, warn, call-in-favor.
   - Offer endorsement: a player commitment with a new condition kind `endorsement-given` (in `types.ts`), met when a recorded endorsement favor exists through `recordFavor` (kind `political:endorsement`). The condition must be provable from that favor record.
   - Warn: recorded as the player's commitment plus a claim, so Lie and contradiction rules apply to it. The threat contents (go public, back a challenger, oppose their item) are chosen from the member's own records (their pending items, their next race date).
   - Call in a favor: only offered when `favorStandingBetween` shows a debt; acceptance writes `recordFavor` with `inReturnForFavorId`.
   - Add an exchange character only if none of the seven fits (a warning is not `personal-inducement`; pick or add `pressure` and say why in the PR).
   - The other member answers through the existing decisions in `legislative-bargaining-decisions.ts` with considerations from their own records (items pending, next race, district's view, relationship, debt, `registeredTraitConsiderations`).
3. **Vote reasons for the new moves** in `memberVoteConsiderations`: promised endorsement still owed; a believed threat (belief from the player's record of kept/broken threats via `assessCommitment`, yielding or defying decided by the member's traits); called-in favor uses the existing debt path (:535). Each reason cites its record. Land after Session 21's favor/money PR (it owns this file). In the same PR clear the PLACEHOLDER comments you touch (:349, :405, :419) with a real mapping from the recorded conviction/salience, using the one ordinal table the decision engine already has, and say so in the PR.
4. **Public pressure is people reaching people.** "Go public" uses existing channels only: a statement to the local reporter (`presentation/press-request.ts:184 composePressAnswer`), a speech at a meeting (`speech-reception.ts`), or asking your recorded supporters to contact the member (each decides by their own reasons). Contacts write knowledge and run belief formation for the people reached; `constituentsConsideration` reads the changed views unchanged. Add one consideration "constituents calling" built from the recorded contacts the member received. Build once here; b17's bully pulpit reuses it.
5. **Promises come due.** After the roll call, `assessCommitment` decides kept/broken; broken ones write strain and memory for those who heard (existing writers in `claim-contradictions.ts`). The player's own promises are checked at that item's vote. Expose pending/wants records to Session 4's situation reader so people bring them up in scenes.
6. **Scenes, not a menu.** Exchanges play through Session 4's rows (ask/explain, offer/consent, commitment/follow-through, refusal). Every line goes through `composeGroundedLine`. A move appears only when records permit it. `Replaces:` both `legislativeMotifLine` calls (:306, :894) and delete `legislative-dialogue-motifs.ts` plus its test once nothing else imports it (grep first; if something else does, delete only what is orphaned).
7. **Computer-run members bargain too.** Before a vote, an NPC sponsor short of a majority (its own count, as `amendment-authors.ts` counts) approaches undecided members through `resolveBargainingResponse`, writing the same records. Background only, no notices, runs only when a vote is on the calendar (no daily tick).

## Must NOT build

A second negotiation engine; influence points, favor currency or relationship meters; a percent chance of yes; dice; authored dialogue lines or banks; any place-specific scenario in play (Kentucky, Ashland); a poll or opinion meter; bargaining that writes bill text; a separate council vote engine; a scripted list of who wants what; a daily gossip tick; a new knowledge or belief writer.

## Research tables

No new number is needed: moves carry no amounts. Bill amounts come from the real measure's facts. If a PR needs a number (for example what a pledged endorsement is worth in the member's reasons), it uses the engine's existing ordinal importance levels, not a new value. Existing research read: `data/research/legislative-procedure`, `data/research/lawmaking-throughput` hold procedure, not bargaining; nothing on bargaining success rates exists and none should be invented.

## Done when (played-game proof)

- New game in a random town (`tests/support/random-place.ts`), player on council with an ordinance one vote short. Two undecided members want different things, each traced to their own records (pending item, race date, district, debt, traits).
- Across the proof run each of the six move kinds (the four existing ones used plus endorse, warn, call-in) is used once. Records show `legislativeNegotiations` rows with character, commitments with firmness, a favor row for the called-in favor, a claim for the threat.
- The roll call shows a member's deciding reason citing the commitment. A broken promise writes strain and later comes up in a scene. Same save, same answers.
- Same flow in a statehouse place and a random territory/D.C. place.
- Tests: `legislative-bargaining-world.test.ts` (council seats in 3 random states, no Kentucky string anywhere in play output), new `vote-bargaining-endorsement.test.ts`, `vote-bargaining-threat.test.ts`, `vote-bargaining-public-pressure.test.ts` (contacts change one named member's reasons; no contacts, no change), plus a grep test that `legislativeMotifLine` and `kentucky` constants are not imported from play code.

## Proof to post

PR comment per step: the random place and seed, the printed move list, the member's printed reasons with record ids before and after each move, the roll call reasons, the delete list for each "Replaces:", and `npm run typecheck` plus the changed test files passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

- No open owner questions. Switches kept anyway: which exchange character the warn move uses = one constant in `legislative-bargaining.ts` (default: new `pressure` character; if the owner prefers an existing one, change the constant); which channels count as public pressure = a data row listing the three channels (reporter, speech, supporter contact).
