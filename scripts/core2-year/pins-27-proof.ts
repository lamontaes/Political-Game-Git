/**
 * Pins family 27 (#9747): a law's reach comes from the people it reaches.
 * At three drawn places, a played year each: who of the households eligible
 * for home energy aid (the law in force on day one in most states) and for
 * child care aid (turned on through dev mode's own law call) take it up, by
 * household income, and the share of a schools change that becomes pay, read
 * from each government's books.
 * Run: node --import tsx scripts/core2-year/pins-27-proof.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { lawChain, lawInForce } from "../../src/core2/modules/laws";
import { takesUp } from "../../src/core2/law-reach/group-b-money";
import { rowsOf } from "../../src/core2/law-reach/group-b-store";
import {
  povertyLineDollars,
  townFacts,
} from "../../src/core2/law-reach/group-b-people";
import { drawPlace } from "./place";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(20).toString("hex");
const out = (line: string) => process.stdout.write(`${line}\n`);
out(`Pins family 27 proof, seed ${seed}`);

for (let draw = 0; draw < 3; draw += 1) {
  const place = drawPlace(seed, `pins-27-proof:${draw}`);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const dev = new DevMode(
    core,
    world.director,
    new BenchPlayer(core, world.director),
    world.placeId,
  );
  out(`\n== ${place.name} (${place.key}), place seed ${place.seed}`);
  // Child care aid at 85 percent of the state median income a month for three
  // (the CCDF ceiling), through dev mode's own law call.
  try {
    dev.setLaw({
      level: "state",
      series: "child-care-income-limit",
      value: 5000,
    });
    out("child care aid turned on through dev mode's law call");
  } catch (error) {
    out(`child care aid not set: ${(error as Error).message}`);
  }
  dev.advance(addDays(makeIsoDate(core.date), 365));
  const chain = lawChain(api);
  const facts = townFacts(api, chain.townPlaceId);
  const limit = lawInForce(api, "energy-assistance-income-limit").value;
  const benefit = 2508; // the program's average yearly benefit a month, in cents ($301 a year)
  const fifths = new Map<number, { eligible: number; took: number }>();
  const incomes = [...facts.households.values()]
    .map((h) => h.incomeDollars)
    .sort((a, b) => a - b);
  const fifthOf = (income: number) =>
    Math.min(
      4,
      Math.floor(
        (5 * incomes.findIndex((x) => x >= income)) /
          Math.max(1, incomes.length),
      ),
    );
  let eligible = 0,
    took = 0;
  for (const h of facts.households.values()) {
    if (
      !limit ||
      h.incomeDollars >
        (povertyLineDollars(chain.stateKey, h.size) * limit) / 100
    )
      continue;
    const weight = h.scale ?? 1;
    const yes = takesUp(api, undefined, benefit, h).yes;
    eligible += weight;
    if (yes) took += weight;
    const row = fifths.get(fifthOf(h.incomeDollars)) ?? {
      eligible: 0,
      took: 0,
    };
    row.eligible += weight;
    if (yes) row.took += weight;
    fifths.set(fifthOf(h.incomeDollars), row);
  }
  out(
    `energy aid (limit ${limit}% of poverty): ${Math.round(took)} of ${Math.round(eligible)} eligible households take it up (${((100 * took) / Math.max(1, eligible)).toFixed(0)}%); by the town's income fifth: ${[
      ...fifths,
    ]
      .sort((a, b) => a[0] - b[0])
      .map(
        ([f, r]) =>
          `${f + 1}: ${((100 * r.took) / Math.max(1, r.eligible)).toFixed(0)}% of ${Math.round(r.eligible)}`,
      )
      .join(", ")}`,
  );
  const applied = (
    api
      .moduleState("core2-law-effects-v1")
      .table("applied")
      .rows() as unknown as {
      key: string;
      what: string;
      count?: number;
      amountMinor?: number;
      targetId: string;
    }[]
  ).filter((r) =>
    /energy-assistance-paid|child-care-paid|preschool-paid|ssi-paid/.test(
      r.what,
    ),
  );
  const byWhat = new Map<
    string,
    { rows: number; count: number; minor: number }
  >();
  for (const r of applied) {
    const row = byWhat.get(r.what) ?? { rows: 0, count: 0, minor: 0 };
    row.rows += 1;
    row.count += r.count ?? 1;
    row.minor += r.amountMinor ?? 0;
    byWhat.set(r.what, row);
  }
  out(
    `applied rows: ${[...byWhat].map(([what, r]) => `${what}: ${r.rows} rows for ${r.count} households, $${(r.minor / 100).toFixed(0)} a month`).join("; ") || "none"}`,
  );
  const services = rowsOf<{
    id: string;
    terms?: Record<string, number>;
  }>(api, "groups");
  for (const g of services.filter(
    (row) => row.terms?.compensationShare !== undefined,
  ))
    out(
      `${g.id}: share of the line that is pay, from the books: ${g.terms!.compensationShare!.toFixed(3)}`,
    );
}
