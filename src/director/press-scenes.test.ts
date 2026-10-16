import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  PRESS_MODULE_ID,
  answerInterview,
  candidateAnswers,
  officeholderSpeaker,
  requestInterview,
} from "../core2/modules/press";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";

// A published interview is a scene for the person interviewed, with the
// outlet's reporter in it (pool item director-civic-producers-government-rest):
// the officeholder asks an outlet for an interview, the outlet invites them,
// they answer, the interview prints, and the director stages the press
// interview from the record the press engine wrote.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "press-scenes");

it(`a published interview is a scene with the reporter in it, in ${place.name}, seed ${seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const api = coreAPI(core);
  const outlets = (
    api.moduleState(PRESS_MODULE_ID).table("outlets").rows() as unknown as {
      id: string;
      tier?: string;
      reporterIds?: string[];
    }[]
  ).filter((o) => o.tier !== "national" && o.reporterIds?.length);
  const holders = townSeats(api)
    .map((s) => s.holder?.personId)
    .filter((id): id is string => !!id && !!core.people.get(id)?.alive);
  if (!outlets.length || !holders.length) {
    console.log(
      `PRESS ${place.name} ${seed}: no local outlet or seated resident`,
    );
    return;
  }
  let published: { id: string; personId: string; reporterId: string } | null =
    null;
  for (const holder of holders) {
    director.watch(core, holder);
    const speaker = officeholderSpeaker(api, holder);
    if (!speaker) continue;
    for (const outlet of outlets) {
      const row = requestInterview(api, {
        outletId: outlet.id,
        personId: holder,
      });
      if (row.status !== "invited") continue;
      const done = answerInterview(
        api,
        row.id,
        candidateAnswers(api, row.questions, speaker),
      );
      if (done.status === "published" && done.reporterId) {
        published = {
          id: done.id,
          personId: holder,
          reporterId: done.reporterId,
        };
        break;
      }
    }
    if (published) break;
  }
  expect(
    published,
    `no outlet invited a seated resident in ${place.name}`,
  ).toBeTruthy();
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const scenes = (
    director.ledger.people.get(published!.personId)?.schedule ?? []
  )
    .filter((row) =>
      row.momentId.includes(`interview-published:${published!.id}`),
    )
    .flatMap((row) => row.bindings);
  const scene = scenes.find((row) => row.typeKey === "press-interview");
  expect(scene, "the interview is staged as a press interview").toBeTruthy();
  const reporter = scene!.roles.find((row) => row.role === "reporter")!;
  expect(reporter.personIds).toEqual([published!.reporterId]);
  const official = scene!.roles.find((row) => row.role === "official")!;
  expect(official.personIds).toEqual([published!.personId]);
  console.log(
    `PRESS ${place.name} ${seed}: ${published!.id} for ${published!.personId} with reporter ${published!.reporterId}`,
  );
}, 600_000);
