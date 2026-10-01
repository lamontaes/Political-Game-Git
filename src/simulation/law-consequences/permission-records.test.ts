import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { createHousehold, createOrganization } from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson, personName } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity, createWorld, createWorldId } from "../world";
import { appendLawPermission, latestLawPermission } from "./permission-records";

function fixture() {
  const seed = "permission-record-family";
  const date = makeIsoDate("2026-01-14");
  const state = stateJurisdictionForKey("US-NY")!;
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    currentDate: date,
    homeJurisdictionId: state.id,
  });
  let world = createWorld({
    seed,
    currentDate: date,
    jurisdictions: [state],
    people: [person],
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = createHousehold(world, {
    stableKey: "permission-fixture:source",
    formedAt: date,
    label: "Recorded source",
    provenance: {
      kind: "authored",
      note: "Append-family fixture; no policy interpretation is inferred.",
    },
  });
  const source = world.history.households.at(-1)!;
  const question = Object.values(world.policyCatalog!.propositions).find(
    (p) =>
      p.stableKey ===
      "us-policy-positions:health-human-services.expand-medicaid-eligibility",
  )!;
  const law = lawInForce(world, state.id, question.id, date)!;
  expect(law).not.toBeNull();
  const context = {
    effectKind: "right-permission",
    questionKey: question.stableKey,
    jurisdictionId: state.id,
    appliedAt: date,
  };
  const input = {
    subject: { kind: "person", id: person.id } as const,
    permissionKey: "fixture:resolved-permission",
    status: "permitted" as const,
    effectiveAt: date,
    sourceRecordIds: [source.id],
  };
  return { world, law, context, input };
}

describe("saved law permission family", () => {
  it("does not infer permission when the law or record is missing", () => {
    const { world, context, input } = fixture();
    expect(
      latestLawPermission(world, input.subject, input.permissionKey),
    ).toBeNull();
    expect(appendLawPermission(world, null, context, input)).toBe(world);
    expect(world.history.lawPermissionRecords).toBeUndefined();
  });
  it("round-trips a named person's stamped decision and preserves repeated-review identity", () => {
    const { world, law, context, input } = fixture();
    const next = appendLawPermission(world, law, context, input);
    assertWorldIntegrity(next);
    const saved = latestLawPermission(
      next,
      input.subject,
      input.permissionKey,
    )!;
    expect(personName(next.people[saved.subject.id]!)).toEqual(
      personName(world.people[input.subject.id]!),
    );
    expect(saved.lawEffectStamps[0].governingLawKey).toBe(law.measureId);
    expect(saved.sourceRecordIds).toEqual(input.sourceRecordIds);
    const resumed = deserializeWorld(serializeWorld(next));
    expect(
      latestLawPermission(resumed, input.subject, input.permissionKey),
    ).toEqual(saved);
    expect(appendLawPermission(resumed, law, context, input)).toBe(resumed);
    expect(serializeWorld(resumed)).toBe(serializeWorld(next));
    expect(
      latestLawPermission(
        next,
        input.subject,
        input.permissionKey,
        makeIsoDate("2026-01-13"),
      ),
    ).toBeNull();
  });
  it("uses one subject-key reader for organizations and retains earlier person decisions", () => {
    const { world, law, context, input } = fixture();
    let next = createOrganization(world, {
      stableKey: "permission-fixture:organization",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: "Saved organization fixture." },
      initialProfile: {
        name: "Fixture business",
        classification: "sector:private",
        locationJurisdictionId: context.jurisdictionId,
      },
    });
    const organization = next.history.organizations.at(-1)!;
    next = appendLawPermission(next, law, context, input);
    const orgInput = {
      ...input,
      subject: { kind: "organization", id: organization.id } as const,
      status: "prohibited" as const,
      sourceRecordIds: [organization.id],
    };
    next = appendLawPermission(next, law, context, orgInput);
    assertWorldIntegrity(next);
    expect(
      latestLawPermission(next, orgInput.subject, input.permissionKey)?.status,
    ).toBe("prohibited");
    expect(
      latestLawPermission(next, input.subject, input.permissionKey)?.status,
    ).toBe("permitted");
    expect(
      deserializeWorld(serializeWorld(next)).history.lawPermissionRecords,
    ).toEqual(next.history.lawPermissionRecords);
  });
  it("rejects missing sources and conflicting results for one actual review", () => {
    const { world, law, context, input } = fixture();
    expect(() =>
      appendLawPermission(world, law, context, {
        ...input,
        sourceRecordIds: [world.id],
      }),
    ).toThrow(/saved record/);
    const next = appendLawPermission(world, law, context, input);
    expect(() =>
      appendLawPermission(next, law, context, {
        ...input,
        status: "prohibited",
      }),
    ).toThrow(/Conflicting/);
  });
  it("participates in global sequence and ID integrity checks", () => {
    const { world, law, context, input } = fixture();
    const next = appendLawPermission(world, law, context, input);
    const row = next.history.lawPermissionRecords![0]!;
    expect(() =>
      assertWorldIntegrity({
        ...next,
        history: {
          ...next.history,
          lawPermissionRecords: [
            { ...row, sequence: world.history.households[0]!.sequence },
          ],
        },
      }),
    ).toThrow(/sequence/);
    expect(() =>
      assertWorldIntegrity({
        ...next,
        history: {
          ...next.history,
          lawPermissionRecords: [{ ...row, id: input.subject.id }],
        },
      }),
    ).toThrow(/identity/);
    expect(() =>
      assertWorldIntegrity({
        ...next,
        history: {
          ...next.history,
          lawPermissionRecords: [
            {
              ...row,
              lawEffectStamps: [] as unknown as typeof row.lawEffectStamps,
            },
          ],
        },
      }),
    ).toThrow(/attribution/);
  });
});
