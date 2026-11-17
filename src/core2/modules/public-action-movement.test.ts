import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { wordPrintedStory } from "../../bench/archive-words";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { OUTCOME_WEB_MODULE_ID } from "../outcome-web-model";
import { coreAPI, registerModule } from "../state";
import { TERM_MEASURES } from "../term-read";
import {
  INTEREST_GROUPS_MODULE_ID,
  groupStance,
  type GroupRow,
} from "./interest-groups";
import { actionsOf, organizerOf } from "./public-action";

// A movement can grow (owner, Nov 8: "can you start a movement?"). One of the
// people who keep turning out over a grievance decides to found a standing
// residents' group when the crowd, the grievance and their own ties carry it,
// through the interest-group engine: the same group a bill's fiscal losers
// form, with the organizer as its lobbyist, lobbying the next bill on its
// question. A weak or small crowd never does.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "public-action-movement");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const api = coreAPI(core);
const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");

it("a protest whose people decide to found a group becomes one that the interest-group engine knows", () => {
  const change: Record<string, number> = {
    "housing.rent": 0.3,
    "labor.unemployment": 0.4,
    "health.": -0.2,
  };
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of TERM_MEASURES) {
      const factor = Object.entries(change).find(([prefix]) =>
        key.startsWith(prefix),
      )?.[1];
      values[key] = 100 * (1 + (factor ?? 0) * (Math.max(at - 1, 0) / 2));
    }
    web.put({
      id: `web:${world.placeId}:${month}`,
      placeId: world.placeId,
      month,
      date: `${month}-02`,
      values,
      bases: values,
      effects: {},
      engineSources: {},
    } as never);
  }
  // What the crowd looked like on the day a group was founded: its organizer
  // among the people turned out, and how long it had been turning out.
  const atFounding = new Map<string, { inCrowd: boolean; months: number }>();
  registerModule(core, {
    id: "test-movement-tap",
    eventKinds: ["civic.movement"],
    onEvent: (tapApi, event) => {
      const action = actionsOf(tapApi, world.placeId).find(
        (row) => row.id === event.facts!.actionId,
      );
      if (!action) return;
      atFounding.set(event.id, {
        inCrowd: action.participantIds.includes(event.facts!.organizerId!),
        months: action.months,
      });
    },
  });
  advanceCore(core, "2025-12-06");
  const actions = actionsOf(api, world.placeId);
  const groups = api
    .moduleState(INTEREST_GROUPS_MODULE_ID)
    .table("groups")
    .rows() as unknown as GroupRow[];
  const records = [...core.durableLog.values()].filter(
    (row) => row.kind === "civic.movement",
  );
  process.stdout.write(
    `MOVEMENT ${where}: ${actions.map((r) => `${r.kind}/${r.area} ${r.months} months`).join(", ") || "none"}; movements ${records.map((r) => `${r.facts!.question} (${r.date})`).join(", ") || "none"}\n`,
  );
  expect(records.length, `${where}: a crowd became a movement`).toBeGreaterThan(
    0,
  );
  for (const record of records) {
    const action = actions.find((row) => row.id === record.facts!.actionId)!;
    const group = groups.find((row) => row.id === record.facts!.groupId)!;
    expect(action.side, where).toBe("grievance");
    expect(group, where).toBeTruthy();
    // Its members are the people who turned out; it stands for the demand; one
    // of them decided to found it and speaks for it.
    expect(group.memberPersonIds!.length, where).toBeGreaterThanOrEqual(2);
    const founding = atFounding.get(record.id)!;
    expect(founding, where).toBeTruthy();
    // The organizer is one of the people who had turned out that day.
    expect(founding.inCrowd, `${where}: the organizer was in the crowd`).toBe(
      true,
    );
    expect(group.lobbyistId, where).toBe(record.facts!.organizerId);
    expect(group.memberPersonIds, where).toContain(group.lobbyistId);
    expect(groupStance(group), where).toEqual([
      { question: record.facts!.question, position: 1 },
    ]);
    expect(core.organizations.has(group.organizationId), where).toBe(true);
    // Movements form over weeks to a few months: one to six months of turnout.
    const monthsToFound = founding.months;
    expect(monthsToFound, `${where}: months to found`).toBeGreaterThanOrEqual(
      1,
    );
    expect(monthsToFound, `${where}: months to found`).toBeLessThanOrEqual(6);
    const worded = wordPrintedStory(core, {
      id: `printed:test:${record.id}`,
      kind: "press.printed",
      date: record.date,
      topic: record.topic,
      facts: { sourceRecordId: record.id },
    } as never);
    expect(worded, `${where}: the movement is worded`).toBeTruthy();
    process.stdout.write(
      `  ${group.id} founded after ${monthsToFound} months (${group.memberPersonIds!.length} members, organizer ${group.lobbyistId}): ${worded!.headline} / ${worded!.lede}\n`,
    );
  }
  // The decision slides with the crowd: the same people, the grievance's
  // weight gone and no one counted beside them, found nothing; the whole
  // crowd at its full weight does.
  const grievance = actions.find((row) => row.side === "grievance")!;
  expect(
    organizerOf(
      api,
      { ...grievance, level: 0, countedParticipants: 0 },
      grievance.participantIds.slice(0, 2),
    ),
    `${where}: a weak crowd founds nothing`,
  ).toBeUndefined();
  expect(
    organizerOf(api, grievance, grievance.participantIds),
    `${where}: a strong crowd has an organizer`,
  ).toBeTruthy();
  // A crowd whose people decided not to found a group has no record: some
  // grievances stay a protest.
  for (const action of actions.filter((row) => row.side === "grievance"))
    if (!records.some((row) => row.facts!.actionId === action.id))
      expect(
        groups.some((row) => row.formedOver === action.id),
        where,
      ).toBe(false);
}, 600_000);
