import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { coreAPI } from "./state";
import { gameStartDate } from "./game-start";
import { enactLaw, lawChain } from "./modules/laws";
import {
  draftBill,
  holdVote,
  members,
  memberKey,
  FEDERAL_HOUSE,
} from "./modules/legislature";
import { policyAuthority } from "./policy-authority";
import { POLICY_QUESTIONS } from "./policy-answers";
import catalog from "../../data/research/powers-catalog/catalog.json" with { type: "json" };
import mapping from "../../data/research/powers-catalog/question-powers.json" with { type: "json" };
import type { CoreAPI } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "policy-authority-test");
let api: CoreAPI;
beforeAll(() => {
  api = coreAPI(
    buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    }).core,
  );
}, 600_000);

describe("recorded policy powers", () => {
  it("does not give Congress a question reserved to state law", () => {
    const result = policyAuthority(
      api,
      "us-policy-positions:fiscal.adopt-income-tax",
      "federal",
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("level-lacks-power");
    expect(result.source).toContain("question-powers.json");
  });
  it("keeps every adopted committee and floor section inside the body's powers", () => {
    const sponsorId = memberKey(members(api, FEDERAL_HOUSE)[0]!);
    const bill = draftBill(api, {
      bodyOfficeId: FEDERAL_HOUSE,
      sponsorId,
      provisions: [
        {
          kind: "policy-question",
          question:
            "us-policy-positions:health-human-services.medicaid-work-requirement",
          value: 1,
        },
      ],
    });
    expect(bill.status).toBe("drafted");
    const voted = holdVote(api, bill.id);
    expect(voted.authority).toHaveLength(voted.provisions.length);
    expect(voted.authority.every((row) => row.allowed)).toBe(true);
  });
  it("does not turn a missing mapping into permission", () => {
    expect(
      policyAuthority(api, "fixture:unmapped-power", "state"),
    ).toMatchObject({ allowed: false, warning: "disputed" });
  });
  it("reads a home-rule grant and its same-day repeal from law records", () => {
    const state = lawChain(api).stateKey;
    const rows = mapping.questions as Record<
      string,
      { dial: string; levels: string[]; gate?: unknown }
    >;
    const question = Object.entries(rows).find(
      ([key, row]) =>
        row.levels.includes("city") &&
        !row.gate &&
        !POLICY_QUESTIONS[key]?.answers[state]?.preempts &&
        catalog.dials.some(
          (d) => d.id === row.dial && d.levels.city.may === "UNKNOWN",
        ),
    )?.[0];
    expect(question, `${place.name}; seed ${seed}`).toBeDefined();
    // Use a county even in the federal district only when its catalog column
    // is local: the district's combined powers are already explicit grants.
    const homeRule =
      "us-policy-positions:government-operations.broaden-local-authority";
    const grant = enactLaw(api, {
      jurisdiction: state,
      level: "state",
      series: homeRule,
      value: 1,
      effectiveDate: api.state.date,
      measureId: "authority-fixture-grant",
      citation: "Authority-reader regression fixture",
    });
    const granted = policyAuthority(api, question!, "city");
    if (granted.source === grant.id) {
      expect(granted.allowed).toBe(true);
      const repeal = enactLaw(api, {
        jurisdiction: state,
        level: "state",
        series: homeRule,
        value: 0,
        effectiveDate: api.state.date,
        measureId: "authority-fixture-repeal",
        citation: "Authority-reader regression fixture",
      });
      expect(policyAuthority(api, question!, "city")).toMatchObject({
        allowed: false,
        source: repeal.id,
      });
    } else {
      expect(granted.source).toContain("/dc");
    }
  });
  it("gives a territorial legislature its state cell's power where the catalog has not read its own", async () => {
    // A territory drawn by the seed (the five island areas), in its own world.
    const territories = ["PR", "GU", "VI", "AS", "MP"];
    const usps =
      territories[parseInt(seed.slice(0, 4), 16) % territories.length]!;
    const { searchCorePlaces } = await import("./place-lookup");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: `US-${usps}`,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = places[parseInt(seed.slice(4, 8), 16) % places.length]!.key;
    const world = buildBenchWorld(seed, gameStartDate(), {
      placeKey: key,
      twoLevel: true,
    });
    const territory = coreAPI(world.core);
    const rows = mapping.questions as Record<
      string,
      { dial: string; levels: string[] }
    >;
    const unread = Object.entries(rows).filter(
      ([, row]) =>
        row.levels.includes("state") &&
        catalog.dials.some(
          (d) =>
            d.id === row.dial &&
            (d.levels as Record<string, { may: string }>).territory?.may ===
              "UNKNOWN" &&
            (d.levels as Record<string, { may: string }>).state?.may === "yes",
        ),
    );
    expect(unread.length, `${usps} ${key}; seed ${seed}`).toBeGreaterThan(0);
    for (const [question] of unread.slice(0, 10)) {
      const result = policyAuthority(territory, question, "state");
      expect(result.allowed, question).toBe(true);
      expect(result.source, question).toContain("territory-grant.json");
    }
  }, 600_000);
});
