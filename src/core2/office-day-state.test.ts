/**
 * The state officeholder's day in the world the owner plays (pool:
 * office-needs-office-state-26): the bench world in a place and seed nobody
 * chose, every module installed. A sitting state legislator and the governor
 * each get a calendar from the place's session data, every entry citing where
 * its date comes from, and the legislature's members are paid their per diem
 * from the state's treasury where the place pays one.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { lawChain } from "./modules/laws";
import {
  perDiemOf,
  perDiemPaidTo,
  stateDay,
  stateOfficeOf,
  type StateOffice,
} from "./office-day-state";
import { coreAPI } from "./state";

it("gives a state legislator and the governor a calendar from the place's data, and pays the per diem", () => {
  const seed = process.env.OFFICE_STATE_SEED || randomBytes(8).toString("hex");
  const place = drawPlace(seed, "office-state");
  const where = `${place.name} [${place.key}], seed ${seed}`;
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const terms = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .rows() as unknown as TermRow[];
  const offices = new Map<string, StateOffice>();
  for (const term of terms) {
    if (term.status !== "serving" || !term.personId) continue;
    const office = stateOfficeOf(api, term.personId);
    if (office) offices.set(`${office.role}:${office.personId}`, office);
  }
  const legislator = [...offices.values()].find((o) => o.role === "legislator");
  const governor = [...offices.values()].find((o) => o.role === "governor");
  expect(legislator, `${where}: a sitting state legislator`).toBeTruthy();
  expect(governor, `${where}: the sitting governor`).toBeTruthy();

  // Two years of days from the start: each entry has a unique id and a cited source.
  const start = makeIsoDate(core.date);
  const seen = new Set<string>();
  const kinds = new Map<string, Set<string>>([
    ["legislator", new Set()],
    ["governor", new Set()],
  ]);
  for (let n = 0; n < 730; n++) {
    const date = addDays(start, n);
    for (const office of [legislator!, governor!])
      for (const entry of stateDay(api, office, date)) {
        expect(seen.has(entry.id), `${where} ${entry.id}`).toBe(false);
        seen.add(entry.id);
        expect(entry.holderId).toBe(office.personId);
        expect(entry.source.citation.length, entry.id).toBeGreaterThan(0);
        kinds.get(office.role)!.add(entry.kind);
      }
  }
  // A legislator has days of office whether the legislature sits or not.
  expect([...kinds.get("legislator")!].length, where).toBeGreaterThan(0);

  // The per diem: where the place pays one, a member who sat is paid from the state's treasury.
  const rate = perDiemOf(lawChain(api).stateKey, core.seed);
  advanceCore(core, addDays(start, 400));
  const paid = perDiemPaidTo(api, legislator!.personId);
  if (rate && rate.basis !== "none" && rate.dailyMinor > 0 && paid.length) {
    for (const row of paid) {
      expect(row.paidMinor, `${where} ${row.id}`).toBeLessThanOrEqual(
        row.days * rate.dailyMinor + row.shortMinor,
      );
      expect(row.citation, row.id).toContain(lawChain(api).stateKey);
    }
  }
}, 900_000);
