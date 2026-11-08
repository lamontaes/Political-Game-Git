// @vitest-environment node
/** A player in a consolidated city-county, a Virginia independent city or a Puerto Rico municipio has a local government with real offices. */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { lawChainForPlace } from "./laws-starting";
import {
  bodyRow,
  draftBill,
  holdVote,
  memberKey,
  members,
} from "./modules/legislature";
import { addDays, makeIsoDate } from "./kernel/dates";
import { provisionFor } from "./bill-catalog";
import { coreAPI } from "./state";

/** Places named by their Census keys; the rule that serves them reads data, not these names. */
const CASES: readonly (readonly [string, string])[] = [
  [
    "Schofield Barracks, Hawaii (inside the City and County of Honolulu)",
    "1569050",
  ],
  ["Urban Honolulu, Hawaii (the seat)", "1571550"],
  ["Nashville, Tennessee (the seat of the metropolitan government)", "4752006"],
  ["Alexandria, Virginia (an independent city)", "5101000"],
  ["Hatillo, Puerto Rico (a municipio)", "7233296"],
];

it(
  "every case has local offices in the offices table",
  { timeout: 1_800_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    const seen: string[] = [];
    try {
      for (const [label, key] of CASES) {
        const chain = lawChainForPlace(key);
        const place = drawPlace("consolidated-body", key, (k) => k === key);
        const world = buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: key,
          twoLevel: true,
        });
        const offices = coreAPI(world.core)
          .moduleState("core2-offices-v1" as never)
          .table("offices")
          .rows() as unknown as { level: string; kind: string }[];
        const local = offices.filter(
          (o) => !["federal", "state"].includes(o.level),
        );
        const kinds = [...new Set(local.map((o) => `${o.level}/${o.kind}`))];
        seen.push(
          `${label} [${key}, seed ${place.seed}]: chain ${chain.levels.map((l) => l.level).join(">")}; offices ${kinds.join(", ") || "none"}`,
        );
        expect(kinds.length, label).toBeGreaterThan(0);
        expect(
          kinds.some((k) => /board|council|mayor|legislature/.test(k)),
          `${label} has a governing body`,
        ).toBe(true);
        // A local bill goes through that body by its members' votes.
        const api = coreAPI(world.core);
        const body = (
          api
            .moduleState("core2-offices-v1" as never)
            .table("offices")
            .rows() as unknown as {
            id: string;
            level: string;
            kind: string;
          }[]
        ).find(
          (o) => !["federal", "state"].includes(o.level) && bodyRow(o.kind),
        );
        if (body) {
          const sponsor = members(api, body.id)[0];
          if (sponsor) {
            const bill = draftBill(api, {
              bodyOfficeId: body.id,
              sponsorId: memberKey(sponsor),
              provisions: [
                provisionFor({
                  policyId: "budget:parks",
                  operation: "expand",
                  amount: 100_000,
                  effectiveDate: addDays(makeIsoDate(api.state.date), 1),
                }),
              ],
            });
            const result = holdVote(api, bill.id);
            seen.push(
              `  ${label}: ${body.kind} bill ${bill.id} -> ${result.status}`,
            );
          }
        }
      }
      process.stdout.write(`CONSOLIDATED\n${seen.join("\n")}\n`);
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
