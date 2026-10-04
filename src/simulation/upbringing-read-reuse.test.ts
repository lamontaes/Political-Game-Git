import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import * as families from "./family-shape";
import {
  createResourceFlow,
  createWorkCompensation,
  recordResourceFlowTerms,
  money,
} from "./resources";
import {
  createOrganization,
  createWorkRelationships,
  recordWorkStatus,
} from "./life";
import * as lifeQueries from "./life-queries";
import * as childhood from "./childhood-record";
import { addDays } from "./dates";
import { ensurePeopleTraits, personTrait } from "./people-traits";
import { upbringingFor } from "./people-upbringing";
import * as upbringing from "./people-upbringing";
import { deserializeWorld, serializeWorld } from "./serialization";
import { recordWorldEvent } from "./world";
import type { Person, PersonFact } from "./types";

const seed = "upbringing-read-reuse";
const place = drawRandomPlace(seed);
const fixture = () => smallWorld({ place: place.key, seed });

describe(`upbringing read reuse (${place.displayName}, seed ${seed})`, () => {
  it.each(["family-pay-candidates-one", "family-pay-candidates-two"])(
    "estimates only recorded paid-work candidates without changing mixed-work evidence (%s)",
    (seed) => {
      const selected = drawRandomPlace(seed);
      const small = smallWorld({
        place: selected.key,
        seed,
        people: 8,
        household: true,
      });
      const provenance = {
        kind: "authored" as const,
        note: "Controlled mixed-work upbringing fixture.",
      };
      let world = createOrganization(small.world, {
        stableKey: "family-pay-candidates:employer",
        formedAt: small.world.currentDate,
        provenance,
        initialProfile: {
          name: "Recorded fixture employer",
          classification: "enterprise:retail",
          locationJurisdictionId: small.jurisdictionId,
        },
      });
      const organizationId = world.history.organizations.at(-1)!.id;
      world = createWorkRelationships(
        world,
        Array.from({ length: 4 }, (_, at) => ({
          stableKey: `family-pay-candidates:work:${at}`,
          personId: world.personOrder[at]!,
          organizationId,
          startedAt: world.currentDate,
          kind: "employment:staff",
          compensation: at === 2 ? ("unpaid" as const) : ("paid" as const),
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance,
          initialRole: {
            title: "Recorded clerk",
            occupationClassification: "occupation:cashier",
            locationJurisdictionId: small.jurisdictionId,
            timeDemand: {
              expectedWeekly: { minimumHours: 32, maximumHours: 40 },
              attention: "moderate",
              concurrency: "mostly-exclusive",
              scheduleRigidity: "rigid",
              interruptibility: "limited",
              locationJurisdictionId: small.jurisdictionId,
            },
          },
        })),
      );
      const works = world.history.workRelationships.slice(-4);
      world = recordWorkStatus(world, {
        stableKey: "family-pay-candidates:ended",
        workRelationshipId: works[3]!.id,
        effectiveAt: world.currentDate,
        status: "ended",
        reason: "The recorded fixture job ended.",
        provenance,
        supersedesStatusId: world.history.workStatuses.at(-1)!.id,
      });
      world = createWorkCompensation(world, {
        stableKey: "family-pay-candidates:known-pay",
        workRelationshipId: works[0]!.id,
        startsAt: world.currentDate,
        amount: money(200_000, "USD"),
        cadenceKind: "schedule:monthly",
        restrictionKind: null,
        jurisdictionId: small.jurisdictionId,
        provenance,
      });
      const spy = vi.spyOn(lifeQueries, "activeWorkRelationshipsAt");
      try {
        const packet = upbringingFor(world, small.personId);
        for (const [at, id] of world.personOrder.entries()) {
          // Household evidence reads everyone once; the estimator additionally
          // reads only unknown-pay paid candidates, including an ended job.
          expect(
            spy.mock.calls.filter(([, readId]) => readId === id),
          ).toHaveLength(at === 1 || at === 3 ? 2 : 1);
        }
        expect(packet.familyContext?.incomeSourcePersonIds).toContain(
          works[0]!.personId,
        );
        expect(packet.familyContext?.incomeSourcePersonIds).not.toContain(
          works[2]!.personId,
        );
        expect(packet.familyContext?.incomeSourcePersonIds).not.toContain(
          works[3]!.personId,
        );
        expect(
          upbringingFor(
            {
              ...world,
              personOrder: [...world.personOrder].reverse(),
              history: {
                ...world.history,
                kinshipRelationships: [...world.history.kinshipRelationships],
              },
            },
            small.personId,
          ),
        ).toEqual(packet);
      } finally {
        spy.mockRestore();
      }
    },
  );

  it("reads one upbringing per seeded person and leaves completed seeds unchanged without an eager read", () => {
    const { world } = smallWorld({ place: place.key, seed, household: true });
    const dates = new Map(
      world.personOrder.map((id) => [id, world.people[id]!.birthDate]),
    );
    const actors = world.personOrder.filter(
      (id) => world.control.kind !== "person" || id !== world.control.personId,
    );
    const spy = vi.spyOn(upbringing, "upbringingFor");
    try {
      const seeded = ensurePeopleTraits(world, world.personOrder, dates);
      expect(spy.mock.calls.map(([, id]) => id)).toEqual(actors);
      expect(seeded.history.personalityTendencies.length).toBeGreaterThan(0);
      const records = seeded.history.personalityTendencies;
      expect(records.map((row) => row.sequence)).toEqual(
        records.map((_, index) => world.history.nextSequence + index),
      );
      for (const row of records)
        expect(row.recordedAt).toBe(dates.get(row.personId));
      spy.mockClear();
      expect(ensurePeopleTraits(seeded, world.personOrder, dates)).toBe(seeded);
      expect(spy).not.toHaveBeenCalled();
      expect(seeded.history.personalityTendencies).toBe(records);
    } finally {
      spy.mockRestore();
    }
  });
  it("shares the upbringing read between sociability and conflict on one unchanged snapshot", () => {
    const { world, personId } = fixture();
    const spy = vi.spyOn(childhood, "childhoodRecordEntries");
    try {
      const sociability = personTrait(world, personId, "sociability");
      expect(sociability.recordId).toBeNull();
      const first = spy.mock.calls.length;
      expect(first).toBeGreaterThan(0);
      const conflict = personTrait(world, personId, "conflict");
      expect(conflict.recordId).toBeNull();
      expect(spy.mock.calls.length).toBe(first);
      const fresh = { ...world };
      expect(personTrait(fresh, personId, "sociability")).toEqual(sociability);
      expect(personTrait(fresh, personId, "conflict")).toEqual(conflict);
    } finally {
      spy.mockRestore();
    }
  });

  it("does not assign opening childhood events or care from a different seed", () => {
    const { world, personId } = fixture();
    const before = serializeWorld(world);
    const read = upbringingFor(world, personId);
    expect(read).toMatchObject({
      caregiving: "not-recorded",
      protectiveCaregiver: false,
      events: [],
      schooling: [],
      firstJob: "none",
    });
    expect(read.familyContext?.source.note).toContain(
      "ESTIMATED FROM GAME FAMILIES",
    );
    expect(read.familyContext?.placeId).toBe(
      world.people[personId]!.homeJurisdictionId,
    );
    expect(
      upbringingFor({ ...world, seed: "another-identity-seed" }, personId),
    ).toEqual(read);
    expect(serializeWorld(world)).toBe(before);
    expect(upbringingFor(deserializeWorld(before), personId)).toEqual(read);
  });

  it("recomputes after a canonical childhood record changes the snapshot", () => {
    const { world, personId, jurisdictionId } = fixture();
    const before = upbringingFor(world, personId);
    expect(before.basis).toBe("game-profile");
    const birthDate = world.people[personId]!.birthDate;
    const withSource = recordWorldEvent(world, {
      stableKey: "upbringing-reuse:birth-source",
      type: "person.birth",
      occurredAt: birthDate,
      recordedAt: world.currentDate,
      jurisdictionId,
      involvedEntityIds: [personId],
      participants: [{ personId, role: "focus:subject", detail: null }],
      personFactConstraints: [],
      visibility: "public",
      tags: [],
      summary: "Explicit reader fixture: the recorded birth source.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const changed = childhood.appendChildhoodEntry(withSource, {
      stableKey: "upbringing-reuse:birth",
      kind: "birth",
      personId,
      effectiveAt: birthDate,
      sourceRecordId: withSource.history.events.at(-1)!.id,
      jurisdictionId,
      birthDate,
    });
    const after = upbringingFor(changed, personId);
    expect(after.basis).toBe("childhood-record");
    expect(after).toEqual(upbringingFor({ ...changed }, personId));
    expect(upbringingFor(world, personId)).toBe(before);
  });

  it("reads afresh on another date and after Save/Continue", () => {
    const { world, personId } = fixture();
    const before = upbringingFor(world, personId);
    const date = addDays(world.currentDate, 1);
    const nextDay = {
      ...world,
      currentDate: date,
      currentMoment: { ...world.currentMoment, date },
    };
    const after = upbringingFor(nextDay, personId);
    expect(after).not.toBe(before);
    expect(after).toEqual(upbringingFor({ ...nextDay }, personId));
    const restored = deserializeWorld(serializeWorld(nextDay));
    const continued = upbringingFor(restored, personId);
    expect(continued).not.toBe(after);
    expect(continued).toEqual(after);
  });

  it("keeps each person's reading separate", () => {
    const { world, personId } = fixture();
    const other = world.personOrder.find((id) => id !== personId)!;
    const own = upbringingFor(world, personId);
    const theirs = upbringingFor(world, other);
    expect(theirs.personId).toBe(other);
    expect(theirs).not.toBe(own);
    expect(theirs).toEqual(upbringingFor({ ...world }, other));
  });
  it("retains the first household representative and excludes households without adults across snapshots and reload", () => {
    const { world, personId } = smallWorld({
      place: place.key,
      seed,
      household: true,
    });
    const representative = world.history.householdMemberships[0]!.personId;
    const before = upbringingFor(world, personId);
    expect(before.familyContext?.cohortScope).toBe("household");
    expect(before.familyContext?.comparablePersonIds).toEqual([representative]);
    expect(before.familyContext?.estimateSamplePersonId).toBe(representative);
    expect(
      upbringingFor(deserializeWorld(serializeWorld(world)), personId),
    ).toEqual(before);

    const childFact = (fact: PersonFact): PersonFact =>
      "endedAt" in fact
        ? {
            ...fact,
            occurredAt: world.currentDate,
            endedAt: fact.endedAt === null ? null : world.currentDate,
          }
        : { ...fact, occurredAt: world.currentDate };
    const child = (person: Person): Person => {
      const establishedFacts = person.establishedFacts.map(childFact);
      return person.detailLevel === "materialized"
        ? {
            ...person,
            birthDate: world.currentDate,
            establishedFacts,
            details: {
              ...person.details,
              generatedFacts: person.details.generatedFacts.map(childFact),
            },
          }
        : { ...person, birthDate: world.currentDate, establishedFacts };
    };
    const children = {
      ...world,
      people: Object.fromEntries(
        Object.entries(world.people).map(([id, person]) => [id, child(person)]),
      ),
    };
    const withoutAdults = upbringingFor(children, personId);
    expect(withoutAdults.familyContext?.cohortScope).toBe("no-sample");
    expect(withoutAdults.familyContext?.comparablePersonIds).toEqual([]);
    expect(withoutAdults.familyContext?.estimateSamplePersonId).toBeNull();
    expect(
      upbringingFor(deserializeWorld(serializeWorld(children)), personId),
    ).toEqual(withoutAdults);
    expect(upbringingFor(world, personId)).toBe(before);
    expect(upbringingFor({ ...world }, personId)).toEqual(before);
  });
  it("reuses cohorts after irrelevant withholding appends without changing output or reload", () => {
    const { world: empty, personId } = fixture();
    const world = createResourceFlow(empty, {
      stableKey: "cohort:initial-withholding",
      source: { kind: "person", personId },
      recipient: {
        kind: "person",
        personId: empty.personOrder.find((id) => id !== personId)!,
      },
      startsAt: empty.currentDate,
      amount: money(100, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "custom:tax-collection",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance: {
        kind: "authored",
        note: "Existing nonempty withholding prefix control.",
      },
    });
    const spy = vi.spyOn(families, "recordedFamilyEstimates");
    try {
      const before = upbringingFor(world, personId);
      const calls = spy.mock.calls.length;
      expect(calls).toBeGreaterThan(0);
      const next = createResourceFlow(world, {
        stableKey: "cohort:withholding",
        source: { kind: "person", personId },
        recipient: {
          kind: "person",
          personId: world.personOrder.find((id) => id !== personId)!,
        },
        startsAt: world.currentDate,
        amount: money(100, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: "custom:tax-collection",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance: {
          kind: "authored",
          note: "Explicit irrelevant withholding dependency control.",
        },
      });
      expect(upbringingFor(next, personId)).toEqual(before);
      expect(spy.mock.calls.length).toBe(calls);
      expect(upbringingFor(world, personId)).toBe(before);
      expect(
        upbringingFor(deserializeWorld(serializeWorld(next)), personId),
      ).toEqual(before);
    } finally {
      spy.mockRestore();
    }
  });

  it("rebuilds for compensation and revised histories, preserves earlier snapshots and future date boundaries", () => {
    const { world, personId } = smallWorld({
      place: place.key,
      seed,
      household: true,
    });
    const spy = vi.spyOn(families, "recordedFamilyEstimates");
    try {
      const before = upbringingFor(world, personId);
      const calls = spy.mock.calls.length;
      const paidPersonId =
        before.familyContext!.caregiverPersonIds[0] ?? personId;
      const paid = createResourceFlow(world, {
        stableKey: "cohort:income",
        source: {
          kind: "person",
          personId: world.personOrder.find((id) => id !== paidPersonId)!,
        },
        recipient: { kind: "person", personId: paidPersonId },
        startsAt: world.currentDate,
        amount: money(100_000, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: "compensation:owner-draw",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance: {
          kind: "authored",
          note: "Controlled recorded monthly compensation.",
        },
      });
      const income = upbringingFor(paid, personId);
      expect(spy.mock.calls.length).toBeGreaterThan(calls);
      expect(income.familyContext).not.toEqual(before.familyContext);
      expect(upbringingFor(world, personId)).toBe(before);
      const flow = paid.history.resourceFlows.at(-1)!;
      const terms = paid.history.resourceFlowTerms.at(-1)!;
      const raised = recordResourceFlowTerms(paid, {
        stableKey: "cohort:income-change",
        resourceFlowId: flow.id,
        effectiveAt: paid.currentDate,
        status: "active",
        amount: money(10_000_000, "USD"),
        cadenceKind: terms.cadenceKind,
        reason: "Controlled recorded compensation change.",
        provenance: flow.provenance,
        supersedesTermsId: terms.id,
      });
      const changed = upbringingFor(raised, personId);
      expect(
        changed.familyContext,
        JSON.stringify({
          income: income.familyContext,
          changed: changed.familyContext,
        }),
      ).not.toEqual(income.familyContext);
      expect(upbringingFor(paid, personId)).toBe(income);
      const revised = {
        ...raised,
        history: {
          ...raised.history,
          resourceFlows: raised.history.resourceFlows.map((row, index) =>
            index === 0 ? { ...row } : row,
          ),
        },
      };
      const count = spy.mock.calls.length;
      expect(upbringingFor(revised, personId)).toEqual(changed);
      expect(spy.mock.calls.length).toBeGreaterThan(count);
      expect(
        upbringingFor(deserializeWorld(serializeWorld(raised)), personId),
      ).toEqual(changed);
      const boundary = addDays(raised.currentDate, 2);
      const dated = createResourceFlow(raised, {
        stableKey: "cohort:future-income",
        source: flow.source,
        recipient: flow.recipient,
        startsAt: boundary,
        initialStatus: "expected",
        amount: money(100_000, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: "compensation:owner-draw",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance: flow.provenance,
      });
      upbringingFor(dated, personId);
      const initial = spy.mock.calls.length;
      const day = (date: typeof boundary) => ({
        ...dated,
        currentDate: date,
        currentMoment: { ...dated.currentMoment, date },
      });
      upbringingFor(day(addDays(boundary, -1)), personId);
      expect(spy.mock.calls.length).toBe(initial);
      upbringingFor(day(boundary), personId);
      expect(spy.mock.calls.length).toBeGreaterThan(initial);
    } finally {
      spy.mockRestore();
    }
  });
});
