/** Ordinary played-world bank proof. Seed comes from the assignment's base SHA. */
import { bankView } from "../../src/bench/bank";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { bankDepositLiability, depositsAtBank } from "../../src/core2/accounts";
import { residentsRuntime } from "../../src/core2/modules/residents";
import { drawPlace } from "../../tests/golden-path/place";
import { countedRecords } from "../../src/core2/tooling/counted-records";

const seed = process.argv[2];
if (!seed) throw new Error("Supply the assignment's base SHA as the seed.");
const place = drawPlace(seed, "world-business");
const started = performance.now();
const { core } = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const built = performance.now();
const api = coreAPI(core);
const rows = (name: string) => api.moduleState("credit").table(name).rows();
let bankId = "";
const cash = () =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (sum, row) => sum + row.liquidMinor,
    0,
  );
const external = () =>
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (sum, row) => sum + row.netMinor,
    0,
  );
const openingCash = cash(),
  openingExternal = external();
const months = [];
const draws = new Map();
const start = core.date;
for (let month = 1; month <= 12; month++) {
  const next = new Date(`${start}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + month);
  advanceCore(core, next.toISOString().slice(0, 10));
  bankId = String(rows("banks")[0]!.organizationId);
  const claims = depositsAtBank(core, bankId);
  const cashError = cash() - openingCash + external() - openingExternal;
  const liabilityError =
    claims.reduce((sum, row) => sum + row.balanceMinor, 0) -
    bankDepositLiability(core, bankId);
  months.push({
    date: core.date,
    cashError,
    liabilityError,
    depositsMinor: bankDepositLiability(core, bankId),
    holders: claims.length,
  });
  for (const receipt of core.finance.latestCreditByFacility.values())
    if (receipt.principalAfterMinor > receipt.principalBeforeMinor)
      draws.set(receipt.id, receipt);
}
const finished = performance.now();
const books = rows("books");
const bookErrors = books.map((row) => ({
  id: row.id,
  error:
    Number(row.cash) +
    Number(row.principal) +
    Number(row.loans) +
    Number(row.mortgagesMinor) -
    Number(row.openingMortgageFundingMinor) -
    Number(row.deposits) -
    Number(row.equity),
}));
// One holder of each kind with money at the bank, read from the bank's own
// claims (the deposit-move table that once held these was read by nothing else).
const heldNow = depositsAtBank(core, bankId).filter(
  (row) => row.balanceMinor > 0,
);
const tierOf = (holderId: string) =>
  core.households.has(holderId)
    ? "full"
    : countedRecords(core).has(holderId)
      ? "counted"
      : "business";
const examples = ["full", "counted", "business"].map((tier) => {
  const deposit = heldNow.find((row) => tierOf(row.holderId) === tier);
  return {
    tier,
    deposit,
    namedMembers: deposit
      ? (core.households.get(String(deposit.holderId))?.memberIds ??
        residentsRuntime(core)
          ?.households.get(String(deposit.holderId))
          ?.people.map((person) => person.id))
      : undefined,
  };
});
const viewPersonId = examples.find((row) => row.tier === "full")
  ?.namedMembers?.[0];
if (!viewPersonId) throw new Error("No full depositor to inspect on Money.");
const beforeRead = {
  date: core.date,
  sequence: core.cashJournal.nextSequence,
  people: core.people.size,
  cash: cash(),
};
const moneyScreen = bankView(core, viewPersonId);
if (
  !moneyScreen?.books ||
  moneyScreen.books.assetsMinor !== moneyScreen.books.liabilitiesAndEquityMinor
)
  throw new Error("Money screen balance sheet does not balance.");
if (
  JSON.stringify(beforeRead) !==
  JSON.stringify({
    date: core.date,
    sequence: core.cashJournal.nextSequence,
    people: core.people.size,
    cash: cash(),
  })
)
  throw new Error("Money screen read changed the world.");
if (bankView(core, "missing-person") !== null)
  throw new Error("Unknown person exposed bank data.");
console.log(
  JSON.stringify(
    {
      seed,
      place,
      span: [start, core.date],
      bankId,
      viewPersonId,
      moneyScreen,
      seconds: {
        build: (built - started) / 1000,
        year: (finished - built) / 1000,
        total: (finished - started) / 1000,
      },
      months,
      bookErrors,
      examples,
      books,
      applications: rows("applications"),
      loans: rows("loans"),
      draws: [...draws.values()],
      claims: depositsAtBank(core, bankId),
    },
    null,
    2,
  ),
);
if (
  months.some((row) => row.cashError || row.liabilityError) ||
  bookErrors.some((row) => row.error)
)
  process.exitCode = 1;
