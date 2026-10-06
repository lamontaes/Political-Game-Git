import { describe, expect, it } from "vitest";
import {
  decideExecutiveActionAuthority,
  type ExecutiveActionClause,
} from "./executive-action-authority";
import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import type { LawInForce } from "./governing/law-in-force";
import type { EntityId } from "./types";
import { makeIsoDate } from "./dates";
import { issueExecutiveInstrument, replayMeasure } from "./legislation";
import { legislatureProfilePackId } from "./legislature-game-profile";
import { stateJurisdictionForKey } from "./life-places";
import { searchLifePlaces } from "./life-places";
import { SeededRng } from "./rng";
import { STATES } from "./state-reference";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "./nationwide-world/state-executives";

const pack = executiveRulePackForJurisdiction("US-NH");
const statuteId = "measure-delegating-statute" as EntityId;
const delegatedLaw: LawInForce = {
  answer: "yes",
  measureId: statuteId,
  origin: "enacted",
  level: "state-statute",
  operativeAt: makeIsoDate("2026-01-01"),
  operativeBasis: "enacted-date",
};
const delegation = {
  key: "maximum-interest-rate",
  questionKey: "credit-interest-limit",
  minimum: 0,
  maximum: 18,
  unit: "ratio" as const,
  sourceIds: ["statute-section:4"],
};

describe("executive action authority", () => {
  it("allows only recorded executive-branch management clauses", () => {
    expect(
      decideExecutiveActionAuthority(
        pack,
        {
          kind: "executive-branch-management",
          topicKey: "agency-instructions",
        },
        null,
      ),
    ).toMatchObject({ allowed: true });
    expect(
      decideExecutiveActionAuthority(
        pack,
        { kind: "independent-policy", topicKey: "change-tax-rate" },
        null,
      ),
    ).toMatchObject({
      allowed: false,
      reason:
        "An executive action cannot create independent policy; the legislature must enact it or a law must delegate the term.",
    });
  });

  it("accepts a delegated term only from the matching statute and within its range", () => {
    const accepted = decideExecutiveActionAuthority(
      pack,
      {
        kind: "delegated-term",
        propositionId: "proposition_credit" as EntityId,
        statuteMeasureId: statuteId,
        delegation,
        value: 12,
      },
      delegatedLaw,
    );
    expect(accepted).toMatchObject({ allowed: true });

    const outsideRange = decideExecutiveActionAuthority(
      pack,
      {
        kind: "delegated-term",
        propositionId: "proposition_credit" as EntityId,
        statuteMeasureId: statuteId,
        delegation,
        value: 19,
      },
      delegatedLaw,
    );
    expect(outsideRange).toMatchObject({
      allowed: false,
      reason:
        "The statute delegates this term only within its recorded range (0 to 18 ratio).",
    });

    expect(
      decideExecutiveActionAuthority(
        pack,
        {
          kind: "delegated-term",
          propositionId: "proposition_credit" as EntityId,
          statuteMeasureId: "another-measure" as EntityId,
          delegation,
          value: 12,
        },
        delegatedLaw,
      ),
    ).toMatchObject({
      allowed: false,
      reason:
        "No statute currently in force delegates this term to the executive.",
    });
  });

  it("files and issues an executive order through the canonical measure and enactment records", () => {
    const seed = "session38-executive-profile-new-game-20261006";
    const rng = new SeededRng(seed);
    const stateUsps = rng.pick(Object.keys(STATES));
    const jurisdictionKey = `US-${stateUsps}`;
    const places = searchLifePlaces("", 100, {
      scope: "locality",
      stateJurisdictionKey: jurisdictionKey,
    });
    expect(places.length).toBeGreaterThan(0);
    const place = rng.pick(places);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "normal",
      placeKey: place.key,
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      seed,
      questionnaire: "skipped",
      priors: [],
    });
    const subjectPersonId = Object.keys(game.world.people)[0] as EntityId;
    const stateExecutiveWorld = ensureStateExecutiveIncumbent(
      game.world,
      subjectPersonId,
      stateUsps,
    );
    const actorPersonId = currentStateExecutiveHolders(
      stateExecutiveWorld,
    ).find((holder) => holder.stateUsps === stateUsps)!.personId;
    const jurisdictionId = stateJurisdictionForKey(jurisdictionKey)!.id;
    const clause: ExecutiveActionClause = {
      kind: "executive-branch-management",
      topicKey: "agency-instructions",
    };
    const authority = decideExecutiveActionAuthority(
      executiveRulePackForJurisdiction(jurisdictionKey),
      clause,
      null,
    );
    const issued = issueExecutiveInstrument(stateExecutiveWorld, {
      stableKey: `session38:${stateUsps}:order:records-audit`,
      jurisdictionKey,
      jurisdictionId,
      legislativeRulePackId: legislatureProfilePackId(jurisdictionKey),
      instrument: "executive-order",
      designation: "Executive Order 1",
      shortTitle: "Direct a records audit",
      summary: "Direct the executive branch to review its records process.",
      actorLabel: executiveRulePackForJurisdiction(jurisdictionKey).displayName,
      actorPersonId,
      rationale: "The governor is directing an internal agency process.",
      sourceDocumentKey: `session9:executive-order:${stateUsps}:records-audit`,
      publishedAt: stateExecutiveWorld.currentDate,
      effectiveAt: stateExecutiveWorld.currentDate,
      expiresAt: null,
      propositionIds: [],
      propositionAnswers: [],
      authorityChecks: [
        {
          clause,
        },
      ],
    });
    const measure = issued.history.legislativeMeasures?.find(
      (row) => row.stableKey === `session38:${stateUsps}:order:records-audit`,
    );
    expect(measure).toMatchObject({
      governmentInstrument: "executive-order",
      origin: "executive-request",
      sourceDocumentKey: `session9:executive-order:${stateUsps}:records-audit`,
    });
    const enactment = issued.history.legislativeEnactments?.find(
      (row) => row.measureId === measure?.id,
    );
    expect(enactment).toMatchObject({
      outcome: "enacted",
      publishedAt: stateExecutiveWorld.currentDate,
      effectiveAt: stateExecutiveWorld.currentDate,
      expiresAt: null,
    });
    expect(replayMeasure(issued, measure!.id).violations).toEqual([]);
    expect(replayMeasure(issued, measure!.id).position.phase).toBe("enacted");
    console.log(
      JSON.stringify({
        proof: "generated executive order measure and enactment",
        seed,
        worldId: issued.id,
        simulationDate: issued.currentDate,
        place: place.displayName,
        placeKey: place.key,
        jurisdictionKey,
        office: executiveRulePackForJurisdiction(jurisdictionKey).displayName,
        authorityBasis:
          executiveRulePackForJurisdiction(jurisdictionKey).office.source
            .authority,
        authorityDecision: authority,
        measureId: measure!.id,
        enactmentId: enactment!.id,
        outcomeEventId: enactment!.outcomeEventId,
        publishedAt: enactment!.publishedAt,
        effectiveAt: enactment!.effectiveAt,
        expiresAt: enactment!.expiresAt,
      }),
    );
  });
});
