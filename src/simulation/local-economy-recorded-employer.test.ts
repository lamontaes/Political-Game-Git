/// <reference types="node" />
import { afterAll, describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { hireAtAdultStart } from "./job-market";
import { localBusinessWageMinor } from "./recorded-employer";
import { lifePlaceByKey, lifePlaces } from "./life-places";
import { SeededRng } from "./rng";
import {
  activeWorkRelationshipsAt,
  workRoleAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
} from "./life-queries";
import {
  townBusinesses,
  recordedTownEmployer,
} from "./living-world/town-businesses";
import type {
  EntityId,
  OccupationClassification,
  Organization,
  World,
} from "./types";
import { personName } from "./people";
import { serializeWorld, deserializeWorld } from "./serialization";
import { withWorldIntegrityDeferred, createWorld, worldLineage } from "./world";

const SEED = "team4-a58-recorded-employer-20261001";
const receipts: unknown[] = [];
afterAll(() => {
  if (process.env.TEAM4_RECORD_A58 === "1")
    writeFileSync(
      "/tmp/team2-a58-saved-employers.json",
      JSON.stringify(receipts, null, 2),
    );
});
const randomPlace = new SeededRng("team2-a58-canonical-selector-opening").pick(
  lifePlaces().filter((place) => place.scope === "locality"),
);
const places = ["5553000", "1304000", "4159000", "0820000", "1921000"];

describe("A58 adult starting jobs use the town's recorded employers", () => {
  it("opens the sampled ordinary game without inventing a missing employer", () => {
    const game = withWorldIntegrityDeferred(
      () =>
        generateOpeningLife(
          prepareOpeningLife({
            ...DEFAULT_NEW_GAME_SETUP,
            placeKey: randomPlace.key,
            seed: `${SEED}:${randomPlace.key}`,
            startAge: 24,
            questionnaire: "skipped",
          }),
        ).game!,
    );
    const { world, playerPersonId } = game;
    const town = randomPlace.context.jurisdiction.id;
    const before = serializeWorld(world);
    expect(world.people[playerPersonId]).toBeDefined();
    expect(townBusinesses(world, town)).toHaveLength(0);
    expect(recordedTownEmployer(world, playerPersonId, town)).toBeNull();
    expect(previousRecordedEmployer(world, playerPersonId, town)).toBeNull();
    expect(
      serializeWorld(
        hireAtAdultStart(world, {
          personId: playerPersonId,
          jurisdictionId: town,
        }),
      ),
    ).toBe(before);
    expect(
      recordedTownEmployer(deserializeWorld(before), playerPersonId, town),
    ).toBeNull();
    console.log(
      JSON.stringify({
        audit: "A58",
        seed: world.seed,
        place: randomPlace.displayName,
        recordedEmployers: 0,
        selectedEmployer: null,
      }),
    );
  });
  it.each(places)(
    "hires into an existing paid staff role in %s",
    (placeKey) => {
      const game = withWorldIntegrityDeferred(
        () =>
          generateOpeningLife(
            prepareOpeningLife({
              ...DEFAULT_NEW_GAME_SETUP,
              placeKey,
              seed: `${SEED}:${placeKey}`,
              startAge: 24,
              questionnaire: "skipped",
            }),
          ).game!,
      );
      const world = game.world;
      const personId =
        world.control.kind === "person"
          ? world.control.personId
          : world.personOrder[0]!;
      const town = lifePlaceByKey(placeKey)!.context.jurisdiction.id;
      const recorded = townBusinesses(world, town);
      expect(recorded.length).toBeGreaterThan(0);
      const before = serializeWorld(world);
      const selected = recordedTownEmployer(world, personId, town);
      expect(selected).not.toBeNull();
      expect(selected).toEqual(previousRecordedEmployer(world, personId, town));
      const business = recorded.find(
        (entry) => entry.organizationId === selected!.organization.id,
      );
      expect(business).toBeDefined();
      expect(
        business!.jobs.some((entry) => {
          const role = workRoleAt(world, entry.relationshipId);
          return (
            role?.title === selected!.kind.workerTitle &&
            role.occupationClassification === selected!.kind.workerOccupation &&
            !entry.directsOthers
          );
        }),
      ).toBe(true);
      expect(serializeWorld(world)).toBe(before);
      expect(
        recordedTownEmployer(deserializeWorld(before), personId, town),
      ).toEqual(selected);

      // Explicit ordinary hiring writer after town records exist, not proof of
      // the earlier production opening callsite's producer/order.
      const hired = withWorldIntegrityDeferred(() =>
        hireAtAdultStart(world, { personId, jurisdictionId: town }),
      );
      const work = activeWorkRelationshipsAt(hired, personId).find(
        (entry) =>
          entry.relationship.stableKey === `adult-start-work-v1:${personId}`,
      );
      expect(work?.relationship.organizationId).toBe(selected!.organization.id);
      expect(hired.history.organizations).toEqual(world.history.organizations);
      expect(hired.history.organizationProfiles).toEqual(
        world.history.organizationProfiles,
      );
      expect(hired.history.resourceTransferOutcomes).toEqual(
        world.history.resourceTransferOutcomes,
      );
      const saved = serializeWorld(hired);
      expect(
        serializeWorld(
          hireAtAdultStart(hired, { personId, jurisdictionId: town }),
        ),
      ).toBe(saved);
      expect(
        serializeWorld(
          hireAtAdultStart(deserializeWorld(saved), {
            personId,
            jurisdictionId: town,
          }),
        ),
      ).toBe(saved);

      const sparse = createWorld({
        seed: world.seed,
        lineage: worldLineage(world),
        currentDate: world.currentDate,
        currentMoment: world.currentMoment,
        people: [world.people[personId]!],
        jurisdictions: [world.jurisdictions[town]!],
        policyCatalog: world.policyCatalog,
      });
      const sparseSaved = serializeWorld(sparse);
      expect(recordedTownEmployer(sparse, personId, town)).toBeNull();
      expect(
        serializeWorld(
          hireAtAdultStart(sparse, { personId, jurisdictionId: town }),
        ),
      ).toBe(sparseSaved);
      console.log(
        JSON.stringify({
          audit: "A58",
          seed: world.seed,
          place: lifePlaceByKey(placeKey)!.displayName,
          person: personName(world.people[personId]!),
          organization: business!.name,
          oldNewParity: true,
        }),
      );
      receipts.push({
        seed: world.seed,
        placeKey,
        personId,
        person: personName(world.people[personId]!),
        organizationId: selected!.organization.id,
        organizationName: business!.name,
        role: selected!.kind,
        workId: work!.relationship.id,
        recordedEmployerCount: recorded.length,
        organizationCountUnchanged: true,
        transfersUnchanged: true,
        emptyMarket: "no employer or hire recorded",
      });
    },
  );
});

// Exact selector from main b219621a7, test-only parity witness before its move.
/**
 * The local business a grown-up new life works at when the game opens, chosen
 * from the person's own situation rather than first in the town's list.
 *
 * - Only work the person is fit for: the professional roles (legal
 *   assistant, bookkeeper) need schooling no summarized history gives. A
 *   trade is learned on the job, as most builders and mechanics learn it;
 *   an apprenticeship the history records counts as that line of work.
 * - Somebody they know works there or owns it: family and household put a
 *   person forward, as they do in the job market.
 * - Otherwise the line of work they already did: a person who worked a shop
 *   counter at school goes back to a counter.
 * - Otherwise the best-paid of those jobs, at the town's own published pay.
 *
 * Null when the town has no business, or none the person is fit for, and
 * then nobody is hired: the person starts looking for work.
 */
function previousRecordedEmployer(
  world: World,
  personId: EntityId,
  jurisdictionId: EntityId,
): {
  organization: Organization;
  kind: {
    readonly workerTitle: string;
    readonly workerOccupation: OccupationClassification;
    readonly workerRelationshipId: EntityId;
  };
} | null {
  if (!world.people[personId]) return null;
  const past = world.history.workRelationships.filter(
    (work) => work.personId === personId,
  );
  // Borrow only roles that an actual open town business employs today.
  // A legacy player-only business and its fixed revenue are never candidates.
  const fit = townBusinesses(world, jurisdictionId).flatMap((business) => {
    const organization = world.history.organizations.find(
      (record) => record.id === business.organizationId,
    );
    if (!organization || organization.formedAt > world.currentDate) return [];
    const seen = new Set<string>();
    return business.jobs.flatMap((job) => {
      const work = world.history.workRelationships.find(
        (record) => record.id === job.relationshipId,
      );
      const role = workRoleAt(world, job.relationshipId);
      if (
        !work ||
        work.startedAt > world.currentDate ||
        work.compensation !== "paid" ||
        job.directsOthers ||
        !role ||
        !role.occupationClassification ||
        role.occupationClassification.startsWith("profession:") ||
        role.locationJurisdictionId !== jurisdictionId
      )
        return [];
      const kind = {
        workerTitle: role.title,
        workerOccupation: role.occupationClassification,
        workerRelationshipId: work.id,
      };
      if (!localBusinessWageMinor(kind, jurisdictionId, world).sourced)
        return [];
      const key = JSON.stringify(kind);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ organization, kind }];
    });
  });
  if (fit.length === 0) return null;
  const known = new Set<EntityId>();
  for (const kin of kinshipRelationshipsAt(world, personId))
    for (const id of kin.personIds) if (id !== personId) known.add(id);
  const homes = new Set(
    householdMembershipsAt(world, personId).map((entry) => entry.household.id),
  );
  for (const record of world.history.householdMemberships)
    if (record.personId !== personId && homes.has(record.householdId))
      known.add(record.personId);
  const vouched = fit.filter(({ organization }) =>
    [...known].some(
      (id) =>
        world.people[id] &&
        activeWorkRelationshipsAt(world, id).some(
          (entry) => entry.relationship.organizationId === organization.id,
        ),
    ),
  );
  const lines = new Set(
    past.flatMap((work) => {
      const occupation = workRoleAt(world, work.id)?.occupationClassification;
      return occupation ? [occupation.split(":")[0]!] : [];
    }),
  );
  const experienced = fit.filter(({ kind }) =>
    lines.has(kind.workerOccupation.split(":")[0]!),
  );
  const pool =
    vouched.length > 0 ? vouched : experienced.length > 0 ? experienced : fit;
  const pay = (kind: { readonly workerOccupation: OccupationClassification }) =>
    localBusinessWageMinor(kind, jurisdictionId, world).monthlyMinor;
  return [...pool].sort(
    (left, right) =>
      pay(right.kind) - pay(left.kind) ||
      left.organization.id.localeCompare(right.organization.id),
  )[0]!;
}
