// @vitest-environment node
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import questionPowers from "../../data/research/powers-catalog/question-powers.json";
import { buildBenchWorld } from "../bench/world";
import { billCatalog, provisionFor } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import catalog from "./data/legislature/bill-catalog.json";
import seriesPowers from "./data/legislature/series-powers.json";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";

it("the generated catalog uses the draft authority tables for every existing policy and amount", () => {
  const policies = catalog.subjects.flatMap((s) =>
    s.topics.flatMap((t) => t.policies),
  );
  expect(policies.length).toBeGreaterThan(0);
  for (const policy of policies) {
    if (policy.kind === "policy-question" && "question" in policy) {
      const power =
        questionPowers.questions[
          policy.question as keyof typeof questionPowers.questions
        ];
      expect(policy.levels, policy.id).toEqual(power.levels);
    }
    if (
      policy.kind === "law-amount" &&
      "series" in policy &&
      !policy.series.startsWith("local-power:")
    ) {
      const power =
        seriesPowers.series[policy.series as keyof typeof seriesPowers.series];
      expect(policy.levels, policy.id).toEqual(
        power.levels.flatMap((level) =>
          level === "local" ? ["county", "city"] : [level],
        ),
      );
    }
  }
});

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(replay, "bill-catalog-existing-powers");
it(`the opening game's tax and work-rule laws have their existing federal and state bill controls: ${place.name}, replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      placeKey: place.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    for (const level of ["federal", "state"] as const) {
      const policies = billCatalog(api, level).flatMap((s) =>
        s.topics.flatMap((t) => t.policies),
      );
      const ids = [
        "law:income-tax",
        ...(level === "state"
          ? ["law:sales-tax"]
          : [
              "question:us-policy-positions:health-human-services.medicaid-work-requirement",
              "question:us-policy-positions:health-human-services.work-requirement-for-assistance",
            ]),
      ];
      for (const id of ids) {
        const policy = policies.find((p) => p.id === id);
        expect(policy, `${level}: ${id}`).toBeDefined();
        expect(policy!.authority.allowed, `${level}: ${id}`).toBe(true);
        const operation =
          policy!.kind === "policy-question" ? "repeal" : "lower";
        expect(policy!.operations).toContain(operation);
        const provision = provisionFor({ policyId: id, operation, amount: 0 });
        expect(provision.value).toBe(operation === "repeal" ? -1 : 0);
      }
    }
    console.log(
      JSON.stringify({
        place: place.name,
        placeKey: place.key,
        replay,
        worldSeed: place.seed,
      }),
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
