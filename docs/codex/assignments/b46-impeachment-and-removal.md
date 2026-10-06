# Impeachment and removal as scenes: House investigation and articles, Senate trial, and the state and local equivalents (bank id b46, phase P4 every office, gap G136, unlocks "a governor, a judge or a mayor can be removed by the people who sit above them" at every level)

Verified against origin/main a88744a25 (Oct 6).

## What the player experiences

You are a state senator. A county prosecutor's office has indicted the governor's chief of staff, a reporter has the story, and the House has opened an inquiry. A staffer tells you the Speaker will bring articles when the committee reports. You are not on that committee, so you lobby the members who are. On the floor day the clerk reads each article, members rise and speak from what they own, owe and have seen, and the roll is called; each member's reason cites the record behind it. It passes. Two weeks later your chamber sits as a court: the chief justice presides, you take an oath as a juror, the House managers present, the governor's lawyer answers, witnesses are people from the record, and then you vote on each article. Your vote is yours and your own voters see it. If the count reaches what your state's constitution requires, the governor leaves office that day and the lieutenant governor is sworn in; if it falls short, the governor stays and everyone remembers who voted how.

The same scene plays smaller elsewhere. A town council can vote to remove a member only where that state lets it; where it does not, you see the petition route (recall) or a court route. A judge faces a conduct commission before a court or chamber. A member of your own chamber faces an expulsion vote. Where a body has no such power, the scene is absent and you are told which court, commission or voters hold it. Computer-run bodies do all of it in the background and the news reports it.

## Owner decisions it rests on

- Register, constitutional crises (item 9): "INTERNAL AND CONSTITUTIONAL CRISES ARE INCLUDED: crises are not restricted to natural hazards. Include context-generated disputes, organizational and party pressure, fiscal or service failures, incompatible authority/succession claims, defiance and emergency-powers conflicts".
- Register: "Escalation is conditional; compliance, compromise, review, resignations, relief or supported reform can resolve an episode."
- Register: "The game grants no plot armor to preserve a preferred officeholder. Succession, grief, institutional response and downstream consequences follow what actually happened."
- Register, "Important people everywhere": they "act when their institution acts: a session day, a hearing, a vote, a campaign event."
- Session 23 brief: "1.0 = every office up to President playable" and one shared engine per branch per level.
- Register (quoted in b12, b36): "Chamber procedure starts as each chamber's real rules and can be changed in game."
- No owner quote exists on main for impeachment, trials or removal by name (grep of the register and both owner-words files finds none). This doc rests on the crisis and no-plot-armor rulings above.
- Fixed rules: zero dice; nothing blank (estimate and mark it); one rule for all 50 states, D.C. and territories; emergent not authored; one writer per record kind; delete what you replace.

## Existing code to extend (VERIFIED on a88744a25)

- Nothing plays impeachment. `grep -rni impeach src` finds only exclusions: `executive-authority-rule-packs.ts:379,921,1015` (pardon power "except in cases of impeachment") and one routing note at `press/state-ethics-bodies.ts:504`. No articles, managers, trial, verdict or per-state impeachment rule data exists. `data/source/book-of-the-states/raw/table-2023-{3-9,4-3,5-4}.html` are pay tables that only link a page titled "Impeachment Provisions in the States"; the provisions themselves are not in the repo.
- `src/simulation/governing/institution-authority.ts:98 canInstitutionAct` already answers "may this body do this to this person" from compiled authority. Actions `expel` and `remove-from-office` exist (:30-43). Congress rows (:175-215) say expulsion needs two thirds and Congress members leave only by expulsion; other cases return `unknown` ("nothing happens", :11). Only caller: `press/procedures.ts:775`. Impeachment is not an action there.
- `src/simulation/governing/office-consequence.ts:60 OfficeConsequenceKind` has only `resignation` and `removed-on-sentence` (:65-67), `:70 endsTerm`, `:145 recordOfficeConsequence` (closes the work term; vacancy note names who fills it). Callers: `justice/prosecution.ts:592`, `presentation/office-response.ts:303`. This is the one writer that ends a term; removal must use it.
- `src/simulation/governing/office-continuity.ts:378 scheduleSeatFilling`, `:90` imports `seatGovernorSuccessor` (`nationwide-world/governor-succession`); `:585 senateAppointmentHandler`; `:1538 vicePresidentNominationHandler`. Fills a vacancy; does not know why it opened.
- `src/simulation/governing/chamber-votes.ts:840 decideChamberVote` (inputs kinds `bill`, `nomination` :223, `constitutional` :246). One vote function; a trial verdict adds a kind, never a new function.
- `src/simulation/legislature-rules.ts:173 VoteThresholdRule` (fraction, denominator, rounding), `:442 OverrideForum`. The shape to copy for "two thirds of members present" versus "of all members".
- `src/simulation/recall.ts:107 municipalRecallRule`, `:164 RecallPetition`, `:284 canStartRecallPetition`, `:336 startRecallPetition`, `:538 recallPetitionClosesHandler`, `:642 recallElectionHandler`; `enacted-rule-changes.ts:111 municipal.recall.doctrine` (includes `judicial-cause-removal-trial`, `prohibited`). Recall is the voter route for town officials and has no dice on main. b18 owns turning it into the general petition engine.
- `src/simulation/press/state-ethics-bodies.ts:29 StateLegislativeEthicsBody`, `:49 STATE_LEGISLATIVE_ETHICS_BODIES`, `:615 stateLegislativeEthicsBody`; `press/procedures.ts:725 openProceeding`, `:686 institutionHoldsSupport`: how a body opens an inquiry.
- `src/simulation/legislature-rule-packs.ts:1248` quotes Minn. Const. art. IV, § 7 (each house may "with the concurrence of two-thirds expel a member"): the only expulsion text in rule data.
- `src/simulation/governing/legislative-clock.ts:643 applyInstitutionStep` (b32/b35 engine); `src/simulation/justice/prosecution.ts:335 referForProsecution` (the criminal route, already removes on sentence).

## Build steps (one PR each, in this order)

1. **Removal rows, one table for every place.** New data file `data/research/removal-of-officials/rules.json` (one row per office kind per jurisdiction): who may start it (house majority, a petition, a commission), who tries it (other chamber, whole legislature, supreme court, special court, a commission then the court), the threshold as a `VoteThresholdRule`-shaped value, grounds the law names, what happens on conviction (removal, disqualification), who succeeds. Loader in `src/simulation/removal-rules.ts`; add `removal.*` fields to `AMENDABLE_RULE_FIELDS` (`enacted-rule-changes.ts:72`) so a law can change them (b32 owns the field mechanism). Nothing unknown: fill from similar bodies and mark `ESTIMATED FROM AVERAGE`. Must not: a per-state function or a level-name branch.
2. **Teach the authority gate.** In `institution-authority.ts` add actions `open-impeachment`, `adopt-articles`, `convict` and answer them from the rows; keep Congress and ethics rows, and replace any "unknown" with the row. Replaces: nothing; extends `canInstitutionAct`.
3. **The inquiry.** An inquiry opens through `openProceeding` when evidence reaches the body: b14 corruption records, b15 investigation findings, b26 scandal and call-for-resignation reactions, a prosecution referral. Members who start it decide from their own records and stakes through `decideChamberVote`. Files: `press/procedures.ts` (one new procedure key), `governing/removal-inquiry.ts`. Must not: a "scandal meter" or a number that triggers it.
4. **Articles scene.** The committee hearing and floor day are the b35 sitting (witnesses are real records, roll call cites reasons). Articles are separate counts, each voted alone. Files: `governing/removal-articles.ts` calling the b32 sitting handler. Must not: a second sitting handler.
5. **The trial scene.** The trying body sits through the same handler: presiding officer from the row, managers named from the proposing chamber, oath, witnesses from records, closing, a vote per article. Add vote kind `removal` to `chamber-votes.ts` so a juror's reasons cite records and relationships. Where the row names a court (b13/b39 bench), that court decides through the court engine.
6. **Conviction ends the term.** Add `OfficeConsequenceKind` values `removed-by-impeachment`, `removed-by-expulsion`, `removed-by-court`; `recordOfficeConsequence` closes the term; `scheduleSeatFilling` and `seatGovernorSuccessor` fill it from the row's succession line. Acquittal writes a record each voter's later view reads. Replaces: nothing.
7. **Resignation and pressure.** Resigning mid-inquiry ends it through the existing `resignation` kind; b26 pressure feeds the person's own resign-or-stay choice. Only the player's own answer is a player choice.
8. **Every office.** Judges (b13/b39 conduct commission route), mayors and council members (row says council vote, court, recall or none), legislators (expulsion), governors, President, appointed officials. Where a row says voters only, hand to recall (`recall.ts`).
9. **Player views.** Journal chapter in first person, people named by relationship on first mention; news (b40) and the Register of your votes. Remove nothing the player already sees.

## Must NOT build

A second legislative, trial or court engine (b32, Session 42/b13/b39); a new vote function; authored articles, speeches or verdicts; a dice roll, odds or "will they convict" meter; per-state scripts; the investigation or oppo-research systems themselves (b15); corruption kinds (b14); scandal and press records (b26); the petition engine (b18; recall stays there); the Senate confirmation scene (b37); executive orders and the desk (Session 23/b17); criminal trial of the official (b13, `justice/`); foreign-pressure removal causes (after 1.0).

## Research tables

Repo data first (verified): `data/source/constitutional-process/` (54 manifest lines; state constitutions used by rule packs, including `raw/ca-constitution-iv.html`), `data/source/book-of-the-states/raw/` (links to "Impeachment Provisions in the States"), `data/municipal-elections/92O-national-state-baseline.json` (`recallMechanics` per state), `data/research/clemency/clemency-gates-2026.json`, `data/source/judicial-office-selection/`, `src/simulation/legislature-rule-packs.ts` (chamber seats). Missing, one search each, 10 minutes max, never invent: per state and territory (a) who may impeach and by what vote, (b) who tries, trial vote needed, (c) grounds, (d) succession on removal, (e) judge removal route (commission or court), (f) town officer removal by council or court. Sources: each constitution, NCSL, Book of the States impeachment table. Estimate wording in data only: "ESTIMATED FROM AVERAGE: <government type> in <region>". Federal rows from the U.S. Constitution art. I and II, as compiled.

## Done when (played-game proof)

- New game in a random place via `tests/support/random-place.ts` `drawRandomPlace`: the player is a state legislator; a seeded misconduct record reaches the inquiry; the player sees the inquiry, the articles floor day and the trial vote under that state's rows; conviction vacates the office and the successor takes it; acquittal leaves a record. Same save, same answers.
- Same flow in a random territory place and D.C. (unicameral or council trial route): different bodies and thresholds, one code path.
- A town in a state that bars recall and removal by council shows the court route; a town where the council may remove plays that vote.
- Tests: `removal-rules-all-places.test.ts` (56 rows, nothing unknown), `removal-inquiry-from-records.test.ts`, `removal-articles-and-trial.test.ts`, `removal-ends-term-and-succession.test.ts`, `judge-removal-route.test.ts`, grep test that no impeachment or removal threshold literal exists outside the rows and that `removed-on-sentence` is not the only removal kind.

## Proof to post

PR comment per step: random place and seed, printed rule row used, the inquiry record with source ids, the roll calls with reasons, the vacancy and successor record, `npm run typecheck` and changed tests passing.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.

Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a PROGRESS: note in the PR body.

Open owner questions (none blocking): (1) how much of a trial plays on screen versus summarized when the player is only a juror; (2) whether a player facing removal gets a defense scene or only a stay-or-resign choice. Switches kept: trial scenes shown = one constant `REMOVAL_TRIAL_SCENES_PLAYED` in `removal-articles.ts` (default: those that involve the player or their closest relationships, rest summarized); player defense = one row in the removal rules data. If b32 has not landed, build parts 1, 2, 6 and 9 and stub the sitting through `applyInstitutionStep`. If b14, b15 or b26 have not landed, stub the inquiry trigger from `justice/prosecution.ts:335` referrals and existing press findings. If b13/b39 have not landed, stub court trials through a recorded decision row.
