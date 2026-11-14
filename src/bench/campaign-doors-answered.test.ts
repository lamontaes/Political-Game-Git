import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  fileCandidacy,
  openContests,
  petitionOf,
  petitionSigners,
} from "../core2/modules/elections";
import { corePlaceByKey } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import { petitionAsksAtDoors } from "../core2/modules/campaigns";
import { campaignDay } from "./campaign";
import { buildBenchWorld } from "./world";

// A petition outing's strip says the doors that opened, then how many signed
// (Words lead, Nov 14): every opener is asked once, so the signers can never
// outnumber the doors answered, while "reached" (the full people met) can be
// fewer than the signers, since a counted resident signs and stays a count.
// Pinned to Otisville, New York, where T47 measured it (Nov 14).
const PLACE = "3655673";
const SEED = "580915c55b122496eedbb4aef26193e639a89d50e6df380c1a1073abc59559a5";
const OUTINGS = 6;

it(`a petition outing's signers never outnumber the doors answered (Otisville NY, seed ${SEED})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const local = () =>
    openContests(api).filter(
      (row) => row.level !== "federal" && row.level !== "state",
    );
  for (let week = 0; week < 52 && !local().length; week += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const town = corePlaceByKey(PLACE)?.context.jurisdiction.id;
  const start = makeIsoDate(core.date);
  const adults = [...core.people.values()]
    .filter(
      (row) =>
        row.alive &&
        row.placeId === town &&
        row.tier !== "husk" &&
        ageOnDate(makeIsoDate(row.birthDate), start) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id))
    .slice(0, 60);
  let filed: { personId: string; filingId: string } | null = null;
  for (const adult of adults) {
    core.playerId = adult.id;
    for (const contest of local()) {
      const out = fileCandidacy(api, {
        personId: adult.id,
        contestId: contest.id,
        platform: [`${PLATFORM_QUESTIONS[0]}=1`],
      });
      if (out.status !== "refused" && out.filing.status === "petitioning") {
        filed = { personId: adult.id, filingId: out.filing.id };
        break;
      }
    }
    if (filed) break;
  }
  expect(filed, `no petition race at Otisville by ${start}`).toBeTruthy();
  const { personId, filingId } = filed!;
  const days: string[] = [];
  let signedOverReached = 0;
  for (let day = 0; day < OUTINGS; day += 1) {
    if (core.date > petitionOf(api, filingId)!.due) break;
    const asking = petitionAsksAtDoors(api, filingId);
    const doorSigned = () =>
      petitionSigners(api, filingId).filter((row) => row.via === "door").length;
    const signedBefore = doorSigned();
    const out = campaignDay(core, personId, { filingId, kind: "canvass" });
    days.push(
      `${core.date}: ${out.doorsKnocked} doors, ${out.answered} answered, ${out.reached} reached, ${out.signed} signed`,
    );
    if (!asking) {
      // Past the target plus the cushion (owner, Nov 14) the doors ask for
      // votes: no signed figure, no signature asked.
      expect(out.answered, days.at(-1)).toBeNull();
      expect(out.signed, days.at(-1)).toBeNull();
      expect(doorSigned(), days.at(-1)).toBe(signedBefore);
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      continue;
    }
    expect(out.answered, days.at(-1)).not.toBeNull();
    expect(out.signed!, days.at(-1)).toBeLessThanOrEqual(out.answered!);
    expect(out.answered!, days.at(-1)).toBeGreaterThanOrEqual(out.reached);
    expect(out.answered!, days.at(-1)).toBeLessThanOrEqual(out.doorsKnocked);
    if (out.signed! > out.reached) signedOverReached += 1;
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  process.stdout.write(`DOORS ANSWERED ${filingId}\n  ${days.join("\n  ")}\n`);
  expect(days.length).toBeGreaterThan(0);
  // The case the label fixes: more signed than full people met.
  expect(signedOverReached, days.join("\n")).toBeGreaterThan(0);
});
