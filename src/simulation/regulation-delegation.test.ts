import { describe, expect, it } from "vitest";
import {
  boundedRegulationDraftValues,
  delegatedRegulationCandidates,
  openDelegatedRegulationDrafts,
} from "./executive-regulations";
import { delegatedRegulationAuthority } from "./executive-regulation-issuance";
import { SeededRng } from "./rng";
import { STATES } from "./state-reference";
import { searchLifePlaces } from "./life-places";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "./nationwide-world/state-executives";
import { governorOfficeForJurisdiction } from "./governing/state-governing";
import type { EntityId } from "./types";

describe("delegated regulation drafting", () => {
  it("offers only values inside the range recorded by the delegating law", () => {
    expect(
      boundedRegulationDraftValues({
        key: "maximum-rate",
        questionKey: "credit-rate",
        minimum: 0,
        maximum: 18,
        unit: "ratio",
        sourceIds: ["statute:section-4"],
      }),
    ).toEqual([0, 9, 18]);

    expect(
      boundedRegulationDraftValues({
        key: "minimum-age",
        questionKey: "eligibility-age",
        minimum: 0.5,
        maximum: 1,
        unit: "years",
        sourceIds: ["statute:section-8"],
      }),
    ).toEqual([0.5, 0.75, 1]);
  });

  it("does not invent an unbounded value or accept invalid source rows", () => {
    expect(
      boundedRegulationDraftValues({
        key: "unbounded",
        questionKey: "topic",
        minimum: null,
        maximum: null,
        unit: null,
        sourceIds: ["statute:section-1"],
      }),
    ).toEqual([]);
    expect(
      boundedRegulationDraftValues({
        key: "reversed",
        questionKey: "topic",
        minimum: 8,
        maximum: 2,
        unit: "years",
        sourceIds: ["statute:section-1"],
      }),
    ).toEqual([]);
  });

  it("does not invent a regulation when a random new game has no delegation", () => {
    const seed = "session38-regulation-discovery-new-game-20261006";
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
    const office = governorOfficeForJurisdiction(prepared, jurisdictionKey)!;
    const world = {
      ...prepared,
      control: { kind: "person" as const, personId: holder.personId },
    };
    const candidates = delegatedRegulationCandidates(world, office.officeKey);
    const drafts = openDelegatedRegulationDrafts(
      world,
      office.officeKey,
      () => null,
      candidates,
    );

    expect(candidates).toEqual([]);
    expect(drafts).toBe(world);
    const proposition = Object.values(world.policyCatalog.propositions).find(
      (candidate) => candidate.stableKey.endsWith("require-photo-id-to-vote"),
    )!;
    const forgedTerm = {
      key: "invented-limit",
      questionKey: proposition.stableKey,
      minimum: 0,
      maximum: 5,
      unit: "count" as const,
      sourceIds: ["unverified-section"],
    };
    const forgedMatter = {
      family: "regulation",
      officeKey: office.officeKey,
      holderPersonId: holder.personId,
      measureId: "unrecorded-statute" as EntityId,
      openedEvent: {
        participants: [
          { personId: playerId, role: "agency:drafter", detail: null },
        ],
      },
    } as unknown as Parameters<
      typeof delegatedRegulationAuthority
    >[1]["matter"];
    expect(
      delegatedRegulationAuthority(world, {
        office,
        matter: forgedMatter,
        actorPersonId: holder.personId,
        propositionId: proposition.id,
        delegation: forgedTerm,
        value: 3,
        drafterPersonId: playerId,
      }),
    ).toMatchObject({
      allowed: false,
      reason:
        "The proposed rule is missing its exact recorded delegation, range, or agency-head draft.",
    });
    console.info("Session 38 delegated-regulation random new-game proof", {
      seed,
      place: place.displayName,
      jurisdictionKey,
      worldId: world.id,
      candidateCount: candidates.length,
      forgedTermDecision:
        "refused because no exact catalog delegation is recorded",
      note: "No enacted delegating statute or Session 23 agency-head appointment is fabricated.",
    });
  });
});
