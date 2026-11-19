/**
 * Day one's law in force is what the century's bodies left (owner, Nov 17, 2026, CTO line
 * 6935086070 on #9747: "That includes Presidents, Congress, governors, legislatures, party
 * control and laws"; History's family 4 plan). Each policy question's law in the town's state and
 * the nation equals the century's last record, its history reads that record's roll call (no
 * generated votes, no moved dates), and worlds differ. Every world is a drawn place (skill
 * drawn-place-tests); each assertion names it and its seed.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import {
  centuryLaw,
  centuryLegislatures,
  setHistoryMode,
} from "./electorate-century";
import { sessionQuestions } from "./electorate-century-laws";
import { campaignParameter } from "./campaign-data";
import { gameStartDate } from "./game-start";
import { LAWS_MODULE_ID } from "./modules/laws";
import { lawHistory } from "./past-module";
import { coreAPI } from "./state";

const RUN = `history-laws:${Date.now()}`;

describe("the century's bodies leave day one's law in force", () => {
  it("loads the century's law on every policy question, with the century's roll call, at three drawn places", () => {
    setBookkeeping(false);
    const passed: string[] = [];
    let worlds = 0;
    for (let i = 0; worlds < 3 && i < 12; i += 1) {
      const place = drawPlace(`${RUN}:${i}`, "history-laws");
      const where = `${place.name} (${place.key}), world seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const counted = [
        ...centuryLegislatures(place.seed, gameStartDate()).values(),
      ].some((seat) => seat.stateKey === place.state);
      if (!counted) {
        passed.push(`${where}: its legislature is not on the two sides`);
        continue;
      }
      worlds += 1;
      const api = coreAPI(world.core);
      const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
      let enacted = 0;
      for (const [placeKey, federal] of [
        [place.state, false],
        ["US", true],
      ] as const)
        for (const question of sessionQuestions(federal)) {
          const law = centuryLaw(place.seed, placeKey, question);
          expect(law, `${where}: ${placeKey} ${question}`).not.toBe(undefined);
          const row = laws.get(
            `law:${placeKey}:${federal ? "federal" : "state"}:${question}:general:starting`,
          ) as unknown as
            { value: number; terms?: { centuryRecordId?: string } } | undefined;
          expect(row, `${where}: ${placeKey} ${question} loaded`).toBeDefined();
          expect(row!.value, `${where}: ${placeKey} ${question}`).toBe(
            law?.value ?? 0,
          );
          expect(row!.terms?.centuryRecordId, `${where}: ${question}`).toBe(
            law?.id,
          );
          if (!law) continue;
          enacted += 1;
          // Its history is the century's session: the year and each chamber's count.
          const history = lawHistory(
            api,
            `law:${placeKey}:${federal ? "federal" : "state"}:${question}:general:starting`,
          );
          if (!history) continue;
          expect(history.enactedOn, `${where}: ${law.id}`).toBe(
            `${law.year}-01-01`,
          );
          expect(
            history.rollCalls.map((c) => [c.yes, c.no]),
            `${where}: ${law.id}`,
          ).toEqual(law.chambers.map((c) => [c.yes, c.no]));
        }
      expect(enacted, `${where}: laws the century enacted`).toBeGreaterThan(0);
    }
    expect(
      worlds,
      `three drawn worlds whose legislature the century elects; passed over: ${passed.join("; ") || "none"}`,
    ).toBe(3);
  }, 300_000);

  it("passes a change only through every chamber and the executive or an override, and worlds differ", () => {
    const override = campaignParameter("vetoOverrideShare");
    const lawsOf = new Map<string, string>();
    const named: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const place = drawPlace(`${RUN}:worlds:${i}`, "history-laws");
      named.push(`${place.name} (${place.key}), world seed ${place.seed}`);
      setHistoryMode(place.seed, "century", gameStartDate(), place.state);
      const seats = centuryLegislatures(place.seed, gameStartDate());
      const states = [...new Set([...seats.values()].map((s) => s.stateKey))];
      const inForce: string[] = [];
      for (const stateKey of [...states, "US"])
        for (const question of sessionQuestions(stateKey === "US")) {
          const law = centuryLaw(place.seed, stateKey, question);
          if (!law) continue;
          for (const chamber of law.chambers) {
            // Every chamber passed the change, by a majority of its members.
            expect(
              chamber.yes * 2,
              `${named.at(-1)}: ${law.id}`,
            ).toBeGreaterThan(chamber.yes + chamber.no);
            if (law.overridden)
              expect(
                chamber.yes,
                `${named.at(-1)}: ${law.id}`,
              ).toBeGreaterThanOrEqual(
                Math.ceil(override * (chamber.yes + chamber.no)),
              );
          }
          if (law.value) inForce.push(`${stateKey}|${question}`);
        }
      lawsOf.set(named.at(-1)!, inForce.sort().join(","));
    }
    expect(
      new Set(lawsOf.values()).size,
      `the law in force across ${named.join("; ")}`,
    ).toBeGreaterThan(1);
  }, 240_000);
});
