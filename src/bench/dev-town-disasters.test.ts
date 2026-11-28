/**
 * Dev mode's town disasters (dev-views/town-disasters.ts) through the bench's own request handler
 * on a built world at a drawn place: `POST dev/town-disasters/cause` makes the county's next
 * disaster, and `GET dev/town-disasters` then lists it with the exposure it came from. A county
 * with no recorded flood, storm or wildfire to take figures from is passed over by name.
 */
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { handleDev } from "./dev-api";
import { loadDevViews } from "./dev-views";
import { buildBenchWorld } from "./world";

const SEED = process.env.GOLDEN_PATH_SEED ?? `town-disasters-${Date.now()}`;
const PLACES = 12;

const request = (method: "GET" | "POST", body = ""): IncomingMessage =>
  ({
    method,
    async *[Symbol.asyncIterator]() {
      if (body) yield Buffer.from(body);
    },
  }) as unknown as IncomingMessage;

it("dev mode causes a town disaster and lists it with its exposure", async () => {
  setBookkeeping(false);
  await loadDevViews();
  const passed: string[] = [];
  for (let draw = 0; draw < PLACES; draw++) {
    const place = drawPlace(SEED, `town-disasters-${draw}`);
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const ask = async (method: "GET" | "POST", path: string, body = "") => {
      let answer: { status: number; value: unknown } | undefined;
      const handled = await handleDev(
        request(method, body),
        new URL(`http://bench/api/dev/${path}`),
        (status, value) => (answer = { status, value }),
        () => ({
          core: world.core,
          director: world.director,
          placeId: world.placeId,
        }),
      );
      expect(handled, `${where}: ${path} was not handled`).toBe(true);
      return answer!;
    };
    const caused = await ask("POST", "town-disasters/cause", "{}");
    expect(caused.status, where).toBe(200);
    const made = caused.value as { number: number | null; recorded: number };
    if (made.number === null) {
      passed.push(`${where}: no recorded disaster to take figures from`);
      continue;
    }
    const listed = await ask("GET", "town-disasters");
    const rows = listed.value as {
      exposure: { id: string; happened: number }[];
      disasters: { number: number; recorded: number | null }[];
    };
    expect(
      rows.disasters.map((row) => row.number),
      `${where}: the caused disaster is listed`,
    ).toContain(made.number);
    expect(
      rows.exposure.some((row) => row.happened >= 1),
      `${where}: its exposure counts it`,
    ).toBe(true);
    process.stdout.write(
      `town-disasters: ${where}: caused ${made.number} (recorded ${made.recorded}); ${passed.length} places passed over\n`,
    );
    return;
  }
  throw new Error(
    `no place caused a disaster in ${PLACES} draws (seed ${SEED}):\n${passed.join("\n")}`,
  );
}, 900_000);
