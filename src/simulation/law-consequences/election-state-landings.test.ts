import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { stateJurisdictionForKey } from "../life-places";
import { lawEffectStamp } from "../law-effect-stamp";
import { lawExposuresOf } from "../law-exposure";
import { createLightweightPerson } from "../people";
import { serializeWorld, deserializeWorld } from "../serialization";
import { createWorld, createWorldId, recordWorldEvent } from "../world";
import { lawExposureSentence } from "../../presentation/law-exposure-lines";
import type { EntityId, World } from "../types";
import { applyStateElectionLawLandings } from "./modules/election-state-landings";

const QUESTION_KEY =
  "us-policy-positions:government-operations.legislative-term-limits";
const SEED = "election-state-landings-fixture";

function fixture(
  options: {
    place?: "FL" | "KY";
    eventDate?: string;
    worldDate?: string;
    barred?: boolean;
  } = {},
) {
  const place = options.place ?? "FL";
  const eventDate = makeIsoDate(options.eventDate ?? "2026-10-01");
  const worldDate = makeIsoDate(options.worldDate ?? eventDate);
  const jurisdiction = stateJurisdictionForKey(`US-${place}`)!;
  const person = createLightweightPerson({
    worldId: createWorldId(SEED, "production"),
    worldSeed: SEED,
    index: 0,
    currentDate: worldDate,
    homeJurisdictionId: jurisdiction.id,
    birthplaceJurisdictionId: jurisdiction.id,
    profile: "production",
  });
  let world: World = createWorld({
    seed: SEED,
    currentDate: worldDate,
    jurisdictions: [jurisdiction],
    people: [person],
    lineage: "production",
  });
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (candidate) => candidate.stableKey === QUESTION_KEY,
  )!;
  const law = lawInForce(world, jurisdiction.id, proposition.id, eventDate)!;
  expect(law).toBeDefined();
  const stamp = lawEffectStamp(law, {
    effectKind: "election.state-legislative-candidacy-intent",
    questionKey: QUESTION_KEY,
    jurisdictionId: jurisdiction.id,
    appliedAt: eventDate,
  })!;
  world = recordWorldEvent(world, {
    stableKey: "fixture:barred-legislator-intent",
    type: "election.state-legislative-candidacy-intent",
    occurredAt: eventDate,
    recordedAt: eventDate,
    jurisdictionId: jurisdiction.id,
    involvedEntityIds: [person.id],
    participants: [
      { personId: person.id, role: "focus:subject", detail: "not-seeking" },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      "state-legislature-turnover-v1",
      ...(options.barred === false ? [] : ["barred:term-limit"]),
    ],
    summary: "The legislator cannot seek another term.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
    lawEffectStamps: [stamp],
  });
  const event = world.history.events.find(
    (candidate) => candidate.stableKey === "fixture:barred-legislator-intent",
  )!;
  return { world, event, personId: person.id, law };
}

describe("state election law landings", () => {
  it("lands the saved barred intent on its named person and survives save/continue", () => {
    const { world, event, personId, law } = fixture();
    expect(law.answer).toBe("yes");
    const landed = applyStateElectionLawLandings(world, event.id);
    expect(lawExposuresOf(landed, personId)).toMatchObject([
      {
        measureId: law.measureId,
        channel: "election-rule",
        relation: "own",
        direction: "cost",
        amount: null,
        cadence: null,
        sourceRecordId: event.id,
      },
    ]);
    expect(lawExposuresOf(landed, personId)).toHaveLength(1);
    expect(
      lawExposureSentence(
        landed,
        personId,
        lawExposuresOf(landed, personId)[0]!,
      ),
    ).toBe("The term-limit law prevented you from seeking another term.");
    expect(applyStateElectionLawLandings(landed, event.id)).toBe(landed);

    const restored = deserializeWorld(serializeWorld(landed));
    expect(lawExposuresOf(restored, personId)).toEqual(
      lawExposuresOf(landed, personId),
    );
    expect(
      lawExposureSentence(
        restored,
        personId,
        lawExposuresOf(restored, personId)[0]!,
      ),
    ).toBe("The term-limit law prevented you from seeking another term.");
    expect(applyStateElectionLawLandings(restored, event.id)).toBe(restored);
  });

  it("reads the same saved bar after canonical institution-rule stamp migration", () => {
    const { world, event, personId } = fixture();
    const migrated = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((row) =>
          row.id === event.id
            ? {
                ...row,
                lawEffectStamps: row.lawEffectStamps!.map((stamp) => ({
                  ...stamp,
                  effectKind: "institution-rule",
                })),
              }
            : row,
        ),
      },
    };
    const landed = applyStateElectionLawLandings(migrated, event.id);
    expect(lawExposuresOf(landed, personId)).toHaveLength(1);
    expect(lawExposuresOf(landed, personId)[0]!.sourceRecordId).toBe(event.id);
  });

  it("does not expose a source event without the recorded bar", () => {
    const { world, event, personId } = fixture({ barred: false });
    expect(applyStateElectionLawLandings(world, event.id)).toBe(world);
    expect(lawExposuresOf(world, personId)).toEqual([]);
  });

  it("does not backfill an event saved on an earlier date", () => {
    const { world, event, personId } = fixture({
      eventDate: "2026-10-01",
      worldDate: "2026-10-02",
    });
    expect(event.recordedAt).toBe(makeIsoDate("2026-10-01"));
    expect(applyStateElectionLawLandings(world, event.id)).toBe(world);
    expect(lawExposuresOf(world, personId)).toEqual([]);
  });

  it("does not expose a future source date", () => {
    const { world, event, personId } = fixture();
    const futureEvent = { ...event, occurredAt: addDays(world.currentDate, 1) };
    const futureWorld = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((candidate) =>
          candidate.id === event.id ? futureEvent : candidate,
        ),
      },
    };
    expect(applyStateElectionLawLandings(futureWorld, event.id)).toBe(
      futureWorld,
    );
    expect(lawExposuresOf(futureWorld, personId)).toEqual([]);
  });

  it("does not expose a barred tag where the recorded law answer is no", () => {
    const { world, event, personId, law } = fixture({ place: "KY" });
    expect(law.answer).toBe("no");
    expect(applyStateElectionLawLandings(world, event.id)).toBe(world);
    expect(lawExposuresOf(world, personId)).toEqual([]);
  });

  it("requires the source event to exist in the saved world", () => {
    const { world } = fixture();
    expect(() =>
      applyStateElectionLawLandings(world, "event_missing" as EntityId),
    ).toThrow("saved source event");
  });
});
