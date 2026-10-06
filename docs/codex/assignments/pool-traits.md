# Pool: personality wired everywhere (T1–T12)

Owner rule (Oct 6): all 97 traits are read and weighed in every person-level decision, now. Every item goes through the existing decision engine: `evaluateDecision` (src/simulation/decisions.ts:66) plus `registeredTraitConsiderations` (trait-readings.ts:154) and trait-registry.ts. Traits declare their effects as DATA rows in the registry, never ad-hoc lean code. Zero dice, no fixed weights. Done = in a new game in a random place, two people differing only in one trait make visibly different choices, with the trace printed. One PR per item. Post "Session N takes T#" on #2052, then build. T1 and T2 first: they drive the whole game.

- **T1 Member votes read traits:** governing/chamber-votes.ts:970, legislative-member-decisions.ts:162, constitutional-reform.ts:484, federal-reform.ts:588.
- **T2 Voters and opinion:** election.vote (election-contests.ts:261) reads traits as the lens on beliefs. Replace the dead "synthetic tendencies" in official-views.ts:338/415/847, crime/offenders.ts:387 and crisis/epidemic.ts:432 with real trait reads (only demo.ts:323 writes those fields), then delete the synthetic field.
- **T3 Campaign:** donors, outreach and support asks (campaign-money-sources.ts:119, campaign-life-activities.ts:1392, 2216); Congress and state-legislature runs (congress-candidates.ts:257, state-legislature-candidates.ts:685).
- **T4 Couples and romance:** couples.ts:315, town-couple-actor-adapter.ts:64/150/200.
- **T5 Jobs:** quitting (town-labor-market.ts:83), civil-service discharge and settlement (civil-personnel-actions.ts:1175/1350).
- **T6 Courts:** sentencing and detention (court-reasoning.ts:707/763), clemency ruling (clemency-reasoning.ts:318).
- **T7 Press:** desk.ts:365/757/968, matters.ts:633/767, ownership.ts:453, responses.ts:255, press-interview-producers.ts:509.
- **T8 Others:** moguls.ts:627/1040, party-evolution.ts:770, crisis/handling-reactions.ts:344, supreme-court-appointments.ts:297.
- **T9 The 92 catalogue traits:** about 73 are read nowhere. Each gets registry rows naming the decisions it argues in (several per trait), split by trait family across 4 to 6 PRs (T9a–T9f).
- **T10 Traits change over life:** generalize attemptTraitChange (people-trait-change.ts:309) so recorded life events (loss, success, prison, parenthood, scandal, betrayal) shift traits through the same producer; today it fires only for rebuffed askers.
- **T11 Dialogue reads LIVE traits:** not the frozen snapshot (life-personality.ts:38-40); ask/listen/direct and leisure preferences derive from current traits.
- **T12 Registry hygiene:** fix the stale PERSONALITY_TRAIT_READERS registry (personality-trait-registry.ts:77, ~140-160) and add a check that fails when any trait has zero readers; replace the hard-coded multipliers (favors.ts:238/274, job-offers.ts:109, crime/reporting.ts:89, appointments.ts:166, town-rent.ts:306-309) with each person's own record.
