/**
 * A state's election agency has a head: a full person on the state's payroll,
 * who the filing scene puts at the counter for state and federal races. A
 * place is drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { ELECTIONS_MODULE_ID, type ContestRow } from "./modules/elections";
import { ELECTION_CHIEF_POST, agencyHeadsIn } from "./modules/executive";
import { filingClerkFor } from "./modules/filing-clerk";
import { lawChain } from "./modules/laws";
import { postPayCapDaily } from "./budgets-treasury";
import { governments } from "./modules/budgets";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe(`the state election agency's head (seed ${seed})`, () => {
  it("is a living person on the state payroll, and every state and federal contest names someone at the counter", () => {
    const place = drawPlace(seed, "election-chief");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const chief = agencyHeadsIn(api, lawChain(api).stateKey).find(
      (row) => row.post === ELECTION_CHIEF_POST,
    );
    expect(chief, where).toBeDefined();
    const person = core.people.get(chief!.holderId);
    expect(person?.alive, `${where}: ${chief!.holderId}`).toBe(true);
    // On the state treasury, unless its administration line has no room for
    // the post (the registered pay stopgap holds it unpaid, as for a town head).
    const employer = governments(api).find(
      (g) => g.level === "state",
    )?.organizationId;
    const room = employer
      ? postPayCapDaily(api, employer, "state:chief-election-official", 1)
      : 0;
    const job = person?.jobId ? core.jobs.get(person.jobId) : undefined;
    if (room) {
      expect(
        job?.endsAt,
        `${where}: a job on the state treasury`,
      ).toBeUndefined();
      expect(job?.id, where).toMatch(
        /^job:public:state:chief-election-official:/,
      );
    }
    const contests = api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[];
    const outside = contests.filter(
      (c) => c.family !== "municipalOffice" && c.family !== "countyOffice",
    );
    expect(outside.length, where).toBeGreaterThan(0);
    for (const contest of outside) {
      const clerk = filingClerkFor(api, contest.id);
      expect(clerk, `${where}: ${contest.id}`).not.toBeNull();
      expect(
        core.people.get(clerk!.personId)?.alive,
        `${where}: ${contest.id}`,
      ).toBe(true);
    }
  }, 600_000);
});
