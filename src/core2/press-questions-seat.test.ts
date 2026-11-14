/**
 * A reporter asks a local official what their own body decides, and otherwise
 * only what is truly in the news in town (pool item
 * campaign-interview-asks-a-council-candidate-federal-questions-and-the-player-cannot-take-a-side).
 * In worlds from buildBenchWorld in named places with a fixed seed, every
 * serving city or township official is asked by a national outlet and by a
 * local one; each question asked is one the official's body may decide or one
 * the town cares about.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { contestPositions } from "./contest-positions";
import { gameStartDate } from "./game-start";
import { OFFICES_MODULE_ID } from "./modules/offices";
import {
  PRESS_MODULE_ID,
  interviewQuestions,
  officeholderSpeaker,
  townConcernReader,
} from "./modules/press";
import { coreAPI } from "./state";

/** A city council place and a township place, named. */
const PLACES = ["1347336", "4212512"];

it.each(PLACES)(
  "a local official is asked their body's questions or the town's news (%s)",
  (key) => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(
      `press-questions-seat:${key}`,
      gameStartDate(),
      {
        twoLevel: true,
        placeKey: key,
      },
    );
    const api = coreAPI(core);
    const offices = api.moduleState(OFFICES_MODULE_ID);
    const outlets = api
      .moduleState(PRESS_MODULE_ID)
      .table("outlets")
      .rows() as unknown as { id: string; tier: string; lean: number }[];
    const concern = townConcernReader(api);
    let asked = 0;
    let officials = 0;
    for (const term of offices.table("terms").rows() as unknown as {
      personId: string | null;
      officeId: string;
      status: string;
    }[]) {
      const office = offices.table("offices").get(term.officeId) as unknown as
        { level: string } | undefined;
      if (
        term.status !== "serving" ||
        !term.personId ||
        !api.state.people.get(term.personId)?.alive ||
        (office?.level !== "city" && office?.level !== "township")
      )
        continue;
      const speaker = officeholderSpeaker(api, term.personId);
      if (!speaker) continue;
      officials += 1;
      const seat = new Set(contestPositions(api, { officeId: term.officeId }));
      for (const outlet of outlets.slice(0, 8))
        for (const q of interviewQuestions(api, speaker, outlet as never)) {
          asked += 1;
          expect(
            seat.has(q) || concern(q) > 0,
            `${key}: ${q} is neither this body's to decide nor in the town's news (${outlet.tier})`,
          ).toBe(true);
        }
    }
    expect(officials, `${key}: a serving local official`).toBeGreaterThan(0);
    expect(asked, `${key}: questions were asked`).toBeGreaterThan(0);
  },
  300_000,
);
