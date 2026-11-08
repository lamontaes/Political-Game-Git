import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI, registerModule } from "../state";
import { OUTCOME_WEB_MODULE_ID } from "../outcome-web-model";
import { TERM_MEASURES } from "../term-read";
import { actionsOf } from "./public-action";
import { CASE_MADE } from "./speech";

// A rally has no demand (owner, Nov 8: "if the world is great... you show up
// to a rally"). A town whose term reads well in every area gathers rallies; a
// friend in one asks the player to come with a topic that names no demand, and
// the player saying yes puts them in it without pressing any official.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "public-action-rally");
const where = `${place.name} (${place.key}), seed ${seed}:0`;

it("a rally invites the player without a demand, and joining one presses no one", () => {
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const api = coreAPI(core);
  const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  // Every measure moves the way that reads well for it: bad things fall, good
  // things rise (the term read's own directions).
  const falls = ["labor.unemployment", "housing.rent", "crime."];
  for (const [at, month] of [
    "2025-01",
    "2026-01",
    "2026-02",
    "2026-03",
  ].entries()) {
    const values: Record<string, number> = {};
    for (const key of TERM_MEASURES) {
      const factor = falls.some((prefix) => key.startsWith(prefix))
        ? -0.3
        : 0.3;
      values[key] = 100 * (1 + factor * (Math.max(at - 1, 0) / 2));
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
  const invited: { id: string; speaker: string; topic: string | undefined }[] =
    [];
  const pressed: string[] = [];
  registerModule(core, {
    id: "test-rally-tap",
    eventKinds: [CASE_MADE, "cause.shared"],
    onEvent: (_api, event) => {
      if (
        event.kind === "cause.shared" &&
        event.id.startsWith("cause.shared:action:")
      )
        invited.push({
          id: event.id,
          speaker: event.personIds[0]!,
          topic: event.topic,
        });
      if (event.id.startsWith("case:action:")) pressed.push(event.id);
    },
  });
  advanceCore(core, "2025-07-06");
  const actions = actionsOf(api, world.placeId);
  process.stdout.write(
    `RALLY ${where}: ${actions.map((row) => `${row.kind}/${row.area} x${row.participantIds.length}`).join(", ") || "none"}; invited ${invited.length}\n`,
  );
  const rallies = actions.filter((row) => row.kind === "rally");
  expect(rallies.length, where).toBeGreaterThan(0);
  // A rally presses no one (an area that read badly may protest beside it),
  // and an invitation to one names the area, not a policy question.
  const pressedByRally = () =>
    pressed.filter((id) => rallies.some((row) => id.includes(`${row.id}:`)));
  expect(pressedByRally(), where).toEqual([]);
  for (const row of invited.filter((row) =>
    rallies.some((rally) => row.id.includes(rally.id)),
  ))
    expect(row.topic?.includes("us-policy-positions"), where).toBe(false);
  // The player says yes to a friend in a rally: in it from then, still pressing no one.
  const rally = rallies[0]!;
  const friend = rally.participantIds[0]!;
  api.emit({
    id: `scene.reply:test:rally`,
    date: core.date,
    kind: "scene.reply",
    personIds: [world.playerId!, friend],
    placeId: world.placeId,
    facts: {
      typeKey: "cause-invite",
      causeId: `cause.shared:${rally.id}:${friend}:${world.playerId}`,
      ending: "joined",
    },
    source: { tag: "SOURCED", asOf: core.date, citation: "test" },
  });
  const after = actionsOf(api, world.placeId).find(
    (row) => row.id === rally.id,
  )!;
  expect(after.participantIds, where).toContain(world.playerId);
  expect(pressedByRally(), where).toEqual([]);
}, 240_000);
