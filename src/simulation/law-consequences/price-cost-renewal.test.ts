/// <reference types="node" />
import { writeFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import { makeIsoDate, simulationMomentOnLocalDate } from "../dates";
import * as effects from "../enacted-law-effects";
import {
  hudRentRowFor,
  renewTownLeases,
  startTownLeases,
  townLeases,
} from "../living-world/town-rent";
import { deserializeWorld, serializeWorld } from "../serialization";
import { personName } from "../people";
import { withWorldIntegrityDeferred } from "../world";
import { PLACE_POPULATION_ROWS } from "../nationwide-world/place-population.generated";
import { lifePlaceByKey } from "../life-places";
import { SeededRng } from "../rng";
import { cancelFutureDueItem } from "../future-transitions";
import * as housing from "../living-world/housing-market";
import { resourceFlowTermsAt } from "../resource-queries";
import type { LawConsequenceRow } from "../law-consequence-types";
import type startingLaw from "../../../data/research/laws/starting-law-2026.json";
import {
  availableMeasureSteps,
  introduceMeasure,
  measurePosition,
  recordEnactment,
} from "../legislation";
import { recordFiledProvision } from "../legislative-politics";
import {
  legislativeProcedureForJurisdiction,
  legislativeRulePackForWorld,
} from "../legislative-procedure-world";
import { defaultOriginChamber } from "../legislature-rules";
import { seatedChamberForPack } from "../governing/chamber-votes";
import type { LegislativeProcedureContext } from "../legislation-scenarios";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { ensureStateExecutiveIncumbent } from "../nationwide-world/state-executives";
import {
  decideGoverningMatter,
  governorOfficeForJurisdiction,
  governingMatters,
  governorDesk,
} from "../governing/state-governing";
import { BILL_SIGN } from "../governing/governor-bill-decision";
import { legislativeBlueprintForMeasure } from "../governing/legislative-clock";
import { stateJurisdictionForKey } from "../life-places";
import { recordWorldEvent } from "../world";
import { playerRequiredWorkIds, releasePlayerRequiredWork } from "../time-work";
import type { World } from "../types";
import { resolvePriceCostConsequences } from "./price-cost";

const controlled = vi.hoisted(
  () =>
    ({
      question: "us-policy-positions:housing-land-use.rent-stabilization",
    }) as const,
);

/** Fictional votes/3% term, with actual saved members and a real governor desk.
 * This operates on the existing lease world; it never constructs a scenario world.
 */
function enactCapOnLeaseWorld(start: World, placeKey: string) {
  const stateKey = lifePlaceByKey(placeKey)!.stateJurisdictionKey!;
  const state = stateJurisdictionForKey(stateKey)!;
  const procedure = legislativeProcedureForJurisdiction(start, state.id);
  expect(
    procedure,
    "Existing lease world must have its recorded legislature",
  ).not.toBeNull();
  const pack = legislativeRulePackForWorld(
    start,
    procedure!.baselinePack.packId,
  );
  const bodies = pack.chambers.map((chamber) => {
    const seated = seatedChamberForPack(
      start,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    );
    expect(
      seated,
      "Use actual saved legislators, never substitute people",
    ).not.toBeNull();
    expect(seated!.body.members.length).toBeGreaterThan(0);
    return seated!.body;
  });
  const origin = defaultOriginChamber(pack);
  const sponsor = bodies.find((body) => body.chamberKey === origin.chamberKey)!
    .members[0]!.personId!;
  const proposition = Object.values(start.policyCatalog.propositions).find(
    (p) => p.stableKey === controlled.question,
  )!;
  let next = introduceMeasure(start, {
    stableKey: "fixture:a57-enacted-cap",
    jurisdictionId: state.id,
    rulePackId: pack.packId,
    designation: "Controlled A57 rent-cap bill",
    shortTitle: "Controlled three-percent renewal limit",
    summary: "Authored numeric contract proof, not a researched state rate.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: sponsor,
    originChamberKey: origin.chamberKey,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer: "yes" }],
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  next = recordFiledProvision(next, {
    stableKey: "fixture:a57-enacted-cap:term",
    measureId,
    provisionKey: "controlled-rent-cap",
    sectionNumber: 1,
    heading: "Controlled renewal cap",
    text: "The controlled covered renewal increase is limited to three percent.",
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Controlled fixture leases",
    },
    applicationScope: { jurisdictionId: state.id, segmentKey: null },
    lawTerms: [
      {
        questionKey: controlled.question,
        key: "cap",
        unit: "ratio",
        value: 0.03,
      },
    ],
  });
  const votePlan: Record<string, { yea: number }> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find(
      (entry) => entry.chamberKey === chamber.chamberKey,
    )!;
    for (const committee of chamber.committees)
      votePlan[`committee:${committee.committeeKey}`] = {
        yea: Math.min(committee.appointedMembers, body.members.length),
      };
    for (const stage of chamber.floorStages)
      votePlan[`floor:${chamber.chamberKey}:${stage.stageKey}`] = {
        yea: body.members.length,
      };
  }
  const context: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: null,
    governorRationale: "No authored executive outcome.",
  };
  next = ensureStateExecutiveIncumbent(next, sponsor, stateKey.slice(3));
  for (let guard = 0; guard < 40; guard += 1) {
    const phase = measurePosition(next, measureId).phase;
    if (phase === "awaiting-enactment") {
      next = recordEnactment(next, {
        stableKey: "fixture:a57-enacted-cap:law",
        measureId,
        effectiveAt: next.currentDate,
      });
      return { world: next, measureId };
    }
    if (phase === "awaiting-executive") {
      const office = governorOfficeForJurisdiction(next, stateKey)!;
      expect(office).not.toBeNull();
      const previous =
        next.control.kind === "person" ? next.control.personId : null;
      const handoff = recordWorldEvent(next, {
        stableKey: `fixture:a57-governor-control:${measureId}`,
        type: "test.control-moved",
        occurredAt: next.currentDate,
        recordedAt: next.currentDate,
        jurisdictionId: null,
        involvedEntityIds: [
          office.holderPersonId,
          ...(previous
            ? [previous, ...playerRequiredWorkIds(next, previous)]
            : []),
        ],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: [],
        summary:
          "Controlled fixture hands the actual bill to its saved governor.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      next = previous
        ? releasePlayerRequiredWork(handoff, {
            personId: previous,
            stableKeyPrefix: `fixture:a57-governor-control:${measureId}:released`,
            outcomeEventId: handoff.history.events.at(-1)!.id,
          })
        : handoff;
      next = {
        ...next,
        control: { kind: "person", personId: office.holderPersonId },
      };
      const measure = next.history.legislativeMeasures!.find(
        (record) => record.id === measureId,
      )!;
      next = governorDesk(
        next,
        measure,
        legislativeBlueprintForMeasure(next, measure),
      );
      const matter = governingMatters(next, office.officeKey).find(
        (row) => row.measureId === measureId && row.status === "open",
      )!;
      expect(matter).toBeDefined();
      const decision = decideGoverningMatter(next, matter.id, BILL_SIGN);
      expect(decision.ok, decision.ok ? "" : decision.reason).toBe(true);
      next = decision.world;
      expect(measurePosition(next, measureId).phase).toBe("awaiting-enactment");
      continue;
    }
    const step = availableMeasureSteps(next, measureId).find(
      (key) => key !== "offer-amendment",
    );
    expect(step, `Canonical next step at ${phase}`).toBeDefined();
    next = applyLegislativeStep(context, next, step!).world;
  }
  throw new Error("Controlled rent-cap bill did not reach enactment.");
}
// Authored 3% contract input, not a claim about any state's statutory cap.
vi.mock(
  "../../../data/research/laws/starting-law-2026.json",
  async (importOriginal) => {
    const original = await importOriginal<{ default: typeof startingLaw }>();
    const question = original.default.questions[controlled.question];
    return {
      default: {
        ...original.default,
        questions: {
          ...original.default.questions,
          [controlled.question]: {
            ...question,
            answers: Object.fromEntries(
              Object.keys(question.answers).map((key) => [
                key,
                {
                  answer: "yes",
                  operativeAt: "2026-01-01",
                  lawTerms: [
                    {
                      questionKey: controlled.question,
                      key: "cap",
                      unit: "ratio",
                      value: 0.03,
                    },
                  ],
                },
              ]),
            ),
          },
        },
      },
    };
  },
);

describe("the actual lease renewal activity hook", () => {
  it("dispatches after saving actual renewal terms, with their payer/date/identity, once", () => {
    const seed = "team4-m10-renewal-activity-20260930";
    const supported = PLACE_POPULATION_ROWS.split(";")
      .map((row) => row.split(":")[0]!)
      .filter((key) => {
        const place = lifePlaceByKey(key);
        return place && hudRentRowFor(place.context.jurisdiction.id);
      });
    const placeKey = new SeededRng(seed).pick(supported);
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!;
    let initial = startTownLeases(game.world, game.world.currentDate);
    // This is a focused renewal hook fixture, not a simulated year. Cancel
    // unrelated scheduled activities through their writer before moving to
    // the anniversary; preserve their records and canonical save validation.
    initial = withWorldIntegrityDeferred(() => {
      let isolated = initial;
      const states = new Map(
        initial.history.futureDueItemStates.map((state) => [
          state.dueItemId,
          state,
        ]),
      );
      for (const item of initial.history.futureDueItems) {
        if (states.get(item.id)?.status !== "scheduled") continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `fixture:renewal-only:${item.id}`,
          dueItemId: item.id,
          effectiveAt: initial.currentDate,
          reasonKey: "fixture:isolated-renewal",
          context:
            "Controlled anniversary hook fixture; not a year progression proof.",
        });
      }
      return isolated;
    });
    const lease = townLeases(initial).find(
      (entry) => entry.regime === "market" && !entry.ended,
    )!;
    expect(lease).toBeDefined();
    const day = makeIsoDate(
      `${Number(initial.currentDate.slice(0, 4)) + 1}-${lease.flow.startsAt.slice(5, 7)}-01`,
    );
    const due = {
      ...initial,
      currentDate: day,
      currentMoment: simulationMomentOnLocalDate(initial.currentMoment, day),
    };
    const calls: { activityId: string; personId: string; date: string }[] = [];
    const dispatch = vi
      .spyOn(effects, "applyLawConsequences")
      .mockImplementation((world, context) => {
        const terms = world.history.resourceFlowTerms.find(
          (record) => record.id === context.activityId,
        )!;
        expect(terms).toBeDefined();
        expect(terms.effectiveAt).toBe(context.onDate);
        const savedLease = townLeases(world, day).find(
          (entry) => entry.flow.id === terms.resourceFlowId,
        )!;
        expect(context.activity).toBe("renewal");
        expect(context.subjectIds).toEqual([savedLease.leaseholderId]);
        calls.push({
          activityId: terms.id,
          personId: savedLease.leaseholderId,
          date: day,
        });
        return world;
      });
    try {
      const changed = withWorldIntegrityDeferred(() =>
        renewTownLeases(due, day),
      );
      expect(calls.length).toBeGreaterThan(0);
      const count = calls.length;
      expect(renewTownLeases(changed, day)).toBe(changed);
      expect(calls).toHaveLength(count);
      const reopened = deserializeWorld(serializeWorld(changed));
      expect(renewTownLeases(reopened, day)).toBe(reopened);
      expect(calls).toHaveLength(count);
      console.log(
        `M10 actual renewal hook seed=${seed}: ${calls.length} saved activities, ${personName(changed.people[lease.leaseholderId]!)} in ${game.world.jurisdictions[lease.town]?.name}, ${day}. No numeric row admitted.`,
      );
    } finally {
      dispatch.mockRestore();
    }
  });
  it("A57 enacts a controlled final 3% bill on the actual lease world before native renewal", () => {
    const seed = "team4-m10-renewal-activity-20260930";
    const supported = PLACE_POPULATION_ROWS.split(";")
      .map((row) => row.split(":")[0]!)
      .filter((key) => {
        const place = lifePlaceByKey(key);
        return place && hudRentRowFor(place.context.jurisdiction.id);
      });
    const placeKey = new SeededRng(seed).pick(supported);
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey,
        startAge: 30,
        questionnaire: "skipped",
      }),
    ).game!;
    let initial = startTownLeases(game.world, game.world.currentDate);
    // This is a focused renewal hook fixture, not a simulated year. Cancel
    // unrelated scheduled activities through their writer before moving to
    // the anniversary; preserve their records and canonical save validation.
    initial = withWorldIntegrityDeferred(() => {
      let isolated = initial;
      const states = new Map(
        initial.history.futureDueItemStates.map((state) => [
          state.dueItemId,
          state,
        ]),
      );
      for (const item of initial.history.futureDueItems) {
        if (states.get(item.id)?.status !== "scheduled") continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `fixture:renewal-only:${item.id}`,
          dueItemId: item.id,
          effectiveAt: initial.currentDate,
          reasonKey: "fixture:isolated-renewal",
          context:
            "Controlled anniversary hook fixture; not a year progression proof.",
        });
      }
      return isolated;
    });
    const lease = townLeases(initial).find((entry) => {
      const home = initial.history.dwellings.find(
        (record) => record.id === entry.dwellingId,
      );
      return (
        entry.regime === "market" &&
        !entry.ended &&
        home?.builtYear != null &&
        Number(initial.currentDate.slice(0, 4)) - home.builtYear >= 15
      );
    })!;
    expect(lease).toBeDefined();
    const enacted = enactCapOnLeaseWorld(initial, placeKey);
    initial = withWorldIntegrityDeferred(() => {
      let isolated = enacted.world;
      const latest = new Map(
        isolated.history.futureDueItemStates.map((state) => [
          state.dueItemId,
          state,
        ]),
      );
      // Filing/enactment can schedule new activities. This isolated renewal
      // fixture cancels those too before its explicit anniversary date jump.
      for (const item of isolated.history.futureDueItems) {
        if (latest.get(item.id)?.status !== "scheduled") continue;
        isolated = cancelFutureDueItem(isolated, {
          stableKey: `fixture:post-enactment-renewal-only:${item.id}`,
          dueItemId: item.id,
          effectiveAt: isolated.currentDate,
          reasonKey: "fixture:isolated-renewal",
          context:
            "Controlled anniversary hook; not natural calendar progression.",
        });
      }
      return isolated;
    });
    expect(measurePosition(initial, enacted.measureId).phase).toBe("enacted");
    const day = makeIsoDate(
      `${Number(initial.currentDate.slice(0, 4)) + 1}-${lease.flow.startsAt.slice(5, 7)}-01`,
    );
    const due = {
      ...initial,
      currentDate: day,
      currentMoment: simulationMomentOnLocalDate(initial.currentMoment, day),
    };
    const old = resourceFlowTermsAt(due, lease.flow.id)!.amount.minorUnits;
    const row: LawConsequenceRow = {
      id: "fixture:a57-native-three-percent",
      kind: "price-cost",
      when: "renewal",
      who: { selector: "person-price-flows", predicates: [] },
      what: "set-resource-flow-price",
      amount: {
        op: "minimum",
        operands: [
          { op: "record", key: "current-flow-minor", unit: "minor" },
          {
            op: "sum",
            operands: [
              { op: "record", key: "prior-flow-minor", unit: "minor" },
              {
                op: "product",
                left: { op: "record", key: "prior-flow-minor", unit: "minor" },
                right: { op: "term", key: "cap", unit: "ratio" },
              },
            ],
          },
        ],
      },
      conditions: [
        {
          capability: "price-flow-basis",
          parameters: { basisKind: lease.flow.basisKind },
        },
        {
          capability: "housing-built-at-least-years-ago",
          parameters: { years: 15 },
        },
      ],
      lag: { days: 0, sourceIds: [] },
      onRepeal: "recompute-prospective",
      evidence: {
        sourceIds: ["fixture:a57-three-percent"],
        population: "Actual named fixture leaseholder",
        scope: "Controlled 3% term, not real OR/CA eligibility",
        why: "The final typed term limits this saved renewal.",
        uncertainty: "No production numeric row or natural-year proof.",
      },
    };
    const proposition = Object.values(due.policyCatalog.propositions).find(
      (p) => p.stableKey === controlled.question,
    )!;
    const withRow = {
      ...due,
      policyCatalog: {
        ...due.policyCatalog,
        propositions: {
          ...due.policyCatalog.propositions,
          [proposition.id]: { ...proposition, consequences: [row] },
        },
      },
    };
    const home = vi
      .spyOn(housing, "homePriceLevel")
      .mockImplementation((_world, _town, date) => (date >= day ? 1.2 : 1));
    const nativeDispatch = effects.applyLawConsequences;
    const calls: { activityId: string; personId: string; date: string }[] = [];
    const dispatch = vi
      .spyOn(effects, "applyLawConsequences")
      .mockImplementation((world, context) => {
        const terms = world.history.resourceFlowTerms.find(
          (record) => record.id === context.activityId,
        )!;
        expect(terms).toBeDefined();
        expect(terms.effectiveAt).toBe(context.onDate);
        const savedLease = townLeases(world, day).find(
          (entry) => entry.flow.id === terms.resourceFlowId,
        )!;
        expect(context.activity).toBe("renewal");
        expect(context.subjectIds).toEqual([savedLease.leaseholderId]);
        calls.push({
          activityId: terms.id,
          personId: savedLease.leaseholderId,
          date: day,
        });
        if (terms.resourceFlowId === lease.flow.id)
          expect(terms.amount.minorUnits).toBe(
            Math.round((old * 1.2) / 100) * 100,
          );
        return terms.resourceFlowId === lease.flow.id
          ? nativeDispatch(world, context)
          : world;
      });
    try {
      const changed = withWorldIntegrityDeferred(() =>
        renewTownLeases(withRow, day),
      );
      expect(calls.length).toBeGreaterThan(0);
      const priced = resourceFlowTermsAt(changed, lease.flow.id)!;
      expect(priced.amount.minorUnits).toBe(old + old * 0.03);
      expect(priced.lawEffectStamps?.length).toBeGreaterThan(0);
      const stamp = priced.lawEffectStamps!.find(
        (record) => record.governingLawKey === enacted.measureId,
      )!;
      expect(stamp.source).toBe("enacted");
      expect(stamp.sourceRecordIds).toContain(lease.dwellingId);
      expect(stamp.sourceRecordIds).toContain(lease.tenureId);
      const actualActivity = changed.history.resourceFlowTerms.find((record) =>
        record.stableKey.startsWith(`${lease.flow.stableKey}:renewal:`),
      )!;
      const actualContext = {
        activity: "renewal" as const,
        activityId: actualActivity.id,
        subjectIds: [lease.leaseholderId],
        onDate: day,
      };
      // Controlled alternative facts test the predicate; they are not saved
      // into the watched world's actual sourced dwelling.
      const withBuiltYear = (builtYear: number | null) => ({
        ...changed,
        history: {
          ...changed.history,
          dwellings: changed.history.dwellings.map((record) =>
            record.id === lease.dwellingId ? { ...record, builtYear } : record,
          ),
        },
      });
      expect(
        resolvePriceCostConsequences(
          withBuiltYear(Number(day.slice(0, 4))),
          row,
          actualContext,
        ),
      ).toEqual([]);
      expect(() =>
        resolvePriceCostConsequences(withBuiltYear(null), row, actualContext),
      ).toThrow("saved building-year fact");
      expect(stamp.sourceRecordIds).toContain(
        changed.history.legislativeEnactments!.find(
          (record) => record.measureId === enacted.measureId,
        )!.id,
      );
      expect(changed.history.resourceTransferOutcomes).toEqual(
        due.history.resourceTransferOutcomes,
      );
      const count = calls.length;
      expect(renewTownLeases(changed, day)).toBe(changed);
      expect(calls).toHaveLength(count);
      const reopened = deserializeWorld(serializeWorld(changed));
      expect(renewTownLeases(reopened, day)).toBe(reopened);
      expect(calls).toHaveLength(count);
      if (process.env.TEAM4_A57_WATCHED_RECEIPT)
        writeFileSync(
          process.env.TEAM4_A57_WATCHED_RECEIPT,
          JSON.stringify(
            {
              seed,
              placeKey,
              place: game.world.jurisdictions[lease.town]?.name,
              personId: lease.leaseholderId,
              person: personName(changed.people[lease.leaseholderId]!),
              dwelling: changed.history.dwellings.find(
                (record) => record.id === lease.dwellingId,
              ),
              measureId: enacted.measureId,
              governorId:
                enacted.world.control.kind === "person"
                  ? enacted.world.control.personId
                  : null,
              actualRenewalId: actualActivity.id,
              pricedTermsId: priced.id,
              flowId: lease.flow.id,
              obligationId: lease.obligationId,
              tenureId: lease.tenureId,
              onDate: day,
              oldMinor: old,
              finalMinor: priced.amount.minorUnits,
              stamp,
              cashUnchanged: true,
              repeatIdentity: true,
              canonicalContinueIdentity: true,
              scope:
                "Controlled3% bill/votes on actual lease world; isolated anniversary, not natural-year or actual OR/CA cap.",
            },
            null,
            2,
          ) + "\n",
        );
      console.log(
        `M10 actual renewal hook seed=${seed}: ${calls.length} saved activities, ${personName(changed.people[lease.leaseholderId]!)} in ${game.world.jurisdictions[lease.town]?.name}, ${day}. Controlled enacted 3% bill via actual governor desk; no real statutory rate or natural-year proof.`,
      );
    } finally {
      dispatch.mockRestore();
      home.mockRestore();
    }
  });
});
