// @vitest-environment node
/** A state's governor term limit is a law: raising or repealing it changes who the elections engine lets file, and the law reach names the person. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import {
  recordTermLimitFiling,
  termLimitReached,
} from "./law-reach/group-a-voting";
import { appliedOn } from "./law-reach/applied";
import { executiveTermLimit } from "./executive-term-limits";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { coreAPI } from "./state";

const SERIES = "executive-term-limit";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "governor-term-limit");

it(
  `a governor term limit enacted bars a governor who has served it, and a repeal lets them file: ${place.name}, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const state = lawChain(api).levels.find((l) => l.level === "state")!;
      const officeId = `office:${state.jurisdiction}:governor`;
      const offices = api.moduleState(OFFICES_MODULE_ID);
      const sitting = (
        offices
          .table("terms")
          .query("bySeatStatus", [
            `seat:${state.jurisdiction}:governor`,
            "serving",
          ]) as unknown as TermRow[]
      )[0];
      if (!sitting) {
        process.stdout.write(
          `GOV-LIMIT ${place.name}: no governor seated; nothing to name\n`,
        );
        return;
      }
      // Edge fixture: the sitting governor is a named official; give the
      // term to a resident so the filing check can count it.
      const person = world.playerId!;
      offices.table("terms").put({ ...sitting, personId: person } as never);
      const enact = (value: number, day: number, id: string) => {
        enactLaw(api, {
          jurisdiction: state.jurisdiction,
          level: "state",
          series: SERIES,
          value,
          unit: "terms",
          effectiveDate: addDays(makeIsoDate(api.state.date), day),
          measureId: id,
          citation: "Test: the legislature sets the governor's term limit",
        });
      };
      enact(1, 1, "governor-limit-one");
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 3));
      expect(termLimitReached(api, person, officeId)).toBe(true);
      recordTermLimitFiling(api, person, officeId);
      const named = appliedOn(api, SERIES);
      expect(
        named.some(
          (r) => r.targetId === person && r.what === "kept-off-ballot",
        ),
      ).toBe(true);
      enact(0, 1, "governor-limit-repeal");
      advanceCore(world.core, addDays(makeIsoDate(api.state.date), 3));
      expect(termLimitReached(api, person, officeId)).toBe(false);
      process.stdout.write(
        `GOV-LIMIT ${place.name} (${place.key}, seed ${place.seed}): limit of one term barred the governor, the repeal let them file\n`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);

it(
  `another statewide executive keeps its constitution's term limit: ${place.name}, replay ${replay}`,
  { timeout: 900_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        placeKey: place.key,
        twoLevel: true,
      });
      const api = coreAPI(world.core);
      const state = lawChain(api).levels.find((l) => l.level === "state")!;
      const offices = api.moduleState(OFFICES_MODULE_ID);
      let checked = 0;
      for (const kind of [
        "lieutenant-governor",
        "attorney-general",
        "secretary-of-state",
        "treasurer",
        "auditor",
      ]) {
        const limit = executiveTermLimit(state.jurisdiction, kind);
        const officeId = `office:${state.jurisdiction}:${kind}`;
        if (limit.kind === "none" || !offices.table("offices").get(officeId))
          continue;
        const sitting = (
          offices
            .table("terms")
            .query("bySeatStatus", [
              `seat:${state.jurisdiction}:${kind}`,
              "serving",
            ]) as unknown as TermRow[]
        )[0];
        if (!sitting) continue;
        const person = world.playerId!;
        for (let n = 0; n < limit.terms; n += 1)
          offices.table("terms").put({
            ...sitting,
            id: `${sitting.id}:limit-test:${n}`,
            personId: person,
            startDate: api.state.date,
          } as never);
        expect(termLimitReached(api, person, officeId), kind).toBe(true);
        checked += 1;
      }
      process.stdout.write(
        `EXEC-LIMIT ${place.name} (${place.key}, seed ${place.seed}): ${checked} statewide offices barred at their limit\n`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
