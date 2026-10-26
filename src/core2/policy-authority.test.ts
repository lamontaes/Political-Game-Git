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
  it("refuses a town council's bill outside its powers for the recorded reason, and the state's chamber drafts the same bill", () => {
    // A place with a town body to draft in: a council, a township board, or
    // the county board where the place is unincorporated. Some places (a
    // territory with no municipal body on record) have none, so the draw
    // goes on to the next.
    let found:
      | {
          api: CoreAPI;
          where: string;
          council: { id: string; kind: string };
          chamber: { id: string };
        }
      | undefined;
    for (let i = 0; i < 10 && !found; i += 1) {
      const where = drawPlace(`${seed}:${i}`, "policy-authority-refusal");
      const tried = coreAPI(
        buildBenchWorld(where.seed, gameStartDate(), {
          placeKey: where.key,
          twoLevel: true,
        }).core,
      );
      const offices = tried
        .moduleState("core2-offices-v1")
        .table("offices")
        .rows() as unknown as { id: string; kind: string }[];
      const council = ["council", "township-board", "county-board"]
        .map((kind) => offices.find((o) => o.kind === kind))
        .find((o) => o !== undefined);
      const chamber = offices.find((o) => o.kind === "legislature-lower");
      if (council && chamber)
        found = { api: tried, where: where.name, council, chamber };
    }
    expect(found, "a place with a town body and a state chamber").toBeTruthy();
    const { api: world, where, council, chamber } = found!;
    const level = council.kind === "county-board" ? "county" : "city";
    // A question the town lacks the power for and the state holds.
    const question = Object.keys(POLICY_QUESTIONS).find((q) => {
      const city = policyAuthority(world, q, level);
      return (
        !city.allowed &&
        city.reason === "level-lacks-power" &&
        policyAuthority(world, q, "state").allowed
      );
    });
    expect(
      question,
      `${where}: a power the town lacks and the state holds`,
    ).toBeTruthy();
    const draft = (bodyOfficeId: string) =>
      draftBill(world, {
        bodyOfficeId,
        sponsorId: memberKey(members(world, bodyOfficeId)[0]!),
        provisions: [
          { kind: "policy-question", question: question!, value: 1 },
        ],
      });
    const refused = draft(council.id);
    expect(refused.status, refused.id).toBe("blocked");
    expect(refused.authority[0]).toMatchObject({
      allowed: false,
      reason: "level-lacks-power",
    });
    expect(refused.authority[0]!.source).toContain("question-powers.json");
    const accepted = draft(chamber.id);
    expect(accepted.status, accepted.id).toBe("drafted");
  }, 600_000);
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
