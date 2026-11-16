/**
 * A campaign gathers the clerk's count plus the names already off the roll
 * (`signaturesToGather`), read from the roll and the signatures held, never a
 * share picked in advance (owner, Nov 16: no fixed cushion). Pinned to
 * Otisville, New York, seed 580915c5 (Nov 16 strike measurement: struck 2 of
 * 150 at the clerk's check).
 */
import { expect, it } from "vitest";
import { setBookkeeping } from "./bookkeeping";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  fileCandidacy,
  openContests,
  petitionOf,
  petitionSigners,
} from "./modules/elections";
import { signaturesToGather } from "./modules/campaigns";
import { electorateRoll } from "./modules/voting";
import { corePlaceByKey } from "./place-lookup";
import { coreAPI } from "./state";
import { campaignDay } from "../bench/campaign";
import { buildBenchWorld } from "../bench/world";

const PLACE = "3655673";
const SEED = "580915c55b122496eedbb4aef26193e639a89d50e6df380c1a1073abc59559a5";

it(`the gather target is the clerk's count plus the signers off the roll (Otisville NY, seed ${SEED})`, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const local = () =>
    openContests(api).filter(
      (c) => c.level !== "federal" && c.level !== "state",
    );
  for (let week = 0; week < 52 && !local().length; week += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  const town = corePlaceByKey(PLACE)?.context.jurisdiction.id;
  const start = makeIsoDate(core.date);
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        p.tier !== "husk" &&
        ageOnDate(makeIsoDate(p.birthDate), start) >= 35,
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
  const due = petitionOf(api, filingId)!.due;
  let lastChecked = "";
  while (addDays(makeIsoDate(core.date), 1) <= due) {
    campaignDay(core, personId, { filingId, kind: "canvass" });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    lastChecked = core.date;
  }
  const needed = petitionOf(api, filingId)!.needed;
  const roll = new Set(electorateRoll(api).map((v) => v.id));
  const off = petitionSigners(api, filingId).filter(
    (s) => !roll.has(s.personId),
  ).length;
  const target = signaturesToGather(api, filingId);
  process.stdout.write(
    `PETITION TARGET ${lastChecked}: needed ${needed}, off the roll ${off}, target ${target}\n`,
  );
  expect(target).toBe(needed + off);
  expect(target).toBeLessThan(Math.ceil(needed * 1.5));
}, 180_000);
