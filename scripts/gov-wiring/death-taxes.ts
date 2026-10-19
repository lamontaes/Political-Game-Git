/**
 * One played year in a state with an estate or inheritance tax (drawn from
 * the seed): each estate settled, the taxes it paid and to which treasury,
 * what each heir received, and whether the heir now holds a view on the law
 * that took it, citing the estate's accounting.
 *
 * Run: node --max-old-space-size=8192 --import tsx scripts/gov-wiring/death-taxes.ts [seed] [days]
 */
import { createHash } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { stancesOf } from "../../src/core2/modules/views";
import { heirsOf } from "../../src/core2/estates";
import startingLaw from "../../src/core2/data/laws/starting-law.json" with { type: "json" };
import { placeLocalities } from "../../src/core2/places";

setBookkeeping(false);
const seed =
  process.argv[2] ??
  createHash("sha256").update(String(Date.now())).digest("hex");
const days = Number(process.argv[3] ?? 365);
const hash = createHash("sha256").update(`${seed}:death-taxes`).digest("hex");
const jurisdictions = (
  startingLaw as unknown as {
    jurisdictions: Record<string, { series: string }[]>;
  }
).jurisdictions;
const states = Object.keys(jurisdictions)
  .filter(
    (k) =>
      k !== "US" &&
      jurisdictions[k]!.some(
        (r) => r.series === "estate-tax" || r.series === "inheritance-tax",
      ),
  )
  .sort();
const state = states[parseInt(hash.slice(0, 8), 16) % states.length]!;
const localities = [...placeLocalities(state)].sort((a, b) =>
  a.key.localeCompare(b.key),
);
const place = localities[parseInt(hash.slice(8, 16), 16) % localities.length]!;
const world = buildBenchWorld(hash, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
advanceCore(core, addDays(makeIsoDate(core.date), days));
const api = coreAPI(core);
const log = [...core.durableLog.values()];
const accountings = log.filter((e) => e.kind === "estate.accounting");
const learned = log.filter(
  (e) =>
    e.kind === "law.effect-learned" &&
    (e.topic === "estate-tax" || e.topic === "inheritance-tax"),
);
const deaths = log.filter((e) => /death/.test(e.kind) && e.publicRecord);
console.log(
  JSON.stringify(
    {
      seed,
      state,
      place: `${place.displayName} (${place.key})`,
      days,
      deaths: deaths.length,
      estatesTaxed: new Set(accountings.map((e) => e.facts?.decedentId)).size,
      accountings: accountings.slice(0, 6).map((e) => ({
        id: e.id,
        heir: e.personIds[0],
        received: e.facts?.receivedMinor,
        laws: e.facts?.taxLawIds,
      })),
      heirsWithView: learned.slice(0, 6).map((e) => ({
        heir: e.personIds[0],
        law: e.facts?.lawId,
        took: e.facts?.amountMinor,
        stance: stancesOf(api, e.personIds[0]!).find(
          (s) => s.topic === e.topic,
        ),
      })),
    },
    null,
    1,
  ),
);
if (process.env.DEBUG_ESTATES)
  for (const e of deaths) {
    const id = e.personIds[0]!;
    const person = core.people.get(id);
    console.log(
      e.kind,
      id,
      person
        ? {
            liquid: person.liquidMinor,
            familyFacts: (person.pastFacts ?? []).filter((f) =>
              f.kind.startsWith("family:"),
            ).length,
            heirs: heirsOf(api, person).heirs,
          }
        : "no person",
    );
  }
