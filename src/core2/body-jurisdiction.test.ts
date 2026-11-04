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
  for (const kind of ["township", "county-without-law", "city"] as const) {
    const findOffice = (key: string) => {
      const own = lawChainForPlace(key);
      return localOfficesForPlace(key).find((office) => {
        if (kind === "county-without-law")
          return (
            office.level === "county" &&
            !own.levels.some((level) => level.level === "county")
          );
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

it(`a multi-county board uses its own county rather than the first: replay ${replay}`, () => {
  const findBoard = (key: string) => {
    const chain = lawChainForPlace(key);
    return localOfficesForPlace(key).find((office) => {
      const county = governmentUnit(office.jurisdiction)?.countyGeoid;
      return (
        bodyRow(office.kind)?.law === "county" &&
        county !== undefined &&
        county !== null &&
        county !== chain.countyGeoids[0] &&
        chain.countyGeoids.includes(county)
      );
    });
  };
  const place = drawPlace(replay, "body-own-county", (key) =>
    Boolean(findBoard(key)),
  );
  const board = findBoard(place.key)!;
  const chain = lawChainForPlace(place.key);
  const expected = `county:${governmentUnit(board.jurisdiction)!.countyGeoid}`;
  expect(expected).not.toBe(`county:${chain.countyGeoids[0]}`);
  expect(officeLawJurisdiction(chain, board)).toBe(expected);
  // A real county unit has no municipality geoid. An outside input cannot
  // turn that absence into the played town's place key.
  expect(governmentUnit(board.jurisdiction)!.placeGeoid).toBeNull();
  expect(
    officeLawJurisdiction(chain, {
      level: "city",
      jurisdiction: board.jurisdiction,
      coversTown: false,
    }),
  ).toBe(board.jurisdiction);
  setBookkeeping(false);
  try {
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    }).core;
    const api = coreAPI(core);
    // An input to the reader only: no bill, law, vote or event is written.
    const input = { bodyOfficeId: board.id } as BillRow;
    expect(bodyJurisdiction(api, board.id)).toBe(expected);
    expect(billJurisdiction(api, input)).toBe(expected);
    expect(billReach(api, input).county).toBe(expected);
    advanceCore(core, addDays(makeIsoDate(core.date), 90));
    const sessions = sessionsOf(api).filter(
      (row) => row.bodyOfficeId === board.id,
    );
    expect(
      sessions.length,
      `${place.name}: actual county meetings`,
    ).toBeGreaterThan(0);
    for (const session of sessions) expect(session.stateKey).toBe(expected);
    edgeProof.push({ kind: "own-county", place, board, expected, sessions });
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);

it(`a county-level board with no county law keeps its real city-law meetings: replay ${replay}`, () => {
  const findBoard = (key: string) => {
    const chain = lawChainForPlace(key);
    return chain.levels.some((level) => level.level === "county")
      ? undefined
      : localOfficesForPlace(key).find(
          (office) => bodyRow(office.kind)?.law === "county",
        );
  };
  const place = drawPlace(replay, "body-no-county-law", (key) =>
    Boolean(findBoard(key)),
  );
  setBookkeeping(false);
  try {
    const core = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    }).core;
    const api = coreAPI(core);
    const board = findBoard(place.key)!;
    const expected = lawChain(api).levels.at(-1)!.jurisdiction;
    expect(bodyJurisdiction(api, board.id)).toBe(expected);
    expect(billReach(api, { bodyOfficeId: board.id } as BillRow).level).toBe(
      "city",
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 90));
    const sessions = sessionsOf(api).filter(
      (row) => row.bodyOfficeId === board.id,
    );
    expect(
      sessions.length,
      `${place.name}: actual local meetings`,
    ).toBeGreaterThan(0);
    for (const session of sessions) expect(session.stateKey).toBe(expected);
    edgeProof.push({
      kind: "no-county-law-meetings",
      place,
      board,
      expected,
      sessions,
    });
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);

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
