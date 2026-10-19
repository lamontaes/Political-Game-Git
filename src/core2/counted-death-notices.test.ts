import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { notifyCountedDeaths } from "./births-counted";
import { createRenewalCore } from "./births-setup";
import { griefToday } from "./grief";
import { coreAPI } from "./state";
import type { CoreInput, Source } from "./types";

const seed = randomBytes(20).toString("hex");
const place = drawPlace(seed, "counted-death-notices");
const date = "2026-01-01";
const placeId = `place:${place.key}`;
const source: Source = {
  tag: "ESTIMATED",
  asOf: date,
  citation: "Controlled notification fixture; not a played-world death.",
};

function fixture() {
  const people = ["relative", "unrelated"].map((key) => ({
    id: `person:${key}`,
    givenName: key,
    familyName: "Fixture",
    birthDate: "1980-01-01",
    placeId,
    householdId: `household:${key}`,
    tier: "weekly",
    traits: {},
    liquidMinor: 0,
    livingCostDailyMinor: 0,
    familyIds: key === "relative" ? ["person:deceased"] : [],
    knownIds: key === "relative" ? ["person:deceased"] : [],
    source,
  }));
  const input: CoreInput = {
    seed,
    startedAt: date,
    people,
    households: people.map((person) => ({
      id: person.householdId,
      placeId,
      memberIds: [person.id],
      source,
    })),
    husks: [
      {
        id: "person:deceased",
        givenName: "Deceased",
        familyName: "Fixture",
        birthDate: "1925-01-01",
        familyIds: ["person:relative"],
        placeId,
        looks: {},
        said: [],
        source,
      },
    ],
    organizations: [],
    jobs: [],
    focusPersonIds: ["person:relative"],
    focusPlaceIds: [placeId],
    calendarDates: [],
    gaps: [],
  };
  return createRenewalCore(input);
}

describe(`counted death notices in ${place.name}, seed ${seed}`, () => {
  it("reaches a known relative, produces grief once and preserves counted identities", () => {
    const core = fixture();
    const api = coreAPI(core);
    const row = {
      id: `${placeId}:2026-01`,
      placeId,
      deaths: ["person:deceased", "person:unmet"],
    };
    api.moduleState("core2-renewal-v1").table("counts").put(row);
    const relative = core.people.get("person:relative")!;
    // A retained relationship is a separate record from knowing a name.
    // This fixture supplies one explicitly; the notifier must never invent it.
    const tieId = [relative.id, "person:deceased"].sort().join(":");
    core.relationships.set(tieId, {
      id: tieId,
      actorId: relative.id,
      otherId: "person:deceased",
      kind: "family",
      level: 0.5,
      lastContactDate: date,
    });
    core.relationshipsByPerson.set(relative.id, new Set([tieId]));
    core.relationshipsByPerson.set("person:deceased", new Set([tieId]));
    expect(griefToday(api, relative).grief).toBe(0);
    const people = core.people.size;
    const husks = core.husks.size;
    notifyCountedDeaths(api, row);
    const id = `life.death:person:deceased:${date}`;
    expect(api.knows(relative.id, `event:${id}:experienced`)?.sourceId).toBe(
      id,
    );
    expect(
      api.knows("person:unrelated", `event:${id}:experienced`),
    ).toBeUndefined();
    expect(core.durableLog.get(id)?.facts?.[`event:${id}:countsId`]).toBe(
      row.id,
    );
    const grief = griefToday(api, relative);
    expect(grief.grief).toBeGreaterThan(0);
    expect(grief.sourceIds).toContain(id);
    notifyCountedDeaths(api, row);
    expect(griefToday(api, relative)).toEqual(grief);
    expect(core.people.size).toBe(people);
    expect(core.husks.size).toBe(husks);
    expect(core.people.has("person:deceased")).toBe(false);
    expect(core.eventIds.has(`life.death:person:unmet:${date}`)).toBe(false);
  });
});
