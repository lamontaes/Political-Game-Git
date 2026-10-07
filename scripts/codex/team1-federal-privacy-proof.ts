import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {
  observerPlace,
  observerSetup,
  openObserverWorld,
} from "../../src/presentation/observer-world";
import { advanceWorld } from "../../src/simulation/world";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation/campaigns";
import { addDays } from "../../src/simulation/dates";
import {
  NATIONAL_DATA_PRIVACY_QUESTION,
  dataPrivacyCostOn,
} from "../../src/simulation/federal-data-privacy-law";
import { isLawEffectStamp } from "../../src/simulation/law-effect-stamp";
import { organizationProfileAt } from "../../src/simulation/life-queries";
import { payTownPaydays } from "../../src/simulation/living-world/town-pay";
import { townBusinesses } from "../../src/simulation/living-world/town-businesses";
import { stepTownFinances } from "../../src/simulation/living-world/town-finances";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";
function law(
  world: World,
  n: number,
  answer: "yes" | "no",
  resolvedAt: IsoDate,
): World {
  const question = world.policyCatalog!.propositionOrder.find(
    (id) =>
      world.policyCatalog!.propositions[id]!.stableKey ===
      NATIONAL_DATA_PRIVACY_QUESTION,
  )!;
  const measure = {
    id: `measure_privacy_${n}` as EntityId,
    stableKey: `test:privacy:${n}`,
    sequence: 90000 + n,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "test",
    designation: `HR ${n}`,
    shortTitle: "A test act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: resolvedAt,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question],
    propositionAnswers: [{ propositionId: question, answer }],
  } as unknown as LegislativeMeasureRecord;
  const enactment = {
    id: `enactment_privacy_${n}` as EntityId,
    stableKey: `test:privacy:${n}:enactment`,
    sequence: 91000 + n,
    measureId: measure.id,
    resolvedAt,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: resolvedAt,
    outcomeEventId: `event_privacy_${n}` as EntityId,
  } as unknown as LegislativeEnactmentRecord;
  return {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

// Draw places with the production observer selector, retaining five distinct states.
const seen = new Set<string>();
const cases: { seed: string; place: ReturnType<typeof observerPlace> }[] = [];
for (let n = 0; cases.length < 5 && n < 100; n += 1) {
  const seed = `team1-privacy-saved-${n}`;
  const place = observerPlace(seed);
  if (!place.stateJurisdictionKey || seen.has(place.stateJurisdictionKey))
    continue;
  seen.add(place.stateJurisdictionKey);
  cases.push({ seed, place });
}

const receipts = [];
assert.equal(cases.length, 5);
for (const { seed, place } of cases) {
  const opened = openObserverWorld(observerSetup(seed));
  let world = opened.world;
  for (let month = 0; month < 3; month += 1) {
    const since = world.currentDate;
    world = advanceWorld(world, 31, createCampaignElectionTransitionRegistry());
    world = payTownPaydays(world, since, null);
  }
  assert.equal(world.currentDate, addDays(opened.world.currentDate, 93));
  assert.ok((world.macroEconomy?.months.length ?? 0) > 0);
  const town = world.people[opened.anchorPersonId]!.homeJurisdictionId!;
  const businesses = townBusinesses(world, town).map((b) => ({
    organizationId: b.organizationId,
    kind: b.workplace.key,
    newcomer: b.outlet >= b.workplace.outlets,
  }));
  world = stepTownFinances(
    world,
    town,
    businesses,
    new Set(),
    "privacy-opening",
  ).world;
  world = advanceWorld(world, 1, createCampaignElectionTransitionRegistry());
  const baseline = stepTownFinances(
    world,
    town,
    businesses,
    new Set(),
    "privacy-proof",
  ).world;
  const passed = law(world, 1, "yes", addDays(world.currentDate, -1));
  const changed = stepTownFinances(
    passed,
    town,
    businesses,
    new Set(),
    "privacy-proof",
  ).world;
  const ids = businesses
    .map((b) => b.organizationId)
    .filter((id) => changed.townFinances?.businesses[id]);
  assert.ok(ids.length > 0, "actual business books must exist");
  const cost = dataPrivacyCostOn(passed, world.currentDate, town);
  let positive = 0;
  for (const id of ids) {
    const before = baseline.townFinances!.businesses[id]!;
    const after = changed.townFinances!.businesses[id]!;
    assert.ok(after.lastQuarterPrivacyCost! >= 0);
    assert.equal(before.lastQuarterPrivacyCost, 0);
    assert.ok(
      Math.abs(
        before.lastQuarterNet -
          after.lastQuarterNet -
          after.lastQuarterPrivacyCost!,
      ) <= 0.02,
    );
    assert.ok(after.cash - after.debt <= before.cash - before.debt + 0.02);
    if (after.lastQuarterPrivacyCost! > 0) positive += 1;
    assert.equal(after.lawEffectStamps?.length, 1);
    const stamp = after.lawEffectStamps![0]!;
    assert.ok(isLawEffectStamp(stamp));
    assert.equal(stamp.governingLawKey, "measure_privacy_1");
    assert.equal(stamp.jurisdictionId, town);
    assert.equal(stamp.appliedAt, world.currentDate);
    assert.equal(stamp.effectKind, "business-compliance-cost");
    assert.deepEqual(stamp.sourceRecordIds, ["measure_privacy_1", id]);
  }
  assert.ok(positive > 0);
  const reloaded = JSON.parse(JSON.stringify(changed)) as World;
  assert.deepEqual(reloaded.townFinances, changed.townFinances);
  const repealed = law(reloaded, 2, "no", world.currentDate);
  const next = stepTownFinances(
    repealed,
    town,
    businesses,
    new Set(),
    "privacy-repeal",
  ).world;
  for (const id of ids) {
    assert.equal(next.townFinances!.businesses[id]!.lastQuarterPrivacyCost, 0);
    assert.deepEqual(next.townFinances!.businesses[id]!.lawEffectStamps, []);
  }
  // Repeal writes this quarter, without rewriting the earlier world's snapshot.
  assert.equal(
    changed.townFinances!.businesses[ids[0]!]!.lawEffectStamps?.length,
    1,
  );
  const id = ids.find(
    (id) => changed.townFinances!.businesses[id]!.lastQuarterPrivacyCost! > 0,
  )!;
  const receipt = {
    seed,
    place: place.displayName,
    state: place.stateJurisdictionKey,
    date: world.currentDate,
    businessId: id,
    firm: organizationProfileAt(world, id)?.name,
    share: cost.share,
    cost: changed.townFinances!.businesses[id]!.lastQuarterPrivacyCost,
    beforeNet: baseline.townFinances!.businesses[id]!.lastQuarterNet,
    afterNet: changed.townFinances!.businesses[id]!.lastQuarterNet,
    stamped: positive,
    books: ids.length,
    reloadAndRepeal: "PASS",
    lawSource:
      "controlled enacted federal yes/no fixture; not natural legislative passage",
  };
  receipts.push(receipt);
  console.log(JSON.stringify(receipt));
}
writeFileSync(
  "docs/codex/effect-batches/team-1/privacy-five-state-proof.json",
  JSON.stringify(
    {
      status: "PASS",
      scope:
        "Five real seeded observer worlds; canonical clock and payroll preparation; controlled federal enactments; saved quarterly accounting, JSON reload and repeal. Not a nationwide audit or canonical Save/Continue.",
      receipts,
    },
    null,
    2,
  ) + "\n",
);
