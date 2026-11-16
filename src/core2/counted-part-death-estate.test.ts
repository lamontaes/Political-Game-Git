/**
 * A counted record that dies in part (an illness in some of the households it
 * stands for, births-counted.ts) settles the estate of those households under
 * the death taxes in force, the same way a death of the whole record does,
 * times fewer households: the tax booked for the part is the whole's tax
 * scaled by the share of its households. Places are pinned by index under a
 * fixed seed; a place with no heavy record that has cash and kin is named and
 * passed over.
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { settleCountedEstate } from "./estates";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn } from "./law-reach/applied";
import { setJournalTrace } from "./journal-state";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce } from "./modules/laws";
import {
  countedEstateOf,
  countedPartDeath,
  residentsRuntime,
} from "./modules/residents";
import { coreAPI } from "./state";

const SEED = "pinned-counted-part-death-estate";
const TRIES = 6;

/** The death-tax rows the town has applied, by id: what each moved, for how many households, and under which law series. */
const taxRows = (api: ReturnType<typeof coreAPI>) => {
  const out = new Map<string, { key: string; minor: number; count: number }>();
  for (const key of ["estate-tax", "inheritance-tax"])
    for (const row of appliedOn(api, key))
      out.set(row.id, { key, minor: row.amountMinor, count: row.count ?? 1 });
  return out;
};

/** The rows a settlement wrote or changed, summed by law series, as one household's tax. */
const perHousehold = (
  before: ReadonlyMap<string, { key: string; minor: number; count: number }>,
  after: ReadonlyMap<string, { key: string; minor: number; count: number }>,
) => {
  const out = new Map<string, number>();
  for (const [id, row] of after) {
    const was = before.get(id);
    if (was && was.minor === row.minor && was.count === row.count) continue;
    out.set(row.key, (out.get(row.key) ?? 0) + row.minor / row.count);
  }
  return out;
};

it("a part death's estate is taxed as a whole death's, scaled by its share of the households", () => {
  const was = setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let i = 0; i < TRIES; i++) {
      const drawn = drawPlace(SEED, `part-death-estate:${i}`);
      const where = `${drawn.name} (${drawn.key}), seed ${drawn.seed}`;
      const core = buildBenchWorld(drawn.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: drawn.key,
      }).core;
      const api = coreAPI(core);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const rt = residentsRuntime(core)!;
      const store = rt.store;
      // The death taxes set low enough to reach a household's cash.
      const state = lawChain(api).levels.find((l) => l.level === "state")!;
      const federal = lawInForce(api, "estate-tax").levels.find(
        (l) => l.level === "federal",
      );
      const tomorrow = addDays(makeIsoDate(core.date), 1);
      // The rows govern from tomorrow, before the starting law's 2026 year row.
      const date = tomorrow;
      if (federal?.row)
        enactLaw(api, {
          jurisdiction: federal.jurisdiction,
          level: "federal",
          series: "estate-tax",
          value: 40,
          unit: "percent-top-rate",
          effectiveDate: date,
          measureId: "test:estate-low",
          citation: "Test estate tax",
          terms: { exemption: 1, minRate: 10, maxRate: 40, slideOver: 1000 },
        });
      enactLaw(api, {
        jurisdiction: state.jurisdiction,
        level: "state",
        series: "inheritance-tax",
        value: 10,
        unit: "percent-top-rate",
        effectiveDate: date,
        measureId: "test:inheritance-low",
        citation: "Test inheritance tax",
        terms: {
          classes: {},
          others: { exemption: 1, minRate: 10, slideOver: 0 },
        },
      });
      // Paydays fund the groups that pay the tax.
      advanceCore(core, addDays(makeIsoDate(core.date), 35));
      // A heavy record (stands for several households) with cash and a
      // second member; the one with the most cash, then the lowest id.
      const heavy = [...store.liveHouseholds()]
        .filter(
          (h) => store.weightOf(h) >= 3 && store.countedMembers(h).length >= 2,
        )
        .map((h) => ({
          h,
          dead: store.ids[store.countedMembers(h)[0]!]!,
        }))
        .map((row) => ({
          ...row,
          estate: countedEstateOf(core, row.dead as never)!,
        }))
        .filter((row) => row.estate.estateMinor > 100_00)
        .sort(
          (a, b) =>
            b.estate.estateMinor - a.estate.estateMinor ||
            a.dead.localeCompare(b.dead),
        )[0];
      if (!heavy) {
        passed.push(`${where}: no heavy record with cash`);
        continue;
      }
      const weight = store.weightOf(heavy.h);
      const share = 1;
      const before = taxRows(api);
      const part = countedPartDeath(core, heavy.dead as never, share);
      expect(part, `${where}: the part death ran`).toBeDefined();
      expect(
        store.weightOf(heavy.h),
        `${where}: the record stands for fewer`,
      ).toBe(weight - share);
      const placeId = lawChain(api).townPlaceId;
      // The money the settlement moved, from the journal, against what it recorded.
      let moved = 0;
      setJournalTrace((input) => {
        if (!/:(estate-tax|inheritance-tax):/.test(input.sourceRef.id)) return;
        for (const posting of input.postings)
          if (posting.deltaMinor > 0) moved += posting.deltaMinor;
      });
      try {
        settleCountedEstate(api, {
          deceasedId: heavy.dead as never,
          placeId,
          estate: { ...part!.estate, households: share },
        });
      } finally {
        setJournalTrace(null);
      }
      const afterPart = taxRows(api);
      const partTax = perHousehold(before, afterPart);
      const recorded = [...afterPart]
        .filter(([id, row]) => before.get(id)?.minor !== row.minor)
        .reduce((n, [, row]) => n + row.minor, 0);
      // What the treasury took is what the town recorded: the payment is for the share that died.
      expect(moved, `${where}: tax moved against tax recorded`).toBe(recorded);
      expect(
        [...partTax.values()].reduce((n, v) => n + v, 0),
        `${where}: tax booked for the part`,
      ).toBeGreaterThan(0);
      // The same estate settled for every household the record stood for.
      settleCountedEstate(api, {
        deceasedId: `${heavy.dead}:whole` as never,
        placeId,
        estate: { ...part!.estate, households: weight },
      });
      const wholeTax = perHousehold(afterPart, taxRows(api));
      // One household's tax under each law series is the same either way (to a hundredth: what a group's fund pays out rounds across its households).
      for (const [key, each] of partTax)
        expect(
          Math.abs(each - (wholeTax.get(key) ?? Number.NaN)),
          `${where}: ${key} per household, part ${each}, whole ${wholeTax.get(key)}`,
        ).toBeLessThanOrEqual(Math.max(1, each * 0.01));
      expect([...wholeTax.keys()].sort(), where).toEqual(
        [...partTax.keys()].sort(),
      );
      const partMinor = [...partTax.values()].reduce((n, v) => n + v, 0);
      const wholeMinor = [...wholeTax.values()].reduce((n, v) => n + v, 0);
      process.stdout.write(
        `PART-ESTATE ${where}: record of ${weight} households, ${share} died, estate ${part!.estate.estateMinor} each; tax per household ${partMinor.toFixed(1)} for the part (${share} household), ${wholeMinor.toFixed(1)} for all ${weight}\n`,
      );
      return;
    }
    expect.fail(
      `no drawn place had a heavy record with cash: ${passed.join("; ")}`,
    );
  } finally {
    setBookkeeping(was);
  }
}, 600_000);
