/**
 * Hearers nobody watches, heard as groups (`hearAsGroups`, owner's level of
 * detail, Nov 9). One speech by a world candidate is heard by a drawn place's
 * adults in two cores built from the same input: one with every hearer a
 * person (the old path), one with unwatched hearers grouped. A group's shift
 * times its members is the sum of their reads; the grouped total agrees with
 * the person-by-person total; and every watched hearer's stance is the same
 * row in both.
 */
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { createLifeCore } from "./life";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import { RUN_SEED } from "./trait-test-kit";
import { drawPlace } from "../../tests/golden-path/place";
import { deliverSpeech, speechModule } from "./modules/speech";
import {
  stanceOn,
  stanceRow,
  viewsModule,
  VIEWS_MODULE_ID,
} from "./modules/views";
import { groupStance, hearsAsPerson } from "./hearer-groups";

const SEED = `${RUN_SEED}:hearer-groups`;
const place = drawPlace(SEED, "hearer-groups");
const input = buildPopulation({
  seed: SEED,
  placeKey: place.key,
  startedAt: "2025-01-20",
  minimumPeople: 900,
});
const TOPIC = "fixture:park";

function hear(grouped: boolean) {
  const core = createLifeCore(input, { modules: [viewsModule, speechModule] });
  const api = coreAPI(core);
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(input.startedAt)) >= 18,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const speaker = adults[0]!;
  // The player is the last adult; their household and circle are watched.
  core.playerId = adults[adults.length - 1]!.id;
  const audience = adults.slice(1, -1).map((p) => p.id);
  for (const [n, desiredChange] of ["enact", "enact", "repeal"].entries())
    deliverSpeech(api, {
      id: `speech:group-test:${n}`,
      speakerId: speaker.id,
      placeId: speaker.placeId,
      topic: TOPIC,
      desiredChange,
      audienceIds: audience,
      groupUnwatched: grouped,
    });
  return { core, api, speaker, audience };
}

describe(`a candidate's speeches heard in ${place.name} (seed ${SEED})`, () => {
  const people = hear(false);
  const groups = hear(true);
  const unwatched = groups.audience.filter(
    (id) => !hearsAsPerson(groups.api, id, groups.speaker.id),
  );
  const watched = groups.audience.filter((id) =>
    hearsAsPerson(groups.api, id, groups.speaker.id),
  );

  it("has hearers on both sides", () => {
    expect(unwatched.length).toBeGreaterThan(100);
    expect(watched.length).toBeGreaterThan(0);
  });

  it("gives no unwatched hearer a row of their own", () => {
    for (const id of unwatched)
      expect(stanceRow(groups.api, id, TOPIC)).toBeUndefined();
  });

  it("makes each group's shift times its members the sum of its members' reads, within rounding", () => {
    const store = groups.api.moduleState(VIEWS_MODULE_ID);
    const members = new Map<string, string[]>();
    for (const id of unwatched) {
      const row = store.table("groupHearers").get(id) as unknown as {
        groupId: string;
      };
      members.set(row.groupId, [...(members.get(row.groupId) ?? []), id]);
    }
    expect(members.size).toBeGreaterThan(3);
    for (const [groupId, ids] of members) {
      const group = groupStance(groups.api, groupId, TOPIC);
      const signed = group
        ? (group.desiredChange === "repeal" ? -1 : 1) * group.strength
        : 0;
      const sum = ids.reduce((n, id) => n + stanceOn(groups.api, id, TOPIC), 0);
      expect(sum).toBeCloseTo(signed * ids.length, 9);
    }
  });

  it("moves the unwatched in total as the person-by-person path does, within five percent", () => {
    const total = (api: typeof groups.api) =>
      unwatched.reduce((n, id) => n + stanceOn(api, id, TOPIC), 0);
    const before = total(people.api);
    const after = total(groups.api);
    expect(Math.abs(before)).toBeGreaterThan(0);
    expect(Math.abs(after - before) / Math.abs(before)).toBeLessThan(0.05);
  });

  it("keeps every watched hearer's stance row the same", () => {
    for (const id of watched)
      expect(stanceRow(groups.api, id, TOPIC)).toEqual(
        stanceRow(people.api, id, TOPIC),
      );
  });
});
