import { describe, expect, it } from "vitest";
import {
  createCharacterHistoryContextPerson,
  characterHistoryContextPersonId,
} from "../character-history";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import { createWorld, assertWorldIntegrity } from "../world";
import { beginHealthEpisode } from "./health";
import { crisisProtectedDecisions } from "./notices";

function episode(birthDate: string) {
  const date = makeIsoDate("2026-01-02");
  let world = createWorld({
    seed: `team8-health-age:${birthDate}`,
    currentDate: date,
    jurisdictions: [stateJurisdictionForKey("US-KY")!],
    people: [],
  });
  world = createCharacterHistoryContextPerson(world, {
    stableKey: "recorded-patient",
    givenName: "Morgan",
    familyName: "Reed",
    birthDate: makeIsoDate(birthDate),
    homeJurisdictionId: world.jurisdictionOrder[0]!,
  });
  const personId = characterHistoryContextPersonId(world, "recorded-patient");
  world = { ...world, control: { kind: "person", personId } };
  const before = world.history.nextSequence;
  world = beginHealthEpisode(world, {
    stableKey: "recorded-health-episode",
    personId,
    severity: "acute",
    initialLimitation: "limited",
    origin: { kind: "authored", note: "Controlled age-boundary episode." },
    causalParentIds: [],
  });
  return { world, personId, before };
}

describe("controlled health disclosure uses age at the episode", () => {
  it.each(["2016-01-02", "2008-01-03"])(
    "does not stop a child born %s for an adult decision",
    (birthDate) => {
      const f = episode(birthDate),
        payload = serializeWorld(f.world);
      expect(crisisProtectedDecisions(f.world, f.before - 1)).toEqual([]);
      expect(serializeWorld(f.world)).toBe(payload);
      const loaded = deserializeWorld(payload);
      assertWorldIntegrity(loaded);
      expect(crisisProtectedDecisions(loaded, f.before - 1)).toEqual([]);
      expect(serializeWorld(loaded)).toBe(payload);
    },
  );
  it.each(["2008-01-02", "1988-01-02"])(
    "preserves the adult decision for %s",
    (birthDate) => {
      const f = episode(birthDate);
      const decisions = crisisProtectedDecisions(f.world, f.before - 1);
      expect(decisions).toHaveLength(1);
      expect(decisions[0]).toMatchObject({
        personId: f.personId,
        kind: "own-health-disclosure",
      });
      const loaded = deserializeWorld(serializeWorld(f.world));
      expect(crisisProtectedDecisions(loaded, f.before - 1)).toEqual(decisions);
      expect(
        crisisProtectedDecisions(loaded, decisions[0]!.sinceSequence),
      ).toEqual([]);
      expect(
        crisisProtectedDecisions(
          { ...loaded, control: { kind: "observer" } },
          f.before - 1,
        ),
      ).toEqual([]);
    },
  );
  it("does not turn a child's older episode into an adult decision after a birthday", () => {
    const f = episode("2008-01-03"),
      date = makeIsoDate("2026-01-04");
    const later = {
      ...f.world,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(f.world.currentMoment, date),
    };
    expect(crisisProtectedDecisions(later, f.before - 1)).toEqual([]);
  });
});
