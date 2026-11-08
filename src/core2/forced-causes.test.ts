/**
 * Forced causes in the played world (Dev Tester, Nov 8; the CTO's ruling on
 * golden-path M0-13 "every module"): a module that waits for a cause may read
 * "unobserved" in a one-year run only if forcing its cause through the game's
 * own code makes it act, so "unobserved" never hides a dead module. One
 * bench world on a seed nobody chose; each test forces one cause with the
 * module's own function and shows the module's records change.
 *
 * Already covered in a played world elsewhere: corruption (bench/dev-bribe),
 * succession (succession.test.ts), public projects (projects.test.ts),
 * recalls (recalls.test.ts), the federal office day (office-day-federal).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { lawChain } from "./modules/laws";
import {
  measureResult,
  putOnBallot,
  type MeasureRow,
} from "./modules/ballot-measures";
import { appoint, appointmentsIn, postsToFill } from "./modules/executive";
import { townSeats } from "./modules/offices";
import { drawPlace } from "../../scripts/core2-year/place";
import { settleEstate } from "./estates";

const seed = process.env.FORCED_CAUSES_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const where = `${world.place.displayName} (seed ${seed})`;

/** Every row of every table of a module, counted. */
const rowsOf = (moduleId: string) =>
  Object.values(api.moduleState(moduleId).snapshot().tables).reduce(
    (n, rows) => n + (rows as readonly unknown[]).length,
    0,
  );

describe(`forced causes in the played world: ${where}`, () => {
  it("a measure put on the state's ballot is counted on its day (core2-ballot-measures-v1)", () => {
    const before = rowsOf("core2-ballot-measures-v1");
    const election = addDays(makeIsoDate(core.date), 40);
    const measure: Omit<MeasureRow, "status"> = {
      id: `measure:forced:${seed}`,
      stateKey: lawChain(api).stateKey,
      title: "A forced measure",
      kind: "legislative referral",
      question: "us-policy-positions:government-operations.all-mail-voting",
      yesMeans: "enact",
      electionDate: election,
      passShare: 0.5,
      passRule: "simple majority",
      enactsOnApproval: true,
      source: "Forced by the Dev Tester to show the module acts",
    };
    putOnBallot(api, measure);
    advanceCore(core, addDays(makeIsoDate(election), 2));
    expect(measureResult(api, measure.id), where).not.toBeNull();
    expect(rowsOf("core2-ballot-measures-v1"), where).toBeGreaterThan(before);
  }, 600_000);

  it("a death settles an estate and probate closes (core2-estates-v1)", () => {
    const person = [...core.people.values()].find(
      (p) => p.alive && p.liquidMinor > 100_000 && p.id !== core.playerId,
    )!;
    api.updatePerson(person.id, { alive: false });
    const deathId = `forced-death:${person.id}`;
    // The estate module's own cause function (the health engine calls it on a death).
    settleEstate(api, person.id, deathId);
    const key = `probate-closes:${person.id}`;
    expect(api.moduleCalendar("core2-estates-v1").get(key)?.status, where).toBe(
      "pending",
    );
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    expect(api.moduleCalendar("core2-estates-v1").get(key)?.status, where).toBe(
      "completed",
    );
  }, 600_000);

  it("a post whose holder has died is filled by the town's appointer (core2-executive-v1)", () => {
    // The module's cause is a post to fill: posts are filled at the opening,
    // so the holder of one dies, in the first drawn town that has appointed posts.
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "forced-executive");
      const w = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const a = coreAPI(w.core);
      const town = lawChain(a).townPlaceId;
      const held = appointmentsIn(a, town).find(
        (row) => w.core.people.get(row.holderId)?.alive,
      );
      if (!held) {
        tried.push(`${place.name}: no appointed post`);
        continue;
      }
      a.updatePerson(held.holderId, { alive: false });
      for (const seat of townSeats(a)) {
        const id = seat.holder?.personId;
        const post = id
          ? postsToFill(a, id).find((p) => p.key === held.post)
          : undefined;
        if (!post) continue;
        expect(appoint(a, { post: post.key }), place.name).not.toBeNull();
        const now = appointmentsIn(a, town).filter(
          (r) => r.post === held.post && w.core.people.get(r.holderId)?.alive,
        );
        expect(
          now.length,
          `${place.name}: ${held.post} refilled`,
        ).toBeGreaterThan(0);
        return;
      }
      tried.push(`${place.name}: nobody appoints ${held.post}`);
    }
    expect.fail(`no drawn town refilled a post: ${tried.join("; ")}`);
  }, 600_000);
});
