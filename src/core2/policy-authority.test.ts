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
    const offices = api
      .moduleState("core2-offices-v1")
      .table("offices")
      .rows() as unknown as { id: string; kind: string }[];
    const council = offices.find((o) =>
      ["council", "township-board"].includes(o.kind),
    );
    const chamber = offices.find((o) => o.kind === "legislature-lower");
    expect(council, `${place.name}: a town body`).toBeTruthy();
    expect(chamber, `${place.name}: a state chamber`).toBeTruthy();
    // A question the town lacks the power for and the state holds.
    const question = Object.keys(POLICY_QUESTIONS).find((q) => {
      const city = policyAuthority(api, q, "city");
      return (
        !city.allowed &&
        city.reason === "level-lacks-power" &&
        policyAuthority(api, q, "state").allowed
      );
    });
    expect(question, "a power the town lacks and the state holds").toBeTruthy();
    const draft = (bodyOfficeId: string) =>
      draftBill(api, {
        bodyOfficeId,
        sponsorId: memberKey(members(api, bodyOfficeId)[0]!),
        provisions: [
          { kind: "policy-question", question: question!, value: 1 },
        ],
      });
    const refused = draft(council!.id);
    expect(refused.status, refused.id).toBe("blocked");
    expect(refused.authority[0]).toMatchObject({
      allowed: false,
      reason: "level-lacks-power",
    });
    expect(refused.authority[0]!.source).toContain("question-powers.json");
    const accepted = draft(chamber!.id);
    expect(accepted.status, accepted.id).toBe("drafted");
  });
});
