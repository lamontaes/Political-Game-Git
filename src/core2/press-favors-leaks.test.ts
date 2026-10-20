/**
 * Favors and leaks (SG-PEOPLE-press-favors-and-leaks), in the played world, a
 * place drawn from all 56: someone does a reporter a favor (closeness grows
 * through the relationship writer, by a favor record), then leaks them another
 * person's recorded vote. The leak is on that reporter's desk alone with the
 * leaker in their knowledge; the desk files it, and its readers never learn
 * who leaked it. Seed and place are named in every failure message; set
 * GOLDEN_PATH_SEED to reproduce.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { townSeats } from "./modules/offices";
import { closeness } from "./press-desk";
import {
  PRESS_MODULE_ID,
  doReporterFavor,
  leakToReporter,
  outletsHere,
  storiesPrinted,
} from "./modules/press";
import { recordVote } from "./modules/record";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const QUESTION = "us-policy-positions:justice-public-safety.stand-your-ground";

it("a favor warms a reporter, a leak reaches only their desk, and they file it", () => {
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const draw = drawPlace(seed, `press-favors-leaks:${attempt}`);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(core);
      const where = `${draw.key} (${core.placeMetadata.placeName}), seed ${draw.seed}`;
      const local = outletsHere(api).filter(
        (o) => o.tier !== "national" && o.reporterIds?.length,
      );
      const holders = townSeats(api)
        .map((s) => s.holder?.personId)
        .filter((id): id is string => !!id && !!core.people.get(id)?.alive);
      if (local.length < 1 || holders.length < 2) continue;
      const outlet = local[0]!;
      const reporterId = outlet.reporterIds![0]!;
      const [leakerId, aboutId] = holders.filter((id) => id !== reporterId);
      if (!leakerId || !aboutId) continue;
      const vote = recordVote(api, {
        personId: aboutId,
        body: "council",
        measureId: `measure:press-favors-leaks:${QUESTION}`,
        stance: { question: QUESTION, position: 1 },
        passed: true,
      });

      // The favor: closeness grows, and the favor is on the record.
      const before = closeness(api, reporterId, leakerId);
      const favor = doReporterFavor(api, leakerId, reporterId);
      expect(favor, where).toBeTruthy();
      expect(closeness(api, reporterId, leakerId), where).toBeGreaterThan(
        before,
      );

      // The leak: on this reporter's desk alone, with the leaker in their knowledge.
      const leak = leakToReporter(api, {
        leakerId,
        reporterId,
        aboutId,
        question: QUESTION,
      });
      expect(leak?.voteId, where).toBe(vote.id);
      expect(api.knows(reporterId, `leaked-by:${leak!.wireId}`)?.value).toBe(
        leakerId,
      );
      expect(
        leakToReporter(api, {
          leakerId: reporterId,
          reporterId,
          aboutId,
          question: QUESTION,
        }),
        "no one leaks to themselves",
      ).toBeNull();
      expect(
        leakToReporter(api, {
          leakerId,
          reporterId,
          aboutId,
          question: "us-policy-positions:none.none",
        }),
        "no vote on the record, nothing to leak",
      ).toBeNull();

      advanceCore(core, addDays(makeIsoDate(core.date), 14));
      const printed = storiesPrinted(api, outlet.id).find(
        (s) => s.wireId === leak!.wireId,
      );
      if (process.env.FAVORS_LEAKS_PROOF)
        writeFileSync(
          process.env.FAVORS_LEAKS_PROOF,
          JSON.stringify({ where, favor, leak, printed }, null, 1),
        );
      // Another outlet's reporters were never offered it.
      for (const other of outletsHere(api).filter((o) => o.id !== outlet.id))
        expect(
          storiesPrinted(api, other.id).some((s) => s.wireId === leak!.wireId),
          where,
        ).toBe(false);
      expect(printed, `${where}: the reporter filed the leak`).toBeTruthy();
      expect(printed!.reporterId, where).toBe(reporterId);
      expect(printed!.subjectIds, where).toEqual([aboutId]);
      // Its readers never learn who leaked it.
      const table = api.moduleState(PRESS_MODULE_ID).table("leaks");
      expect(table.get(leak!.id), where).toBeTruthy();
      for (const id of core.people.keys()) {
        if (id === reporterId) continue;
        expect(
          api.knows(id, `leaked-by:${leak!.wireId}`),
          `${where}: ${id} learned the leaker`,
        ).toBeUndefined();
      }
      return;
    }
    throw new Error(
      `no drawn place had an outlet and two seated people (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_800_000);
