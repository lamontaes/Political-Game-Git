// @vitest-environment node
/**
 * The played area's opinion is read only by officials it elects (Pins 18
 * review): the views engine keeps one opinion row a question, over the
 * played town's people alone, so moving it moves the reasons of one of the
 * town's own state legislators (the seat that covers the town) and leaves
 * those of a legislator of another state where they were, who reads their
 * district by its lean alone (SG-OFFICIALS-outside-opinion). In the same
 * world, a federal law set with no vote count on record (as dev mode sets
 * one) leaves Congress's consensus to the sitting members' leans rather than
 * an even split. A random place and seed each run, named in every message
 * (GOLDEN_PATH_SEED replays one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { axisOf } from "./campaign-data";
import { opinionQuestions, leanStrength } from "./campaign-views";
import { gameStartDate } from "./game-start";
import { lawConsensus } from "./law-consensus";
import { enactLaw, POLICY_QUESTIONS } from "./modules/laws";
import {
  allOfficials,
  answersToTown,
  officialParts,
  type OfficialRow,
} from "./modules/officials";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { VIEWS_MODULE_ID, worldOpinion } from "./modules/views";
import type { ModuleRow } from "./module-data";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(
  `the town's opinion moves its own legislators and no other state's, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    try {
      // A town whose state has a legislature with a seat covering it and
      // another state's legislators beside it; a place without is drawn
      // again and named.
      const passed: string[] = [];
      for (let at = 0; ; at += 1) {
        const place = drawPlace(replay, `officials-town-opinion:${at}`);
        const where = `${place.name} (${place.key}), seed ${place.seed}, replay ${replay}`;
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        });
        const api = coreAPI(world.core);
        const seats = api.moduleState(OFFICES_MODULE_ID).table("seats");
        const town = (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("loaded")
            .get("town") as unknown as { stateKey: string }
        ).stateKey;
        const sitting = allOfficials(api)
          .filter((row) => row.ended === null && row.bodyKind === "legislature")
          .sort((a, b) => a.id.localeCompare(b.id));
        const own = sitting.find(
          (row) =>
            row.stateKey === town &&
            (seats.get(row.seatId) as unknown as { coversTown?: boolean })
              ?.coversTown === true,
        );
        const outside = sitting.find((row) => row.stateKey !== town);
        if (!own || !outside) {
          passed.push(
            `${where}: no ${own ? "other state's" : "own"} legislator`,
          );
          continue;
        }
        const question = opinionQuestions().find(
          (q) => leanStrength(q) !== 0 && worldOpinion(api, q),
        );
        expect(question, `${where}: a kept opinion`).toBeTruthy();
        const q = question!;
        const stances = [{ question: q, position: 1 }];
        const read = (row: OfficialRow) => officialParts(api, row, stances);
        const [ownBefore, outsideBefore] = [read(own), read(outside)];
        // The town's people come to favor "yes" by half a point more than
        // their leans alone say.
        const kept = worldOpinion(api, q)!;
        api
          .moduleState(VIEWS_MODULE_ID)
          .table("opinions")
          .put({ ...kept, mean: kept.mean + 0.5 } as unknown as ModuleRow);
        const [ownAfter, outsideAfter] = [read(own), read(outside)];
        process.stdout.write(
          `TOWN-OPINION ${where}${passed.length ? ` (passed over ${passed.join("; ")})` : ""}: ${q} mean ${kept.mean} -> ${kept.mean + 0.5}; own ${own.id} (${own.seatId}) constituents ${ownBefore.constituents.toFixed(4)} -> ${ownAfter.constituents.toFixed(4)}, press ${ownBefore.press.toFixed(4)} -> ${ownAfter.press.toFixed(4)}; outside ${outside.id} (${outside.stateKey}) constituents ${outsideBefore.constituents.toFixed(4)} -> ${outsideAfter.constituents.toFixed(4)}\n`,
        );
        expect(answersToTown(api, own), where).toBe(true);
        expect(answersToTown(api, outside), where).toBe(false);
        expect(ownAfter.constituents, where).toBeGreaterThan(
          ownBefore.constituents,
        );
        expect(outsideAfter, where).toEqual(outsideBefore);
        // Nobody in another state reads the town's opinion.
        for (const row of allOfficials(api))
          if (row.stateKey !== town)
            expect(answersToTown(api, row), `${where}: ${row.id}`).toBe(false);
        // A federal law with no vote count on record.
        const federal = Object.keys(axisOf)
          .filter((key) => !POLICY_QUESTIONS[key])
          .sort()[0]!;
        enactLaw(api, {
          jurisdiction: "US",
          level: "federal",
          series: federal,
          value: 1,
          effectiveDate: api.state.date,
          measureId: "officials-town-opinion",
          citation: "officials-town-opinion.test.ts",
          terms: { provenance: "officials-town-opinion.test.ts" },
        });
        expect(lawConsensus(api, federal)?.from, `${where}: ${federal}`).toBe(
          "members' leans",
        );
        return;
      }
    } finally {
      setBookkeeping(true);
    }
  },
);
