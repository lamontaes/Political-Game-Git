import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  ARTICLE_V_STATE_KEYS,
  constitutionalActions,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  recordConstitutionalProposalVote,
} from "../constitutional-process";
import { stateRatificationChambers } from "../constitutional-ratification-rules";
import { addDays } from "../dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { ensureStateLegislatureOpening } from "../nationwide-world/state-legislature-opening";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { composeWorldTimeHandlers } from "../campaigns";
import {
  resolveFutureDueItemsThrough,
  scheduleFutureDueItem,
} from "../future-transitions";
import { ARTICLE_V_STATE_ACTION } from "./article-v";
import { stateConstitutionalRoster } from "./chamber-votes";
import { seatedCongressChamber } from "./congress-chambers";

const seed = "A79 policy amendment scheduled state action";
const places = lifePlaceStateIdentities();
const home = new SeededRng(seed).pick(places);
const admitted = ARTICLE_V_STATE_KEYS.filter((key) =>
  stateRatificationChambers(key),
);
const sample = [...admitted];
const rng = new SeededRng(seed).fork("state chambers");
const states = Array.from(
  { length: Math.min(5, sample.length) },
  () => sample.splice(rng.integer(0, sample.length), 1)[0]!,
);
let world: World;
let measureId: EntityId;

beforeAll(() => {
  expect(places).toHaveLength(56);
  expect(states).toHaveLength(5);
  world = ensureNationalElectionJurisdiction(
    smallWorld({ place: home.jurisdictionKey, seed, offices: ["congress"] })
      .world,
  );
  const propositionId = world.policyCatalog.propositionOrder.find((id) => {
    const proposition = world.policyCatalog.propositions[id]!;
    return (
      world.policyCatalog.issues[proposition.issueId]?.levels?.includes(
        "federal",
      ) && (proposition.principles?.length ?? 0) > 0
    );
  })!;
  world = proposeConstitutionalMeasure(world, {
    stableKey: `${seed}:proposal`,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    jurisdictionKey: "US",
    processKind: "federal-amendment",
    designation: "Supplied policy amendment",
    shortTitle: "Actual state chamber ratification fixture",
    text: "Supplied fictional policy amendment isolates the state's actual ratification vote.",
    textVersion: "v1",
    sponsoringAuthority: "The Congress of the United States",
    // Institution-authored fixture, as the existing Article V producer writes.
    // It does not grant an unqualified person a constitutional sponsor's office.
    sponsorPersonId: null,
    ratificationMode: "state-legislatures",
    deadlineAt: addDays(world.currentDate, 365),
    delayedOperativeAt: null,
    ruleDelta: { kind: "policy-provision", propositionId, stance: "adopt" },
    ordinaryMeasureId: null,
  });
  measureId = world.history.constitutionalMeasures!.at(-1)!.id;
  // Authored congressional admission on actual saved members isolates the
  // state caller. These are not naturally formed congressional opinions.
  for (const bodyKey of ["house", "senate"] as const) {
    const members = seatedCongressChamber(world, bodyKey)!.body.members;
    world = recordConstitutionalProposalVote(
      world,
      measureId,
      bodyKey,
      members.map((member) => ({
        memberKey: member.memberKey,
        personId: member.personId,
        disposition: "yea",
        reason: "fixture:supplied-congressional-admission",
      })),
      members.length,
      {
        method: "authored-fixture",
        note: "Supplied congressional approval on the actual roster; state votes remain unsupplied.",
        sourceEntityIds: [],
      },
    );
  }
  expect(constitutionalPosition(world, measureId).phase).toBe("ratification");
});

/** Supplied calendar fixture; the canonical dispatcher and state votes remain real. */
function dispatch(world: World, stateKey: string): World {
  const dueAt = addDays(world.currentDate, 1);
  const measure = world.history.constitutionalMeasures!.find(
    (row) => row.id === measureId,
  )!;
  const scheduled = scheduleFutureDueItem(world, {
    stableKey: `${measure.stableKey}:state:${stateKey}`,
    dueAt,
    transitionKey: ARTICLE_V_STATE_ACTION,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: {
      kind: "authored",
      note: "Supplied next-day calendar fixture; state member votes are unsupplied.",
    },
  });
  return resolveFutureDueItemsThrough(
    scheduled,
    dueAt,
    composeWorldTimeHandlers(),
  );
}

function stateActions(world: World) {
  return constitutionalActions(world, measureId).filter(
    (row) => row.detail.kind === "state-ratification",
  );
}

describe("A79 scheduled policy amendment state action uses actual state chambers", () => {
  for (const stateKey of states) {
    it(`records actual separate chamber votes in ${stateKey}`, () => {
      const subject =
        world.control.kind === "person" ? world.control.personId : null;
      if (!subject) throw Error("The fixture requires its saved subject.");
      const actual = ensureStateLegislatureOpening(
        world,
        subject,
        stateKey.slice(3),
      );
      const next = dispatch(actual, stateKey);
      expect(next).not.toBeNull();
      if (!next) throw Error("Expected disclosed actual-state admission.");
      const action = constitutionalActions(next, measureId).find(
        (row) =>
          row.detail.kind === "state-ratification" &&
          row.detail.stateKey === stateKey,
      );
      expect(action).toBeDefined();
      if (action?.detail.kind !== "state-ratification")
        throw Error("Expected an actual state action.");
      expect(action.detail.jurisdictionId).toBe(
        stateJurisdictionForKey(stateKey)!.id,
      );
      expect(action.detail.chamberVotes?.map((row) => row.bodyKey)).toEqual(
        stateRatificationChambers(stateKey),
      );
      for (const chamber of action.detail.chamberVotes!) {
        const roster = stateConstitutionalRoster(
          actual,
          action.detail.jurisdictionId!,
          chamber.bodyKey,
          "ratification",
        )!;
        expect(roster).not.toBeNull();
        expect(
          chamber.vote.dispositions.map((row) => [row.memberKey, row.personId]),
        ).toEqual(
          roster.seated.body.members.map((row) => [
            row.memberKey,
            row.personId,
          ]),
        );
        expect(chamber.vote.purpose).toBe("constitutional-ratification");
        expect(
          chamber.vote.dispositions.every((row) => row.personId && row.reason),
        ).toBe(true);
        expect(chamber.sourceRecordIds).toContain(chamber.organizationId);
      }
      expect(action.detail.approved).toBe(
        action.detail.chamberVotes!.every(
          (row) => row.vote.outcome === "passed",
        ),
      );
      const loaded = deserializeWorld(serializeWorld(next));
      expect(constitutionalActions(loaded, measureId)).toEqual(
        constitutionalActions(next, measureId),
      );
      const repeated = resolveFutureDueItemsThrough(
        loaded,
        addDays(loaded.currentDate, 1),
        composeWorldTimeHandlers(),
      );
      expect(stateActions(repeated)).toEqual(stateActions(loaded));
      const due = repeated.history.futureDueItems.find((row) =>
        row.stableKey.endsWith(`:state:${stateKey}`),
      )!;
      expect(
        repeated.history.futureDueItemStates
          .filter((row) => row.dueItemId === due.id)
          .at(-1)?.status,
      ).toBe("resolved");
    });
  }

  it("does not substitute Congress for an absent actual state body", () => {
    expect(seatedCongressChamber(world, "house")).not.toBeNull();
    expect(seatedCongressChamber(world, "senate")).not.toBeNull();
    expect(stateActions(dispatch(world, states[0]!))).toEqual([]);
  });

  it("covers all states with disclosed rules and leaves ineligible jurisdictions without fabricated action", () => {
    expect(admitted).toHaveLength(50);
    expect(new Set(admitted).size).toBe(50);
    const unsupported = places.filter(
      (row) => !ARTICLE_V_STATE_KEYS.includes(row.jurisdictionKey),
    );
    expect(unsupported).toHaveLength(6);
    for (const place of unsupported) {
      expect(stateRatificationChambers(place.jurisdictionKey)).toBeNull();
      expect(
        stateActions(dispatch(world, place.jurisdictionKey)),
        place.jurisdictionKey,
      ).toEqual([]);
    }
    console.info(
      "A79 scheduled state action coverage",
      JSON.stringify({
        seed,
        home: home.jurisdictionKey,
        startingPlaces: places.length,
        admitted,
        sample: states,
        ineligible: unsupported.map((row) => row.jurisdictionKey),
      }),
    );
  });

  it("keeps a controlled actual state member absent without an authored player ballot", () => {
    const subject =
      world.control.kind === "person" ? world.control.personId : null;
    if (!subject) throw Error("The fixture requires its saved subject.");
    const stateKey = states[0]!;
    const actual = ensureStateLegislatureOpening(
      world,
      subject,
      stateKey.slice(3),
    );
    const bodyKey = stateRatificationChambers(stateKey)![0]!;
    const roster = stateConstitutionalRoster(
      actual,
      stateJurisdictionForKey(stateKey)!.id,
      bodyKey,
      "ratification",
    )!;
    const controlled = roster.seated.body.members.find((row) => row.personId)!;
    const next = dispatch(
      {
        ...actual,
        control: { kind: "person", personId: controlled.personId! },
      },
      stateKey,
    );
    const action = stateActions(next).find(
      (row) =>
        row.detail.kind === "state-ratification" &&
        row.detail.stateKey === stateKey,
    );
    if (action?.detail.kind !== "state-ratification")
      throw Error(
        "Expected actual chamber vote with the controlled member absent.",
      );
    const ballot = action.detail
      .chamberVotes!.find((row) => row.bodyKey === bodyKey)!
      .vote.dispositions.find((row) => row.personId === controlled.personId);
    expect(ballot?.disposition).toBe("absent");
    expect(ballot?.reason).toBe("member:player-not-present");
  });
});
