# U2 build spec: each body's law is its own

U2 makes each legislature's and council's laws its own, so that once unit U3 opens every state's legislature and U4 other towns' councils, no other place's law, vote or event lands as the town's. A builder finds each site below by its function name; the base the line numbers refer to, and the record of what was agreed, are under Method at the end.

## 1. What U2 changes for the player

**What the player sees now.** Almost nothing changes yet. Today only Congress and the player's own state legislature sit, and both belong to the town's chain. The chain is `lawChain(api)`: Congress, the town's state, its county, its township and the town.

**Why U2 must come first.** U3 will seat every state's legislature and U4 other towns' councils. Without U2, the first act of another state would be written as the player's own state law. The town's wage floor would move. The local paper would print it as state news. The town's lowest-paid workers would testify before that state's committee. The town's residents and employers would organize and pay dues over it. Congress's members would treat the question as freshly settled. Another town's ordinance would land as the player's town's own law.

**What U2 does.** Each body keeps its own:

- jurisdiction and effective date
- power check
- status quo and how fresh its law is
- interest groups, budget and events

**What players can see change in today's worlds:**

- Members of Congress and of the player's state legislature now choose bills by their own district's lean, the same lean they already vote by, instead of the town's. So the bills that reach the floor differ.
- In a town governed by its township, or by a municipio, the board's budget amendments now actually change the budget. Today they land nowhere.

## 2. Steps, in order

**Base and order.**

- Build after `governing/phase-in-dated-steps` merges, as agreed. Its `sectionDates` changes `billSections`, `billForm`, a new block after `countyOfBody` and `enact`, so rebase onto it.
- Build after #7020 (U1) merges, because U1 already seats every other place's chambers with `coversTown: false` (offices.ts:785-822 on that branch). If #7020 has not merged when you start, do steps 1, 2 and 4-9 first. Do step 3 and the `executivePriorities` part of step 10 after it merges.
- Commit in three groups so the records proofs in section 3 can tell them apart:
  - Group 1: steps 1-10.
  - Group 2: steps 11, 12, 14 and 15.
  - Group 3: step 13a, the filer lean, which is the change that alters behavior.
- U2 does not finish the pool item, so its merge must not flip the item to done. U3 and U4 are still to come.

### Step 1. `inTownChain`, the one chain test

- **Where:** `src/core2/laws-in-force.ts`.
  - :68-72 `inForceOn`
  - :251-257 the `pending` filter in `resolveLawInForce`, which holds the inline chain test at :255
  - :245 the sales-tax `localAverage` find
- **Change:**
  - Add `export function inTownChain(chain: Pick<LawChain, "levels">, jurisdiction: string): boolean { return chain.levels.some((l) => l.jurisdiction === jurisdiction); }` beside `inForceOn`.
  - Replace the inline test at :255 with `inTownChain(chain, row.jurisdiction)`.
  - At :245, use `input.localAverage.find((row) => row.jurisdiction === chain.stateKey && inForceOn(row, date))`.
  - The helper takes the chain as a parameter, so budgets' `residentLaw` keeps getting a worker's residence chain.
- **Why:**
  - Without the helper, the rule lives in three copies (here, `lawTookEffect` and `billJurisdiction`).
  - laws.ts:508 passes every jurisdiction's `local-sales-tax-average` rows. Once another state has one, a town with no local sales-tax row would take whichever state's row comes first.
- **Today:** no change.
- **Tests it touches:**
  - src/core2/laws.test.ts:412-470
  - law-enacted-over-scheduled.test.ts, laws-carry-forward.test.ts, laws-in-force-every-question.test.ts
  - withholding-outside-governments.test.ts
  - law-wiring-prices.test.ts, purchase-tax.test.ts, src/bench/issues-tax-levels.test.ts
- **Proof (new `src/core2/in-town-chain.test.ts`):** draw a place with `drawPlace(seed, "in-town-chain")` and build `lawChainForPlace(place.key)`.
  - `inTownChain` is true for every level.
  - It is false for another state key drawn from `placeStateKeys()` (never the town's), for `place:<another geoid>`, and for `chain.townPlaceId`. A place id is not a law key.
  - `resolveLawInForce("sales-tax")`, given another state's `local-sales-tax-average` row ordered first, still gives the town's city level the town's state's row.

### Step 2. One law key per office: `officeLawJurisdiction` and `bodyJurisdiction`

- **Where:**
  - New pure function in `src/core2/laws-in-force.ts`.
  - `src/core2/modules/legislature.ts`:
    - :1790-1800 `billJurisdiction`
    - :5011-5024 `countyOfBody`, plus the stray doc comment at :4998, which belongs to it
    - :5000-5009 `townshipOfBody`
    - :52, the `governmentUnitsForPlace` import, whose only use is :5019
- **Change:**
  - `officeLawJurisdiction(chain, office: { level; jurisdiction; coversTown? })` returns:
    1. **Federal level:** `"US"`. This includes the `office:US-XX:us-house` and `us-senate` rows, whose jurisdiction is the state key (offices-state.ts:441-490).
    2. **State level:** `office.jurisdiction`, which is the state key (offices-state.ts:555 and :629-689).
    3. **County level:** let `own = governmentUnit(office.jurisdiction)?.countyGeoid`. `governmentUnit` also resolves `municipio:` ids (government-units.ts:184-191).
       - When `coversTown !== false`: return `county:${own}` if that is a chain level. Otherwise return the chain's first county level. Otherwise return the chain's city level.
       - The city-level fallback keeps every town with a county-level government but no county law level writing city law, exactly as today. That covers every municipio town and about 31 others, per the critic's probe; see critic wrong[0].
       - When `coversTown === false`: return `county:${own}`, or `office.jurisdiction` if the unit has no county.
    4. **Township level:** `office.jurisdiction`, the unit id. laws-starting.ts:110-115 and offices-local.ts:281-283 both take the first township, so the town's own board is always the chain's township level.
    5. **City level (council, mayor):**
       - When `coversTown !== false`: return the chain's city level. offices-local.ts builds councils from `governmentUnitsForPlace(sourceGeoid)`, so this is the town's own place.
       - Otherwise return `place:${governmentUnit(office.jurisdiction)?.placeGeoid}`, or `office.jurisdiction` when `placeGeoid` is null. Never return the town's own place.
  - In legislature.ts, export `bodyJurisdiction(api, bodyOfficeId)`:
    - `FEDERAL_HOUSE` and `FEDERAL_SENATE` (:2327-2328) give `"US"`.
    - Any other id gives `officeLawJurisdiction(lawChain(api), <offices row>)`.
    - A missing row gives the chain's city level, which is today's default.
  - `billJurisdiction` returns `bodyJurisdiction(api, bill.bodyOfficeId)`.
  - `countyOfBody` returns that value when it starts with `county:`, else null. `townshipOfBody` gives the same result as today.
  - `billReach` (:1761-1787) is unchanged. Its level still comes from the body row, so a municipio board stays at level `city`.
  - Delete the `governmentUnitsForPlace` import.
- **Why:** today `billJurisdiction` returns `chain.stateKey` for every state chamber and the town's own `place:` for every council. `countyOfBody`'s lookup can never match, because no county unit has a `placeGeoid`. So the board's county is always `countyGeoids[0]`.
- **Today:** this changes only towns where the county board's own county is a chain level other than `countyGeoids[0]`. The critic's probe found 5, for example Blythe, Georgia. Their ordinances move from `countyGeoids[0]` to the board's own county. Both are chain levels.
- **Tests it touches:**
  - township-law-level.test.ts:97-106
  - world-legislating.test.ts (including :393, `meetingRule` with `countyGeoids[0]`)
  - law-wiring-government.test.ts
  - state-session-end-effective.test.ts:208-264
  - vote-level.test.ts:56-75
  - laws.test.ts:117
- **Proof (new `src/core2/body-jurisdiction.test.ts`):** draw places, a bounded number of times.
  - For every offices row with `coversTown !== false`, the result is a chain level.
  - It also equals c9b60ce1ed's `billJurisdiction` rule, written into the test as the oracle, except in the board-county case, which the test names.
  - Keep drawing until one place has a county-level board and no county law level, and one has a township board. Find them by these data properties, never by a state's name.
  - For copies of one office per level with `coversTown: false`:
    - state gives its own key
    - county gives `county:<geoid>`
    - a council gives `place:<placeGeoid>`
    - a unit with a null `placeGeoid` gives its unit id

### Step 3. One "outside office" rule, merged with U1's

- **Where:** `src/core2/modules/offices.ts` on #7020: :239-261 `isOutsideOffice` and :263-280 `seatingPlace`.
- **Change:**
  - While the laws module is open, `isOutsideOffice` becomes `office.level !== "federal" && !inTownChain(chain, officeLawJurisdiction(chain, office))`. Keep #7020's state-key test only for when laws is closed (offices-only unit tests).
  - `seatingPlace` places an outside office at `officeLawJurisdiction(chain, office)`. For a state office that is the same as today's `office.jurisdiction`.
  - laws.ts imports neither offices.ts nor legislature.ts on c9b60ce1ed, so offices.ts may import `lawChain`. If that import makes a cycle, read the laws module's stored `chain` row instead.
- **Why (critic gap 1):** U1's rule returns false for every local office, while `inTownChain` returns false for another town's council. Under U4 the two rules would disagree.
  - The critic proposed `bodyJurisdiction` from legislature.ts. That does not work as written: legislature.ts imports offices.ts, so calling it from offices.ts makes a cycle, and `isOutsideOffice` also covers executives, which are not bodies. Hence the pure function in laws-in-force.ts.
- **Today:** no change. The two rules agree on every row.
- **Tests:** rerun offices-every-legislature.test.ts and wide-races.test.ts from #7020.
- **Proof:** add a case to body-jurisdiction.test.ts. In a built world, for every offices row, `isOutsideOffice(api, o) === (o.level !== "federal" && o.coversTown === false)`.

### Step 4. `lawTookEffect` stops before any town read for an outside law

- **Where:** `src/core2/modules/laws.ts:766-843`. The gate goes right after `if (!row || !inForceOn(row, api.state.date)) return;` at :771, before the first `lawInForce` at :775.
- **Change:**
  ```ts
  if (!inTownChain(lawChain(api), row.jurisdiction)) {
    // stopgapId: SG-GOV-other-place-law-effects
    api.stopgap("SG-GOV-other-place-law-effects");
    return;
  }
  ```
  - `enactLaw` (:631-723) is unchanged. Its calendar entry still fires and stops at the gate. An optional speed change is to skip scheduling an outside row, using the same `inTownChain` test.
- **Why:** today an outside row runs four `lawInForce` resolves on the town's chain. It then emits `law-took-effect` with the town's placeId, `news: true` and the town's prior amount. For a minimum wage it runs `raiseToFloor` (:841), and for the public pay floor it runs `recordPublicPay` (:842).
- **Readers this one gate covers, with no edits in them:**
  - law-reach host.ts:41-42 and :143-169. Without the gate, the group-b `incomeTaxAct` would enact a town-state income-tax row.
  - outcome-web.ts:685-715
  - budgets.ts:354-358
  - recalls.ts:119-125
  - the press, news, the Journal and the law street stop
  - src/bench/changes.ts:41-92 `lawsTook`, and reached.ts
- **Readers that keep reading outside rows:**
  - the body's own next sitting: world-legislating.ts `answerIn` :220, `ownRow` :292, and laws.ts `questionSettled` :591-625
  - budgets.ts `residentLaw` :1506-1549, which withholds for workers who live in that state
  - laws-death-taxes `rowInForce`
- **Today:** no change. No played world writes a law row outside the chain.
- **Tests it touches:**
  - law-took-effect-superseded.test.ts:38 and :103
  - laws.test.ts:412-470
  - world-legislating.test.ts:52 and :514
  - public-pay-floor-hire.test.ts, press-amount-law.test.ts
  - src/director/bring-it-up-law.test.ts, src/director/journal-law-effect.test.ts
  - laws-death-taxes.test.ts:164-221. It enacts other states' rows through `enactLaw` and keeps passing.
- **Proof:** the edge fixture in section 3, plus one new assertion in laws-death-taxes.test.ts:164-221: no `law-took-effect` exists for the other states' rows, and their own readers still tax.

### Step 5. The other readers of the laws table

**(a) law-reach opening scan.** `src/core2/law-reach/host.ts:55-63`: add `inTownChain(lawChain(api), r.jurisdiction)` to the filter. This is latent today.

- Tests: starting-policy-law.test.ts, law-reach-group-a.test.ts, law-reach-group-b.test.ts, township-law-level.test.ts.

**(b) "What changed": laws ahead.** `src/bench/changes.ts:13-35`, the filter at :23: also require `inTownChain(lawChain(coreAPI(core)), law.jurisdiction)`. This read bypasses events, so the gate in step 4 does not cover it.

- No test covers it today. Add `src/bench/changes.test.ts`: an outside enacted row with a future date is not listed, and a chain row is.

**(c) The outcome web's law causes, by each place's own chain (critic gap 7).** `src/core2/modules/outcome-web.ts:201-229 lawValue`, with callers at :430-435 `causeAt`, :471-478 `baselineOf` and :586-587 `recordMonth`.

- **Change:** pass the reading's `placeId`. Change the open branch only:
  - For the town (`placeId === chain.townPlaceId`), read rows where `inTownChain(townChain, row.jurisdiction)`.
  - For another place in `placesOf` (:165-190), read rows in that place's own `lawChainForPlace` (through `corePlaceByJurisdictionId`), plus that chain's starting rows that the town does not share.
    - This is the pattern budgets.ts uses at :1483-1497 and :1534-1546. Move `residenceLawFor` into laws.ts and call it from both places, so there is one resolver.
    - Cache the result per place.
  - A place that does not resolve reads the town's chain, under SG-WEB-place-law-unresolved. Register it only if such a place actually occurs.
  - Leave the fallback branch for a closed laws module alone: outcome-web.test.ts:261-272 and :399-414 emit `state:${place.state}` there.
- **Today:**
  - The town itself does not change.
  - A place other than the town no longer moves on the town's own county or city law, nor on the town's state law if it lies in another state. It reads its own state's starting law instead.
  - Baseline and current read the same rows, so such a place moves only when its own law changes.
- **Tests:** outcome-web.test.ts (unchanged), plus re-runs of outcome-web-places-played.test.ts, outcome-web-health-played.test.ts, outcome-web-environment-played.test.ts, law-wiring-small-dollar-lenders.test.ts and outcome-web-public-finance.test.ts.
- **Proof:** a new case in outcome-web-places-played.test.ts. In a played world, enact another state's "yes" on one of `LAW_CAUSES`. Neither the town's `lawValue` nor its month row moves.

### Step 6. Freshness comes from the body's own law

- **Where:**
  - laws.ts:456-479 `lastEnactment`, which reads `seriesRows` with `bySeriesOnly` at :407-412.
  - legislature.ts:
    - :2670-2681 `settledness`
    - :2698-2719 `recordConsistency`
    - :2722-2727 `billSettledness`, read at :2807 `positionOn` and :4355 `executiveLean`
  - world-legislating.ts:380-396 `lawStanding`.
- **Change:**
  - `lastEnactment(api, series, jurisdictions: ReadonlySet<string>)` queries `bySeries [j, series]` (the index at laws.ts:116) for each jurisdiction in the set. It no longer filters `bySeriesOnly`.
  - `settledness(api, series, jurisdictions)`.
  - New `bodyJurisdictions(api, officeId)` beside `bodyJurisdiction`:
    - A chain body gets every chain level. That is today's set, and Congress keeps it.
    - Another state's body gets `{"US", its key}`.
    - Another county's or town's body gets `"US"`, its state and its own `lawChainForPlace` levels, or `"US"`, its state and its own key when the place does not resolve.
  - `recordConsistency` and `billSettledness` pass `bodyJurisdictions(api, bill.bodyOfficeId)`.
  - `lawStanding` takes the session's set from `fileChanges`, calls `lastEnactment` once and derives `settled` from that one result.
  - Memoize the bill's `{jurisdiction, own, jurisdictions, settled by series}` per bill. Key it on the bill id, the date and `api.moduleState(LAWS_MODULE_ID).writes`, as laws.ts:526-539 does. Skip the memo when `tableTraceOn()`.
- **Why:** under U3, an act passed last week in another state would make the town's state legislature and Congress read that question as just settled. That moves their taste for change and their reluctance to reverse.
- **Today:** no change. Every row today is a chain row.
- **Tests:** no direct test. Indirectly:
  - legislature.test.ts, modules/legislature.traits.test.ts
  - world-legislating.test.ts:52, :269, :341
  - floor-every-bill.test.ts, session-moot-bills.test.ts:43
  - src/director/desk-scene.test.ts, src/director/journal-signing.test.ts
- **Proof (new `src/core2/settledness-own-body.test.ts`):** enact a row dated today at another state's key.
  - The settledness of a chain bill on that series does not change.
  - A bill in that state's chamber (step 3's offices row) reads it as fresh.

### Step 7. The status quo a bill amends is its own body's law

- **Where:**
  - laws.ts, a new `lawInForceIn(api, series, jurisdiction)`.
  - legislature.ts:
    - :1318-1329 `currentAmount`
    - :1272-1308 `provisionStance`
    - :5082-5087, `enact`'s shape base
    - :1638-1640 `lawInForceRow` and :1681-1692 `billSections`
- **Change:**
  - `lawInForceIn`:
    - A chain jurisdiction gives `lawInForce(api, series)`, as today.
    - Otherwise it resolves over the body's own chain with the shared `residenceLawFor` rows from step 5c. Budgets' `residentLaw` calls the same helper, so there is one resolver.
    - For a state key, use a chain of `"US"` plus that key. Guard the city-level `findIndex` at laws-in-force.ts:241-250, which returns -1 when a chain has no city level.
  - `currentAmount` and `provisionStance` take an optional jurisdiction. Inside legislature.ts, pass the bill's from `positionOn` :2737, `recordConsistency` :2706, `chamberVote`'s `recordVote` loop :3493-3494, `committeeStage` :3696 and `ownSections` :3832.
  - Callers outside the file keep the level-only default: bill-catalog.ts:85, bench/legislature.ts:197, staff.ts:925, campaigns.ts:3202, meetings.ts:274, interest-groups.ts:716.
  - The shape base becomes `lawInForceIn(api, series, jurisdiction).levels.find(l => l.jurisdiction === jurisdiction)?.row`.
  - For an outside bill, `billSections` reads `lawInForceIn`'s row. Keep `lawInForceRow(api, series)` for the town's draft card at bench/legislature.ts:527. Phase-in edits `billSections`, so rebase here.
- **Why:** another state's $12 wage bill would read as a cut against the town's state's $15 floor, which flips its members' stances. Its rate amendment would also lose the unit and schedule of the prior row.
- **Today:** no change.
- **Tests:**
  - record-vote-per-question.test.ts:108-119
  - legislature-sections.test.ts, income-tax-schedule.test.ts, bill-section-cite.test.ts
  - src/english/bill-sections.test.ts
  - legislature.test.ts, floor-every-bill.test.ts
  - withholding-outside-governments.test.ts (now runs through the shared helper)
- **Proof:** in the edge fixture, a wage bill before the other state's chamber is measured against that state's own floor.

### Step 8. The power check reads the body's own state

- **Where:**
  - `src/core2/policy-authority.ts`: :42-59 `stateLaw` (state read :48), :62-158 `policyAuthority` (:67), :165-190 `recordHomeRule` (target :178-182).
  - legislature.ts:
    - :2187-2264 `checkedText` (`policyAuthority` :2200, `authorityFor` :2209)
    - :1345-1421 `authorityFor`
    - :1956-1959, `draftBill`'s call to `recordHomeRule`
- **Change:**
  - `stateLaw` and `policyAuthority` take an optional `stateKey`, defaulting to `lawChain(api).stateKey`. It feeds:
    - the dc or territory column (:68-74)
    - preemption (`answers[state]`, :120 and :133)
    - the gate-question law and home rule (:125, :128, :142)
  - `checkedText` derives the body's state: the key itself for a state body, or `` `US-${governmentUnit(office.jurisdiction)!.stateUsps}` `` for a local body. It passes that state on.
  - `authorityFor(api, p, stateKey?, chain?)`, defaulting to the town's:
    - Minimum wage: `localAuthority(rows, enacted, chain, date)` (:1359) over the body's chain. Filter rows to that state so `source: rows[0]` (:1365, :1373) never cites another state's row.
    - Income tax: `lawInForceIn(api, "local-income-tax-authority", stateKey)` (:1386).
    - Sales tax: `r.jurisdiction === stateKey` (:1393).
    - Policy question: `policyAuthority(api, q, "city", stateKey)` (:1413).
  - `recordHomeRule` runs only when `inTownChain(chain, bodyJurisdiction(api, bodyOfficeId))`. It targets the body's own budget government (step 10), not the first government at that level.
- **Why:** another state's chamber would be checked against the town's state. In a D.C. or territory town, every state would get the dc or territory column. Guam's legislature would get the state column. Another town would get the town's state's preemptions and home rule, and its drafts would carry the wrong authority, warning and blocked status.
- **Today:** no change.
- **Tests:**
  - policy-authority.test.ts:34, :44, :63, :68, :117, :183
  - legislature.test.ts:107, :1003, :1099, :1143, :1187, :1223, :1285, :1409
  - home-rule-played.test.ts:26, law-wiring-government.test.ts:144 and :387
  - bench/bill-paper.test.ts, bench/bill-paper-authority.test.ts, bench/seat-bill-text.test.ts
  - director/opening-asks.test.ts, director/desk-scene.test.ts, director/desk-visit-scene.test.ts
  - executive.test.ts:228, law-reach-group-a.test.ts:565 and :573
  - carry-ask-played.test.ts, contest-positions.test.ts:236, office-day-desk.test.ts
- **Proof:** a new case in policy-authority.test.ts. Draw two jurisdictions whose `jurisdictionKind` differs, found by data. `policyAuthority(api, q, "state", other)` reads the other's column, and with no `stateKey` the answer is today's.

### Step 9. No town people or town rules for an outside body

- **Where and change:**
  - **Fiscal note.** `costOf`, legislature.ts:1459-1477, reached from `checkedText` :2259: pass it the body. For an outside body return `{ workersRaised: 0, annualPayMinor: 0, note }` under SG-GOV-other-place-fiscal-note. `employerCosts` (:665-686) stays town-only.
  - **Hearing witnesses.** `committeeStage` witnesses, :3676-3690: draw them only when `bodyPlace(api, bill.bodyOfficeId).own` (step 11). Otherwise there are none, under SG-GOV-other-place-witnesses. The speech placeId at :3707 stays the town's, since only chain bodies hear witnesses.
  - **Mayor's veto.** `mayorVeto(api, bodyOfficeId?)`, :4827-4842, called from `executiveAction` :4401 and `budgetDesk` :4496:
    - Read `MAYOR_VETO` for the body's state.
    - Read the population from that place's data, under SG-GOV-other-place-population, because `api.state.placeMetadata` holds only the town's.
    - The default stays the town's, so legislature.test.ts:1038, executive.test.ts:165, desk-visit-scene.test.ts:88, journal-signing.test.ts:72 and desk-scene.test.ts:78 still call `mayorVeto(api)`.
  - **Governor's desk.** `signingDeadline` (`vetoWindows`, :5280-5283) and `executiveItemVeto` (`lineItemVetoOf`, :4889) read the executive office's own state key. This is latent: only the player's own chain executive waits on a desk.
- **Why:**
  - The town's workers would testify before another state's committee and move its members.
  - The town's jobs would fill another state's fiscal note.
  - Another town's mayor would get the town's state's veto rule.
- **Today:** no change.
- **Tests:**
  - interest-groups.test.ts, bench/bill-paper.test.ts
  - legislature.test.ts:306 (`costEstimate`) and :1059-1064 (`signBy`)
  - office-day-committee.test.ts:116-117, director/hold-scenes.test.ts
  - state-item-veto.test.ts

### Step 10. A body's budget is its own government's

- **Where:**
  - budgets.ts:636-735 (governments), :455-457 (`governmentKey`), :1790-1798 (`amendBudget` returns null)
  - legislature.ts:
    - :5110-5124, `enact`'s `amendBudget` and `payProjectGrant`
    - :1170-1246 `budgetChambers` (filter :1193-1199, local find :1222-1230)
    - :1107-1150 `executivePriorities` (find :1120, which #7020 already narrows by state jurisdiction)
- **Change:**
  - New `budgetGovernmentOf(api, officeId)` in budgets.ts:
    - federal gives `"US"`
    - state gives `office.jurisdiction`
    - a local office gives the government whose treasury's `governmentFacts.governmentKey` equals `office.jurisdiction`. budgets.ts:456 already stores the unit id there.
    - a body covering the town with no match falls back to today's level match.
  - `enact` amends budgets and pays grants through `budgetGovernmentOf(api, bill.bodyOfficeId)` instead of through the law key.
  - `budgetChambers` and `executivePriorities` keep today's level match for bodies covering the town and skip offices with `coversTown === false` (critic wrong[1]).
- **Why (critic gap 3):** one government can have two ids.
  - In a town governed by its township, the law key is the township's unit id but the budget government is `place:<geoid>` (budgets.ts:671 and :722).
  - In a town whose county-level government is its municipio, the law key is the chain's city level but the budget government is `county:<geoid>` (budgets.ts:689-716).
- **Today, two changes named here:**
  - In the 4,382 of 32,350 localities governed by a township (critic's probe), a township board's budget-line act now amends the town's budget instead of finding no government.
  - In municipio-governed towns, the municipio legislature's budget-line act now amends `county:<geoid>`.
- **Tests:**
  - office-day-budget-season.test.ts:37-38 and :497
  - budget-line-schools-staffing.test.ts:26 and :68
  - budget-desk.test.ts, home-rule-played.test.ts
- **Proof (new `src/core2/body-budget-government.test.ts`):** draw until one place has a township board and no municipal government, and one has a county-level government but no county law level. In each, a budget-line bill from the town's own board moves its budget government's line by the bill's amount.

### Step 11. One emit helper for every body's records

- **Where:** legislature.ts, new `bodyPlace(api, officeId)` returning `{ own, jurisdiction, placeId, news }`, and `emitForBody(api, officeId, event)`.
- **Change:**
  - `own = inTownChain(lawChain(api), bodyJurisdiction(api, officeId))`.
  - A chain body: `placeId` is the town's, and the site's own news flag stands.
  - An outside body: `placeId` is the body's jurisdiction, and news is false.
  - Always set `facts.jurisdiction`.
  - Filter `personIds` and `witnessIds` to `api.state.people` or `api.state.husks` (critic gap 8). state.ts:2129-2131 throws on an absent person, and under U3 outside members are not filled in. `legislative-vote` keeps naming every member who is present, so the director's ledger still takes a watched member's floor vote as a scene cause.
  - `publicRecord` is unchanged.
- **Sites (placeId line in parentheses):**
  - `holdCouncilBudgetHearing` `budget-hearing`, :839-858 (:844)
  - `councilBudget` `legislative-vote`, :980-1004 (:987)
  - `askToCarry` `carry-asked`, :2981-3005 (:2989; key by `input.bodyOfficeId`)
  - `chamberVote` `legislative-vote`, :3509-3535 (:3516)
  - `committeeStage` `committee-hearing` and `bill-held-in-committee`, :3756-3783 (:3766; `news = own && heard`)
  - `floorAmendments` `bill-amendment`, :3949-3979 (:3956)
  - `recordPromises` `vote-promise`, :4134-4157 (:4142)
  - `recordFailure` `bill-failed`, :4181-4203 (:4186)
  - `executiveAction` `bill-presented`, :4433-4458 (:4441; latent)
  - `decideAtDesk` `veto-override`, :4557-4588 (:4565)
  - `decideAtDesk` `executive-action`, :4606-4634 (:4614)
  - `executiveItemVeto` `item-veto`, :4975-4994 (:4980; latent)
  - Outside legislature.ts:
    - meetings.ts `public-comment`, :462-480
    - leadership.ts `chamber-organized`, :444-470 (placeId from the offices `loaded` row at :451-456)
- **Meetings gates:**
  - `publicComment` (meetings.ts:415) returns when the bill is not `own`.
  - `considerTownHalls`' filter (:878) adds `own`. Without it, `members()` at :882 would fill in every outside body's members each week (critic gap 5).
  - `local()` (:280-282) stays a test of the body's kind. It picks `billQuestion`'s level (:272) and `signUpToSpeak`'s kind (:314); see critic wrong[3].
- **Who reads an outside placeId (critic wrong[4]):**
  - For another state, that state's filled-in officials live at its key (officials.ts:800). So news.ts `readersOf` (:224-226), in worlds without the press, and ledger place reach (ledger.ts:1660-1663) reach that state's own officials. That is correct.
  - For a `county:`, `place:` or unit-id placeId, nobody's placeId matches.
  - `retainLog` (state.ts:737-740) keeps an outside record only for the player's circle, because its placeId is not in `visiblePlaceIds` and its news is false.
- **Today:** only chain bodies sit, so the only change is the added `facts.jurisdiction`. No test asserts exact facts on these events; press-public-facts.test.ts:58 compares its own fixture.
- **Tests:**
  - vote-level.test.ts:29-80 and :83-240
  - director: government-scenes.test.ts:125, own-bill-failed-scene.test.ts:97, carry-bill-scene.test.ts, hold-scenes.test.ts, bargain-scenes.test.ts, vote-confirmed-scene.test.ts, journal-bill-names.test.ts, staff-news-scene.test.ts, staff-bad-news.test.ts, desk-visit-scene.test.ts, desk-scene.test.ts, recall-override-scenes.test.ts, officeholder-scenes.test.ts, journal-signing.test.ts, hearing-scenes.test.ts, cause-names.test.ts
  - bench: archive-words.test.ts:53-68, own-ordinance-in-the-paper.test.ts:79 and :137, printed-words.test.ts, guide-terms.test.ts
  - core2:
    - budget and legislature: office-day-budget-season.test.ts, budget-desk.test.ts, carry-ask-played.test.ts, floor-every-bill.test.ts, office-day-committee.test.ts, world-legislating.test.ts:128-140, state-item-veto.test.ts
    - overrides and voting: override-replies.test.ts, recall-override-records.test.ts, voting-winner-person.test.ts:55-67
    - meetings: meetings-counted-speakers.test.ts
- **Proof (new `src/core2/body-events.test.ts`):** take one chain bill and one bill before a `coversTown: false` office row, and check every kind above.
  - Chain: the town's placeId, the original news flag, and `facts.jurisdiction` a chain level.
  - Outside: the body's key, no news, `facts.jurisdiction` set.
  - An unfilled official's id in `members()` is dropped, not thrown.

### Step 12. `office.voted` and `vote-recorded`

- **Where:**
  - state.ts:722-736, the circle test inside `retainLog` (:728-736)
  - legislature.ts:3423 `chamberVote`, with its emit at :3460-3474
  - record.ts:88-130 `recordVote`, which emits at :104-128
- **Change:**
  - Extract `export function inPlayerCircle(core, id)` from the circle test (`focusPersonIds`, `playerId`, `isExplicitlyControlledPersonV1`) and have `retainLog` call it.
  - In `chamberVote`, compute `const place = bodyPlace(api, officeId)` once, before the member loop.
  - Emit `office.voted` for a full-person member who voted yes or no, when `place.own || inPlayerCircle(core, key)`, through `emitForBody`.
  - Do not gate it on `votesAreTownNews`. That would stop the record for every member of Congress and every outside-district state legislator, the player's circle included (plan critique.wrong[0]).
  - `recordVote(api, vote, options?: { townNews?: boolean })`. `chamberVote` passes `{ townNews: place.own }`. When it is false, no `vote-recorded` is emitted, but the vote row is still written. Readers of that row: government-bodies.ts `recentVotesOf` :148-201, and press.ts `votesOf` at :1438, :1517-1530, :2172 and :2244.
  - `votesAreTownNews` (officials.ts:1717-1725) is unchanged, so its two-argument test calls stay valid. The critic wanted `votesAreTownNews` to call `bodyJurisdiction`. That would make officials.ts import legislature.ts, which imports officials.ts. So the gate comes from the one caller as an option instead.
- **Today:** no change.
- **Tests:**
  - src/director/journal-bill-names.test.ts:145-161, journal-relative-acts.test.ts:94-103, ask-before-the-roll.test.ts:271
  - record-vote-per-question.test.ts:108-119, :266-283, :433, :458
  - record.test.ts:416-436
- **Proof:** in the edge fixture, the outside roll call emits no `office.voted` except for the one member put in `focusPersonIds`, and no `vote-recorded`. Its record rows exist under that body.

### Step 13. World legislating

Message the governing lead before editing `fileChanges`; its co-sponsor work sits at :479-530.

**(a) Filer lean (behavior change).** `filerOf`, :349-371, home at :357: use `home: officialOf(api, key)?.districtLean ?? (person ? townLean(api) : lean)`. This is officials.ts:85, the same read as past-bodies.ts:120. Rewrite the doc at :329-335, which says "until district views are modeled". Commit this alone, as group 3.

**(b) Optional state on the level checks.** `questionForLevel` (:135-146, state read at :140) and `levelMayDecide` (:157-169) take an optional `stateKey` and pass it through. Local levels call `authorityFor(api, provision, stateKey)` (step 8). contest-positions.ts:59 keeps the default.

**(c) State sessions.** `openSession`'s `allowed` (:962-963) passes the session's jurisdiction for a state session.

**(d) Freshness.** `lawStanding` uses step 6's set.

**(e) Local meetings.** `localMeeting`, :1394-1444:

- `jurisdiction = bodyJurisdiction(api, officeId)` replaces :1411-1420, including the `?? chain.townPlaceId` fallback at :1420.
- `needsChange` (:1435-1438): a raise reads the body's chain (`inForceForTown` :282-290 for a chain body); a repeal reads `ownRow(api, jurisdiction, question) === 1`.
- `allowed` (:1439-1440) passes the body's state.
- `townBodies` (:198-211) keeps only offices whose `coversTown` is not false, until U4 supplies other places' reads.
- **Today:**
  - Where the chain has no county level, the county-level board's session jurisdiction becomes the chain's city level instead of the town's place id. Its repeal branch opens (`!!own` was false), and its sessions row's `stateKey` changes.
  - In the board-county towns from step 2, the meeting reads the board's own county, which now matches the enactment.

**(f) Floor order weight.** In `fileChanges`' concern weight (:540-544), apply `townConcernShare` only when `inTownChain(lawChain(api), input.jurisdiction)`. After (e), that jurisdiction is a law key for every session (critic wrong[2]). Otherwise the weight is 0, under the SG-GOV-other-place-concern-weight marker. No change today.

**(g) Moot bills.** `mootAtFloor` (:665-683) needs no edit; step 2 fixes it.

- **Tests:**
  - world-legislating.test.ts:52, :269, :341, :558
  - floor-every-bill.test.ts:46, session-moot-bills.test.ts:43, committee-chair-reasons.test.ts:38
  - legislature-committees.test.ts:63 and :96, state-session-end-effective.test.ts:85 and :208
  - contest-positions.test.ts:161 and :349, township-law-level.test.ts:37, home-rule-played.test.ts:26, session-calendar.test.ts:89
  - tests/golden-path/played-world.node-test.ts:571-576 ("a non-budget bill is introduced")
- **Proof:** a new case in world-legislating.test.ts. In a played year, every Congress and state filer's `home` equals their officials row's `districtLean`, by member key.

### Step 14. Interest groups

- **Where:** interest-groups.ts:202-207 `organize`, and :151-162, the `afterVote` hook that calls `settleBribes` (corruption.ts:565-576).
- **Change:**
  - In `organize`, after the module check: `if (!bodyPlace(api, b.bodyOfficeId).own) return;`.
  - The `afterVote` hook returns on the same test before calling `settleBribes` (critic gap 9).
  - `organizeResidents` (:568-702), `organizeEmployers` (:278-380), `lobbyistFor` (:453-514) and `lobbied` (:517-538) stay town-only.
- **Why:**
  - Without the gate, the town's residents and employers would organize and pay dues (:409-436) over another state's bill, with no one there to lobby.
  - The bribe hook scans the whole crimes table for every bill voted, outside bills included.
- **Today:** no change.
- **Tests:**
  - interest-groups.test.ts:48 (`it.each` over chain bodies)
  - interest-groups.traits.test.ts (unaffected)
  - src/director/desk-visit-scene.test.ts:48 and :340
  - tests/golden-path/played-world-modules.node-test.ts:83
- **Proof:** in the edge fixture, the outside wage bill forms no group and posts no dues.

### Step 15. The press's wire (Review: words)

- **Where:** main's `src/core2/press-topics.ts`. It changed after c9b60ce1ed (#7022, 75308ec05a), so write against main:
  - `seatOffice` :88-101
  - `wireItem` :107
  - the held-seat check :113-123
  - the `officeLevel` call :126
  - the level choice :127-136
  - the switch :154, with the recorded-kind drops at :157-158 and the `vote-recorded` drop at :171-174
- **Change:**
  1. Move the three cheap drops (`person.recorded`, `organization.recorded`, `vote-recorded`) above the seat check.
  2. Then, only when the laws module is open, read `const chain = lawChain(api)`:
     - For `took-office` and `seat-vacated`: when `seatOffice` returns an office and `!inTownChain(chain, officeLawJurisdiction(chain, office))`, return null. After #7020 every other place's seats are in the offices table, so #7022's `seat === null` no longer drops them (critic gap 2).
     - For any record whose `facts.jurisdiction` is present and not a chain level, return null.
     - A record with no `facts.jurisdiction` gets no check. Records about schools, crime or business, and the archive's past roll calls (past-news.ts:118-124), carry none.
  3. All of this runs before `officeLevel` (:126), so an outside record costs no term queries.
  4. Keep the `town` parameter. press-public-facts.test.ts:43 runs without the laws module.
- **Who sends `facts.jurisdiction` to `wireItem`:**
  - `law-took-effect` (laws.ts:816)
  - law-reach host.ts:204
  - the archive's law records (past-news.ts:107)
  - step 11's emits

  All of these are law keys. offices.ts:154 `office.seat-reached` carries an office's jurisdiction, but it is a history record that bench/card.ts:344 reads, not a wire record. Confirm with a grep before merge.

- **No edits needed:** press.ts `onEvent` (:380-413 on c9b60ce1ed; the `wireItem` call is at :408 on main) and `writeArchiveStory` (:2355-2378).
- **Tests:**
  - vote-level.test.ts:29-80 and :83-240: add an outside branch that expects null.
  - world-legislating.test.ts:105-127: keep as is.
  - recall-override-scenes.test.ts:46-53: chain overrides only.
  - press-public-facts.test.ts:43, voting-winner-person.test.ts:55-70, school-honors.test.ts:319 and :427.
  - bench/own-ordinance-in-the-paper.test.ts.
  - bench/printed-words.test.ts: add an outside-oath case.

### Step 16. Re-baselines and the PR body

- **Re-baseline after the filer change (13a):**
  - world-legislating.test.ts:52 and :269
  - floor-every-bill.test.ts:46, session-moot-bills.test.ts:43, committee-chair-reasons.test.ts:38
  - legislature-committees.test.ts:63 and :96, state-session-end-effective.test.ts:85 and :208
  - contest-positions.test.ts:161
  - tests/golden-path/played-world.node-test.ts:571-576

  These tests retry draws. Expect different draws and reports, and check that no draw loop runs out.

- **Re-baseline for the named changes:**
  - Steps 2 and 13e: board-county towns, and towns whose county-level government has no county law level.
  - Step 10: township-governed and municipio-governed budgets.
  - Step 5c: places other than the town in the outcome-web played tests.
- **Add an outside branch to:** vote-level.test.ts and recall-override-scenes.test.ts.
- **In the PR body, name:**
  - every changed behavior above
  - the stopgaps
  - the U3 dependency: outside members are not filled in
  - the bills-index pool item

**Not changed, on purpose:**

- Ledger place reach (ledger.ts:1627-1700) and news.ts `readersOf`: the outside placeId reaches only that state's own officials, which is correct (step 11).
- calendar.ts:188-191 `newsVisibility`: by design, a circle record is news to the player (the comment at :182-186). An outside vote that names a circle member is that player's news.
- `office.introduced` (:1960-1978): `wireItem` already drops an outside official's.
- `vote-ahead` (:577-598): it runs only in the player's chamber.
- `townshipOfBody`, `chambersOf`, `executiveOf`, `tieBreaker`, `bodyNumbering`.
- `residentLaw`'s own reads: they already read the right residence chain.
- The readers map's "second township" risk is dropped: offices-local.ts:281-283 also builds only the first township (critic wrong[5]).
- Owned by Words, not U2: the director's `civic-roles.ts` press-corps (:350-374) and clerk (:537-551) casting for an outside cause (see Seams).

## 3. The proof

**A. Edge fixture (new `src/core2/outside-body-law.test.ts`).**

1. **World.**
   - `seed = process.env.U2_SEED ?? randomBytes(8).toString("hex")`, and `place = drawPlace(seed, "outside-body-law")` from scripts/core2-year/place.ts:13.
   - `buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key })` from src/bench/world.ts:249 (every module installed, the press included).
   - Pick `other`, a state key drawn from `placeStateKeys()` by the seed that is not `lawChain(api).stateKey` and has a seated `legislature-*` office. #7020 seats these. If it has not merged, seat one through offices-state.ts `stateOffices(other, …)` with `coversTown: false`, the way #7020's `seatOutsideOffices` does.
2. **Snapshot before the bill:**
   - `lawInForce(api, series)` for the town
   - every commitment's hourly pay
   - the press wire table's ids
   - `logByKind("law-took-effect")`
3. **Drive the bill.**
   - `draftBill` on that chamber, with a member's `memberKey` as sponsor and one policy question or wage raise that `levelMayDecide(api, "state", q, 1, other)` allows.
   - `castMemberVote(api, bill.id, key, "yes")` for each member of each chamber in `chambersOf`.
   - `holdVote` in a bounded loop until the bill awaits signature, then `executiveDecision(api, bill.id, true)`.
   - `advanceCore` past `effectiveRule(api, bill).date`.
4. **Assert:**
   1. The law row has `jurisdiction === other`, level `state`, and `terms.enactedByBill === bill.id`. Its effective date follows `stateActEffectiveDate(other, …)`.
   2. No `law-took-effect` exists for that row id, and the SG-GOV-other-place-law-effects hit is recorded.
   3. No wire row and no public or news durable-log row for any of the bill's events. Its `legislative-vote` has `placeId === other`, no news, and `facts.jurisdiction === other`.
   4. The town's `lawInForce` and pay match the snapshot.
   5. `votesOn(api, bill.id)` rows carry `chamber` equal to the office id, and record-module rows carry `body` equal to the office id. Put one member in `core.focusPersonIds` before the vote: exactly that member has an `office.voted`, and nobody has a `vote-recorded`.
   6. No interest group or dues, no witnesses, and `costEstimate.workersRaised === 0`.
   7. The settledness of a town-chain bill on the same question does not change.
5. **Print** the place, key, seed, bill id and law row id.
6. **A second case (U4 preview):** enact at `place:<another geoid>`. No town event is emitted, and the town's law in force does not change.

**B. Today's worlds, by records proof** (speed-work skill). Draw three places with `drawPlace` using seeds the builder did not choose. In each, run `speed:year --place <key> --years 1 --proof-out <file>` on one pinned main and on the branch, one process at a time, and read the result with `compareProofs`.

- **After group 1:** identical, except tables explained by step 2 (board-county towns), step 10 (township-governed or municipio-governed places), 13e and 5c (places other than the town in the outcome web), when the drawn place has them.
- **After group 2:** differs only by the added `facts.jurisdiction` on the legislature, meetings and leadership events (the log and the wire's copied facts).
- **After group 3:** filings, floor order and what follows from them differ. That is the named filer change.

Add a played-year invariant test (new `src/core2/chain-bodies-played.test.ts`, `buildBenchWorld` with a drawn place, one year):

- every law row's jurisdiction is a chain level
- every event that carries `facts.jurisdiction` has a chain level there
- every `legislative-vote` has the town's placeId
- the `office.voted` count equals the yes and no votes of full-person members

The golden-path runner (`node --import tsx tests/golden-path/runner.mjs`) stays green.

## 4. Stopgaps to register

Register each in `src/core2/data/stopgaps.json` with `id`, `kind`, `file`, `line`, `whatItFakes`, `why`, `addedBy`, `addedAt`, `replacement` and `status`, with a `// stopgapId:` marker and an `api.stopgap()` call at the site.

| ID                                                                         | Where                                            | What it fakes                                                                                                                                                                                                                                               | Replacement                                                                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SG-GOV-other-place-law-effects (missing-mechanic)                          | laws.ts `lawTookEffect`, early return after :771 | A law of a body outside the town's chain reaches no one at its own place on its effective date: no event, no law-reach handlers, no wage raise, no outcome move there. Only its own body's next sitting and out-of-state workers' withholding read the row. | U3/U4 with the lives lead: that place's counted population and its husks read the row on its effective date through the same law-reach and wage engines. |
| SG-GOV-other-place-concern-weight (missing-data)                           | world-legislating.ts `fileChanges`, :540-544     | An outside body orders its floor calendar with no weight for how many of its residents a question touches (weight 0).                                                                                                                                       | A concern share from that place's counted population (counts by place, age, job and household).                                                          |
| SG-GOV-other-place-fiscal-note (missing-data)                              | legislature.ts `costOf`, :1459                   | An outside wage bill's fiscal note counts no workers and no pay.                                                                                                                                                                                            | That place's coarse workforce: counted jobs by pay, from world-metrics.                                                                                  |
| SG-GOV-other-place-witnesses (missing-mechanic)                            | legislature.ts `committeeStage`, :3676           | An outside committee hears no witnesses.                                                                                                                                                                                                                    | Witnesses filled in from that place's counted workers under the two-level population rule.                                                               |
| SG-GOV-other-place-population (missing-data)                               | legislature.ts `mayorVeto`, :4827                | Another town's mayor's veto threshold reads no population when the place data has none (`placeMetadata` is the town's only).                                                                                                                                | That place's reference population from the place data.                                                                                                   |
| SG-WEB-place-law-unresolved (missing-data), only if it occurs              | outcome-web.ts `lawValue`, :201                  | A place in `placesOf` with no recorded place reads the town's chain.                                                                                                                                                                                        | Its own chain once the place resolves.                                                                                                                   |
| SG-GOV-body-budget-government (partial-model), only if step 10 is deferred | legislature.ts `enact`, :5110                    | A township board's or municipio legislature's budget-line act finds no government.                                                                                                                                                                          | `budgetGovernmentOf`.                                                                                                                                    |

U2 does not register these, and here is why:

- **Another town's non-official member's lean** (`filerOf` and `leanOf` fall back to `townLean`). No such member exists until U4. Register it in U4 if U4 seats residents rather than officials.
- **Outside members not filled in.** U1's SG-GOV-other-legislatures-not-sitting already names it.
- **The director's casting for an outside cause.** Words decides it (see Seams).

## 5. Speed

The bar is a country's year in under two minutes, and no more than 20% slower than its base on the same machine, one process at a time. Measure with `npm run speed:year` (four years by default) on the same base before and after each group, following the heavy-runs skill.

- **Step 1:** at most 6 string comparisons per call.
- **Step 2:** one offices get and one government-units map get per call. `countyOfBody` gets cheaper: one map get instead of `governmentUnitsForPlace` plus a find.
- **Step 4:** the gate removes, per outside law:
  - four `lawInForce` resolves
  - `raiseToFloor`'s scan of every commitment and counted job
  - outcome-web's recompute of every place's month
  - `syncSalesTax`
  - the law-reach handler runs
  - recalls' scan of every adult
  - a wire row
- **Step 5c:** one chain plus starting-row build per place, cached for the run. Build the chain set once per `lawValue` call, because it runs for every law cause, every lagged month and every place.
- **Steps 6 and 7 (critic gap 4):**
  - Today `positionOn` runs once per member at many sites (:542, :903, :948, :1095, :2090, :2109-2110, :2929, :3106, :3138, :3162, :3898-4041, :4354), and `chamberVote` runs `provisionStance` per member (:3493-3494). Each call rebuilds `lawInForce` (no cache) and scans `lastEnactment` across every jurisdiction.
  - The per-bill memo (keyed on the bill id, the date and the laws write counter) makes this once per bill per day, which is a cut even today. Prove it exact with the group 1 records proof.
  - `lastEnactment` over `bySeries [j, series]` reads only the set's rows. After U3 this avoids reading 50 states' rows.
- **Steps 9 and 11-14:**
  - `bodyPlace` is computed once per roll call, not per member.
  - For every outside bill or record, these per-bill and per-member costs go away:
    - per-member `office.voted` events;
    - `organizeResidents`' scan of the town's adults, and `employerCosts`;
    - the bribes hook's crimes scan;
    - `townConcernShare`'s daily build on days only outside sessions open;
    - the weekly filling-in of outside members by `considerTownHalls`;
    - the term queries in `wireItem`.
- **Step 13a:** one indexed officials get per filer per sitting (535 at Congress's opening, 60 to 400 at a state's, 5 to 15 at a council meeting). It may change how many bills are filed, so measure it alone.
- **Not built in U2. File as one U3 pool item and name it in the PR body (search `docs/pool/items` first):**
  - **A bills index.** The bills table (legislature.ts:301) has no index, and it is scanned in full on paths that run per day and per gift:
    - campaigns.ts:3182-3215 `donorsBill` (every gift)
    - office-day-acts.ts:497-506
    - world-legislating.ts:1446-1457 `liveBills` and :1117-1141 `chamberBills`
    - meetings.ts:873-879
    - bench/office.ts:272
    - government-bodies.ts:150-153, which scans the record's votes table

    Add `byBody` and `bySponsor` indexes.

  - **The town's cached law.** `lawInForceToday`'s cache (laws.ts:526-539) is cleared by every outside enactment.

## 6. Seams

**Governing lead** (`docs/coordination/CREW.md`; Notes, Nov 1 20:00):

- U2 rebases on `governing/phase-in-dated-steps` after it merges. U2 then carries:
  - `sectionDates` into `effectiveRule`'s body-state read (`stateActEffectiveDate` keyed by the body's state, :1846-1857)
  - `enact`'s effective dates (:5050, :5081)
  - `billForm`'s effective section (:1906)
  - `billSections`
- No phase B unit edits `billJurisdiction`, the effective-date or power-check readers, or `lawTookEffect`, as agreed.
- Before merge, the governing lead sees:
  - U2's diff to `effectiveRule`, `enact`, `countyOfBody` and `billSections`
  - the step 13 diff in `fileChanges`, next to its co-sponsor work at :479-530 (send this before editing)
  - the filer-lean re-baselines

**Words** (owner of `press-topics.ts` and `src/director`):

- Step 15 is U2's change with `Review: words`, written next to #7022's held-seat check.
- Before merge, Words sees:
  - the `wireItem` diff
  - the outside branches in vote-level.test.ts and printed-words.test.ts
  - that a missing `facts.jurisdiction` means no check
  - that `legislative-vote` keeps `personIds` (filtered to people and husks)
  - that `office.voted` still reaches the Journal's own-votes row (journal-rows.json:360-375, journal.ts:1007-1016) for chain bodies and the circle
  - that `law-took-effect` exists only for chain laws (the Journal's law rows and the law street stop)
  - that an outside vote off the wire is right for bring-it-up.ts
- Before U3, Words decides how civic-roles.ts casts the press corps (:350-374) and the clerk (:537-551) for an outside cause. The proposal is to cast nobody, under a Words stopgap.

**U1 (#7020, laws lead):**

- Step 3 unifies `isOutsideOffice` and `seatingPlace`.
- The `executivePriorities` change in step 10 builds on #7020's state-jurisdiction check.
- Rerun offices-every-legislature.test.ts and wide-races.test.ts.

**Speed lead:** the bills-index pool item and the `lawInForceToday` invalidation, filed for U3. Share the U2 records proofs and the `speed:year` numbers.

**Lives lead:** SG-GOV-other-place-law-effects' replacement runs through husks and counted lives elsewhere.

## 7. Method

Base: `origin/main` c9b60ce1ed. Line numbers are on c9b60ce1ed unless a line says "main", which means 87bcf4bfbf (its `press-topics.ts` is the same as 708514a1b9). Later merges will move lines, so find each site by its function name. Pool item: `gov-every-state-and-town-governs` (U2 of `docs/reports/world-governing-plan-2026-10-29.md`). The agreed seams are in that item's Notes, Nov 1 20:00 UTC.
