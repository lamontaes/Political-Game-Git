import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { campaignDay } from "../bench/campaign";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { PLATFORM_QUESTIONS } from "./campaign-data";
import { gameStartDate } from "./game-start";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import {
  announceCandidacy,
  ELECTIONS_MODULE_ID,
  type ContestRow,
} from "./modules/elections";
import { outletsHere } from "./modules/press";
import { corePlaceByKey } from "./place-lookup";
import { coreAPI } from "./state";
import { townResidentsByCash } from "./resident-adults-test-kit";

// P50: an announced candidate, whose filing has not opened, asks a paper for
// an interview and is not turned away as if the race were over.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`a paper does not decline an announced candidate as "race-over" (seed ${seed})`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const place = drawPlace(seed, `announced-interview:${attempt}`);
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const today = makeIsoDate(core.date);
    const contest = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find(
      (row) =>
        row.level !== "federal" &&
        row.level !== "state" &&
        row.filingOpens > core.date,
    );
    const outlet = outletsHere(api).find(
      (o) => o.tier === "local" && o.kind === "newspaper",
    );
    if (!contest || !outlet) {
      tried.push(
        `${where}: no local contest with a filing window ahead, or no paper`,
      );
      continue;
    }
    const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
    const adult = townResidentsByCash(core, api).find(
      (row) =>
        row.alive &&
        row.placeId === town &&
        row.tier !== "husk" &&
        ageOnDate(makeIsoDate(row.birthDate), today) >= 35,
    );
    if (!adult) {
      tried.push(`${where}: no adult resident`);
      continue;
    }
    core.playerId = adult.id;
    const announced = announceCandidacy(api, {
      personId: adult.id,
      contestId: contest.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    if (announced.status !== "announced") {
      tried.push(`${where}: ${adult.id} could not announce for ${contest.id}`);
      continue;
    }
    const day = campaignDay(core, adult.id, {
      filingId: announced.filing.id,
      kind: "interview",
      outletId: outlet.id,
    });
    expect(day.interview, where).not.toBeNull();
    expect(
      day.interview?.reason,
      `${where}: ${announced.filing.id} asked ${outlet.id}`,
    ).not.toBe("race-over");
    return;
  }
  throw new Error(
    `No drawn place let a resident announce: ${tried.join("; ")}`,
  );
}, 600_000);
