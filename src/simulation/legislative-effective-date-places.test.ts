import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { smallWorld, smallWorldPlace } from "../../tests/fixtures/small-world";
import { decideAtDesk } from "../../tests/fixtures/enact-through-desk";
import { addDays, daysBetween } from "./dates";
import {
  governmentUnitsForState,
  type GovernmentUnitIdentity,
} from "./government-units";
import {
  availableMeasureSteps,
  introduceMeasure,
  measureEnactment,
  measurePosition,
  recordEnactment,
} from "./legislation";
import {
  seatBodyForPack,
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
} from "./legislation-scenarios";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { seatedChamberForPack } from "./governing/chamber-votes";
import { governorOfficeForJurisdiction } from "./governing/state-governing";
import {
  actAmendsCriminalCode,
  congressionalReviewEffectiveOn,
  operativeDateForEnactment,
  resolveLegislativeEffectiveDate,
  stateStatuteOperativeAt,
} from "./legislative-effective-date";
import {
  legislativePackForJurisdiction,
  legislativePackForWorkKey,
} from "./legislative-institutions";
import {
  legislativeRulePackForWorld,
  regularSessionRefusalText,
} from "./legislative-procedure-world";
import {
  chamberByKey,
  LOCAL_ORDINANCE_EFFECTIVE_DAYS,
  type LegislativeRulePack,
} from "./legislature-rules";
import { lifePlaceByKey, stateJurisdictionForKey } from "./life-places";
import { councilRules } from "./living-world/local-council-binding";
import {
  ensureLocalGovernmentSeatsForUnit,
  sittingLocalOfficers,
} from "./living-world/local-government-seats";
import { lawJurisdiction } from "./living-world/local-council-binding";
import { completeCouncilPassage } from "./municipal-ordinance-procedure";
import { nextMeasureNumbering } from "./measure-numbering";
import {
  DC_GOVERNMENT_KEY,
  ensureDistrictOfColumbiaCouncilOpening,
} from "./nationwide-world/district-of-columbia-council-opening";
import {
  ensureLocalGovernmentOrganization,
  placeLocalGovernmentUnits,
} from "./nationwide-world/local-governments";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";
import { statuteEffectiveDateEstimated } from "./governing/statute-effective-date";
import { applyInstitutionStep } from "./governing/legislative-clock";
import { ensureCouncilPrinciples } from "./governing/council-lawmaking";
import { deserializeWorld, serializeWorld } from "./serialization";
import { advanceWorld } from "./world";
import type { EntityId, LegislativeEnactmentRecord, World } from "./types";

/**
 * AU2-DUP-03: one effective-date function. In every one of the 56 places, a
 * state bill, a county ordinance and a city ordinance are carried to law by
 * the game's own routes, and the enactment writer dates each from its body's
 * rule pack: the state's recorded rule, the council's read rule, the local
 * ordinance estimate where none was read, or congressional review.
 */
const seed = "au2-dup-03-effective-dates-all56-20261008";

const rank = (id: string) =>
  createHash("sha256").update(`${seed}:${id}`).digest("hex");

/** A body's institution pack, where the game binds one to the unit. */
function localPack(unit: GovernmentUnitIdentity): LegislativeRulePack | null {
  const rules = councilRules(unit);
  return rules
    ? legislativePackForWorkKey(`institution:${rules.packId}`)
    : null;
}

/**
 * The place's own county and city governments, drawn by seed, in the order
 * the test tries them: the first whose body the game seats is used.
 */
function localBodies(usps: string) {
  const home = smallWorldPlace(`US-${usps}`);
  const listed = placeLocalGovernmentUnits(home);
  const ranked = [...governmentUnitsForState(usps)]
    .filter((unit) => unit.functionalActive)
    .sort((a, b) => rank(a.id).localeCompare(rank(b.id)));
  return {
    counties: [
      ...listed.counties,
      ...ranked.filter((unit) => unit.unitType === "county"),
    ].filter((unit) => localPack(unit)),
    countyReason:
      listed.countyReason ??
      "No county government is listed for this place's state or territory.",
    cities: ranked.filter(
      (unit) =>
        unit.unitType === "municipality" &&
        unit.placeGeoid &&
        lifePlaceByKey(unit.placeGeoid) &&
        localPack(unit),
    ),
  };
}

/** The opening world a body's ordinance is filed in, with the body seated. */
function seatedBody(usps: string, unit: GovernmentUnitIdentity) {
  // The ordinance's world opens in the body's own place: the city, or the
  // county, so its residents can hold its seats.
  const place =
    unit.unitType === "municipality"
      ? lifePlaceByKey(unit.placeGeoid!)
      : unit.countyGeoid
        ? lifePlaceByKey(`county:${unit.countyGeoid}`)
        : null;
  const opening = smallWorld({ place: place?.key ?? `US-${usps}`, seed });
  let world = ensureLocalGovernmentSeatsForUnit(
    ensureLocalGovernmentOrganization(opening.world, unit),
    unit,
    opening.jurisdictionId,
    [opening.personId],
  );
  // A government seated by its own opening (the District's Council).
  if (
    sittingLocalOfficers(world, unit).length === 0 &&
    councilRules(unit)?.governmentKey === DC_GOVERNMENT_KEY
  )
    world = ensureDistrictOfColumbiaCouncilOpening(world, [opening.personId]);
  return sittingLocalOfficers(world, unit).some((seat) => !seat.mayor)
    ? { ...opening, world }
    : null;
}

/** The first of a place's bodies of one kind that the game seats. */
function firstSeated(usps: string, units: readonly GovernmentUnitIdentity[]) {
  for (const unit of units.slice(0, 12)) {
    const seated = seatedBody(usps, unit);
    if (seated) return { unit, ...seated };
  }
  return null;
}

function enactStateBill(usps: string) {
  const key = `US-${usps}`;
  const jurisdiction = stateJurisdictionForKey(key)!;
  const pack = legislativePackForJurisdiction(jurisdiction.id);
  if (!pack) return null;
  const offices = ["governor", "state-legislature"] as const;
  // The first day the state's own legislature sits in regular session (a
  // legislature that meets in odd years sits in the next one).
  const probe = smallWorld({ place: key, seed, offices }).world;
  const played = legislativeRulePackForWorld(probe, pack.packId);
  let date = probe.currentDate;
  for (let day = 0; day < 800 && regularSessionRefusalText(played, date); day++)
    date = addDays(date, 1);
  let world =
    date === probe.currentDate
      ? probe
      : smallWorld({ place: key, seed, date, offices }).world;
  // The governor carries the bill's authored passage, as the date-reader
  // proofs do; the seated governor then decides it at the desk.
  const governor = governorOfficeForJurisdiction(world, key)!.holderPersonId!;
  world = { ...world, control: { kind: "person", personId: governor } };
  const chamber = chamberByKey(pack, pack.chamberOrder[0]!);
  world = introduceMeasure(world, {
    stableKey: `${seed}:state-bill`,
    jurisdictionId: jurisdiction.id,
    rulePackId: pack.packId,
    designation: "Effective date bill",
    shortTitle: "Effective date proof",
    summary: "A state bill carried to law to read its effective date.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: null,
    originChamberKey: chamber.chamberKey,
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const bodies = played.chambers.map((row) =>
    seatBodyForPack(
      row.chamberKey,
      row.name,
      row.seats.kind === "known"
        ? row.seats.value
        : seatedChamberForPack(world, pack.packId, row.chamberKey, row.name)!
            .seats,
      [],
      true,
    ),
  );
  const votePlan: Record<string, { yea: number }> = {};
  for (const row of played.chambers) {
    for (const committee of row.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: committee.appointedMembers ?? 7,
      };
    for (const stage of row.floorStages)
      votePlan[votePlanKeyForFloor(row.chamberKey, stage.stageKey)] = {
        yea: bodies.find((body) => body.chamberKey === row.chamberKey)!.members
          .length,
      };
  }
  const context = {
    pack: played,
    measureId,
    bodies,
    committeeMemberCount: 7,
    votePlan,
    governorAction: "signed" as const,
    governorRationale: "Authored passage to read the effective date.",
  };
  for (let guard = 0; guard < 40; guard += 1) {
    const phase = measurePosition(world, measureId).phase;
    if (phase === "awaiting-executive" || phase === "awaiting-enactment") break;
    const step = availableMeasureSteps(world, measureId).find(
      (row) => row !== "offer-amendment",
    );
    if (!step) throw new Error(`No canonical step at '${phase}'.`);
    world = applyLegislativeStep(context, world, step).world;
  }
  if (measurePosition(world, measureId).phase === "awaiting-executive")
    world = decideAtDesk(world, measureId);
  // The enactment writer dates the act; nothing here supplies a date.
  world = recordEnactment(world, {
    stableKey: `${seed}:state-bill:enactment`,
    measureId,
  });
  return { pack, enactment: measureEnactment(world, measureId) };
}

/** Steps the shared bill driver until the council has passed the ordinance. */
function enactOrdinance(
  start: World,
  unit: GovernmentUnitIdentity,
  town: EntityId,
) {
  let world = start;
  const rules = councilRules(unit)!;
  const pack = legislativeRulePackForWorld(world, rules.packId);
  const officers = sittingLocalOfficers(world, unit);
  const members = officers.filter((seat) => !seat.mayor);
  world = ensureCouncilPrinciples(world, officers);
  const law = lawJurisdiction(world, unit, town);
  world = law.world;
  world = introduceMeasure(world, {
    stableKey: `${seed}:${unit.id}:ordinance`,
    rulePackId: pack.packId,
    jurisdictionId: law.jurisdictionId,
    ...nextMeasureNumbering(world, {
      jurisdictionId: law.jurisdictionId,
      originChamber: chamberByKey(pack, "council"),
      rulePackId: pack.packId,
    }),
    shortTitle: "Council meeting room policy",
    summary: "A member's nonfiscal ordinance for the recorded council.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: members[0]!.personId,
  });
  const measure = world.history.legislativeMeasures!.at(-1)!;
  const binding = {
    localCouncil: {
      governmentUnitId: unit.id,
      townJurisdictionId: law.jurisdictionId,
      playerPersonId: null,
    },
  };
  for (let guard = 0; guard < 60; guard += 1) {
    if (measurePosition(world, measure.id).terminal) break;
    if (measurePosition(world, measure.id).phase === "awaiting-enrollment") {
      world = completeCouncilPassage(world, measure, rules.governmentKey);
      continue;
    }
    const result = applyInstitutionStep(
      world,
      measure.id,
      (unchanged) => unchanged,
      binding,
    );
    if (result.kind === "applied") world = result.world;
    else if (result.kind === "blocked")
      throw new Error(`The ordinance was blocked: ${result.reason}`);
    else {
      // A reading interval, a hearing, or the executive's window: the
      // council's clock runs on.
      if ("world" in result && result.world) world = result.world;
      world = advanceWorld(
        world,
        result.kind === "wait-until"
          ? Math.max(1, daysBetween(world.currentDate, result.date))
          : 7,
      );
    }
  }
  expect(measurePosition(world, measure.id).phase).toBe("enacted");
  return {
    world,
    pack,
    measure,
    enactment: measureEnactment(world, measure.id)!,
  };
}

/** What the body's own rule pack says, read from the pack's data. */
function packSays(
  world: World,
  pack: LegislativeRulePack,
  enactment: LegislativeEnactmentRecord,
  amendsCriminalCode: boolean,
) {
  const review = pack.councilActions?.congressionalReviewDays;
  if (review?.kind === "known") {
    const criminal = pack.councilActions?.criminalCodeReviewDays;
    return congressionalReviewEffectiveOn(
      enactment.resolvedAt,
      amendsCriminalCode && criminal?.kind === "known"
        ? criminal.value
        : review.value,
    );
  }
  const schedule = pack.enactment.defaultEffectiveSchedule;
  expect(schedule?.kind).toBe("known");
  void world;
  return addDays(
    enactment.resolvedAt,
    schedule?.kind === "known" ? schedule.value.days : Number.NaN,
  );
}

const rows = CHIEF_EXECUTIVE_JURISDICTIONS.map((usps) => ({ usps }));

describe(`one effective-date rule in all 56 places (seed ${seed})`, () => {
  it("covers all 56 places", () => {
    expect(rows).toHaveLength(56);
    expect(new Set(rows.map((row) => row.usps)).size).toBe(56);
  });

  it.each(rows)(
    "$usps: a state bill, a county ordinance and a city ordinance take effect when their packs say",
    ({ usps }) => {
      const key = `US-${usps}`;
      const record: Record<string, unknown> = { place: key, seed };

      // The state or territory legislature: its recorded rule.
      const state = enactStateBill(usps);
      if (state) {
        const { pack } = state;
        expect(state.enactment).toBeTruthy();
        const enactment = state.enactment!;
        const context = {
          finalPassageAt: () => enactment.finalPassageAt ?? null,
        };
        const expected = stateStatuteOperativeAt(
          key,
          enactment.resolvedAt,
          context,
        );
        expect(expected).not.toBeNull();
        expect(enactment.effectiveAt).toBe(expected);
        expect(
          resolveLegislativeEffectiveDate(pack, enactment.resolvedAt, context)
            .effectiveAt,
        ).toBe(expected);
        expect(enactment.effectiveDateBasis).toBe(
          statuteEffectiveDateEstimated(key, enactment.resolvedAt, context)
            ? "game-default"
            : "source-default",
        );
        record.stateBill = {
          pack: pack.packId,
          enactedOn: enactment.resolvedAt,
          effectiveOn: enactment.effectiveAt,
          basis: enactment.effectiveDateBasis,
        };
      } else {
        // No legislature pack is admitted for this place; nothing dates a
        // state act that cannot be filed.
        expect(
          legislativePackForJurisdiction(stateJurisdictionForKey(key)!.id),
        ).toBeNull();
        record.stateBill =
          "unsupported: no legislature pack is admitted for this place";
      }

      const bodies = localBodies(usps);
      for (const [kind, units] of [
        ["county", bodies.counties],
        ["city", bodies.cities],
      ] as const) {
        const seated = firstSeated(usps, units);
        if (!seated) {
          record[kind] =
            kind === "county"
              ? `unsupported: ${bodies.countyReason}`
              : "unsupported: no municipal government is listed with a seated council";
          continue;
        }
        const unit = seated.unit;
        const { world, pack, measure, enactment } = enactOrdinance(
          seated.world,
          unit,
          seated.jurisdictionId,
        );
        const criminal = actAmendsCriminalCode(world, measure);
        const expected = packSays(world, pack, enactment, criminal);
        expect(enactment.effectiveAt).toBe(expected);
        expect(
          resolveLegislativeEffectiveDate(pack, enactment.resolvedAt, {
            amendsCriminalCode: () => criminal,
          }).effectiveAt,
        ).toBe(expected);
        const schedule = pack.enactment.defaultEffectiveSchedule;
        if (
          pack.councilActions?.congressionalReviewDays?.kind !== "known" &&
          schedule?.kind === "known" &&
          schedule.source.verification === "game-profile"
        ) {
          // No local rule was read: the local ordinance estimate.
          expect(schedule.value.days).toBe(LOCAL_ORDINANCE_EFFECTIVE_DAYS);
          expect(enactment.effectiveDateGameProfile).toEqual({
            version: pack.packId,
            days: LOCAL_ORDINANCE_EFFECTIVE_DAYS,
          });
        }
        expect(operativeDateForEnactment(enactment)?.date).toBe(expected);
        expect(deserializeWorld(serializeWorld(world))).toEqual(world);
        record[kind] = {
          unit: unit.id,
          name: unit.name,
          pack: pack.packId,
          enactedOn: enactment.resolvedAt,
          effectiveOn: enactment.effectiveAt,
          basis: enactment.effectiveDateBasis ?? "explicit",
        };
      }
      console.info("[au2-dup-03-56]", JSON.stringify(record));
    },
    120_000,
  );
});

describe("a save written before the one effective-date rule keeps its dates", () => {
  const usps =
    CHIEF_EXECUTIVE_JURISDICTIONS[
      Number.parseInt(rank("save-load").slice(0, 8), 16) %
        CHIEF_EXECUTIVE_JURISDICTIONS.length
    ]!;
  it(`keeps a town ordinance saved on its adoption date after Continue (seed-drawn ${usps})`, () => {
    const bodies = localBodies(usps);
    const seated =
      firstSeated(usps, bodies.cities) ?? firstSeated(usps, bodies.counties);
    expect(seated).not.toBeNull();
    const unit = seated!.unit;
    const { world, pack, enactment } = enactOrdinance(
      seated!.world,
      unit,
      seated!.jurisdictionId,
    );
    // The shape the previous code saved for an unread council: in force on
    // adoption, under the body's own profile.
    const before: LegislativeEnactmentRecord = {
      ...enactment,
      effectiveAt: enactment.resolvedAt,
      effectiveDateBasis: "game-default",
      effectiveDateGameProfile: { version: pack.packId, days: 0 },
    };
    const saved = {
      ...world,
      history: {
        ...world.history,
        legislativeEnactments: world.history.legislativeEnactments!.map(
          (row) => (row.id === enactment.id ? before : row),
        ),
      },
    };
    const resumed = deserializeWorld(serializeWorld(saved));
    const after = resumed.history.legislativeEnactments!.find(
      (row) => row.id === enactment.id,
    )!;
    // Every recorded date is unchanged, and the shared reader honors it.
    expect(after).toEqual(before);
    expect(
      resumed.history.legislativeEnactments!.map((row) => [
        row.id,
        row.effectiveAt,
      ]),
    ).toEqual(
      saved.history.legislativeEnactments!.map((row) => [
        row.id,
        row.effectiveAt,
      ]),
    );
    expect(operativeDateForEnactment(after)).toEqual({
      date: enactment.resolvedAt,
      basis: "game-default",
    });
    console.info(
      "[au2-dup-03-save-load]",
      JSON.stringify({
        seed,
        place: usps,
        unit: unit.id,
        enactmentId: enactment.id,
        savedEffectiveOn: before.effectiveAt,
        newRuleWouldGive: enactment.effectiveAt,
        afterContinue: after.effectiveAt,
      }),
    );
  });
});
