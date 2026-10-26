import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import scf from "../../data/research/money/scf-transaction-accounts-2022.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { depositsHeld } from "./accounts";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

// Opening cash comes from the Survey of Consumer Finances by income (owner,
// Oct 15). In the played world a family holds money where the survey says it
// does: in its adults' main accounts and in the bank deposits the opening
// makes. A random place from all 56, named with its seed on a failure.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "opening-resident-cash");
const where = `${place.name}, seed ${seed}`;

it(`full households hold money as the Survey of Consumer Finances says, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const api = coreAPI(core);
  const accounts = api.accounts();
  const year = Number(core.date.slice(0, 4));
  const households = new Map<string, { adults: number; holding: number }>();
  // The town's own full residents; officials of other places are not them.
  const townId = lawChain(api).townPlaceId;
  for (const id of core.peopleByPlace.get(townId) ?? []) {
    const person = core.people.get(id)!;
    // The generated residents; the press's staff are made by its engine and
    // open with no cash (pool item people-press-staff-opening-cash).
    if (!person.alive || !id.startsWith("person_")) continue;
    if (year - Number(person.birthDate.slice(0, 4)) < 18) continue;
    const row = households.get(person.householdId) ?? { adults: 0, holding: 0 };
    row.adults += 1;
    if (
      person.liquidMinor > 0 ||
      accounts.balance(accounts.main(person.id)) > 0 ||
      depositsHeld(core, person.id) > 0
    )
      row.holding += 1;
    households.set(person.householdId, row);
  }
  expect(households.size, `${where}: full adult households`).toBeGreaterThan(0);
  const holding = [...households.values()].filter((row) => row.holding > 0);
  const share = holding.length / households.size;
  // The survey's lowest share of families holding a transaction account, less
  // the spread: a town's mix of incomes and its young adults living with
  // their parents (0.15), and two standard errors of a sample of this many
  // households. A household counts if any adult holds.
  const floor = Math.min(
    ...scf.groups.map((group) => group.shareHoldingTransactionAccounts),
  );
  const sampling = 2 * Math.sqrt((floor * (1 - floor)) / households.size);
  expect(
    share,
    `${where}: ${holding.length} of ${households.size} households holding money`,
  ).toBeGreaterThanOrEqual(floor - 0.15 - sampling);
}, 600_000);
