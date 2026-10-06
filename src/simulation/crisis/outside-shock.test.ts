import { beforeAll, describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { addDays } from "../dates";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { lifePlaces } from "../life-places";
import { SeededRng } from "../rng";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import { appendCrisisRecord, crisisRecords } from "./records";
import {
  declareInternationalCrisis,
  internationalCrisisState,
} from "./international";
import {
  OUTSIDE_SHOCK_EVENT_TAG,
  OUTSIDE_SHOCK_ENDED_PHASE,
  OUTSIDE_SHOCK_LASTING_PHASE,
  reconcileOutsidePressureIncident,
} from "./outside-shock";

const LONG = 900_000;
let opening: World;
let placeName: string;
let seed: string;

beforeAll(() => {
  seed = "outside-shock-k6";
  const place = new SeededRng(seed).pick(
    lifePlaces().filter((candidate) => candidate.scope === "state"),
  );
  placeName = place.displayName;
  opening = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!.world;
}, LONG);

describe("outside pressure as a lasting condition", () => {
  it(
    "starts from recorded deployment, follows War Powers records, and ends on withdrawal",
    () => {
      let world = declareInternationalCrisis(opening, {
        stableKey: "outside-shock-k6-crisis",
        counterpartyLabel: "a foreign government",
        allyLabels: ["treaty allies"],
        subject: "a disputed shipping lane",
        tension: "low",
        basis: "A recorded international dispute starts the test condition.",
      });
      const crisis = crisisRecords(world).find(
        (record) => record.kind === "international-crisis",
      )!;
      const addWarStage = (
        stage:
          | "forces-introduced"
          | "report-submitted"
          | "authorization-absent"
          | "forces-withdrawn",
        stableKey: string,
        parentId: EntityId,
      ) => {
        world = appendCrisisRecord(world, {
          kind: "war-powers",
          stableKey,
          effectiveAt: world.currentDate,
          causalParentIds: [parentId],
          visibility: "public",
          eventId: null,
          crisisId: crisis.id,
          stage,
          reportDueAt: addDays(world.currentDate, 2),
          terminationAt: addDays(world.currentDate, 60),
          note: `The recorded War Powers clock entered ${stage}.`,
        });
        return crisisRecords(world).at(-1)!.id;
      };

      const introduced = addWarStage(
        "forces-introduced",
        "outside-shock:forces-introduced",
        crisis.id,
      );
      world = reconcileOutsidePressureIncident(world);
      const shockEvents = () =>
        world.history.events.filter((event) =>
          event.tags.includes(OUTSIDE_SHOCK_EVENT_TAG),
        );
      expect(shockEvents().at(-1)?.tags).toContain("outside-shock:onset");
      expect(shockEvents().at(-1)?.context.pressure).toContain(crisis.eventId!);
      const reportId = addWarStage(
        "report-submitted",
        "outside-shock:report-submitted",
        introduced,
      );
      world = reconcileOutsidePressureIncident(world);
      expect(shockEvents().at(-1)?.tags).toContain(OUTSIDE_SHOCK_LASTING_PHASE);

      const authorization = addWarStage(
        "authorization-absent",
        "outside-shock:authorization-absent",
        reportId,
      );
      addWarStage(
        "forces-withdrawn",
        "outside-shock:forces-withdrawn",
        authorization,
      );
      world = reconcileOutsidePressureIncident(world);
      expect(internationalCrisisState(world, crisis.id).forcesIn).toBe(false);
      expect(shockEvents().at(-1)?.tags).toContain(OUTSIDE_SHOCK_ENDED_PHASE);
      const news = world.history.events.filter((event) =>
        event.tags.includes(OUTSIDE_SHOCK_ENDED_PHASE),
      );
      expect(news.length).toBeGreaterThan(0);
      console.info(
        `WATCHED RUN P4 — ${placeName} (seed ${seed}): recorded force deployment raised the derived outside-pressure count to one; the shock continued through the War Powers report and recorded authorization decision; recorded withdrawal returned the count to zero and ended it.`,
      );
      console.info(`NEWS/JOURNAL — ${news.at(-1)!.summary}`);
      assertWorldIntegrity(world);
    },
    LONG,
  );
});
