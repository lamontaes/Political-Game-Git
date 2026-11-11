/**
 * The person at a state filing counter is told as a job, never by the agency's name (pool item
 * words-counter-agency-said-as-a-post): where the filing data names an agency and not an elected
 * secretary of state, the state's election chief is the clerk, and their `post` is "head of the
 * <agency>", not the agency itself. Played worlds of places drawn from all 56 until one files
 * state races with an agency.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { filingClerkFor } from "./modules/filing-clerk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  "a state election chief at the counter has a post that is not the agency's name",
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    const notes: string[] = [];
    for (let draw = 0; draw < 12; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "filing-clerk-post");
      const where = `${place.name} [${place.key}], seed ${seed}:${draw}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const contests = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[];
      for (const contest of contests) {
        const clerk = filingClerkFor(api, contest.id);
        if (clerk?.basis !== "state-appointment") continue;
        // The agency's head, titled by the agency: the row's title is not a post.
        if (!clerk.post) {
          notes.push(
            `${where}: ${contest.id} names ${clerk.recordId} with a post`,
          );
          continue;
        }
        expect(clerk.post, `${where}: ${clerk.recordId}`).not.toBe(clerk.title);
        expect(clerk.post, `${where}: ${clerk.recordId}`).toContain(
          clerk.title,
        );
        expect(clerk.post, where).toMatch(/^head of the /);
        return;
      }
      notes.push(`${where}: no state counter with an agency head`);
    }
    throw new Error(
      `no place filed state races through an agency head: ${notes.join("; ")}`,
    );
  },
);
