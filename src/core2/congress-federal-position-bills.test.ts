// @vitest-environment node
/** Congress can enact a federal position from the bill paper, and the outcome web's wired link reads it. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain, lawInForce, webReach } from "./modules/laws";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "congress-federal-position-bills");
const CASES = [
  ["us-federal-positions:trade.raise-tariffs", "tariffs-to-prices"],
  [
    "us-federal-positions:housing.vouchers-for-every-eligible-family",
    "housing-vouchers-to-homelessness",
  ],
  [
    "us-federal-positions:energy-environment.limit-power-plant-carbon",
    "power-plant-carbon-to-emissions",
  ],
] as const;

it(
  `Congress enacts tariffs, universal vouchers and a power plant carbon limit, and the web's link reads each: ${place.name}, replay ${replay}`,
  { timeout: 1_800_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    try {
      const build = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        }).core;
      const lawWorld = build();
      const control = build();
      const api = coreAPI(lawWorld);
      const federal = lawChain(api).levels.find((l) => l.level === "federal")!;
      const menu = billCatalog(api, "federal", "US").flatMap((s) =>
        s.topics.flatMap((t) => t.policies),
      );
      const read: string[] = [];
      for (const [question, linkKey] of CASES) {
        expect(
          menu.some((p) => p.id === `question:${question}`),
          `${question} is on the federal bill paper`,
        ).toBe(true);
        expect(lawInForce(api, question).value, question).toBe(0);
        enactLaw(api, {
          jurisdiction: federal.jurisdiction,
          level: "federal",
          series: question,
          value: 1,
          effectiveDate: lawWorld.date,
          measureId: `federal-position-${linkKey}`,
          citation: "Test: Congress enacts the position",
        });
        expect(lawInForce(api, question).value, question).toBe(1);
        expect(lawInForce(coreAPI(control), question).value, question).toBe(0);
      }
      // Play past the longest lag the cases name; the web then reads each law.
      const lagMonths = Math.max(
        ...CASES.map(
          ([, key]) => WEB_LINKS.find((l) => l.key === key)!.lagMonths ?? 0,
        ),
      );
      const until = addDays(makeIsoDate(lawWorld.date), lagMonths * 31 + 40);
      advanceCore(lawWorld, until);
      advanceCore(control, until);
      const capi = coreAPI(control);
      const town = lawChain(api).townPlaceId;
      for (const [, linkKey] of CASES) {
        const link = WEB_LINKS.find((l) => l.key === linkKey)!;
        const part = webReach(api, town, link.to).parts.find(
          (p) => p.link === linkKey,
        );
        const none = webReach(capi, town, link.to).parts.find(
          (p) => p.link === linkKey,
        );
        read.push(
          `${linkKey}: ${part ? `effect ${part.effect.toFixed(4)}` : "not read"} (control ${none ? none.effect.toFixed(4) : "none"})`,
        );
        expect(part, `${linkKey} is read in the law world`).toBeDefined();
        expect(none?.effect ?? 0, linkKey).not.toBe(part!.effect);
      }
      process.stdout.write(
        `FEDERAL-POSITIONS ${place.name} (${place.key}, seed ${place.seed}): ${read.join("; ")}\n`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
