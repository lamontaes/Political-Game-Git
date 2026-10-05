import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createWorkItem } from "../time-work";
import type { LawEffectContext } from "../law-effect-stamp";
import { describe, expect, it } from "vitest";
import { makeIsoDate, makeSimulationMoment } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { createHousehold, createOrganization } from "../life";
import { stateJurisdictionForKey } from "../life-places";
import { createLightweightPerson, personName } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  advanceWorld,
} from "../world";
import {
  appendLawPermission,
  latestLawPermission,
  assertLawPermissionIntegrity,
} from "./permission-records";

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
  const context: LawEffectContext = {
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
    expect(saved.lawEffectStamps[0].effectKind).toBe("right-permission");
    // A historical label is a saved fixture, not an input accepted by a new writer.
    const legacyStamp = {
      ...saved.lawEffectStamps[0],
      effectKind: "eviction-counsel-representation",
    };
    const legacySaved = {
      ...next,
      history: {
        ...next.history,
        lawPermissionRecords: next.history.lawPermissionRecords!.map(
          (record) =>
            record.id === saved.id
              ? { ...record, lawEffectStamps: [legacyStamp] }
              : record,
        ),
      },
    };
    const legacyResumed = deserializeWorld(serializeWorld(legacySaved));
    expect(
      latestLawPermission(legacyResumed, input.subject, input.permissionKey)
        ?.lawEffectStamps,
    ).toEqual([legacyStamp]);
    expect(
      latestLawPermission(legacyResumed, input.subject, input.permissionKey)
        ?.id,
    ).toBe(saved.id);

    expect(appendLawPermission(legacyResumed, law, context, input)).toBe(
      legacyResumed,
    );
    writeFileSync(
      "/tmp/session21-permission-kind.json",
      JSON.stringify(
        {
          testedHead: execFileSync("git", ["rev-parse", "HEAD"], {
            encoding: "utf8",
          }).trim(),
          scope:
            "Authored generic permission review, not an eviction counsel service or representation claim.",
          seed: world.seed,
          personId: saved.subject.id,
          name: personName(next.people[saved.subject.id]!),
          recordId: saved.id,
          status: saved.status,
          governingLawKey: saved.lawEffectStamps[0].governingLawKey,
          effectKind: saved.lawEffectStamps[0].effectKind,
          sourceRecordIds: saved.sourceRecordIds,
          savedLegacyLabel: legacyStamp.effectKind,
          reloadedSameIdentity: true,
          repeatedReviewIsIdempotent: true,
        },
        null,
        2,
      ),
    );
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
  it("accepts an earlier saved moment source and rejects a future moment in append and integrity", () => {
    const fixtureData = fixture();
    let world = createWorkItem(fixtureData.world, {
      stableKey: "permission-fixture:work",
      title: "Recorded review source",
      summary: "Controlled existing moment-bearing record fixture.",
      jurisdictionId: fixtureData.context.jurisdictionId,
      sourceEntityIds: fixtureData.input.sourceRecordIds,
      focus: { kind: "person", personId: fixtureData.input.subject.id },
      effort: null,
      access: { kind: "private", personIds: [fixtureData.input.subject.id] },
      assignedPersonIds: [fixtureData.input.subject.id],
      playerRequirement: "none",
      waitingOnPersonIds: [],
      blocker: null,
      scheduledActivityId: null,
    });
    const state = world.history.workItemStates.at(-1)!;
    world = advanceWorld(world, 1);
    const context = { ...fixtureData.context, appliedAt: world.currentDate };
    const input = {
      ...fixtureData.input,
      effectiveAt: world.currentDate,
      sourceRecordIds: [state.id],
    };
    const saved = appendLawPermission(world, fixtureData.law, context, input);
    assertWorldIntegrity(saved);
    expect(
      deserializeWorld(serializeWorld(saved)).history.lawPermissionRecords,
    ).toEqual(saved.history.lawPermissionRecords);
    const futureMoment = makeSimulationMoment({
      ...state.recordedAt,
      date: "2026-02-01",
    });
    const replaceSource = (base: typeof world) => ({
      ...base,
      history: {
        ...base.history,
        workItemStates: base.history.workItemStates.map((row) =>
          row.id === state.id ? { ...row, recordedAt: futureMoment } : row,
        ),
      },
    });
    expect(() =>
      appendLawPermission(
        replaceSource(world),
        fixtureData.law,
        context,
        input,
      ),
    ).toThrow(/earlier available/);
    expect(() =>
      assertLawPermissionIntegrity(
        replaceSource(saved),
        new Set(world.personOrder),
      ),
    ).toThrow(/later saved source/);
  });
});
