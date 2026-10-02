import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import * as childhood from "./childhood-record";
import { addDays } from "./dates";
import { personTrait } from "./people-traits";
import { upbringingFor } from "./people-upbringing";
import { deserializeWorld, serializeWorld } from "./serialization";
import { recordWorldEvent } from "./world";

const seed = "upbringing-read-reuse";
const place = drawRandomPlace(seed);
const fixture = () => smallWorld({ place: place.key, seed });

describe(`upbringing read reuse (${place.displayName}, seed ${seed})`, () => {
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
});
