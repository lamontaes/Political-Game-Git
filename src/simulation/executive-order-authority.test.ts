import { describe, expect, it } from "vitest";
import { decideExecutiveActionAuthority } from "./executive-action-authority";
import { executiveRulePackForJurisdiction } from "./executive-authority-rule-packs";
import type { LawInForce } from "./governing/law-in-force";
import type { EntityId } from "./types";
import { makeIsoDate } from "./dates";
import { issueExecutiveInstrument, replayMeasure } from "./legislation";
import { legislatureProfilePackId } from "./legislature-game-profile";
import { stateJurisdictionForKey } from "./life-places";
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
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "normal",
      placeKey: "3300980",
      startAge: 30,
      depth: "summarize-earlier-life",
      startingLife: "ordinary-life",
      seed: "session38-executive-instrument-record",
      questionnaire: "skipped",
      priors: [],
    });
    const subjectPersonId = Object.keys(game.world.people)[0] as EntityId;
    const stateExecutiveWorld = ensureStateExecutiveIncumbent(
      game.world,
      subjectPersonId,
      "NH",
    );
    const actorPersonId = currentStateExecutiveHolders(
      stateExecutiveWorld,
    ).find((holder) => holder.stateUsps === "NH")!.personId;
    const jurisdictionId = stateJurisdictionForKey("US-NH")!.id;
    const issued = issueExecutiveInstrument(stateExecutiveWorld, {
      stableKey: "session38:nh:order:records-audit",
      jurisdictionKey: "US-NH",
      jurisdictionId,
      legislativeRulePackId: legislatureProfilePackId("US-NH"),
      instrument: "executive-order",
      designation: "Executive Order 1",
      shortTitle: "Direct a records audit",
      summary: "Direct the executive branch to review its records process.",
      actorLabel: "Governor of New Hampshire",
      actorPersonId,
      rationale: "The governor is directing an internal agency process.",
      sourceDocumentKey: "session9:executive-order:records-audit",
      publishedAt: stateExecutiveWorld.currentDate,
      effectiveAt: stateExecutiveWorld.currentDate,
      expiresAt: null,
      propositionIds: [],
      propositionAnswers: [],
      authorityChecks: [
        {
          clause: {
            kind: "executive-branch-management",
            topicKey: "agency-instructions",
          },
        },
      ],
    });
    const measure = issued.history.legislativeMeasures?.find(
      (row) => row.stableKey === "session38:nh:order:records-audit",
    );
    expect(measure).toMatchObject({
      governmentInstrument: "executive-order",
      origin: "executive-request",
      sourceDocumentKey: "session9:executive-order:records-audit",
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
  });
});
