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
} from "../core2/modules/elections";
import { corePlaceByKey } from "../core2/place-lookup";
import { coreAPI } from "../core2/state";
import {
  petitionAsksAtDoors,
  signaturesToGather,
} from "../core2/modules/campaigns";
import { petitionSigners } from "../core2/modules/elections";
import { campaignDay } from "./campaign";
import { buildBenchWorld } from "./world";

// Owner, Nov 14 (decision card "Switch to asking for votes"): once the petition
// holds what a campaign gathers (the clerk's count plus the cushion), the
// player's doors stop asking for signatures and ask for votes. Pinned to
// Otisville, New York (T47's measurement).
const PLACE = "3655673";
const SEED = "580915c55b122496eedbb4aef26193e639a89d50e6df380c1a1073abc59559a5";

it(`the player's doors ask for votes once the petition holds the target (Otisville NY, seed ${SEED})`, () => {
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
  const target = signaturesToGather(petitionOf(api, filingId)!.needed);
  const doorSigned = () =>
    petitionSigners(api, filingId).filter((s) => s.via === "door").length;
  const days: string[] = [];
  let switched = false;
  for (
    let day = 0;
    day < 12 && core.date <= petitionOf(api, filingId)!.due;
    day += 1
  ) {
    const asking = petitionAsksAtDoors(api, filingId);
    const before = doorSigned();
    const out = campaignDay(core, personId, { filingId, kind: "canvass" });
    days.push(
      `${core.date}: asking ${asking}, ${out.doorsKnocked} doors, ${out.reached} reached, signed ${out.signed}, answered ${out.answered}, door signers ${doorSigned()} of ${target}`,
    );
    if (asking) {
      // The outing that reaches the target shows both: the signed and the
      // doors after it that asked for the vote.
      if (!petitionAsksAtDoors(api, filingId))
        expect(out.votesAsked!, days.at(-1)).toBeGreaterThan(0);
      expect(out.signed, days.at(-1)).not.toBeNull();
      expect(before, days.at(-1)).toBeLessThan(target);
    } else {
      switched = true;
      // A vote-asking outing: no signers, the strip reads "reached", nobody signs.
      expect(out.signed, days.at(-1)).toBeNull();
      expect(out.answered, days.at(-1)).toBe(out.votesAsked);
      expect(out.reached, days.at(-1)).toBeGreaterThan(0);
      expect(doorSigned(), days.at(-1)).toBe(before);
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  process.stdout.write(
    `DOORS SWITCH ${filingId} target ${target}\n  ${days.join("\n  ")}\n`,
  );
  expect(switched, days.join("\n")).toBe(true);
  expect(petitionAsksAtDoors(api, filingId)).toBe(false);
}, 180_000);
