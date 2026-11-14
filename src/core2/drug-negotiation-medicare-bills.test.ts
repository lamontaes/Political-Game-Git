// @vitest-environment node
/** Medicare's negotiated drug prices cut what its members' medical bills ask while the federal law is in force, read from the law itself. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { billCatalog } from "./bill-catalog";
import { advanceCore } from "./life";
import type { MedicalBillRow } from "./medical-bills";
import { COVERAGE_MODULE_ID } from "./modules/coverage";
import { enactLaw, lawInForce } from "./modules/laws";
import { WEB_LINKS } from "./outcome-web-model";
import { appliedOn } from "./law-reach/applied";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const QUESTION = "us-federal-positions:health.medicare-drug-price-negotiation";
const size = WEB_LINKS.find(
  (l) => l.key === "drug-negotiation-to-out-of-pocket",
)!.size!;
const TRIES = 6;

const billsOf = (core: ReturnType<typeof buildBenchWorld>["core"]) =>
  coreAPI(core)
    .moduleState(COVERAGE_MODULE_ID)
    .table("medicalBills")
    .rows() as unknown as MedicalBillRow[];

it(
  `a Medicare member's bill is cut by the researched share while the negotiation law is in force (replay ${replay})`,
  { timeout: 1_800_000 },
  () => {
    const bookkeeping = setBookkeeping(false);
    const passed: string[] = [];
    try {
      for (let attempt = 0; attempt < TRIES; attempt += 1) {
        const drawn = drawPlace(replay, `drug-negotiation:${attempt}`);
        const where = `${drawn.name} (${drawn.key}, seed ${drawn.seed})`;
        const build = () =>
          buildBenchWorld(drawn.seed, gameStartDate(), {
            placeKey: drawn.key,
            twoLevel: true,
          }).core;
        const lawWorld = build();
        const twin = build();
        const api = coreAPI(lawWorld);
        expect(lawInForce(api, QUESTION).value, where).toBe(1);
        // Congress can repeal it from the bill paper.
        expect(
          billCatalog(api, "federal", "US")
            .flatMap((s) => s.topics.flatMap((t) => t.policies))
            .some((p) => p.id === `question:${QUESTION}`),
          where,
        ).toBe(true);
        const federal = lawInForce(api, QUESTION).levels.find(
          (l) => l.level === "federal",
        )!;
        enactLaw(coreAPI(twin), {
          jurisdiction: federal.jurisdiction,
          level: "federal",
          series: QUESTION,
          value: 0,
          effectiveDate: twin.date,
          measureId: `drug-negotiation-twin-${attempt}`,
          citation: "Test: the program repealed in the twin world",
        });
        expect(lawInForce(coreAPI(twin), QUESTION).value, where).toBe(0);
        const until = addDays(makeIsoDate(lawWorld.date), 70);
        advanceCore(lawWorld, until);
        advanceCore(twin, until);
        const twinBills = new Map(billsOf(twin).map((r) => [r.id, r]));
        let compared = 0,
          example = "";
        for (const row of billsOf(lawWorld)) {
          const other = twinBills.get(row.id);
          if (!other) continue;
          for (const m of row.members) {
            if (m.plan !== "medicare") continue;
            const o = other.members.find((x) => x.personId === m.personId);
            if (!o || o.plan !== "medicare" || o.billMinor < 1000) continue;
            expect(
              m.billMinor / o.billMinor,
              `${where} ${m.personId}`,
            ).toBeCloseTo(1 + size, 2);
            compared += 1;
            example ||= `${m.personId} (${row.id}): ${m.billMinor} against ${o.billMinor} in the twin`;
          }
        }
        if (!compared) {
          passed.push(`${where}: no Medicare member billed in both`);
          continue;
        }
        // The law reached those members: a law-reach row names each Medicare
        // member and what their bill fell by.
        const reached = appliedOn(api, QUESTION);
        expect(
          reached.length,
          `${where}: Medicare members reached`,
        ).toBeGreaterThan(0);
        // Full members by person, counted members as counted targets that
        // stand for their household's weight (one model, two tiers).
        expect(
          reached.every(
            (r) =>
              (r.target === "person" && api.state.people.has(r.targetId)) ||
              (r.target === "group" && r.count >= 1),
          ),
        ).toBe(true);
        process.stdout.write(
          `DRUGS ${where}: ${compared} Medicare members billed ${(-100 * size).toFixed(0)}% less with the law; ${example}. Passed over: ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      throw new Error(
        `No place showed a Medicare member: ${passed.join("; ")}`,
      );
    } finally {
      setBookkeeping(bookkeeping);
    }
  },
);
