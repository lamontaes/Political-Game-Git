# Party leadership: state and national committee chairs, platform fights, rules votes (bank id b48, phase P4 ladder, unlocks "run the party" as a career and the party side of the convention)

Verified against origin/main a88744a25 (Oct 6). Builds on b34 (precinct, county chair, nominations, convention), b20 (movements), Session 25 (parties found, split, merge, drift).

## What the player experiences

You are a four-term state senator in Ohio and the state party chair is retiring. You call the members of the state central committee one at a time. Each answers from what they owe you, what they think of your record, and whether they want the party to move toward the voters or toward its base. A rival who ran the county in Cuyahoga does the same. On the day, the committee meets, ballots are cast, and you see who backed whom. You win by one vote. Months later, in a presidential year, the party's platform committee meets and a delegation from your state wants a line changed. You carry it to the floor and speak. People vote their own views, some trade their vote for something you owe, and the line passes or fails. Later the national committee votes on a rules change (how delegates are picked) and you cast your state's vote. Years after that you might run for national chair. Nobody hands you the job: you climb because people back you.

## Owner decisions it rests on

- Register, Politics scope: "Every office listed is in scope: town council, mayor, county, state legislature, governor, U.S. House, Senate, President, appointed posts, party roles and judge."
- Register, first deeper leadership: "party and campaign-committee leadership. Keep public authority/resources and party-organizational authority/resources distinct."
- Register: "Parties are persistent organizations with distinguishable identity, membership, coalitions, positions and history; future supported rules may represent formation, division, merger or disappearance."
- Register: "Foundational world contracts must not assume exactly two permanent parties".
- Register, party knowledge: "Do not expose internal debates, private loyalties, motives or unsettled plans merely because the simulation records them."
- Register: "Visiting a party chapter and meeting its local leader may lead to an introduction... These are optional examples, not one compulsory career ladder, guaranteed access or a credential fabricated to unlock the next scene."
- Register D-4: "A career from first race to elder statesman: protégés, primaries, life after office, family costs."
- No owner quote exists on platform fights or DNC/RNC rules votes specifically. Built from the principles above; roadmap G138 only names them.
- Fixed rules: zero dice; nothing blank, estimate and mark it; one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (VERIFIED on a88744a25)

- `src/simulation/living-world/party-evolution.ts` is the one writer for party bodies. `:84 PARTY_OFFICER_KIND`, `:85 PARTY_COMMITTEE_KIND`, `:95 PARTY_BODY_CADENCE` (header says "Authored cadence"; `standingCommitteeSize: 4`, `nationalCommitteeSize: 5` are hand-set), `:119 partyActorStance`, `:191 partyBodyMembers`, `:205 partyUnitLeaders`, `:228 ensurePartyLeadership` (generates a national committee of invented people only when an action needs one; it is the only way officers appear), `:324 partyUnitOfficersAt`, `:404 partyPlatformAt`, `:481 recordPartyBodyDecision` (plurality of member stances, tie keeps the current line, strong losers become recorded dissent), `:825 proposePartyInitiative`, `:1246 adoptPartyInitiative` (platform change case at :1526), `:1789 ensurePartyGoverningBodies`, `:1911 partyBodyReviewTransitionHandler` (review every 3 months).
- `living-world/party-registry.ts:77 partyUnits`, `:217 settingNationalPartyId`; `SETTING_PARTY_NAMES` :40 has two parties only (democratic, republican).
- `living-world/party-chapters.ts`: `:134 ensureHomePartyChapters`, `:249 homePartyChapters`, `:813 joinPartyChapter`; type `MajorPartyKey` (two keys).
- Vote shape to reuse: `governing/chamber-votes.ts:840 decideChamberVote`.
- Not on main (grep finds nothing in src): a state party chair, a state central committee, a national committee seated by state, delegates, a platform committee or convention rules vote, a leadership race for any party post. `party-evolution.ts` generates invented people for the national committee; they are not people from the world.
- b34 (not on main) owns: precinct committee, county chair and state chair as first records (its step 6), delegates and the convention vote (step 8). This doc starts above that and consumes those records; stub until they land.
- Random place helper: `tests/support/random-place.ts` (`drawRandomPlace`, exists). Rule data: `data/research/elections/party-nomination-rules-2026.json` (nomination methods, not committee structure).

## Build steps (one PR each, in this order)

1. **Party rules as data.** One row per party per level: seats on the state committee and national committee (how each state or territory is represented), who elects the chair (committee vote, convention, caucus), term length, how a platform is written and adopted, how the rules body is chosen and what a rules vote needs. Files: new `data/research/party-rules/` plus a reader in `living-world/party-rules.ts`. Territories and D.C. get rows. Estimated rows marked. `Replaces:` `PARTY_BODY_CADENCE.standingCommitteeSize` and `nationalCommitteeSize` (read the row). Must not: a number in code.
2. **Committee seats held by real people.** Seat the state and national committees from existing records: county chairs and precinct members (b34 step 6), elected officials of the party, past nominees, longtime members, chosen by each row's rule (district, county, appointed by the chair). One writer: `party-evolution.ts` through `PARTY_COMMITTEE_KIND`. `Replaces:` the invented committee in `ensurePartyLeadership` (:228); keep the function only as a fallback that picks from world people by the same rule. Must not: generate a person to fill a seat while a qualified person exists.
3. **Chair races.** When a chair term ends, resigns or dies, the electors named by the rule row vote through the `decideChamberVote` shape. Candidates are people who ask (computer-run candidates decide from ambition, ties and what they think the party needs); the player may declare and canvass members one by one (b08 owns favor and endorsement records; b10 owns the pattern for leadership races, reuse its canvass function). Record each ballot with the elector's own reasons. Result is the officer record via `PARTY_OFFICER_KIND`. Must not: a chair appearing from `ensurePartyLeadership`, or a percent chance to win.
4. **What a chair can do.** From the row and the party's own records, not a power meter: call the committee, schedule the rules and platform meetings, name committee members where the row lets the chair, recognize a state's delegates (b34), endorse in a primary only where the party's rules allow, speak for the party in news. Public authority stays separate from party authority (Register). Files: `party-leadership-actions.ts`. Must not: give a chair any government power.
5. **Platform fights.** Each cycle the platform committee takes up planks. A plank is a position with a policy area; members and delegates propose changes from their own `partyActorStance` against `partyPlatformAt`; each member decides from views, loyalty, who asked and what they owe. Votes in committee then on the convention floor (b34's delegates) through the one vote engine. The adopted plank writes the new `party-platform` record at `:1526`, with each plank's yes and no names kept. Player may propose, speak, whip, or sit out. `Replaces:` the single-plurality `recordPartyBodyDecision` for convention-year platform changes (keep it for ordinary body reviews). Must not: scripted fights, authored planks.
6. **Rules votes.** The national committee or convention votes on rule changes the row allows (delegate selection, primary calendar guidance, debate rules, how superdelegate-style seats work where they exist). Adopted rules write back into the party-rules data row through the same path laws use (`enacted-rule-changes.ts`, b32 step 4) so b34's delegate allocation and `nominationPlan` read the new row. The player who sits on the committee votes and lobbies; one who does not may testify. Must not: change a rule without a recorded vote.
7. **Consequences and the career.** A chair's record builds or burns standing with members (existing relationship writers only). A split, merger or platform drift (Session 25) is read by the chair's decisions here: a chair who loses a platform fight may see members leave (Session 25 step 5 writes the split). Chair of a state party or of the national party is an office a person can hold for life stories (b20, b19). What the public sees follows the party-knowledge rule: announcements and published results, not private whip counts, unless a person present or a reporter makes it public.
8. **More than two parties.** Rules rows and chair races for any party in the registry, including founded parties (Session 25); a new party starts with a founder as chair and a small committee by the default row for its size, marked estimated. `Replaces:` any two-key assumption in `MajorPartyKey` use in this path.

## Must NOT build

Precinct and county chair records, primaries, filing, delegates and the convention nomination vote (b34); movement succession (b20); founding, splitting and merging parties (Session 25); committee and chair races in legislatures (b10); a second vote engine (b32); a second leadership writer outside `party-evolution.ts`; favor and endorsement trading (b08); a "party mood" meter; dice; authored platforms, speeches or chairs; per-party or per-state code; foreign pressures.

## Research tables

Repo data first: `data/research/elections/party-nomination-rules-2026.json`, `data/research/campaign-reality`, `data/research/elections/house-delegates-2024.json`. Missing, one search each (10 minutes, never invent; wording in data: "ESTIMATED FROM AVERAGE: <basis>"): DNC and RNC charter and bylaws (committee size, member selection, chair election, rules committee, platform process); state party rules for a sample of states (central committee size, chair election, term), then drift for the rest; territory and D.C. party committee representation; how platforms were adopted in recent conventions (committee then floor vote).

## Done when (played-game proof)

- New game in a random place via `tests/support/random-place.ts` `drawRandomPlace`: the state party's committee is named people from that place's records, not generated; a chair race runs with named ballots and reasons; the player canvasses three electors and a favor changes one ballot; the new chair appears as an officer record.
- Same flow in a random territory place and D.C.: different seat counts from rows, one code path.
- Convention year: a plank is proposed from a member's stance, fought in committee and on the floor, and the new platform record lists yes and no names; a rules vote changes a row that b34's delegate allocation then reads. Same save, same results.
- Tests: `party-rules-all-places.test.ts` (all places, nothing blank), `party-committee-seats.test.ts` (3 random states; no invented person while a qualified one exists), `party-chair-race.test.ts`, `platform-fight.test.ts`, `party-rules-vote.test.ts`, and a grep test that the invented-committee body in `ensurePartyLeadership` and the two committee-size constants are gone.

## Proof to post

PR comment per step: random place and seed, printed committee roster with record ids, each ballot with reasons, the platform record before and after with names, the delete list per "Replaces:", `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a PROGRESS: note in the PR body.

Open owner questions (none blocking): (1) whether the player can reach national chair directly or only after a state chair post; (2) whether a platform fight plays on screen every cycle or only when the player is in it. Switches kept: reach to national chair = one boolean in the party-rules row (default: no required prior post, since the Register says no compulsory ladder); platform fights played = one constant `PLATFORM_FIGHTS_PLAYED` in `party-leadership-actions.ts` (default: only when the player is a member, proposer or the chair; others summarize). If b34 has not landed, build parts 1, 3, 4 and 8 on the existing officer and chapter records and stub the delegate and committee-member inputs; if Session 25 has not landed, skip the split read in part 7.
