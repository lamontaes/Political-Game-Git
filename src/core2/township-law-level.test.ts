/**
 * A township over a place makes its own law: the law chain has a township level
 * between the county and the city, and the township board meets and legislates
 * for it even where a council sits in the same place. Whatever the board
 * enacts is a law row at its township, never the place's.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { lawChainForPlace } from "./laws-starting";
import { LAWS_MODULE_ID, openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { openLegislature } from "./modules/legislature";
import { openLawReach } from "./law-reach/host";
import { openWorldLegislating, sessionsOf } from "./modules/world-legislating";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import type { LawRowInput } from "./laws-starting";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`township-law:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("a township makes its own law", () => {
  it("the chain has a township level, and its board legislates for it next to a council", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const state = pick(states, `state:${attempt}`);
      const places = [
        ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
          stateJurisdictionKey: state,
          scope: "locality",
        }),
      ].sort((a, b) => a.key.localeCompare(b.key));
      if (!places.length) continue;
      const key = pick(places, `place:${attempt}`).key;
      const chain = lawChainForPlace(key);
      const township = chain.levels.find((l) => l.level === "township");
      if (!township) continue;
      const where = `seed ${seed}, ${state} place ${key}`;
      tried.push(where);
      // The township sits between the county and the place.
      const order = chain.levels.map((l) => l.level);
      expect(order.indexOf("township"), where).toBeGreaterThan(
        order.lastIndexOf("county"),
      );
      expect(order[order.length - 1], where).toBe("city");
      const core = createLifeCore(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
      );
      openLaws(core);
      openOffices(core, seed);
      openElections(core);
      openCampaigns(core);
      openRecord(core);
      openLegislature(core);
      openLawReach(core);
      openWorldLegislating(core);
      const api = coreAPI(core);
      const offices = api
        .moduleState(OFFICES_MODULE_ID)
        .table("offices")
        .rows() as unknown as {
        id: string;
        kind: string;
        jurisdiction: string;
      }[];
      const board = offices.find(
        (o) =>
          o.kind === "township-board" &&
          o.jurisdiction === township.jurisdiction,
      );
      if (!board) continue;
      advanceCore(core, "2027-01-05");
      // The board meets, whether or not a council sits in the same place.
      expect(
        sessionsOf(api).some((s) => s.bodyOfficeId === board.id),
        `${where}: the township board never met`,
      ).toBe(true);
      // Anything it or any body enacted at its jurisdiction is at its level.
      const laws = api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[];
      for (const row of laws.filter(
        (l) => l.jurisdiction === township.jurisdiction,
      ))
        expect(row.level, `${where}: ${row.id}`).toBe("township");
      return;
    }
    throw new Error(`no place with a township board: ${tried.join("; ")}`);
  }, 900_000);
});
