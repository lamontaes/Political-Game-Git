// @vitest-environment node
/** A law having states share disaster costs lowers the federal public assistance a declaration pays the town's governments. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { disasterAssistancePaid, townDisasters } from "./modules/disasters";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const QUESTION = "us-federal-positions:emergencies.states-share-disaster-costs";
const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 60;

it(
  `states sharing disaster costs cuts the federal assistance a declaration pays (replay ${replay})`,
  { timeout: 3_000_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      for (let draw = 0; draw < DRAWS; draw += 1) {
        const place = drawPlace(`${replay}:${draw}`, "disaster-cost-share");
        // A cheap opening screens for a disaster beginning in the first year.
        const screen = createLifeCore(
          generatedOpening(place, {
            twoLevel: true,
            settings: { population: 1500 },
          }),
        );
        const opened = screen.date;
        const end = addDays(makeIsoDate(opened), 365);
        const due = townDisasters(coreAPI(screen)).filter(
          (d) => d.begins > opened && d.begins <= end,
        );
        if (!due.length) continue;
        const build = () =>
          buildBenchWorld(place.seed, gameStartDate(), {
            placeKey: place.key,
            twoLevel: true,
          }).core;
        const lawWorld = build();
        const control = build();
        const api = coreAPI(lawWorld);
        const federal = lawChain(api).levels.find(
          (l) => l.level === "federal",
        )!;
        enactLaw(api, {
          jurisdiction: federal.jurisdiction,
          level: "federal",
          series: QUESTION,
          value: 1,
          effectiveDate: lawWorld.date,
          measureId: "disaster-cost-share-test",
          citation: "Test: states share disaster costs",
        });
        advanceCore(lawWorld, end);
        advanceCore(control, end);
        const sum = (core: typeof control) =>
          disasterAssistancePaid(coreAPI(core)).reduce(
            (n, r) => n + r.cents,
            0,
          );
        const withLaw = sum(lawWorld),
          without = sum(control);
        if (!without) continue;
        process.stdout.write(
          `DISASTER-SHARE ${place.name}, ${place.state} (${place.key}, seed ${place.seed}): federal public assistance ${without} cents without the law, ${withLaw} with it (${((100 * withLaw) / without).toFixed(1)}%), disaster ${due[0]!.number}\n`,
        );
        expect(withLaw / without).toBeCloseTo(0.5 / 0.75, 2);
        return;
      }
      throw new Error(
        `No drawn place paid public assistance in ${DRAWS} draws`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
