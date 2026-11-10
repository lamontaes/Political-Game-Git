# Stand-in triage: traits (Nov 10, 2026)

Rows: 7. Still faked 7, already replaced 0, partly replaced 0, could not tell 0. Closes by: code 5, research 1, data 1, design 0, owner call 0. New items: 0.

| Stand-in | Still true? | What closes it | Pool item | Size | May stay at early access? | In plain words |
| --- | --- | --- | --- | --- | --- | --- |
| SG-TRAITS-household-distance-estimate | still faked | data | none | M | yes: sourced Census land-area estimate; only party attendance reads it | How far each household lives from the middle of town is a made-up spread over the town's area, since homes have no addresses. |
| SG-TRAITS-director-claims-reader | still faked | code | words-director-claims-shared-rule (open) | S | yes: only the player's own claims read the flat rule | When the player tells someone a claim, the listener's doubt ignores how close they are to the player and how well it fits their views. |
| SG-TRAITS-counted-health-no-trait | still faked | code | none | M | yes: totals still match the life tables (rescaled to opening mean) | Unnamed townspeople's illnesses ignore how conscientious they are; only named people's do. |
| SG-TRAITS-counted-no-maturity | still faked | code | none | M | yes: counted people reach their age norm in one step when filled in | Unnamed townspeople's personalities do not change as they age until the player meets them. |
| SG-TRAITS-press-local-misconduct-reach | still faked | code | none | S | yes: the press is basic at early access (Oct 10 scope call); the rule gives the right story | The paper treats a charge against a local official as important to every reader, as a special case rather than a general rule about who a story concerns. |
| SG-TRAITS-counted-hardship-stress | still faked | code | none (research-hardship-distress-half-life, open, is the related decay number) | M | yes: counted worker feels the appraisal on the claim day | A laid-off or evicted unnamed person's lasting stress is not remembered, so later money and moving decisions don't feel it. |
| SG-TRAITS-file-claim-circumstances-tie | still faked | research | none | M | yes: marked estimate until a study gives savings or time-to-job sizes | Whether a laid-off worker files for unemployment depends mostly on temperament, not on savings or job prospects, because no study gives those sizes. |

## Evidence

- `SG-TRAITS-household-distance-estimate`: src/core2/home-distance.ts:59-69 homeDistanceMiles: disc radius from placeLandSquareMiles, seeded hash; marker at 59.
- `SG-TRAITS-director-claims-reader`: src/director/conversation.ts:3027-3032 doubtsClaim still uses P.truthDefaultPull; src/core2/heard-claims.ts:33 believesClaim exists for residents. Marker at heard-claims.ts:33. For speed: one lean read per claim.
- `SG-TRAITS-counted-health-no-trait`: src/core2/modules/health.ts:549-553 hazardFactor reads a full person's conscientiousness and hits data.traitStopgapId; counted-illness.ts has no trait read. Marker is in data/health.json:63 via api.stopgap(data.traitStopgapId) at health.ts:553 (not line 1). Close by group mean factor at monthly booking, by counts.
- `SG-TRAITS-counted-no-maturity`: src/core2/modules/trait-change.ts:200-210 loops over api.state.people (full people) only; marker via data/trait-change.json:2 stopgapId, api.stopgap at trait-change.ts:210. Close yearly by age band, by counts.
- `SG-TRAITS-press-local-misconduct-reach`: src/core2/press-desk.ts:686-696 involved() special-cases justice.charged and press.exposed for servesLocally subjects; marker at 690.
- `SG-TRAITS-counted-hardship-stress`: src/core2/trait-decisions.ts:529-535 hardshipStress returns zero and calls stopgap(COUNTED_HARDSHIP_STOPGAP) when person.affect is missing (line 534). Close by one dated row per counted hardship, read at decision time.
- `SG-TRAITS-file-claim-circumstances-tie`: src/core2/jobs-benefits.ts:255-264 file-claim reads replacement share and hardshipReason only; marker at 264.

## Questions for the owner

None.
