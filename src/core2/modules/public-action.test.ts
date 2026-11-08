import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../../bench/world";
import { drawPlace } from "../../../scripts/core2-year/place";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { coreAPI, registerModule } from "../state";
import { OUTCOME_WEB_MODULE_ID } from "../outcome-web-model";
import { TERM_MEASURES } from "../term-read";
import { actionsOf } from "./public-action";
import { townSeats } from "./offices";
import { CASE_MADE } from "./speech";

// A town's term read by area becomes strikes, protests and rallies (owner,
// Nov 8: "if you're having a good term except for education, then you might
// get a strike"). One world drawn from all 56 places on a seed the builder did
// not choose; the web's month rows for its town are written the way the web
// writes them (a year after it opened, schools and jobs sliding, health
// improving), and the engine runs through its own monthly calendar. The
// played-year proof is in the PR body.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "public-action");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const api = coreAPI(core);
const web = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");

function writeTerm(change: Record<string, number>) {
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
}

describe("a town's term becomes strikes, protests and rallies", () => {
  it("organizes where the term reads badly and gathers where it reads well, from named people, and presses officials", () => {
    writeTerm({
      "school.": -0.2,
      "labor.unemployment": 0.4,
      "housing.rent": 0.3,
      "health.": -0.2,
    });
    // A tap on the speech engine's cases, to see who was pressed.
    const pressed: { id: string; witnessIds: readonly string[] }[] = [];
    registerModule(core, {
      id: "test-case-tap",
      eventKinds: [CASE_MADE],
      onEvent: (_api, event) => {
        if (event.id.startsWith("case:action:"))
          pressed.push({ id: event.id, witnessIds: event.witnessIds ?? [] });
      },
    });
    advanceCore(core, "2025-07-06");
    const actions = actionsOf(api, world.placeId);
    process.stdout.write(
      `PUBLIC ACTION ${where}: ${actions.map((row) => `${row.kind}/${row.area} x${row.participantIds.length} (${row.months} months)`).join(", ") || "none"}\n`,
    );
    expect(actions.length, where).toBeGreaterThan(0);
    for (const row of actions) {
      expect(row.participantIds.length, where).toBeGreaterThanOrEqual(2);
      for (const id of row.participantIds) {
        const person = core.people.get(id)!;
        // They are adults of the town as they joined it, and never the player.
        expect(person.birthDate, where).toBeTruthy();
        expect(id, where).not.toBe(world.playerId);
      }
      // The kind follows the side: a bad slide is a protest or a strike, a good one a rally.
      expect(row.kind === "rally", where).toBe(row.side === "pride");
      expect(row.sourceRecordIds.length, where).toBeGreaterThan(0);
      // An action is a public record the news carries.
      const event = core.durableLog.get(`civic.${row.kind}:${row.id}`);
      expect(event?.publicRecord, where).toBe(true);
    }
    // The people in a protest pressed the town's officials (the speech engine's case).
    expect(pressed.length, where).toBeGreaterThan(0);
    const seated = new Set(
      townSeats(api).flatMap((row) =>
        row.holder?.personId ? [row.holder.personId] : [],
      ),
    );
    for (const row of pressed) {
      expect(row.witnessIds.length, where).toBeGreaterThan(0);
      for (const id of row.witnessIds) expect(seated.has(id), where).toBe(true);
    }
  });
});
