/**
 * A bill takes its body's real form (the owner's ruling, Oct 14, 2026): a
 * state chamber numbers it with its recorded prefix and period and gives it
 * the state's enacting clause, Congress numbers H.R. and S. per two-year
 * Congress, and a town's body numbers ordinances by the year. A random place
 * from all 56.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import {
  billTitle,
  FEDERAL_HOUSE,
  bodyOf,
  reviseBill,
  draftBill,
  motionOn,
  openLegislature,
} from "./modules/legislature";
import { bodyNumbering, designation } from "./legislature-bill-form";
import clauses from "./data/legislature/enacting-clauses.json" with { type: "json" };
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`bill-form:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

describe("a bill's form in its body", () => {
  it("every one of the 56 places has its enacting clause, cited", () => {
    const rows = (
      clauses as unknown as {
        clauses: Record<string, { text: string; citation: string }>;
      }
    ).clauses;
    expect(states.length).toBe(56);
    for (const key of states) {
      expect(rows[key]?.text, key).toMatch(/enact|ordain/i);
      expect(rows[key]?.citation, key).toBeTruthy();
      const numbering = bodyNumbering(
        { id: `x:${key}`, kind: "legislature-lower", jurisdiction: key },
        "2026-02-01",
      );
      expect(designation(numbering, 7), key).toContain("7");
    }
  });

  it("Congress numbers by the two-year Congress", () => {
    const house = { id: "h", kind: "us-house", jurisdiction: "US" };
    const odd = bodyNumbering(house, "2025-03-01");
    const even = bodyNumbering(house, "2026-03-01");
    expect(odd.runKey).toBe(even.runKey);
    expect(designation(odd, 25)).toBe("H.R. 25");
    expect(
      designation(
        bodyNumbering(
          { id: "s", kind: "us-senate", jurisdiction: "US" },
          "2025-03-01",
        ),
        3,
      ),
    ).toBe("S. 3");
  });

  it("a generated world's bills carry their body's designation, clause and motion", () => {
    const state = pick(states, "state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const full = buildPopulation({
      seed,
      placeKey: key,
      startedAt: "2026-01-05",
      minimumPeople: 250,
    });
    const player = [...full.people].sort((a, b) =>
      a.id.localeCompare(b.id),
    )[0]!;
    const core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    const api = coreAPI(core);
    const offices = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .rows() as unknown as {
      id: string;
      kind: string;
      jurisdiction: string;
      coversTown: boolean;
    }[];
    const chamber = offices.find(
      (o) =>
        o.jurisdiction === state &&
        /^legislature-(lower|unicameral)$/.test(o.kind),
    );
    const council = offices.find(
      (o) =>
        o.coversTown && /^(council|county-board|township-board)$/.test(o.kind),
    );
    const provisions = [
      {
        kind: "policy-question" as const,
        question: "local-policy:paid-family-leave",
        value: 1,
      },
    ];
    for (const body of [chamber, council]) {
      if (!body) continue;
      const first = draftBill(api, {
        bodyOfficeId: body.id,
        sponsorId: player.id,
        provisions,
      });
      const second = draftBill(api, {
        bodyOfficeId: body.id,
        sponsorId: player.id,
        provisions,
      });
      const numbering = bodyNumbering(body, core.date);
      const n = Number(/\d+$/.exec(first.number)![0]);
      expect(first.number, where).toBe(designation(numbering, n));
      expect(second.number, where).toBe(designation(numbering, n + 1));
      expect(first.form.enactingClause, where).not.toContain("{body}");
      expect(bodyOf(api, body.id)?.bodyName).toBeTruthy();
      if (body === council)
        expect(first.form.enactingClause).toContain(
          bodyOf(api, body.id)!.bodyName,
        );
      expect(first.form.enactingClause, where).toMatch(/enact|ordain/i);
      expect(() =>
        draftBill(api, {
          bodyOfficeId: body.id,
          sponsorId: player.id,
          provisions: [],
        }),
      ).toThrow("at least one section");
      expect(() => reviseBill(api, first.id, { strike: 0 })).toThrow(
        "at least one section",
      );
      expect(first.title).toEqual(billTitle(first));
      const title = billTitle(first);
      expect(title.subjects.map((s) => s.key)).toEqual([
        "local-policy:paid-family-leave",
      ]);
      expect(motionOn(first)).toBe(body === council ? "adopt" : "pass");
      if (body === council) expect(first.form.kind).toBe("ordinance");
      else expect(first.form.kind).toBe("act");
    }
    expect(chamber ?? council, `${where}: no body to draft to`).toBeTruthy();
  }, 600_000);

  it("the House is the House in the District and the territories, where the first office row is the delegate's", () => {
    const delegates = ["US-DC", "US-PR", "US-GU", "US-VI", "US-AS", "US-MP"];
    const state = pick(delegates, "delegate-state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "delegate-place").key;
    const full = buildPopulation({
      seed,
      placeKey: key,
      startedAt: "2026-01-05",
      minimumPeople: 250,
    });
    const player = [...full.people].sort((a, b) =>
      a.id.localeCompare(b.id),
    )[0]!;
    const core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    const api = coreAPI(core);
    const where = `seed ${seed}, ${state} place ${key}`;
    const offices = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .rows() as unknown as { kind: string }[];
    expect(
      offices.some((o) => o.kind === "us-house-delegate"),
      where,
    ).toBe(true);
    expect(bodyOf(api, FEDERAL_HOUSE)?.kind, where).toBe("us-house");
  }, 600_000);
});
