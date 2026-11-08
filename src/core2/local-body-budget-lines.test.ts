// @vitest-environment node
/** A local body (council or county board) takes up amendments to its own budget's lines through the year, some passing and some failing, and a passed one changes the line. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { lawChainForPlace } from "./laws-starting";
import { advanceCore } from "./life";
import { budgetsOf, governments } from "./modules/budgets";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const incorporated = (key: string) => {
  try {
    return lawChainForPlace(key).incorporated;
  } catch {
    return false;
  }
};
const unincorporated = (key: string) => {
  try {
    return !lawChainForPlace(key).incorporated;
  } catch {
    return false;
  }
};
const draws = [
  drawPlace(replay, "local-lines-town", incorporated),
  drawPlace(replay, "local-lines-county", unincorporated),
];

// A local body sits at the city, county or township level (a New England town's select board is a township board).
const LOCAL_BODIES = ["city", "county", "township"];

interface Bill {
  id: string;
  number: string;
  bodyOfficeId: string;
  status: string;
  provisions: { kind: string; line?: string; value: number }[];
}

// Mid-year amendments passed in each draw, in order.
const amendments: number[] = [];

for (const place of draws) {
  it(
    `a local body amends its budget lines through the year: ${place.name}, replay ${replay}`,
    { timeout: 1_800_000 },
    () => {
      const bookkeeping = setBookkeeping(false);
      try {
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        });
        const api = coreAPI(world.core);
        advanceCore(world.core, addDays(makeIsoDate(api.state.date), 365));
        const offices = new Map(
          (
            api
              .moduleState("core2-offices-v1" as never)
              .table("offices")
              .rows() as unknown as { id: string; level: string }[]
          ).map((o) => [o.id, o.level]),
        );
        const local = (
          api
            .moduleState("core2-legislature-v1" as never)
            .table("bills")
            .rows() as unknown as Bill[]
        ).filter(
          (b) =>
            LOCAL_BODIES.includes(offices.get(b.bodyOfficeId) ?? "") &&
            b.provisions.some((p) => p.kind === "budget-line"),
        );
        const by = (status: string) => local.filter((b) => b.status === status);
        const passed = local.filter((b) =>
          ["enacted", "overridden"].includes(b.status),
        );
        const amended = new Set(
          governments(api).flatMap((g) =>
            budgetsOf(api, g.id).map((b) => b.adoptedBy),
          ),
        );
        process.stdout.write(
          `LOCAL-LINES ${place.name} (${place.key}, seed ${place.seed}): ${local.length} line bills before the local body in a year: ${passed.length} passed, ${by("failed").length} failed, ${by("vetoed").length} vetoed; passed ones ${passed
            .slice(0, 3)
            .map(
              (b) =>
                `${b.number} (${b.provisions[0]!.line} ${b.provisions[0]!.value})`,
            )
            .join(", ")}\n`,
        );
        if (
          !governments(api).some((g) => ["city", "county"].includes(g.level))
        ) {
          process.stdout.write(
            `LOCAL-LINES ${place.name} (${place.key}, seed ${place.seed}): no local government budget in this place; nothing to amend\n`,
          );
          return;
        }
        expect(
          local.length,
          "line bills before the local body",
        ).toBeGreaterThan(0);
        // The annual budget is one bill; amendments are the rest. A small
        // body files an amendment only where a majority of its members want
        // the line moved, so a draw may take up none in a year.
        const mid = passed.filter((b) =>
          [...amended].some((a) => a.includes(`amended by ${b.number}`)),
        );
        amendments.push(mid.length);
        if (!mid.length)
          process.stdout.write(
            `LOCAL-LINES ${place.name} (${place.key}, seed ${place.seed}): the body took up no mid-year amendment (no majority wanted a line moved)\n`,
          );
      } finally {
        setBookkeeping(bookkeeping);
      }
    },
  );
}

it(`across the draws a passed amendment changed a budget line, replay ${replay}`, () => {
  expect(
    amendments.some((n) => n > 0),
    "a passed amendment changed a budget line in some draw",
  ).toBe(true);
});
