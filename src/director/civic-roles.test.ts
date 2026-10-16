import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import {
  LEGISLATURE_MODULE_ID,
  memberKey,
  members,
} from "../core2/modules/legislature";
import { BUDGETS_MODULE_ID } from "../core2/modules/budgets";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { townSeats } from "../core2/modules/offices";
import {
  outletsHere,
  PRESS_MODULE_ID,
  requestInterview,
} from "../core2/modules/press";
import { VOTING_MODULE_ID, pollingPlaceOf } from "../core2/modules/voting";
import { civicFill } from "./civic-roles";
import type { Moment } from "./types";

// The civic roles a scene's type names (clerk, chair, members, press, poll
// workers) filled from the records that carry them, in a played world on a
// place and seed nobody chose. A moment is built around each record the
// world wrote; the producers that fire these scenes from their causes are the
// next families (pool item director-civic-producers).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "civic-roles");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  placeKey: place.key,
  twoLevel: true,
});
const { core } = world;
const api = coreAPI(core);
advanceCore(core, addDays(makeIsoDate(core.date), 365));
const where = `${place.name} (${place.key}), seed ${seed}`;

const momentFor = (personId: string, causeId: string): Moment =>
  ({
    id: `civic-test:${causeId}`,
    personId,
    date: core.date,
    label: "civic-test",
    causeId,
    causeKind: "civic-test",
    counterpartIds: [],
  }) as unknown as Moment;

describe(`civic role fills in ${where}`, () => {
  it("fills the poll workers from the voting engine's polling place", () => {
    expect(api.state.modules.has(VOTING_MODULE_ID), where).toBe(true);
    let checked = 0;
    for (const person of core.people.values()) {
      const place = pollingPlaceOf(api, person.id, core.date);
      if (!place?.pollWorkers?.ids.length) continue;
      const workers = civicFill(
        "poll-workers",
        core,
        momentFor(person.id, place.id),
        new Set(),
      );
      expect(workers.length, where).toBeGreaterThan(0);
      for (const id of workers) {
        expect(place.pollWorkers.ids).toContain(id);
        expect(id).not.toBe(person.id);
        expect(core.people.get(id)?.alive).toBe(true);
      }
      checked += 1;
      if (checked >= 5) break;
    }
    expect(checked, where).toBeGreaterThan(0);
  });

  it("fills the press with the reporter an interview record names", () => {
    expect(api.state.modules.has(PRESS_MODULE_ID), where).toBe(true);
    const holder = townSeats(api).find((seat) => seat.holder?.personId)?.holder
      ?.personId;
    expect(holder, where).toBeTruthy();
    let named = 0;
    for (const outlet of outletsHere(api)) {
      const row = requestInterview(api, {
        outletId: outlet.id,
        personId: holder!,
      });
      if (!row.reporterId) continue;
      const press = civicFill(
        "press",
        core,
        momentFor(holder!, row.id),
        new Set(),
      );
      expect(press, `${where}: ${row.id}`).toEqual([row.reporterId]);
      named += 1;
    }
    expect(named, where).toBeGreaterThan(0);
  });

  it("fills the chair and the members from the body of a bill", () => {
    const bills = api
      .moduleState(LEGISLATURE_MODULE_ID)
      .table("bills")
      .rows() as unknown as { id: string; bodyOfficeId: string }[];
    expect(bills.length, where).toBeGreaterThan(0);
    let withMembers = 0;
    let withChair = 0;
    for (const bill of bills.slice(0, 30)) {
      const roll = members(api, bill.bodyOfficeId).map(memberKey);
      const subject = [...core.people.keys()][0]!;
      const seated = civicFill(
        "members",
        core,
        momentFor(subject, bill.id),
        new Set(),
      );
      for (const id of seated) {
        expect(roll).toContain(id);
        expect(id).not.toBe(subject);
      }
      if (seated.length) withMembers += 1;
      const chair = civicFill(
        "chair",
        core,
        momentFor(subject, bill.id),
        new Set(),
      );
      expect(chair.length, `${where}: ${bill.id}`).toBeLessThanOrEqual(1);
      if (chair.length) withChair += 1;
    }
    expect(withMembers, where).toBeGreaterThan(0);
    expect(withChair, where).toBeGreaterThan(0);
  });

  it("fills the teller with the head of the outlet whose story taught the person", () => {
    // Hand-made records, since the played year rarely lands a change that a
    // story then explains: a story an outlet carried, the person who heard it
    // and the landed change it explained.
    const outlet = outletsHere(api).find(
      (row) => row.headId && core.people.get(row.headId)?.alive,
    );
    expect(outlet, where).toBeDefined();
    const reader = [...core.people.values()].find(
      (p) => p.alive && p.id !== outlet!.headId,
    )!;
    const news = api.moduleState(NEWS_MODULE_ID);
    news.table("stories").put({
      id: "story:test",
      kind: "test",
      outletId: outlet!.id,
      date: core.date,
      placeId: reader.placeId,
      facts: {},
    } as never);
    news.table("heard").put({
      id: `${reader.id}:story:test`,
      personId: reader.id,
      storyId: "story:test",
      date: core.date,
    } as never);
    api
      .moduleState(BUDGETS_MODULE_ID)
      .table("landed")
      .put({
        id: "landed:test",
        personId: reader.id,
        obligationId: "obligation:test",
        date: core.date,
        measureId: "",
        lawId: "law:test",
        series: "test",
        share: -0.1,
        learnedFrom: "story:test",
      } as never);
    const teller = civicFill(
      "teller",
      core,
      momentFor(
        reader.id,
        `event:law.effect-learned:${core.date}:obligation:test`,
      ),
      new Set(),
    );
    expect(teller, where).toEqual([outlet!.headId]);
    // A notice with no story behind it has no teller.
    expect(
      civicFill(
        "teller",
        core,
        momentFor(reader.id, "event:law.effect-learned:no-story"),
        new Set(),
      ),
      where,
    ).toEqual([]);
  });

  it("leaves the clerk unfilled: no record names one", () => {
    expect(
      civicFill(
        "clerk",
        core,
        momentFor([...core.people.keys()][0]!, "x"),
        new Set(),
      ),
    ).toEqual([]);
  });
}, 1_800_000);
