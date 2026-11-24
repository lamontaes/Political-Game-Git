// @vitest-environment node
/** Generated-world authority-reader regression; direct writer calls are not votes. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { enactLaw, lawChain, LOCAL_POWER_PREFIX } from "./modules/laws";
import { placeRow } from "./place-map";
import { policyAuthority } from "./policy-authority";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "specific-local-grants");
const question = "us-policy-positions:housing-land-use.rent-stabilization";
const homeRule =
  "us-policy-positions:government-operations.broaden-local-authority";

it(`a specific grant survives general home rule being off: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const date = gameStartDate();
    const world = buildBenchWorld(place.seed, date, {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const state = lawChain(api).stateKey;
    const write = (series: string, value: number, bill: string) =>
      enactLaw(api, {
        jurisdiction: state,
        level: "state",
        series,
        value,
        effectiveDate: date,
        measureId: bill,
        citation: "Reader regression: specific local grant",
        terms: { enactedByBill: bill },
      });
    write(homeRule, 0, "reader-general-home-rule-off");
    const records: string[] = [];
    for (const [value, bill] of [
      [1, "grant"],
      [0, "bar"],
      [1, "restore"],
    ] as const) {
      const law = write(
        `${LOCAL_POWER_PREFIX}${question}`,
        value,
        `reader-specific-${bill}`,
      );
      records.push(law.id);
      const authority = policyAuthority(api, question, "city");
      if (placeRow(state)?.form === "district") {
        // The district's city and state are aliases for one government.
        expect(authority).toEqual(policyAuthority(api, question, "state"));
        expect(authority.allowed).toBe(true);
      } else {
        expect(authority.allowed).toBe(value === 1);
        expect(authority.source).toBe(law.id);
      }
    }
    // A specific grant does not silently erase an independent wage statute.
    const wage = "us-policy-positions:labor-workforce.city-minimum-wage";
    const wageGate =
      "us-policy-positions:labor-workforce.local-minimum-wage-authority";
    write(`${LOCAL_POWER_PREFIX}${wage}`, 1, "reader-specific-wage-grant");
    const gate = write(wageGate, 0, "reader-wage-statutory-bar");
    if (placeRow(state)?.form !== "district") {
      expect(policyAuthority(api, wage, "city")).toMatchObject({
        allowed: false,
        reason: "state-preempts-question",
        source: gate.id,
      });
    }
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
        records,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
