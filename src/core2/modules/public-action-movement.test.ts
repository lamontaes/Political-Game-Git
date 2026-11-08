import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { wordPrintedStory } from "../../bench/archive-words";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { OUTCOME_WEB_MODULE_ID } from "../outcome-web-model";
import { coreAPI } from "../state";
import { TERM_MEASURES } from "../term-read";
import {
  INTEREST_GROUPS_MODULE_ID,
  groupStance,
  type GroupRow,
} from "./interest-groups";
import { actionsOf } from "./public-action";

// A movement can grow (owner, Nov 8: "can you start a movement?"). A grievance
// that keeps drawing people over the same demand for months becomes a standing
// residents' group, through the interest-group engine: the same group a bill's
// fiscal losers form, with a lobbyist from among its members, lobbying the next
// bill on its question. A one-off crowd is not one.
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

it("a protest that keeps drawing people becomes a standing group that the interest-group engine knows", () => {
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
  advanceCore(core, "2025-09-06");
  const actions = actionsOf(api, world.placeId);
  const lasting = actions.filter(
    (row) => row.side === "grievance" && row.months >= 3,
  );
  const groups = api
    .moduleState(INTEREST_GROUPS_MODULE_ID)
    .table("groups")
    .rows() as unknown as GroupRow[];
  process.stdout.write(
    `MOVEMENT ${where}: ${actions.map((r) => `${r.kind}/${r.area} ${r.months} months`).join(", ") || "none"}; groups ${groups.map((g) => g.id).join(", ") || "none"}\n`,
  );
  expect(
    lasting.length,
    `${where}: a grievance lasted three months`,
  ).toBeGreaterThan(0);
  for (const action of lasting) {
    const record = [...core.durableLog.values()].find(
      (row) =>
        row.kind === "civic.movement" && row.facts?.actionId === action.id,
    );
    expect(record, `${where}: a movement record for ${action.id}`).toBeTruthy();
    const group = groups.find((row) => row.id === record!.facts!.groupId)!;
    expect(group, where).toBeTruthy();
    // Its members are the people who kept turning out; it stands for the demand; it has a voice.
    expect(group.memberPersonIds!.length, where).toBeGreaterThanOrEqual(2);
    for (const id of group.memberPersonIds!)
      expect(action.participantIds, where).toContain(id);
    expect(group.lobbyistId, where).toBeTruthy();
    expect(group.memberPersonIds, where).toContain(group.lobbyistId);
    expect(groupStance(group), where).toEqual([
      { question: record!.facts!.question, position: 1 },
    ]);
    expect(core.organizations.has(group.organizationId), where).toBe(true);
    const worded = wordPrintedStory(core, {
      id: `printed:test:${record!.id}`,
      kind: "press.printed",
      date: record!.date,
      topic: record!.topic,
      facts: { sourceRecordId: record!.id },
    } as never);
    expect(worded, `${where}: the movement is worded`).toBeTruthy();
    process.stdout.write(
      `  ${group.id} (${group.memberPersonIds!.length} members, lobbyist ${group.lobbyistId}): ${worded!.headline} / ${worded!.lede}\n`,
    );
  }
  // A crowd that was not three months old is not a group.
  for (const action of actions.filter((row) => row.months < 3))
    expect(
      [...core.durableLog.values()].some(
        (row) =>
          row.kind === "civic.movement" && row.facts?.actionId === action.id,
      ),
      where,
    ).toBe(false);
}, 600_000);
