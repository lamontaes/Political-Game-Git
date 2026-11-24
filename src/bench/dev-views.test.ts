/**
 * Dev mode's one registration point (dev-views.ts, ui/dev-views.mjs): a view in its own file adds
 * routes and draws in a slot without editing dev-mode.ts or dev-api.ts. Played through the bench's
 * own request handler on a built world: Ridgeville, Alabama (0164656), the draw "8341-pin"/"p6"
 * executive-bill-menu.test.ts names.
 */
import { readFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { handleDev } from "./dev-api";
import { devModeMarks } from "./dev-mode";
import {
  devViewRoutes,
  loadDevViews,
  registerDevView,
  type DevView,
} from "./dev-views";
import { devViewNodes } from "./ui/dev-views.mjs";
import { buildBenchWorld } from "./world";

const PINNED = { run: "8341-pin", purpose: "p6", key: "0164656" };

/** The routes dev-api.ts answers itself, read from its switch. */
const builtIn = new Set(
  [
    ...readFileSync(new URL("./dev-api.ts", import.meta.url), "utf8").matchAll(
      /case "((?:GET|POST) [^"]+)":/g,
    ),
  ].map((m) => m[1]!),
);

/** A request as the bench's server hands it to handleDev. */
function request(method: string, input?: unknown): IncomingMessage {
  const text = input === undefined ? "" : JSON.stringify(input);
  return {
    method,
    async *[Symbol.asyncIterator]() {
      if (text) yield text;
    },
  } as unknown as IncomingMessage;
}

/** One view, written as a thread would write it in src/bench/dev-views/. */
const probe: DevView = {
  name: "registration-probe",
  client: "registration-probe.mjs",
  labels: { title: "Probe" },
  routes: {
    "GET registration-probe": ({ mode, q }) => ({
      date: mode.core.date,
      asked: q("id"),
    }),
    "POST registration-probe/mark": ({ mode, input }) =>
      mode.mark("registration-probe", [], { said: String(input.said) }),
  },
};

it("a view registered from its own file answers its routes and draws in its slot (Ridgeville AL)", async () => {
  setBookkeeping(false);
  const place = drawPlace(PINNED.run, PINNED.purpose);
  const where = `${place.name} (${place.key}), world seed ${place.seed}`;
  expect(place.key, `${where}: the pinned place moved`).toBe(PINNED.key);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  await loadDevViews();
  registerDevView(probe);

  // Every view in src/bench/dev-views/ and this one: no route dev-api.ts answers itself.
  const taken = devViewRoutes().filter((r) => builtIn.has(r.key));
  expect(builtIn.has("GET laws"), "the switch's routes were not read").toBe(
    true,
  );
  expect(devViewRoutes().map((r) => r.key)).toContain("GET registration-probe");
  expect(taken, "a view names a route dev mode answers itself").toEqual([]);

  // Refused: a second view of the same name, a route another view answers, a malformed route.
  expect(() => registerDevView({ name: "registration-probe" })).toThrow(
    /already registered/,
  );
  expect(() =>
    registerDevView({
      name: "registration-twin",
      routes: { "GET registration-probe": () => null },
    }),
  ).toThrow(/already answered by registration-probe/);
  expect(() =>
    registerDevView({
      name: "registration-bad",
      routes: { "registration-probe": () => null },
    }),
  ).toThrow(/not "GET name"/);

  const answers: { status: number; value: unknown }[] = [];
  const ask = async (method: string, path: string, input?: unknown) => {
    const url = new URL(`http://bench/api/dev/${path}`);
    const handled = await handleDev(
      request(method, input),
      url,
      (status, value) => answers.push({ status, value }),
      () => ({
        core: world.core,
        director: world.director,
        placeId: world.placeId,
      }),
    );
    expect(handled, `${path} was not handled`).toBe(true);
    return answers.at(-1)!;
  };

  // The page's list, a GET with its query, and a POST that marks through DevMode.mark.
  const listed = await ask("GET", "views");
  expect(listed.value).toContainEqual({
    name: "registration-probe",
    client: "registration-probe.mjs",
    labels: { title: "Probe" },
  });
  const got = await ask("GET", "registration-probe?id=p1");
  expect(got).toEqual({
    status: 200,
    value: { date: world.core.date, asked: "p1" },
  });
  const before = devModeMarks(world.core).length;
  const marked = await ask("POST", "registration-probe/mark", { said: "yes" });
  expect(marked.status).toBe(200);
  expect(devModeMarks(world.core).length, `${where}: no mark written`).toBe(
    before + 1,
  );
  expect(devModeMarks(world.core).at(-1)).toContain(":registration-probe:");
  // dev mode's own routes are still its own, and an unknown route is still refused.
  expect((await ask("GET", "laws")).status).toBe(200);
  expect((await ask("GET", "no-such-view")).status).toBe(404);

  // The page side: a slot gets each view's part in order, with its labels and the context.
  const drawn = await devViewNodes(
    "bill-card",
    { billId: "b1" },
    {
      views: listed.value as { client: string }[],
      load: async (file: string) =>
        file === "registration-probe.mjs"
          ? {
              slots: {
                "bill-card": ({
                  billId,
                  labels,
                }: {
                  billId: string;
                  labels: { title: string };
                }) => `${labels.title} ${billId}`,
              },
            }
          : {},
    },
  );
  expect(drawn).toEqual(["Probe b1"]);
  expect(
    await devViewNodes(
      "panels",
      {},
      {
        views: listed.value as { client: string }[],
        load: async () => ({ slots: {} }),
      },
    ),
  ).toEqual([]);
}, 60_000);
