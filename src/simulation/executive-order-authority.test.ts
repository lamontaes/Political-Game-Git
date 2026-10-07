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
import {
  decideGoverningMatter,
  governingMatters,
  governorOfficeForJurisdiction,
  openExecutiveOrderMatter,
} from "./governing/state-governing";

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

  it("opens and decides an executive order on the shared office desk in a new game", () => {
    const seed = "session38-executive-order-desk-new-game-20261006";
    const rng = new SeededRng(seed);
    const stateUsps = rng.pick(Object.keys(STATES));
    const jurisdictionKey = `US-${stateUsps}`;
    const places = searchLifePlaces("", 100, {
      scope: "locality",
      stateJurisdictionKey: jurisdictionKey,
    });
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
    const playerId = Object.keys(game.world.people)[0] as EntityId;
    const prepared = ensureStateExecutiveIncumbent(
      game.world,
      playerId,
      stateUsps,
    );
    const holder = currentStateExecutiveHolders(prepared).find(
      (candidate) => candidate.stateUsps === stateUsps,
    )!;
    const office = governorOfficeForJurisdiction(prepared, jurisdictionKey);
    expect(office?.holderPersonId).toBe(holder.personId);
    if (!office) throw new Error("The new game has no governor desk.");
    const controlled: typeof prepared = {
      ...prepared,
      control: { kind: "person", personId: holder.personId },
    };
    const sourceEventId = controlled.history.events.at(-1)!.id;
    const opened = openExecutiveOrderMatter(controlled, office.officeKey, {
      instance: "new-game-records-audit",
      subject: "a records audit",
      sourceEventId,
    });
    const matter = governingMatters(opened, office.officeKey).find(
      (candidate) => candidate.family === "executive-order",
    );
    expect(matter?.status).toBe("open");
    if (!matter) throw new Error("The executive order did not reach the desk.");
    const chosen = decideGoverningMatter(
      opened,
      matter.id,
      "order:agency-instructions",
    );
    expect(chosen.ok).toBe(true);
    const measure = chosen.world.history.legislativeMeasures?.find(
      (candidate) => candidate.governmentInstrument === "executive-order",
    );
    expect(measure?.shortTitle).toBe(matter.title);
    expect(
      chosen.world.history.legislativeEnactments?.some(
        (candidate) => candidate.measureId === measure?.id,
      ),
    ).toBe(true);
    const refusal = decideGoverningMatter(
      opened,
      matter.id,
      "order:independent-policy",
    );
    expect(refusal.ok).toBe(true);
    expect(
      refusal.world.history.events.find(
        (event) =>
          event.type === "governing.matter-decided" &&
          event.tags.includes(`matter:${matter.id}`),
      )?.summary,
    ).toContain(
      "An executive action cannot create independent policy; the legislature must enact it or a law must delegate the term.",
    );
    expect(
      (refusal.world.history.legislativeMeasures ?? []).some(
        (candidate) => candidate.governmentInstrument === "executive-order",
      ),
    ).toBe(false);
    console.info(
      "Executive order desk proof",
      JSON.stringify({
        seed,
        worldId: chosen.world.id,
        simulationDate: chosen.world.currentDate,
        place: place.displayName,
        placeKey: place.key,
        jurisdictionKey,
        office: executiveRulePackForJurisdiction(jurisdictionKey).displayName,
        matterId: matter.id,
        measureId: measure?.id,
        enactmentId: chosen.world.history.legislativeEnactments?.find(
          (candidate) => candidate.measureId === measure?.id,
        )?.id,
        sharedInbox: true,
      }),
    );
  });
});
