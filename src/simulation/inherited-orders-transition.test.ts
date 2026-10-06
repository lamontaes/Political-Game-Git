import { describe, expect, it } from "vitest";
import { issueExecutiveInstrument } from "./legislation";
import { makeIsoDate } from "./dates";
import { legislatureProfilePackId } from "./legislature-game-profile";
import { searchLifePlaces } from "./life-places";
import { SeededRng } from "./rng";
import { STATES } from "./state-reference";
import type { EntityId } from "./types";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
} from "./nationwide-world/state-executives";
import {
  applyOfficeContinuityNotices,
  type OfficeContinuityNoticeInput,
} from "./governing/office-continuity";
import {
  governingMatters,
  governorOfficeForJurisdiction,
  openTransitionMatters,
} from "./governing/state-governing";
import { inheritedExecutiveOrders } from "./inherited-executive-orders";
import { recordPersonDeath } from "./vitality";

describe("inherited executive orders at transition", () => {
  it("finds only unexpired orders from a prior holder in a random new game", () => {
    const seed = "session38-inherited-orders-transition-new-game-20261006";
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
      (row) => row.stateUsps === stateUsps,
    )!;
    const office = governorOfficeForJurisdiction(prepared, jurisdictionKey)!;
    const orderWorld = issueExecutiveInstrument(prepared, {
      stableKey: `session38:transition-source:${stateUsps}`,
      jurisdictionKey,
      jurisdictionId: office.jurisdictionId,
      legislativeRulePackId: legislatureProfilePackId(jurisdictionKey),
      instrument: "executive-order",
      designation: "Executive Order 1",
      shortTitle: "Records schedule",
      summary: "Direct internal records work.",
      actorLabel: jurisdictionKey,
      actorPersonId: holder.personId,
      rationale: "Maintain the office's records.",
      sourceDocumentKey: `session38:transition-source:${stateUsps}`,
      publishedAt: prepared.currentDate,
      effectiveAt: prepared.currentDate,
      expiresAt: null,
      propositionIds: [],
      propositionAnswers: [],
      authorityChecks: [
        {
          clause: {
            kind: "executive-branch-management",
            topicKey: "internal-procedure",
          },
        },
      ],
    });
    const issued = orderWorld.history.legislativeMeasures!.find(
      (row) => row.stableKey === `session38:transition-source:${stateUsps}`,
    )!;
    const deathWorld = recordPersonDeath(orderWorld, {
      stableKey: `session38:transition-death:${stateUsps}`,
      personId: holder.personId,
      diedAt: orderWorld.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [orderWorld.id],
      summary: "The outgoing executive leaves office.",
      provenance: {
        kind: "authored",
        note: "Inherited-order transition proof fixture.",
      },
    });
    const death = deathWorld.history.personDeaths.at(-1)!;
    const notice: OfficeContinuityNoticeInput = {
      noticeKey: `session38:transition-notice:${stateUsps}`,
      sequence: death.sequence,
      originEventId: death.eventId,
      personId: holder.personId,
      kind: "death",
      effectiveDate: death.diedAt,
      recordedDate: deathWorld.currentDate,
      visibility: "public",
      offices: [
        {
          officeKey: holder.officeKey,
          title: holder.title,
          organizationId: holder.organizationId,
          termEvidenceId: holder.termId,
        },
      ],
      sourceRecordId: death.id,
    };
    const transitionedOffice = applyOfficeContinuityNotices(deathWorld, [
      notice,
    ]);
    const incoming = currentStateExecutiveHolders(transitionedOffice).find(
      (row) => row.stateUsps === stateUsps,
    )!;
    expect(incoming.personId).not.toBe(holder.personId);
    const incomingId = incoming.personId;
    expect(
      inheritedExecutiveOrders(
        transitionedOffice,
        office.jurisdictionId,
        incomingId,
      ).map((row) => row.id),
    ).toContain(issued.id);
    expect(
      inheritedExecutiveOrders(
        transitionedOffice,
        office.jurisdictionId,
        holder.personId,
      ),
    ).not.toContainEqual(expect.objectContaining({ id: issued.id }));
    const inherited = transitionedOffice;
    const transitioned = openTransitionMatters(
      transitionedOffice,
      office.officeKey,
    );
    const transitionMatter = governingMatters(
      transitioned,
      office.officeKey,
    ).find(
      (matter) =>
        matter.family === "inherited-executive-order" &&
        matter.measureId === issued.id,
    );
    expect(transitionMatter?.holderPersonId).toBe(incomingId);
    expect(transitionMatter?.options.map((option) => option.key)).toEqual([
      "inherited-order:keep",
      "inherited-order:revoke",
    ]);
    expect(openTransitionMatters(transitioned, office.officeKey)).toBe(
      transitioned,
    );
    const revokedWorld = issueExecutiveInstrument(transitionedOffice, {
      stableKey: `session38:transition-revocation:${stateUsps}`,
      jurisdictionKey,
      jurisdictionId: office.jurisdictionId,
      legislativeRulePackId: legislatureProfilePackId(jurisdictionKey),
      instrument: "executive-order",
      designation: "Executive Order 2",
      shortTitle: "Revoke Records Order",
      summary: "Revoke the prior order.",
      actorLabel: jurisdictionKey,
      actorPersonId: incomingId,
      rationale: "The prior order no longer reflects this office's priorities.",
      sourceDocumentKey: `session38:transition-revocation:${stateUsps}`,
      publishedAt: transitionedOffice.currentDate,
      effectiveAt: transitionedOffice.currentDate,
      expiresAt: null,
      propositionIds: [],
      propositionAnswers: [],
      authorityChecks: [
        {
          clause: {
            kind: "revoke-executive-order",
            targetMeasureId: issued.id,
          },
        },
      ],
    });
    expect(
      inheritedExecutiveOrders(revokedWorld, office.jurisdictionId, incomingId),
    ).not.toContainEqual(expect.objectContaining({ id: issued.id }));
    const expired: typeof inherited = {
      ...inherited,
      history: {
        ...inherited.history,
        legislativeEnactments: inherited.history.legislativeEnactments!.map(
          (row) =>
            row.measureId === issued.id
              ? { ...row, expiresAt: makeIsoDate("1900-01-01") }
              : row,
        ),
      },
    };
    expect(
      inheritedExecutiveOrders(expired, office.jurisdictionId, incomingId),
    ).not.toContainEqual(expect.objectContaining({ id: issued.id }));
    console.info(
      "Inherited-order transition proof",
      JSON.stringify({
        seed,
        place: place.displayName,
        stateUsps,
        worldId: orderWorld.id,
        orderId: issued.id,
        incomingHolderId: incomingId,
      }),
    );
  });
});
