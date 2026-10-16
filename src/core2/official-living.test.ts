import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { considerBribe } from "./modules/corruption";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

// A named official has a household of their own (owner, Oct 16): a living
// cost from the Consumer Expenditure basket and a studio's rent, savings
// from the Survey of Consumer Finances at their pay, and a month of that
// cost leaves their account each payday. The bribe engine reads both.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "official-living");

it(`seated officials keep a household and spend it in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const serving = () =>
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .rows() as unknown as TermRow[]
    ).filter((term) => term.status === "serving" && term.personId);
  const officials = serving().map((term) => core.people.get(term.personId!)!);
  expect(officials.length).toBeGreaterThan(0);
  for (const person of officials) {
    expect(person.livingCostDailyMinor, person.id).toBeGreaterThan(0);
    // An office with no salary on record (a territory's attorney general) has no pay to save from.
    if (person.jobId) expect(person.liquidMinor, person.id).toBeGreaterThan(0);
  }
  const sample = officials.find((p) => p.id.startsWith("official:"))!;
  const before = sample.livingCostDailyMinor;
  // What leaves the sample's account for living on the journal.
  let spent = 0;
  const post = api.postJournal.bind(api);
  api.postJournal = (entry) => {
    if (entry.sourceRef.id.includes(`living:${sample.id}:`))
      for (const posting of entry.postings)
        if (posting.accountId.includes(sample.id) && posting.deltaMinor < 0)
          spent -= posting.deltaMinor;
    return post(entry);
  };
  const start = core.date;
  // Two paydays: the 1st of February and of March.
  advanceCore(core, makeIsoDate("2025-03-02"));
  const days = Math.round(
    (Date.parse("2025-03-01") - Date.parse(start)) / 86_400_000,
  );
  expect(spent).toBe(before * days);
  // A bribe offered to a seated official reads their cushion.
  const rich = [...core.people.values()]
    .filter((p) => p.alive && !p.id.startsWith("official:"))
    .sort((a, b) => b.liquidMinor - a.liquidMinor)
    .slice(0, 12);
  let read: string | undefined;
  for (const offerer of rich) {
    for (const person of officials.slice(0, 12)) {
      const record = considerBribe(api, {
        offererId: offerer.id,
        officialId: person.id,
        stakeMinor: 50_000_000,
        subjectId: `official-living:${offerer.id}:${person.id}`,
      });
      const need = record?.reasons.take?.need;
      if (need === undefined) continue;
      const month = person.livingCostDailyMinor * 30;
      expect(need, record!.id).toBeLessThan(
        record!.amountMinor / (month + 1) + 1,
      );
      read = `${record!.id} need ${need}`;
      break;
    }
    if (read) break;
  }
  console.log(
    `WIRED ${place.name} ${seed}: ${officials.length} officials, ${sample.id} spent ${spent} over ${days} days; bribe read: ${read ?? "no offer made"}`,
  );
}, 900_000);
