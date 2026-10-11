import { describe, it, expect } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { addDays, daysBetween } from "../../simulation/dates";
import {
  shapedLinkFactor,
  OUTCOME_LINKS,
  OUTCOME_MEASURES,
  OUTCOMES_PRODUCED,
  outcomeMeasure,
  outcomeLinkStatus,
  outcomeLinksFedByQuestion,
  LAW_QUESTION_MEASURES,
  drawnLinkSize,
  outcomeRangeViolations,
  acuteWeight as oldAcute,
} from "../../simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomeValue,
  localWeights,
  areaResidents,
  localResidents,
} from "../../simulation/outcome-web/place-outcome-store";
import { countyPopulationSharesForPlace } from "../../simulation/government-units";
import { stateJurisdictionForKey } from "../../simulation/life-places";
import { electricityGenerationMixOutcomeBases } from "../../simulation/outcome-web/electricity-generation-mix";
import generationData from "../../../data/research/outcome-web/electricity-generation-mix-2024.json" with { type: "json" };
import web from "../../../data/research/outcome-web/links.json" with { type: "json" };
import { US_POLICY_POSITIONS_PACK } from "../../simulation/policy-pack-us-policy-positions";
import { US_FEDERAL_POSITIONS_PACK } from "../../simulation/policy-pack-us-federal-positions";
import * as selection from "./outcome-readers";
import type { outcomeFactorFromFacts } from "./outcome-factor";
import {
  localWeightsFromFacts,
  placeOutcomeValue as valueFromFacts,
} from "./place-values";
import {
  electricityGenerationMixOutcomeBasesFromFacts,
  type GenerationDataset,
} from "./generation-bases";
import {
  programLastDayFromFacts,
  programHasEndedFromFacts,
  programTermChangeFromFacts,
  firstDate,
  type ProgramTarget,
  type ProgramTermChange,
} from "./sunset";
import { legacyDeclarations, resultOf } from "./legacy-source.test-support";
import type { World } from "../../simulation/types";

const questionKeys = new Set(
  [US_POLICY_POSITIONS_PACK, US_FEDERAL_POSITIONS_PACK].flatMap((pack) =>
    (pack.propositions ?? []).map((row) => `${pack.pack}:${row.key}`),
  ),
);
const catalog: selection.OutcomeCatalogFacts = {
  links: OUTCOME_LINKS,
  registeredMeasures: new Set(Object.keys(OUTCOME_MEASURES)),
  produced: OUTCOMES_PRODUCED,
  questionKeys,
  changeMeasures: new Set([
    "budget.parks-added-pct",
    "labor.minimum-wage-change-pct",
    "federal.defense-boost-pct",
    "federal.rail-expansion-pct",
    "federal.farm-payments-cut-pct-of-land-value",
    "federal.deficit-change-pct-of-gdp",
  ]),
  placeBases: PLACE_OUTCOME_BASES,
  baselines: web.baselines,
  calibratedAt: web.calibratedAt,
  targets: web.targets,
};
const oldTerm = legacyDeclarations<{
  programTermChangeOf: (
    world: unknown,
    id: string,
  ) => ReturnType<typeof programTermChangeFromFacts>;
  programLastDay: (
    world: unknown,
    target: ProgramTarget,
  ) => ProgramTermChange | null;
  programHasEnded: (world: unknown, target: ProgramTarget | null) => boolean;
  firstDate: typeof firstDate;
}>(
  "enacted-program-terms.ts",
  [
    "PROGRAM_SUNSET_FAMILY",
    "DATED_SECTION",
    "MONTHS",
    "firstDate",
    "KIND",
    "sameTarget",
    "programTermChangeOf",
    "programLastDay",
    "programHasEnded",
  ],
  {
    addDays,
    currentMeasureProvisions: (
      world: { sections: Record<string, unknown[]> },
      id: string,
    ) => world.sections[id] ?? [],
  },
);

describe("complete outcome selection at every place and all government levels", () => {
  it.each(Object.keys(STATES))(
    "compares catalog, composition, lags, sunset and local weights in US-%s",
    (usps) => {
      const placeKey = `US-${usps}`;
      for (const link of OUTCOME_LINKS) {
        expect(selection.outcomeLinkStatusFromFacts(catalog, link)).toBe(
          outcomeLinkStatus(link),
        );
        expect(selection.linkSizeFromFacts(link, placeKey)).toBe(
          drawnLinkSize(
            {} as World,
            link,
            stateJurisdictionForKey(placeKey)!.id,
          ),
        );
      }
      for (const question of questionKeys)
        expect(
          selection.outcomeLinksFedByQuestionFromFacts(
            OUTCOME_LINKS,
            LAW_QUESTION_MEASURES,
            question,
          ),
        ).toEqual(outcomeLinksFedByQuestion(question));
      for (const key of [
        ...Object.keys(OUTCOME_MEASURES),
        ...questionKeys,
      ].flatMap((key) => [
        key,
        `law:${key}`,
        `${key}:moved-by-causes`,
        `${key}:pct-moved-by-causes`,
        `${key}:pct-of-start`,
      ]))
        expect(selection.outcomeMeasureAvailable(catalog, key)).toBe(
          outcomeMeasure(key) !== null,
        );
      for (const halfLife of [0, 1, 90])
        for (const happened of ["2026-01-01", "2026-03-01", "2027-01-01"])
          expect(
            selection.acuteWeight(halfLife, happened, "2026-03-01"),
          ).toEqual(
            oldAcute(
              halfLife,
              happened as Parameters<typeof oldAcute>[1],
              "2026-03-01" as Parameters<typeof oldAcute>[2],
            ),
          );
      const localKeys = ["1234567", "2345678", "county:12345", "unknown"];
      const population = {
        areaResidents: (key: string) => (key === placeKey ? 100 : null),
        localResidents: (key: string) =>
          ({ "1234567": 60, "2345678": 80, "county:12345": 160 })[key] ?? null,
        countyPopulationSharesForPlace: (key: string) =>
          key === "1234567"
            ? [["12345", 1] as const]
            : [["12345", null] as const],
      };
      const oldWeights = legacyDeclarations<{
        localWeights: typeof localWeights;
      }>(
        "outcome-web/place-outcome-store.ts",
        ["localWeights"],
        population,
      ).localWeights;
      expect(localWeightsFromFacts(population, placeKey, localKeys)).toEqual(
        oldWeights(placeKey, localKeys),
      );
      expect(
        localWeightsFromFacts(
          { areaResidents, localResidents, countyPopulationSharesForPlace },
          placeKey,
          [],
        ),
      ).toEqual(localWeights(placeKey, []));
      for (const level of ["local", "state", "federal"]) {
        const jurisdictionId = `${level}:${placeKey}`;
        const readers: selection.OutcomeReaders = {
          placeKey: () => placeKey,
          readRegistered: (key, _id, at) =>
            key.includes("median")
              ? 22000 + (at < "2026-03-01" ? 0 : 1000)
              : key.includes("unemployment")
                ? 5
                : null,
          placeRecord: () => ({
            base: 10,
            structural: 12,
            value: 15,
            multiplier: 1.2,
          }),
          lawAnswer: (key, _id, at) =>
            key.includes("missing")
              ? undefined
              : at < "2026-02-01"
                ? "yes"
                : "no",
          startingLawAnswer: () => "no",
        };
        // Legacy composer reads the same independently selected facts. The real classifier and shapes remain the oracle.
        const propositions = Object.fromEntries(
          [...questionKeys].map((key) => [key, { id: key, stableKey: key }]),
        );
        const oracleWorld = { policyCatalog: { propositions } };
        const registered = Object.fromEntries(
          [...catalog.registeredMeasures].map((key) => [
            key,
            {
              read: (_world: unknown, id: string, at: string) =>
                readers.readRegistered(key, id, at),
            },
          ]),
        );
        const oldComposer = legacyDeclarations<{
          outcomeFactor: (
            world: unknown,
            id: string,
            outcome: string,
            at: string,
          ) => ReturnType<typeof outcomeFactorFromFacts>;
          outcomeMeasure: (key: string) => {
            read: (world: unknown, id: string, at: string) => number | null;
          } | null;
          baselineOf: (
            world: unknown,
            id: string,
            key: string,
          ) => number | undefined;
        }>(
          "outcome-web/index.ts",
          [
            "placeOutcomeOfPctOfStart",
            "placeOutcomeMovedByCauses",
            "placeOutcomePctMovedByCauses",
            "outcomeMeasure",
            "baselineOf",
            "outcomeLinkStatus",
            "drawnLinkSize",
            "lagged",
            "outcomeFactor",
          ],
          {
            addDays,
            OUTCOME_LINKS,
            OUTCOME_MEASURES: registered,
            OUTCOMES_PRODUCED,
            PLACE_OUTCOME_BASES,
            LAW_QUESTION_KEYS: questionKeys,
            LAW_CAUSE_PREFIX: "law:",
            PCT_OF_START_SUFFIX: ":pct-of-start",
            MOVED_BY_CAUSES_SUFFIX: ":moved-by-causes",
            PCT_MOVED_BY_CAUSES_SUFFIX: ":pct-moved-by-causes",
            CHANGE_MEASURES: catalog.changeMeasures,
            BASELINES: web.baselines,
            OUTCOME_WEB_CALIBRATED_AT: web.calibratedAt,
            placeOutcomeKey: () => placeKey,
            placeOutcomeAt: (
              _world: unknown,
              key: string,
              id: string,
              at: string,
            ) => readers.placeRecord(key, id, at),
            lawInForce: (
              _world: unknown,
              id: string,
              key: string,
              at: string,
            ) => {
              const answer = readers.lawAnswer(key, id, at);
              return answer == null ? null : { answer };
            },
            lawInForceAtStart: (
              _world: unknown,
              id: string,
              key: string,
              at: string,
            ) => readers.startingLawAnswer(key, id, at),
            shapedLinkFactor,
          },
        );
        for (const key of [
          ...catalog.registeredMeasures,
          ...questionKeys,
        ].flatMap((key) => [
          key,
          `law:${key}`,
          `${key}:moved-by-causes`,
          `${key}:pct-moved-by-causes`,
          `${key}:pct-of-start`,
        ])) {
          expect(
            selection.readOutcomeMeasure(
              catalog,
              readers,
              key,
              jurisdictionId,
              "2026-03-01",
            ),
          ).toEqual(
            oldComposer
              .outcomeMeasure(key)
              ?.read(oracleWorld, jurisdictionId, "2026-03-01") ?? null,
          );
          expect(
            selection.baselineFromReaders(
              catalog,
              readers,
              jurisdictionId,
              key,
            ),
          ).toEqual(oldComposer.baselineOf(oracleWorld, jurisdictionId, key));
        }
        for (const outcome of OUTCOMES_PRODUCED) {
          const actual = selection.outcomeFactorFromReaders(
            catalog,
            readers,
            jurisdictionId,
            outcome,
            "2026-03-01",
          );
          const legacy = oldComposer.outcomeFactor(
            oracleWorld,
            jurisdictionId,
            outcome,
            "2026-03-01",
          );
          expect(actual).toEqual(legacy);
          expect(
            selection.outcomeRangeViolationsFromFacts(catalog, actual),
          ).toEqual(
            outcomeRangeViolations(
              legacy as Parameters<typeof outcomeRangeViolations>[0],
            ),
          );
        }
        for (const scale of ["level", "rate", "share", "index"] as const) {
          const def = { name: "x", unit: "x", source: "x", places: {}, scale };
          expect(valueFromFacts(def, 10, 1.4, [1.1, 1.2])).toBe(
            placeOutcomeValue(def, 10, 1.4, [1.1, 1.2]),
          );
        }
        const target: ProgramTarget = {
          authorityKey: "program",
          jurisdictionId,
        };
        const changes: (ProgramTermChange & { target: ProgramTarget })[] = [];
        const history = {
          legislativeDraftLineages: [] as unknown[],
          legislativeMeasures: [] as unknown[],
          legislativeEnactments: [] as unknown[],
        };
        const sections: Record<string, unknown[]> = {};
        const variants = [
          "terminate-on-date",
          "extend-authority",
          "repeal-outright",
          "extend-authority",
        ];
        variants.forEach((variant, index) => {
          const id = `law-${index}`;
          const key =
            variant === "terminate-on-date"
              ? "sunset-date"
              : variant === "extend-authority"
                ? "extension-date"
                : "effective-date";
          const date =
            index === 3
              ? "January 1, 2032"
              : index === 2
                ? "January 1, 2029"
                : "February 28, 2030";
          const section = {
            id: `section-${index}`,
            provisionKey: key,
            text: `ends on ${date}`,
          };
          sections[id] = [section];
          const lineage = {
            measureId: id,
            familyKey: "program-sunset",
            variantKey: variant,
            authorityKey: "program",
          };
          const enactment = {
            id: `enactment-${index}`,
            measureId: id,
            outcome: "enacted",
            resolvedAt: `2026-01-0${index + 1}`,
            sequence: index,
          };
          history.legislativeDraftLineages.push(lineage);
          history.legislativeMeasures.push({ id, jurisdictionId });
          history.legislativeEnactments.push(enactment);
          const facts = {
            enactment,
            lineage,
            jurisdictionId,
            sections: [section],
          };
          const lifted = programTermChangeFromFacts(id, facts);
          expect(lifted).toEqual(
            oldTerm.programTermChangeOf({ history, sections }, id),
          );
          if (lifted) changes.push(lifted);
        });
        const world = { history, sections, currentDate: "2029-01-01" };
        expect(programLastDayFromFacts(changes, target)).toEqual(
          oldTerm.programLastDay(world, target),
        );
        expect(
          programHasEndedFromFacts(world.currentDate, target, changes),
        ).toBe(oldTerm.programHasEnded(world, target));
        expect(programHasEndedFromFacts(world.currentDate, null, changes)).toBe(
          false,
        );
      }
    },
  );
  it("retains malformed textual-date errors and all source energy rows", () => {
    for (const text of [
      "no date",
      "February 30, 2028",
      "january 1, 2028",
      "January 1, 2028 then February 2, 2029",
    ])
      expect(resultOf(() => firstDate(text))).toEqual(
        resultOf(() => oldTerm.firstDate(text)),
      );
    expect(
      electricityGenerationMixOutcomeBasesFromFacts(
        generationData as GenerationDataset,
      ),
    ).toEqual(electricityGenerationMixOutcomeBases());
    expect(
      daysBetween(
        "2028-02-28" as Parameters<typeof daysBetween>[0],
        "2028-03-01" as Parameters<typeof daysBetween>[1],
      ),
    ).toBe(2);
  });
});
