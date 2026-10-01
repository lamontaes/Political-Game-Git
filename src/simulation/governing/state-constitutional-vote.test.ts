import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { stateCandidacyPack } from "../candidacy-packs";
import {
  constitutionalActions,
  constitutionalEntityAvailableAt,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
  stateAmendmentProfile,
} from "../constitutional-process";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import {
  ensureStateLegislatureOpening,
  stateLegislators,
} from "../nationwide-world/state-legislature-opening";
import { US_STATE_USPS } from "../nationwide-world/state-executive-candidacy-packs";
import { currentHistoricalCutoff } from "../queries";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { seatedChamberForPack } from "./chamber-votes";

// Prepare the actual saved-state substrate before the shared state arm is admitted.
// This fixture supplies rollcall choices; it does not claim a caller migration.
const seed = "A79-saved-state-constitutional-body";
const identities = lifePlaceStateIdentities();
const supported = identities.filter(
  (identity) =>
    US_STATE_USPS.includes(
      identity.jurisdictionKey.slice(3) as (typeof US_STATE_USPS)[number],
    ) &&
    stateAmendmentProfile(identity.jurisdictionKey)?.basis === "game-profile" &&
    stateCandidacyPack(identity.jurisdictionKey) !== null,
);
const state = new SeededRng(seed).pick(supported);
const place = searchLifePlaces("", 1, {
  stateJurisdictionKey: state.jurisdictionKey,
})[0]!;
const jurisdiction = stateJurisdictionForKey(state.jurisdictionKey)!;
let world: World;
let personId: EntityId;
let measureId: EntityId;
beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: place.key,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  personId = game.playerPersonId;
  world = ensureStateLegislatureOpening(
    game.world,
    personId,
    state.jurisdictionKey.slice(3),
  );
  const propositionId = world.policyCatalog.propositionOrder.find((id) => {
    const proposition = world.policyCatalog.propositions[id]!;
    return world.policyCatalog.issues[proposition.issueId]?.levels?.includes(
      "state",
    );
  })!;
  expect(propositionId).toBeDefined();
  world = proposeConstitutionalMeasure(world, {
    stableKey: "a79:saved-state-proposal",
    jurisdictionId: jurisdiction.id,
    jurisdictionKey: `US-${state.jurisdictionKey.slice(3)}`,
    processKind: "state-amendment",
    designation: "Supplied State Amendment",
    shortTitle: world.policyCatalog.propositions[propositionId]!.name,
    text: "Supplied state constitutional proposal for the saved-body contract fixture.",
    textVersion: "v1",
    sponsoringAuthority: `The ${jurisdiction.name} Legislature`,
    sponsorPersonId: null,
    ratificationMode: "statewide-electors",
    deadlineAt: null,
    delayedOperativeAt: null,
    ruleDelta: { kind: "policy-provision", propositionId, stance: "adopt" },
    ordinaryMeasureId: null,
  });
  measureId = world.history.constitutionalMeasures!.at(-1)!.id;
});

function actualBodies(at: World) {
  const pack = legislativePackForJurisdiction(jurisdiction.id)!;
  const profile = stateAmendmentProfile(state.jurisdictionKey)!;
  return profile.bodies.map((body) => {
    const chamber = pack.chambers.find(
      (row) => row.chamberKey === body.bodyKey,
    )!;
    expect(chamber).toBeDefined();
    const seated = seatedChamberForPack(
      at,
      pack.packId,
      chamber.chamberKey,
      chamber.name,
    )!;
    expect(seated).not.toBeNull();
    return { body, seated };
  });
}

describe("A79 actual saved state constitutional body preparation", () => {
  it("joins the state roster to actual saved seat work and institution records", () => {
    const members = stateLegislators(
      world,
      stateCandidacyPack(state.jurisdictionKey)!.packId,
    );
    expect(members.length).toBeGreaterThan(0);
    const bodies = actualBodies(world);
    expect(bodies.flatMap((row) => row.seated.body.members)).toHaveLength(
      members.length,
    );
    for (const { body, seated } of bodies) {
      expect(seated.seats).toBe(body.members);
      expect(seated.body.members).toHaveLength(body.members);
      for (const member of seated.body.members) {
        const actual = members.find((row) => row.personId === member.personId)!;
        expect(actual).toBeDefined();
        const work = world.history.workRelationships.find(
          (row) => row.id === actual.workRelationshipId,
        )!;
        expect(work).toBeDefined();
        expect(work.personId).toBe(member.personId);
        expect(
          world.history.organizations.some(
            (row) => row.id === work.organizationId,
          ),
        ).toBe(true);
        expect(actual.officeKey.endsWith(`:${body.bodyKey}`)).toBe(true);
        expect(world.people[member.personId!]).toBeDefined();
      }
    }
    const cutoff = currentHistoricalCutoff(world);
    expect(
      constitutionalEntityAvailableAt(
        world,
        measureId,
        cutoff.asOfDate,
        cutoff.historySequenceExclusive,
      ),
    ).toBe(true);
    const measure = world.history.constitutionalMeasures!.find(
      (row) => row.id === measureId,
    )!;
    expect(measure).toMatchObject({
      processKind: "state-amendment",
      jurisdictionId: jurisdiction.id,
      jurisdictionKey: `US-${state.jurisdictionKey.slice(3)}`,
    });
    expect(measure.proposalRule).toEqual(
      stateAmendmentProfile(state.jurisdictionKey)!.base,
    );
    console.info(
      "A79 state substrate",
      JSON.stringify({
        seed,
        state: state.jurisdictionKey,
        place: place.displayName,
        fullIdentityPool: identities.length,
        supportedGameProfileStatePool: supported.length,
        measureId,
        members: members.length,
        bodies: bodies.map((row) => ({
          bodyKey: row.body.bodyKey,
          members: row.seated.body.members.length,
          example: row.seated.body.members[0]!.name,
        })),
      }),
    );
  });

  it("preserves an authored actual-member state rejection rollcall through canonical Continue", () => {
    const { body, seated } = actualBodies(world)[0]!;
    const saved = recordConstitutionalProposalVote(
      world,
      measureId,
      body.bodyKey,
      seated.body.members.map((member, index) => ({
        memberKey: member.memberKey,
        personId: member.personId,
        disposition: index === 0 ? ("absent" as const) : ("nay" as const),
        reason:
          index === 0
            ? "member:supplied-absence"
            : "member:supplied-state-fixture",
      })),
      seated.seats,
      {
        method: "authored-fixture",
        note: "Supplied dispositions on actual saved state members; no shared-vote migration claimed.",
        sourceEntityIds: seated.body.members.flatMap((member) =>
          member.personId ? [member.personId] : [],
        ),
      },
    );
    expect(constitutionalPosition(saved, measureId).phase).toBe("rejected");
    const action = constitutionalActions(saved, measureId).find(
      (row) => row.detail.kind === "proposal-vote",
    )!;
    if (action.detail.kind !== "proposal-vote")
      throw Error("State rollcall missing.");
    expect(
      action.detail.vote.dispositions.map((row) => [
        row.memberKey,
        row.personId,
      ]),
    ).toEqual(
      seated.body.members.map((member) => [member.memberKey, member.personId]),
    );
    expect(action.detail.vote.dispositions[0]!.disposition).toBe("absent");
    const loaded = deserializeWorld(serializeWorld(saved));
    expect(constitutionalActions(loaded, measureId)).toEqual(
      constitutionalActions(saved, measureId),
    );
    expect(actualBodies(loaded)).toEqual(actualBodies(saved));
    expect(
      ensureStateLegislatureOpening(
        loaded,
        personId,
        state.jurisdictionKey.slice(3),
      ),
    ).toBe(loaded);
    expect(serializeWorld(loaded)).toBe(serializeWorld(saved));
  });
});
