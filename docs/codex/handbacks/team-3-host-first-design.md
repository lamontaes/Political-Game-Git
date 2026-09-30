# An evicted family asks people it knows before losing its home

The eviction repair now asks recorded relatives and close friends before recording no fixed home. It records host answers and writes occupancy only after acceptance. Ten direct tests pass; no watched household outcome is claimed. The draft remains unaccepted and needs Team 2's eviction proof before it can be ready. Shelter capacity still awaits research. Unknown money, compassion, prices and hosting costs remain explicit rather than becoming invented resources or rates.

## 1. Why-chain

Measured in the [published vacancy checkpoint](https://github.com/lamontaes/Political-Game-Git/blob/b3ced35fa23776e7192ec1e75c9d8513479a75ca/src/simulation/living-world/town-homes.ts#L528): the allocator chose existing vacant stock without asking a host. That chain ended at allocation rather than consent.

Measured in current source: `src/simulation/living-world/town-homes.ts:550` now reads actual relatives and close friends, orders them by the existing closeness reader, and records each host's acceptance, refusal or unresolved answer. The chain reaches actual hosted occupancy when a host accepts and any necessary move is supported. Otherwise it records no fixed home.

## 2. Research and owner decision

CTO4:40 authorizes host first, with recorded warmth, compassion, household size versus bedrooms, money and the host's circumstances. The decision is a qualitative character rule, not an empirical acceptance probability. No seeded acceptance roll or hosting rate is added.

Measured in source: `src/simulation/living-world/town-rent.ts:537` supplies the existing kind-and-size bedroom estimate. Its kind shares remain authored placeholders. Only an owned home without recorded bedrooms uses that estimate, flagged in the host answer. An unpriced rental does not gain estimated capacity from this repair.

Team 9 owns HUD shelter-capacity research. No shelter bed count or admission rate is supplied here. Fertility-intention evidence does not establish hosting behavior.

## 3. Seam and ownership

The repair uses the released town-homes.ts destination, enterHome and vacancy hunks, plus directly affected tests. Existing hosted occupancy and event writers are reused. No household merger, person, dwelling, car, motel, shelter or rental price is created.

Team 4 owns the released life.ts import and three generic helpers. Team 3 calls existing household readers without editing those helpers. The personality connection registry remains coordinator-owned; its one compassion-reader correction has been requested and is not written here.

## 4. Build plan and result

The seven-heading design was written and independently reviewed before implementation. The writer now reads living household members and dated kinship and interaction records. Existing closeness, including trust, commitment, estrangement and currency, determines ask order; warmth and stable identity break ties.

Measured in source: `src/simulation/living-world/town-homes.ts:629` counts all active occupants, including secondary residence, against recorded leased bedrooms or the flagged owned-home estimate. Unknown capacity stays unknown.

Measured in source: `src/simulation/living-world/town-homes.ts:695` reads recorded compassion, actual liquid money and existing compensation/rent terms. Favorable warmth or compassion supports hosting; insufficient space, recorded financial strain or estrangement opposes it. The rent-burden test reuses existing housing policy. Missing records do not become zero money or seeded compassion.

Host answers retain reasons and source IDs. Estrangement is recorded as a reason even when favorable warmth is also present. Acceptance writes primary hosted occupancy without creating a tenure or invented rent obligation.

Measured in source: `src/simulation/living-world/town-homes.ts:806` uses canonical movement for a host in another place. Existing school, work and player restrictions remain in force. An accepted host with a blocked move gets a separate unresolved-move record; the family asks the next candidate. Those restrictions are a remaining limitation, not proof that the host refused.

Measured in source: `src/simulation/living-world/town-homes.ts:1296` continues quarterly vacancy search using known compensation and existing active lease amounts under the inherited rent-burden rule. Unpriced stock or unknown pay cannot establish affordability. An old tenant's lease is not a landlord's new offer; landlord consent, screening and any changed rental terms remain morning work. This checkpoint supplies no new offer producer.

## 5. SIMULATED / RECORDS / WORLD PIECES / CHECKS

SIMULATED, measured in fixtures: a crowded closest host refuses, the next host accepts, recorded compassion changes an answer, and a warmer estranged relative follows a genuinely close friend. Future interactions do not determine an earlier host answer.

RECORDS, source finding: the writer records host answers, hosting occupancy, unresolved movement and the final destination. Every former eviction dwelling stays excluded. A replay or save continuation does not duplicate the order's destination.

WORLD PIECES: existing people, relationships, homes and money records. All occupants count toward capacity. Missing costs remain unavailable. No shelter, car or payable motel is supplied by this repair.

CHECKS, measured in `docs/codex/handbacks/team-3-replacement-checks.json`: 10 of 10 direct host/destination tests pass. The directly affected existing housing/rent tests pass 22 of 22, and court-record tests pass 7 of 7. Scoped types and lint are recorded in the receipt. Full build, browser and watched eviction proof are NOT RUN. Fixture results do not establish a real household's destination, costs or legal acceptance.

The why-chain terminal is recorded host choice and occupancy, with explicit unresolved cases. Shelter admission, landlord consent, travel costs and further school policy remain unbuilt or unverified.

## 6. Random-place proof

NOT RUN here. Team 2 owns the watched eviction report. It must identify the actual order, family, candidates in ask order, answers and their cited records, same-day occupancy or no fixed home, actual costs and missing inputs. A proof line from that report is required before ready status.

## 7. Named worked example

NOT RUN. No watched family, host, spare bedroom or cash balance is invented. The first example must come from the actual report, including refusals or no fixed home when that is the recorded result.

Method: CTO4:40 read on September 30, 2026. Feature-walkthrough invoked. The design preceded the source repair. Independent source review found and corrected secondary-occupancy counting, closeness ordering and missing estrangement reasons. Source checks are separate from CTO acceptance; only Merge may follow exact approval.
