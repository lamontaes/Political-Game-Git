/**
 * Every public pay authority the world opens with is funded by the treasury of
 * the government it belongs to, in a Puerto Rico place (whose municipio is the
 * county-level government of the town and the employer of its police and
 * schools) and in a place drawn from all 56. A year follows in the Puerto Rico
 * place: the books balance and the municipio's treasury pays its workers.
 */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { governments } from "./modules/budgets";
import { placeLocalities } from "./places";
import { coreAPI } from "./state";
import { publicPayTreasuries } from "./public-work-pay";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

function unfunded(core: ReturnType<typeof buildBenchWorld>["core"]): string[] {
  const links = publicPayTreasuries(core);
  return [...core.organizations.values()]
    .filter(
      // The opening's public employers; the outside market pays through an
      // authority of its own and belongs to no government.
      (org) =>
        org.publicPayAuthority &&
        org.publicPayAuthority.id.startsWith("opening-public-pay:") &&
        !links.has(org.publicPayAuthority.id),
    )
    .map(
      (org) =>
        `${org.name} (${org.id}, authority ${org.publicPayAuthority!.id}, government ${org.governmentFacts?.governmentKey})`,
    );
}

describe(`public pay authorities and their treasuries (seed ${seed})`, () => {
  it("funds every authority in a drawn place", () => {
    setBookkeeping(false);
    try {
      const place = drawPlace(seed, "public-pay-treasuries");
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      expect(
        unfunded(core),
        `${place.name} (${place.key}), seed ${place.seed}`,
      ).toEqual([]);
    } finally {
      setBookkeeping(true);
    }
  }, 600_000);

  it("funds every authority in a Puerto Rico place, and the municipio pays its workers for a year", () => {
    setBookkeeping(false);
    try {
      const places = [...placeLocalities("US-PR")].sort((a, b) =>
        a.key.localeCompare(b.key),
      );
      const pick =
        places[
          parseInt(
            createHash("sha256").update(seed).digest("hex").slice(0, 8),
            16,
          ) % places.length
        ]!;
      const { core } = buildBenchWorld(`${seed}:pr`, gameStartDate(), {
        twoLevel: true,
        placeKey: pick.key,
      });
      const where = `${pick.displayName} (${pick.key}), seed ${seed}:pr`;
      expect(unfunded(core), where).toEqual([]);
      const api = coreAPI(core);
      const municipio = governments(api).find((g) => g.level === "county");
      expect(municipio, `${where}: no municipio government`).toBeDefined();
      advanceCore(core, addDays(makeIsoDate(core.date), 365));
      expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
        core.cashJournal.totals.grossCreditMinor,
      );
    } finally {
      setBookkeeping(true);
    }
  }, 1_200_000);
});
