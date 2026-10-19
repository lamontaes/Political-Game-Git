import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import scf from "../../data/research/money/scf-transaction-accounts-2022.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { depositsHeld } from "./accounts";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { coreAPI } from "./state";

// Every adult who opens with no cash and no account is either a resident
// within the survey's band or belongs to a named group whose own engine or
// pool item says why (pool item people-adults-opening-cash-husks). A zero that
// fits no group fails with the person's id.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "opening-adults-cash");
const where = `${place.name}, seed ${seed}`;

/** Why an adult with nothing is not a resident left without a wallet, or null for a resident. */
function explained(id: string, tier: string, inTown: boolean): string | null {
  if (tier === "husk" && !inTown)
    return "kin outside the household (the kin generator's husk-tier relatives, not residents)";
  if (id.startsWith("person:press:"))
    return "press staff, made by the press engine (people-press-staff-opening-cash)";
  if (id.startsWith("person:central-bank:"))
    return "central bank board, made by the world economy (named officials with no household)";
  if (id.startsWith("person:election-chief:"))
    return "an election chief, a public post paid through its budget line (gov-unpaid-posts-officials-no-income)";
  if (id.startsWith("official:") || tier === "calendar")
    return "an official in a post with no salary row (gov-unpaid-posts-officials-no-income)";
  return null;
}

it(`every adult with no cash is a survey-sized share of residents or an explained group, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const accounts = api.accounts();
  const town = lawChain(api).townPlaceId;
  const year = Number(core.date.slice(0, 4));
  const groups = new Map<string, string[]>();
  let residents = 0;
  let residentsWithNothing = 0;
  for (const person of core.people.values()) {
    if (!person.alive || year - Number(person.birthDate.slice(0, 4)) < 18)
      continue;
    const holds =
      person.liquidMinor > 0 ||
      accounts.balance(accounts.main(person.id)) > 0 ||
      depositsHeld(core, person.id) > 0;
    const why = explained(person.id, person.tier, person.placeId === town);
    if (why === null) residents += 1;
    if (holds) continue;
    if (why) {
      const ids = groups.get(why) ?? [];
      ids.push(person.id);
      groups.set(why, ids);
    } else residentsWithNothing += 1;
  }
  expect(residents, `${where}: resident adults`).toBeGreaterThan(0);
  // The survey's lowest share of families holding a transaction account, less
  // the spread for young adults living with their parents (0.15) and two
  // standard errors of a sample of this many adults (as in
  // opening-resident-cash.test.ts, which holds the household view).
  const floor = Math.min(
    ...scf.groups.map((group) => group.shareHoldingTransactionAccounts),
  );
  const sampling = 2 * Math.sqrt((floor * (1 - floor)) / residents);
  expect(
    residentsWithNothing / residents,
    `${where}: ${residentsWithNothing} of ${residents} resident adults hold nothing; other groups: ${JSON.stringify(
      [...groups].map(([why, ids]) => [why, ids.length]),
    )}`,
  ).toBeLessThanOrEqual(1 - (floor - 0.15 - sampling));
}, 600_000);
