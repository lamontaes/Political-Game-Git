# Starting wage rates reach hiring but are skipped by the later raise writer

The existing town pay writer can save a higher wage and carry its attribution into a real paycheck. Its current raise path requires an enacted law and skips starting rates. The shared law-effects entrypoint and result reader also require an enactment. The approved single-engine repair therefore needs both origins admitted through the same legal identity and numeric-term contract. Reuse the current pay selector, term writer and payment propagation; adding a wage callback alone will not close the starting-law gap.

## Exact first wage row and term binding

Measured existing signature at src/simulation/living-world/town-pay.ts:849:

```ts
raiseTownPayToMinimum(world: World, exceptPersonId: EntityId | null): World
```

Measured existing tick: paydayHandler at src/simulation/living-world/town-pay.ts:508 starts missing job pay, calls this raise writer at line 518, then applies teacher floors, records noticed changes and pays at lines 519–522. The transition key is living-world:payday at line 132. The passed exclusion is the controlled person or null; changing that coverage is separate from legal-origin unification.

| Required saved input | Measured selector or binding | Meaning for the shared consumer |
| --- | --- | --- |
| Existing town compensation flow | src/simulation/living-world/town-pay.ts:879 requires town-pay-v2:job-pay: prefix, work relationship basis and a recipient outside the exclusion. | This selects an existing job/pay row, not every person or arbitrary flow. |
| Latest work role | Latest role by relationship is indexed at line 577 and selected at line 887. | Job location supplies the wage jurisdiction. |
| Active pay terms and cadence | Latest saved terms must be active at line 889. payNoteOf at line 638 admits town weekly, biweekly, semimonthly or monthly cadence. | Preserve the actual period and phase. |
| Weekly paid hours | weeklyHoursOf at line 585 takes the midpoint of the role's saved minimum/maximum expected weekly hours. | This is the existing pay assumption, not measured worked hours. |
| Prior terms, paid periods and job ending | The start bound at line 895 uses current terms, last paid period and a 400-day catch-up limit. Line 905 checks the next actual period boundary; line 907 stops an ended job. | Preserve prior payments and period timing; this is not back pay. |
| Operative wage setting | minimumWageSettingAt(world, role.locationJurisdictionId ?? null, day) at line 912 supplies cents per hour. | Bind jurisdiction, application date, legal identity and numeric term together. |
| Higher period amount | Line 926 rounds hourly cents × weekly hours × 52 / periods per year; line 930 writes only a higher amount. | Annual period counts are 52, 26, 24 and 12 at line 150. Repeal does not cut current pay. |
| Saved successor terms | recordResourceFlowTerms at line 961 preserves flow, date, currency, cadence and prior terms ID. | Reuse this writer for either admitted origin. A terms change is not yet a paid transfer. |

## The current starting/enacted divergence

Measured hiring route: startTownJobPay reads the minimum on the first paid day at src/simulation/living-world/town-pay.ts:718 before creating compensation. minimumWageSettingAt at src/simulation/minimum-wage.ts:454 compares federal, state and local floors. startingStateMinimumHourly at line 206 reads the generated state baseline in dollars per hour, with a known-null state remaining unknown. It falls back to the federal rate for an absent state key. This numeric baseline route does not retain a canonical starting-law identity.

Measured later-raise gate: raiseTownPayToMinimum returns early without enacted wage changes at src/simulation/living-world/town-pay.ts:858. Its per-period branch explicitly skips a setting with measureId null at line 919. Starting state settings return null measure identity and effective date at src/simulation/minimum-wage.ts:366; the location fallback does likewise at line 483. A starting floor can therefore shape new pay without entering this later raise/attribution path.

Measured enacted numeric route: computeStateMinimumSetting reads the exact labor.minimumWage.hourlyCents field at src/simulation/minimum-wage.ts:318 and returns its enacted value at line 330. Without filed numeric terms, the state yes-answer path adds an estimated raise at line 355. The federal yes-answer placeholder is 1,500 cents per hour at line 95; local yes answers use an estimated premium at line 434. Those existing fallbacks must not be presented as newly filed legal values.

Measured attribution divergence: the current raise writer resolves a canonical question only for the federal setting at src/simulation/living-world/town-pay.ts:938. It adds a matching-law stamp at line 947; state/local raises retain an enactment event or authored note at line 970. Origin unification must also retain a matching canonical identity for state/local consequences, not just apply the same amount arithmetic.

## The existing shared engine and result reader exclude starting law

Measured current signature at src/simulation/enacted-law-effects.ts:245:

```ts
applyEnactedLawEffects(world: World, measureId: EntityId): World
```

Measured current boundary: that entrypoint returns unchanged when no enacted history row exists at src/simulation/enacted-law-effects.ts:249. It invokes tax, appropriation, duty and eligibility writers at lines 253–272; no wage consumer is called there. applyNewlyEnactedLawEffects at line 277 visits new enactments only. The read-only enactedLawEffects(world, measureId) result reader at line 327 also requires both a measure and enactment at line 337. Its rule-change line at line 395 describes a legal rule, not a saved wage raise or paid paycheck.

Owner-approved direction, relayed by the coordinator: admit starting and enacted laws through the same applyEnactedLawEffects engine. Proposed contract boundary: resolve one applicable legal identity and supported operative numeric wage term, then feed the same selector and saved terms writer. The result side must read those actual saved terms and transfers through the same identity. Preserve unknown or unsupported bindings explicitly. This report specifies required semantics; it does not invent the new shared type or another per-law settlement/index route.

## Canonical cause and saved result already share a stamp contract

Measured canonical resolver signature at src/simulation/governing/law-in-force.ts:117:

```ts
lawInForce(world, jurisdictionId, propositionId, onDate = world.currentDate,
  scope = "all"): LawInForce | null
```

Measured identity contract: LawInForce at src/simulation/governing/law-in-force.ts:76 retains answer, identity, origin, level and operative date. Starting rows produce their canonical starting-law key at line 420. This interface has no numeric hourly wage field. A baseline cents-per-hour value therefore cannot justify inventing a starting-law key or attaching an unrelated raise-question answer. The shared resolver must validate the actual numeric term's legal/source binding as well as jurisdiction and date.

Measured shared attribution: lawEffectStamp(law: LawInForce | null, context: LawEffectContext): LawEffectStamp | null at src/simulation/law-effect-stamp.ts:40 already supports enacted and in-force-at-start origins. Its guard checks matching starting-key shape and origin at line 77. Reuse it with actual flow, prior terms and work relationship IDs; preserve the applicable canonical question and jurisdiction. Unknown law yields no stamp, not a fabricated authority.

Measured saved result reuse: recordResourceFlowTerms(world: World, input: RecordResourceFlowTermsInput): World at src/simulation/resources.ts:388 saves the successor terms. A positive actual work transfer copies their attribution, changes effectKind to work-compensation-payment and appends terms/flow/transfer IDs at line 620. This existing propagation supplies the consequence-to-payment chain for both legal origins once valid terms carry the shared stamp. It does not manufacture a raise or payment.

## Named preserved evidence and next ownership

Measured historical person/pay example: Jennifer Conway in Appomattox, Virginia, has compensation rising from 189,200 to 224,000 cents and three transfers of 224,000 cents in docs/codex/handbacks/team-5-teacher-five-state-receipt.json:18. This is a teacher-floor receipt, not proof of starting or enacted minimum-wage execution. It demonstrates why changed terms, named person and paid transfers need separate preserved IDs. No named minimum-wage receipt was verified in this bounded source diagnosis.

Source authority is d9e4b8689b24470af29262d5b38affcc9dbb360a. Zero tests, worlds, simulation days, audit processes, production edits or Git mutations occurred. Team 2/Team 3 and coordinator own the released pay adapter and shared type integration. The campaign remains on D9 until the pay engine lands, per coordinator instruction. Mechanical check completed with exit 0, zero errors and zero warnings. Independent review remains pending.
