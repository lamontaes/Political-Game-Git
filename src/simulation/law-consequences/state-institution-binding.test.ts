/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createScenarioWorld } from "../demo";
import { searchLifePlaces, stateJurisdictionForKey } from "../life-places";
import { stateCandidacyPack } from "../candidacy-packs";
import { personName } from "../people";
import { organizationProfileAt, currentLifeCutoff } from "../life-queries";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { generatePoliticalStartingConditions } from "../world-setup/political-start";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import {
  ensureStateLegislatureOpening,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import {
  institutionOfficeBindingAt,
  ruleChangeConsequenceBindingHistoryRecords,
  type InstitutionOfficeBindingRecord,
} from "../enacted-rule-changes";
import { serializeWorld, deserializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import type { World, EntityId } from "../types";

const seed = "G9-state-institution:Hahira-GA";
const place = searchLifePlaces("Hahira", 20).find(
  (entry) => entry.displayName === "Hahira, Georgia",
)!;
const pack = stateCandidacyPack("US-GA")!;
const jurisdiction = stateJurisdictionForKey("US-GA")!;
let before: World;
let opened: World;
let subjectPersonId: EntityId;
const receipts: unknown[] = [];

afterAll(() => {
  if (process.env.G9_INSTITUTION_PROOF_PATH)
    writeFileSync(
      process.env.G9_INSTITUTION_PROOF_PATH,
      JSON.stringify(receipts, null, 2),
    );
});

beforeAll(() => {
  expect(place).toBeDefined();
  const initial = createScenarioWorld(seed, place.context);
  subjectPersonId = initial.personOrder[0]!;
  before = ensureWorldStartingConditions(initial, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    political: generatePoliticalStartingConditions,
  });
  opened = ensureStateLegislatureOpening(before, subjectPersonId, "GA");
}, 30000);

function identities(world: World) {
  return ruleChangeConsequenceBindingHistoryRecords(world).filter(
    (record): record is InstitutionOfficeBindingRecord =>
      record.kind === "office-organization",
  );
}

describe("actual state opening institution bindings", () => {
  it("joins named actual Georgia seats to one existing state legislature body", () => {
    const members = stateLegislators(opened, pack.packId);
    expect(members.length).toBeGreaterThan(0);
    const officeKeys = [...new Set(members.map((member) => member.officeKey))];
    const bindings = identities(opened);
    expect(officeKeys).toHaveLength(2);
    expect(bindings).toHaveLength(2);
    expect(
      new Set(bindings.map((binding) => binding.organizationId)).size,
    ).toBe(1);
    const opening = opened.history.events.find(
      (record) => record.type === "world.state-legislature-opening",
    )!;
    for (const officeKey of officeKeys) {
      const binding = institutionOfficeBindingAt(
        opened,
        officeKey,
        jurisdiction.id,
        currentLifeCutoff(opened),
      )!;
      const profile = organizationProfileAt(opened, binding.organizationId)!;
      expect(profile.locationJurisdictionId).toBe(jurisdiction.id);
      expect(binding.jurisdictionId).not.toBe(place.context.jurisdiction.id);
      expect(binding.effectiveAt).toBe(opened.currentDate);
      expect(binding.sequence).toBeLessThan(opening.sequence);
      expect(binding.sourceRecordIds).toEqual(
        expect.arrayContaining([
          binding.organizationId,
          profile.id,
          jurisdiction.id,
        ]),
      );
      for (const member of members.filter(
        (entry) => entry.officeKey === officeKey,
      )) {
        const tenure = opened.history.workRelationships.find(
          (record) => record.id === member.workRelationshipId,
        )!;
        expect(tenure.organizationId).toBe(binding.organizationId);
        expect(tenure.sequence).toBeLessThan(binding.sequence);
        expect(binding.sourceRecordIds).toContain(tenure.id);
        expect(
          personName(opened.people[member.personId]!).trim().length,
        ).toBeGreaterThan(0);
      }
      const first = members.find((member) => member.officeKey === officeKey)!;
      receipts.push({
        seed,
        placeKey: place.key,
        state: "US-GA",
        officeKey,
        personId: first.personId,
        name: personName(opened.people[first.personId]!),
        tenureId: first.workRelationshipId,
        bodyId: binding.organizationId,
        profileId: profile.id,
        bindingId: binding.id,
        jurisdictionId: binding.jurisdictionId,
      });
    }
    expect(before.history.ruleChangeConsequenceBindings).toHaveLength(0);
    expect(opened.history.ruleChangeProvisions).toEqual(
      before.history.ruleChangeProvisions,
    );
    assertWorldIntegrity(opened);
  });
  it("repeats the actual opening without adding identity, members or events", () => {
    expect(ensureStateLegislatureOpening(opened, subjectPersonId, "GA")).toBe(
      opened,
    );
  });
  it("preserves actual tenure/body/source joins through canonical Save/Continue", () => {
    const continued = deserializeWorld(serializeWorld(opened));
    expect(identities(continued)).toEqual(identities(opened));
    expect(continued.history.ruleChangeConsequenceBindings).not.toBe(
      opened.history.ruleChangeConsequenceBindings,
    );
    expect(stateLegislators(continued, pack.packId)).toEqual(
      stateLegislators(opened, pack.packId),
    );
    expect(
      ensureStateLegislatureOpening(continued, subjectPersonId, "GA"),
    ).toBe(continued);
    assertWorldIntegrity(continued);
  });
});
