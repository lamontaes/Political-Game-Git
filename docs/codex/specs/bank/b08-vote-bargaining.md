# Vote bargaining: amend, trade support, favors, endorsements, threats, public pressure (bank id b08, phase P4)

## What the player experiences

Your ordinance is one vote short. You go find the members on the fence: at city hall, at the diner, after a meeting. Each wants something for their own reasons: one wants the money to reach her ward, one wants your vote on his item next month, one wants you at his reelection kickoff, one still owes you for helping his nephew. You can offer to change the bill, promise support on their item, call in an old favor, offer your endorsement, warn them what you'll do if they cross you, or get their own neighbors to call them. What they say back is a promise on the record (firm, hedged or "we'll see"), and promises come due at the roll call. Some keep their word and some don't, and people remember either way. Talking never changes the bill; only an amendment the body adopts does. The same moves work in the statehouse and in Congress, and computer-run members bargain with each other the same way.

## Owner decisions this rests on

- "Negotiation: everything tradeable: amend the bill, support their item, favors, endorsements, threats, public pressure."
- "Endorsements are NOT transactional by default... Anyone wanting something wants it for their own reasons."
- D-2: "make sure there isn't some % that won't do it. Depends on the people and the personalities."
- Golden path: "proposes an ordinance... → negotiates → vote as a played moment."
- "Lies: recorded; found out by anyone with contradicting facts." "Opinion: word of mouth and local paper at council; real polls higher up."

## Existing code it must use

- `src/presentation/legislative-bargaining.ts:75` eight moves (ask what they want, request support, offer provision, counter with cap, refuse, ask for analysis, private inducement, remind of commitment); `:192 availableBargainingIntents`, `:321 resolveBargainingResponse`, `:744 recordBargainingConsequences`. Rule in header: talking never legislates.
- `src/simulation/legislative-bargaining-decisions.ts:31,38` the two decisions (commit/hold-off; take-the-offer/hold-off) trait packs lean on.
- `src/presentation/legislative-bargaining-world.ts:106 openLegislativeBargaining` real-world entry. Refuses council (`institution:`) seats at ~`:141`; without `docketKey` it requires the Kentucky brief (`:150 bargainingBriefSupports`).
- `src/presentation/legislative-bargaining-brief.ts:36–80` hard-coded Kentucky/Ashland transit scenario (amounts, GEOID, labels). Fixture content leaking into the play route.
- `src/presentation/legislative-bargaining-actions.ts:179 offerNegotiatedAmendment`, `:292 takeNegotiatedFloorVote`.
- `src/simulation/legislative-politics.ts:555 recordLegislativeCommitment`, `:654 commitmentsHeldBy`, `:782 assessCommitment`, `:912 recordLegislativeNegotiation`.
- `src/simulation/types.ts:5450` commitment conditions (incl. `reciprocal-support`); `:5562` exchange characters; `:5571` dispositions.
- `src/simulation/legislative-member-decisions.ts:205 memberVoteConsiderations`: owed commitments (~~`:240–300`), constituents' blame/credit (~~`:405–432`, PLACEHOLDER thresholds), working relationship (~~`:505`), favor owed to sponsor (~~`:540`).
- One vote engine everywhere: `governing/chamber-votes.ts:840 decideChamberVote` (calls members' reasons at `:798`, constituents at `:757`); councils via `governing/council-lawmaking.ts:77 decideCouncilVote` and `municipal-ordinance-procedure.ts:348`.
- `src/simulation/favors.ts:82 recordFavor` (one favor record; `political:endorsement` kind, `types.ts:1864`), `:339 favorStandingBetween`, `:421 feltDebtConsiderations`.
- `governing/constituent-views.ts:39 constituentsConsideration` reading `provision-public-face.ts:89 whoCaresAbout`; `political-belief-formation.ts:312 applyNpcPoliticalBeliefFormation`; `speech-reception.ts:259,290`; `presentation/press-request.ts:184 composePressAnswer`.

## What to change

1. **One door for every body.** In `openLegislativeBargaining`, accept council seats and any measure on the body's agenda (not only the player's docket bill). Delete the Kentucky-brief gate; move `legislative-bargaining-brief.ts` constants into the developer fixture only. Subject facts come from `bargainingSubjectFactsForDraft` (`brief.ts:506`) for the real measure. `Replaces:` lines.
2. **Three new moves** in `legislative-bargaining.ts`: _offer endorsement_ (a player commitment with a new condition kind `endorsement-given`, met when a recorded endorsement favor exists via `recordFavor`); _warn_ (a threat: go public, back a challenger, oppose their item; recorded as the player's commitment plus a claim so Lie and contradiction rules apply); _call in a favor_ (offered only when `favorStandingBetween` shows a debt; acceptance writes `recordFavor` with `inReturnForFavorId`). Add exchange characters only where none fits. The other member answers through the existing decision with considerations from their own records: their pending items, next race date, district's view, relationship, debt, traits (`registeredTraitConsiderations`).
3. **Vote reasons for the new moves** in `memberVoteConsiderations`, coordinated with Session 21 (file owner; land after its favor/money PR): a promised endorsement still owed; a believed threat (belief read from the player's record of kept/broken threats via `assessCommitment`), yielding or defying decided by the member's traits; a called-in favor uses the existing debt path. Each cites its record.
4. **Public pressure is people reaching people.** "Go public" uses existing channels: a statement to the local reporter, a speech at a meeting, or asking your recorded supporters to contact the member (each decides by their own reasons). Contacts write knowledge and run belief formation for the people reached; `constituentsConsideration` reads the changed views unchanged. Add one consideration "constituents calling" built from recorded contacts the member received. Build this once here; b17's bully pulpit reuses it.
5. **Promises come due.** After the roll call, `assessCommitment` decides kept/broken; broken ones write strain and memory for those who heard (existing writers in `claim-contradictions.ts`). The player's own promises are checked at that item's vote. Supply these as "pending/wants" records to Session 4's situation reader so people bring them up.
6. **Scenes, not a menu.** Exchanges play through Session 4's rows (ask/explain, offer/consent, commitment/follow-through, refusal); every line through `composeGroundedLine`. Remove `legislativeMotifLine` fixed text from bargaining (`Replaces:`). A move shows only when records permit it.
7. **Computer-run members bargain too.** Before a vote, an NPC sponsor short of a majority (its own count, as `amendment-authors.ts` counts) approaches undecided members through `resolveBargainingResponse`, writing the same records. Background only; no notices.

## Must NOT build

A second negotiation engine; influence points, favor currency or relationship meters; a % chance of yes; dice; authored dialogue lines; any place-specific scenario in play; a poll engine or opinion meter; bargaining that writes bill text; a separate council vote engine; a scripted list of who wants what.

## Done when (proof in a played game)

New game in a random town (`tests/support/random-place.ts`); player on council with an ordinance one vote short. Two undecided members want different things, each traced to their records. Across tests, each of the six move kinds is used once; records show `legislativeNegotiations` rows with character, commitments with firmness, a favor row for the called-in favor, a claim for the threat. The roll call shows a member's deciding reason citing the commitment. A broken promise writes strain and later comes up in a scene. Same save, same answers. Tests: `legislative-bargaining-world.test.ts` (council seats in 3 random states), new `vote-bargaining-endorsement.test.ts`, `vote-bargaining-threat.test.ts`, `vote-bargaining-public-pressure.test.ts` (contacts change one named member's reasons; no contacts, no change).

## Depends on

Session 4 (scene rows, Lie), Session 21 (member vote reasons; the council vote moment), Session 9 (bill paper, for amendment offers), Session 20 (lived outcomes), b14 (corruption owns what follows the existing private-inducement move: the crime record and how it is caught), the unowned local-reporter item.

## Open questions for the owner

None.
