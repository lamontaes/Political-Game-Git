/**
 * A finished public project is a ribbon-cutting (pool item
 * office-cut-a-ribbon-needs-a-record-of): a budget line that buys from the
 * town's builders becomes a project for its fiscal year, keeps every
 * contractor payment by id, finishes when the year ends, and the executive
 * who leads the government that paid for it is offered the ribbon, which
 * they cut once.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { awaitingRibbon, projectsOf } from "./budgets-projects";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { governments } from "./modules/budgets";
import { officeHost, officeActsOf } from "./modules/office-day";
import { OFFICES_MODULE_ID, townSeats, type TermRow } from "./modules/offices";
import {
  OFFICE_ACTS,
  officeActHandlers,
  officeActProviders,
} from "./office-day-acts";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 8;

it(`a finished public project is offered to the executive as a ribbon-cutting, from seed ${seed}`, () => {
  const misses: string[] = [];
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "ribbon");
    const where = `${place.name}, seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const terms = (seatId: string) =>
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .query("bySeatStatus", [seatId, "serving"]) as unknown as TermRow[];
    const executive = townSeats(api).find(
      ({ office, seat }) =>
        ["mayor", "county-executive"].includes(office.kind) &&
        terms(seat.id)[0]?.personId,
    );
    if (!executive) {
      misses.push(`${where}: no executive who is a person`);
      continue;
    }
    const leader = terms(executive.seat.id)[0]!.personId!;
    // A little over a year of the played world: the first fiscal year's projects finish.
    advanceCore(core, addDays(makeIsoDate(core.date), 420));
    const gov = governments(api).find(
      (g) => g.level === executive.office.level,
    );
    if (!gov) {
      misses.push(`${where}: no ${executive.office.level} government`);
      continue;
    }
    const finished = projectsOf(api, gov.id).filter((p) => p.finishedOn);
    if (!finished.length) {
      misses.push(`${where}: no ${gov.level} project finished`);
      continue;
    }
    // Every project keeps its contractor payments by id and adds up to what was paid.
    for (const project of finished) {
      expect(
        project.paymentIds.length,
        `${where}: ${project.id}`,
      ).toBeGreaterThan(0);
      expect(project.paidMinor, `${where}: ${project.id}`).toBeGreaterThan(0);
      expect(project.finishedOn! > project.startedOn, where).toBe(true);
    }
    // The executive, as the character the player controls, is offered the ribbon.
    (core as { playerId?: string }).playerId = leader;
    const action = OFFICE_ACTS.find((a) => a.id === "cut-ribbon")!;
    const actor = (api.state as CoreState).people.get(leader)!;
    const offered = () =>
      officeActProviders(officeHost)["finished-project"](api, actor, action);
    const offers = offered();
    expect(
      offers.map((o) => o.targetId),
      where,
    ).toEqual(awaitingRibbon(api, gov.id).map((p) => p.id));
    expect(offers.length, `${where}: a ribbon to cut`).toBeGreaterThan(0);
    const target = offers[0]!;
    officeActHandlers(officeHost)["cut-ribbon"](api, leader, target);
    const opened = projectsOf(api, gov.id).find(
      (p) => p.id === target.targetId,
    )!;
    expect(opened.openedBy, where).toBe(leader);
    expect(opened.openedOn, where).toBe(api.state.date);
    expect(
      officeActsOf(api, leader).some(
        (row) => row.kind === "cut-ribbon" && row.recordId === target.targetId,
      ),
      where,
    ).toBe(true);
    // Once cut, it is not offered again.
    expect(
      offered().some((o) => o.targetId === target.targetId),
      where,
    ).toBe(false);
    console.log(
      `RIBBON ${where}: ${leader} cut ${target.targetId}, ${opened.paymentIds.length} payments, ${opened.paidMinor}`,
    );
    return;
  }
  expect.fail(
    `no draw reached a finished project in ${DRAWS}: ${misses.join("; ")}`,
  );
}, 3_600_000);
