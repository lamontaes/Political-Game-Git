import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import declarations from "./data/disasters/declarations.json" with { type: "json" };
import households from "./data/disasters/households.json" with { type: "json" };
import lookup from "./data/places/place-lookup.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import {
  disasterRepairsPaid,
  normalizedGovernmentName,
  townDisastersWithDamage,
} from "./modules/disasters";
import {
  outsideMarketFor,
  residentsAccountFor,
  residentsRuntime,
} from "./modules/residents";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreState, PlaceId } from "./types";

// A disaster declared in a town with no builder and no recorded outside
// market stopped the game: "No outside market recorded for jurisdiction_b0f9"
// (Guthrie, Oklahoma, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83, drawn
// with the salt "stories-from-engines"). The player had moved by then to a
// town of the world with neither. The repairs now wait where there is no one
// to pay, and the year plays through.
const seed = "35f504a41ec4764f52666b6c5ccd1992aa077e83";
const place = drawPlace(seed, "stories-from-engines");

const BUILDER_CLASSIFICATION = "enterprise:construction";

/** A town's open builders: the payees the repairs go to first. */
const openBuilders = (core: CoreState, placeId: PlaceId) =>
  [...core.organizations.values()].filter(
    (org) =>
      org.classification === BUILDER_CLASSIFICATION &&
      org.placeId === placeId &&
      !core.finance.closures.has(org.id),
  );

const marketAt = (core: CoreState, placeId: PlaceId): boolean => {
  try {
    outsideMarketFor(core, residentsRuntime(core)!, placeId);
    return true;
  } catch {
    return false;
  }
};

/** Who could be paid for repairs the day before a disaster is declared. */
interface Payees {
  readonly builders: number;
  readonly market: boolean;
}

/** The world's disaster records that name damaged homes, by disaster number. */
const damagedRecords = (core: CoreState) =>
  [...core.durableLog.values()]
    .filter((row) => row.kind === "hazard.disaster")
    .map((row) => ({
      row,
      number: Number(row.facts?.disasterNumber),
      damagedHomes: Number(row.facts?.damagedHomes ?? 0),
    }))
    .filter((d) => d.damagedHomes > 0);

/** The year's declarations that damage homes in the opened town, in date order. */
const dueIn = (core: CoreState, end: string) =>
  townDisastersWithDamage(coreAPI(core))
    .filter((d) => d.declared > core.date && d.declared <= end)
    .sort((a, b) => a.declared.localeCompare(b.declared));

/**
 * Plays a year, stopping the day before each disaster is declared to note the
 * town's payees as they stand then, and returns the disasters that damaged
 * homes with the payees noted.
 */
function playYear(core: CoreState) {
  const end = addDays(makeIsoDate(core.date), 365);
  const payees = new Map<number, Payees>();
  for (const disaster of dueIn(core, end)) {
    const eve = addDays(makeIsoDate(disaster.declared), -1);
    if (core.date < eve) advanceCore(core, eve);
    // The player may have moved: the repairs are paid where they live on the day.
    const town = core.people.get(core.playerId ?? "")!.placeId;
    payees.set(disaster.number, {
      builders: openBuilders(core, town).length,
      market: marketAt(core, town),
    });
  }
  advanceCore(core, end);
  return damagedRecords(core).map((d) => ({
    ...d,
    payees: payees.get(d.number),
  }));
}

/** The ledger balances. */
function checkLedger(core: CoreState, where: string): void {
  expect(core.cashJournal.totals.grossDebitMinor, where).toBe(
    core.cashJournal.totals.grossCreditMinor,
  );
}

/**
 * The first town by id, other than `besides`, where people of this world live
 * and keep a residents account but no builder is open and no outside market
 * is recorded: a town whose households would have nobody to pay.
 */
function townWithNoPayee(
  core: CoreState,
  besides: PlaceId,
): PlaceId | undefined {
  const towns = new Set<PlaceId>();
  for (const person of core.people.values())
    if (person.alive && person.placeId !== besides) towns.add(person.placeId);
  return [...towns]
    .sort((a, b) => a.localeCompare(b))
    .find(
      (town) =>
        residentsAccountFor(core, town) !== undefined &&
        openBuilders(core, town).length === 0 &&
        !marketAt(core, town),
    );
}

it(`plays a year through a disaster with no one to pay for repairs (${place.name}, seed ${seed})`, () => {
  setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const api = coreAPI(core);
    const end = addDays(makeIsoDate(core.date), 365);
    const disaster = dueIn(core, end)[0];
    expect(
      disaster,
      `${where}: a disaster that damages homes is declared in the year`,
    ).toBeDefined();
    const declared = makeIsoDate(disaster!.declared);
    advanceCore(core, addDays(declared, -1));
    // The one forced step. On today's main the player is still in the opened
    // town on the eve, where builders are open. They move, alone, to a town
    // of this world with nobody to pay, through the writer the moves engine
    // uses when a household member leaves the others behind.
    const player = core.people.get(core.playerId!)!;
    const town = townWithNoPayee(core, player.placeId);
    expect(town, `${where}: a town with nobody to pay`).toBeDefined();
    const countyId = [...core.people.values()].find(
      (person) => person.placeId === town && person.countyId,
    )?.countyId;
    api.relocatePeopleV1({
      personIds: [player.id],
      placeId: town!,
      ...(countyId ? { countyId } : {}),
      householdId: `${player.householdId}:moved:${player.id}:${core.date}`,
      source: {
        tag: "ESTIMATED",
        asOf: core.date,
        citation: `The test moves the player to ${town} before disaster ${disaster!.number} is declared.`,
        estimatedFrom: "disasters-no-market.test.ts",
      },
    });
    const at = `${where}: disaster ${disaster!.number} in ${town}`;
    expect(openBuilders(core, town!).length, `${at} builders`).toBe(0);
    expect(marketAt(core, town!), `${at} outside market`).toBe(false);
    // The declaration day: the repairs find nobody to pay, and the day ends.
    advanceCore(core, declared);
    expect(core.people.get(player.id)!.placeId, at).toBe(town);
    const record = damagedRecords(core).find(
      (d) => d.number === disaster!.number,
    );
    expect(record, `${at}: a record of the damaged homes`).toBeDefined();
    advanceCore(core, end);
    const repaired = disasterRepairsPaid(api).filter(
      (r) => r.disaster === disaster!.number,
    );
    expect(repaired, `${at} repairs`).toEqual([]);
    console.log(
      `${where}: disaster ${disaster!.number} (${record!.row.id}, ${record!.damagedHomes} damaged homes), declared ${declared} with the player in ${town}: builders 0, outside market false; repair payments ${repaired.length}; journal debit ${core.cashJournal.totals.grossDebitMinor} credit ${core.cashJournal.totals.grossCreditMinor} cents`,
    );
    checkLedger(core, where);
  } finally {
    setBookkeeping(true);
  }
  // Measured: 217 seconds on a 4-core container (the bench world's build and
  // a year); 15 minutes leaves a slower runner four times that.
}, 900_000);

type DeclarationRow = [string, string, number, number, number];
type TownFigures = [aid: number, damage: number, damagedHomes: number];

const screened = new Map<string, ReadonlySet<string>>();

/**
 * The town names of a state that FEMA's household figures show with damaged
 * homes in a disaster declared in the world's first year: a screen from the
 * records alone, so a draw that cannot have one is passed over unopened. The
 * opened world's own disasters decide.
 */
function townsWithDamage(usps: string): ReadonlySet<string> {
  const known = screened.get(usps);
  if (known) return known;
  const start = gameStartDate();
  const end = addDays(start, 365);
  const byCounty = declarations.byCounty as unknown as Record<
    string,
    DeclarationRow[]
  >;
  const figures = households.byCountyDisaster as unknown as Record<
    string,
    Record<string, TownFigures>
  >;
  const towns = new Set<string>();
  for (const [county, , state] of lookup.counties.rows as [
    string,
    string,
    string,
  ][]) {
    if (state !== usps) continue;
    for (const row of [
      ...(byCounty[county] ?? []),
      ...(byCounty[`${county.slice(0, 2)}000`] ?? []),
    ]) {
      if (row[1] <= start || row[1] > end) continue;
      for (const [town, [, , homes]] of Object.entries(
        figures[`${county}|${row[4]}`] ?? {},
      ))
        if (homes > 0) towns.add(town);
    }
  }
  screened.set(usps, towns);
  return towns;
}

// About one draw in 46 is a town whose records show homes damaged in the
// first year (2.2 percent over the 56 jurisdictions), so 2,000 draws all miss
// about once in 10^19 runs. Of 30 towns the screen kept, 25 had a damaged-home
// record after their year, so 10 opened towns all fail about once in 60
// million runs.
const DRAWS = 2000;
const OPENED = 10;

it("a place drawn from all 56 where a disaster damaged homes pays repairs to a recorded payee, or to none where none is recorded", () => {
  const drawSeed =
    process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
  setBookkeeping(false);
  try {
    let opened = 0;
    let draw = 0;
    for (; draw < DRAWS && opened < OPENED; draw++) {
      const drawn = drawPlace(`${drawSeed}:${draw}`, "disasters-no-market");
      const name = normalizedGovernmentName(drawn.name.split(",")[0] ?? "");
      if (!townsWithDamage(drawn.state.replace(/^US-/, "")).has(name)) continue;
      opened += 1;
      const core = createLifeCore(
        generatedOpening(drawn, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      );
      if (!dueIn(core, addDays(makeIsoDate(core.date), 365)).length) continue;
      const where = `${drawn.name} (${drawn.key}), seed ${drawSeed}:${draw}`;
      const damaged = playYear(core);
      if (!damaged.length) continue;
      const payments = disasterRepairsPaid(coreAPI(core));
      const repaired = new Set(payments.map((r) => r.disaster));
      const cents = (number: number) =>
        payments
          .filter((r) => r.disaster === number)
          .reduce((sum, r) => sum + r.cents, 0);
      for (const { row, number, damagedHomes, payees } of damaged) {
        const at = `${where}: disaster ${number} (${row.id}, ${damagedHomes} damaged homes)`;
        expect(payees, `${at} payees noted`).toBeDefined();
        const payee = payees!.builders > 0 || payees!.market;
        // A payee is recorded and was paid, or none is and nothing moved.
        expect(repaired.has(number), at).toBe(payee);
      }
      console.log(
        `${where}: damaged-home disasters ${damaged.map((d) => `${d.number} (${d.row.id}, ${d.damagedHomes} homes, builders ${d.payees?.builders}, outside market ${d.payees?.market}, repairs ${payments.filter((r) => r.disaster === d.number).length} payments of ${cents(d.number)} cents)`).join(", ")}; ${draw + 1} draws, ${opened} opened; journal debit ${core.cashJournal.totals.grossDebitMinor} credit ${core.cashJournal.totals.grossCreditMinor} cents`,
      );
      checkLedger(core, where);
      return;
    }
    throw new Error(
      `no disaster damaged homes in ${opened} opened places of ${draw} draws (seed ${drawSeed})`,
    );
  } finally {
    setBookkeeping(true);
  }
  // Measured on a 4-core container: an opening took 3.8 to 9.1 seconds and a
  // played year 8.9 to 14.5, so the most this case does, 10 towns opened and
  // played, is about 4 minutes; 15 minutes leaves a slower runner nearly four
  // times that. A run that opened 3 towns took 33 seconds.
}, 900_000);
