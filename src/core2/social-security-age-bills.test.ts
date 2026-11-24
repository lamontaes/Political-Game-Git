// @vitest-environment node
/** Catalog/reader coverage; writer calls below are not played votes. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { composeBill } from "../english/bill-sections";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import {
  beyondPower,
  draftBill,
  FEDERAL_HOUSE,
  members,
  memberKey,
} from "./modules/legislature";
import { enactLaw, lawInForce, socialSecurityAges } from "./modules/laws";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "social-security-age-bills");
const ages = [
  ["social-security-earliest-claim-age", "earliestMonths"],
  ["social-security-full-retirement-age", "fullMonths"],
  ["social-security-delayed-credit-age", "delayedMaxMonths"],
] as const;

it(`Congress can replace each opening age law: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    const menu = billCatalog(api, "federal").flatMap((s) =>
      s.topics.flatMap((t) => t.policies),
    );
    const records = [];
    for (const [series, field] of ages) {
      const original = lawInForce(api, series).governing!;
      if (original.value === null)
        throw new Error(`No recorded opening age: ${series}`);
      const policyId = `law:${series}`;
      const policy = menu.find((p) => p.id === policyId);
      expect(policy, series).toBeDefined();
      expect(policy!.authority.allowed).toBe(true);
      expect(policy!.operations).toEqual(["raise", "lower"]);
      const before = socialSecurityAges(api, "1965-06-15")[field];
      for (const [operation, value] of [
        ["raise", original.value + 1],
        ["lower", original.value],
      ] as const) {
        const provision = provisionFor({ policyId, operation, amount: value });
        expect(beyondPower(provision, "federal")).toBeNull();
        expect(beyondPower(provision, "state")?.allowed).toBe(false);
        expect(beyondPower(provision, "local")?.allowed).toBe(false);
        expect(provision.unit).toBe("years");
        const bill = draftBill(api, {
          bodyOfficeId: FEDERAL_HOUSE,
          sponsorId: memberKey(members(api, FEDERAL_HOUSE)[0]!),
          provisions: [provision],
        });
        expect(bill.status).toBe("drafted");
        expect(bill.authority.every((read) => read.allowed)).toBe(true);
        const paper = composeBill({
          id: `reader:${series}:${operation}`,
          number: "Reader proof",
          form: { kind: "bill", enactingClause: "Be it enacted" },
          provisions: [provision],
          before: [
            {
              value:
                operation === "raise" ? original.value : original.value + 1,
              unit: "years",
            },
          ],
        });
        expect(JSON.stringify(paper)).toContain(`${value} years`);
        const row = enactLaw(api, {
          jurisdiction: "US",
          level: "federal",
          series,
          value: provision.value,
          unit: provision.unit,
          effectiveDate: api.state.date,
          measureId: `reader:${series}:${operation}`,
          citation: "Catalog/reader regression, not a vote",
          terms: { enactedByBill: `reader:${series}:${operation}` },
        });
        expect(lawInForce(api, series).governing?.id).toBe(row.id);
        expect(socialSecurityAges(api, "1965-06-15")[field]).toBe(value * 12);
        records.push({ series, operation, lawId: row.id });
      }
      expect(socialSecurityAges(api, "1965-06-15")[field]).toBe(before);
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
