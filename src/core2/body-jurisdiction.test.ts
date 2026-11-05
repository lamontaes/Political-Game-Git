/** U2 step2: a body makes its own government's law, through the one engine. */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { inTownChain, officeLawJurisdiction } from "./laws-in-force";
import { lawChainForPlace, type LawRowInput } from "./laws-starting";
import { advanceCore } from "./life";
import { lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import {
  billJurisdiction,
  billReach,
  bodyJurisdiction,
  bodyRow,
  floorCountOf,
  FEDERAL_HOUSE,
  FEDERAL_SENATE,
  LEGISLATURE_MODULE_ID,
  type BillRow,
} from "./modules/legislature";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { sessionsOf } from "./modules/world-legislating";
import { localOfficesForPlace, type OfficeInput } from "./offices-local";
import { governmentUnit } from "./reference/government-units";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(replay, "body-jurisdiction");
const where = `${drawn.name} (${drawn.key}), replay ${replay}`;
const edgeProof: Record<string, unknown>[] = [];

it(`real unit identities retain the federal, county, township and city edges: ${where}`, () => {
  const chain = lawChainForPlace(drawn.key);
  for (const office of localOfficesForPlace(drawn.key))
    expect(inTownChain(chain, officeLawJurisdiction(chain, office))).toBe(true);
  expect(
    officeLawJurisdiction(chain, {
      level: "federal",
      jurisdiction: chain.stateKey,
      coversTown: false,
    }),
  ).toBe("US");

  // Property-selected reference data, not laws inserted into a played world.
  for (const kind of ["township", "city"] as const) {
    const findOffice = (key: string) => {
      return localOfficesForPlace(key).find((office) => {
        return office.level === kind;
      });
    };
    const place = drawPlace(replay, `body-edge:${kind}`, (key) =>
      Boolean(findOffice(key)),
    );
    const own = lawChainForPlace(place.key);
    const office = findOffice(place.key)!;
    const city = own.levels.at(-1)!.jurisdiction;
    const expected = kind === "township" ? office.jurisdiction : city;
    expect(officeLawJurisdiction(own, office), place.name).toBe(expected);
    expect(
      officeLawJurisdiction(own, { ...office, coversTown: undefined }),
    ).toBe(expected);
    const unit = governmentUnit(office.jurisdiction)!;
    const outside = { ...office, coversTown: false };
    const outsideKey =
      office.level === "county" && unit.countyGeoid
        ? `county:${unit.countyGeoid}`
        : office.level === "city" && unit.placeGeoid
          ? `place:${unit.placeGeoid}`
          : office.jurisdiction;
    expect(officeLawJurisdiction(chain, outside)).toBe(outsideKey);
    edgeProof.push({ kind, place, office, own: expected, outside: outsideKey });
  }
  for (const level of ["county", "city"] as const)
    expect(
      officeLawJurisdiction(chain, {
        level,
        jurisdiction: "test:unit-with-no-catalog-row",
        coversTown: false,
      }),
    ).toBe("test:unit-with-no-catalog-row");
});

it(`ordinary bills and voted laws read their actual body's government: ${where}`, () => {
  setBookkeeping(false);
  try {
    const core = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    }).core;
    const api = coreAPI(core);
    const chain = lawChain(api);
    const offices = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .rows() as unknown as OfficeInput[];
    const outside = offices.filter(
      (office) =>
        office.level === "state" &&
        office.jurisdiction !== chain.stateKey &&
        bodyRow(office.kind)?.law === "state",
    );
    expect(
      outside.length,
      "actual other states' seated chambers",
    ).toBeGreaterThan(0);
    for (const office of outside) {
      expect(bodyJurisdiction(api, office.id), office.id).toBe(
        office.jurisdiction,
      );
      // Pure reader input; these chambers do not yet sit under unfinished U3.
      expect(
        billJurisdiction(api, { bodyOfficeId: office.id } as BillRow),
        office.id,
      ).toBe(office.jurisdiction);
    }
    for (const body of [FEDERAL_HOUSE, FEDERAL_SENATE])
      expect(bodyJurisdiction(api, body)).toBe("US");
    expect(bodyJurisdiction(api, "test:missing-body")).toBe(
      chain.levels.at(-1)!.jurisdiction,
    );
    const opened = core.date;
    let witness: Record<string, unknown> | undefined;
    const checked = new Set<string>();
    for (let day = 1; day <= 365; day++) {
      advanceCore(core, addDays(makeIsoDate(opened), day));
      const legislature = api.moduleState(LEGISLATURE_MODULE_ID);
      const laws = api
        .moduleState(LAWS_MODULE_ID)
        .table("laws")
        .rows() as unknown as LawRowInput[];
      for (const law of laws) {
        const billId = law.terms?.enactedByBill;
        if (typeof billId !== "string") continue;
        const bill = legislature
          .table("bills")
          .get(billId) as unknown as BillRow;
        expect(bill, law.id).toBeDefined();
        expect(law.jurisdiction, law.id).toBe(billJurisdiction(api, bill));
        expect(inTownChain(chain, law.jurisdiction), law.id).toBe(true);
        checked.add(law.id);
        if (witness || law.effectiveDate > core.date) continue;
        const resolved = lawInForce(api, law.series);
        if (!resolved.levels.some((level) => level.row?.id === law.id))
          continue;
        const votes = legislature.table("votes").query("byBill", [bill.id]);
        const count = floorCountOf(api, bill.id, bill.bodyOfficeId);
        if (!count?.carried || count.yes === 0) continue;
        witness = {
          on: core.date,
          body:
            offices.find((office) => office.id === bill.bodyOfficeId) ??
            bill.bodyOfficeId,
          bill,
          law,
          votes,
          count,
          consumer: {
            reader: "lawInForce",
            series: law.series,
            level: law.level,
            recordId: law.id,
          },
        };
      }
    }
    expect(checked.size, "naturally enacted law rows").toBeGreaterThan(0);
    expect(
      witness,
      "actual roll call, law and existing resolver consumer",
    ).toBeDefined();
    for (const session of sessionsOf(api))
      if (session.bodyOfficeId)
        expect(session.stateKey, session.id).toBe(
          bodyJurisdiction(api, session.bodyOfficeId),
        );
    const proof = {
      town: drawn.name,
      placeKey: drawn.key,
      replay,
      worldSeed: drawn.seed,
      through: core.date,
      actualOutsideChambers: outside.length,
      checkedLawRows: checked.size,
      witness,
      edges: edgeProof,
      limit:
        "No supplied bill, law or vote enters the played year. Outside-state sitting and named-person effects remain unfinished parent work.",
    };
    if (process.env.LANE2_BODY_JURISDICTION_PROOF)
      writeFileSync(
        process.env.LANE2_BODY_JURISDICTION_PROOF,
        JSON.stringify(proof, null, 2) + "\n",
      );
    console.log(
      JSON.stringify({ town: drawn.name, replay, laws: checked.size, witness }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);
