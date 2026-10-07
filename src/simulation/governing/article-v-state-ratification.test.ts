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
import { recordArticleVStateMemberVote } from "../living-world/federal-reform";
import { seatedCongressChamber } from "./congress-chambers";

const seed = "A79 policy amendment actual state ratification";
const places = lifePlaceStateIdentities();
const home = new SeededRng(seed).pick(places);
const admitted = ARTICLE_V_STATE_KEYS.filter((key) =>
  stateRatificationChambers(key),
);
const sample = [...admitted];
const rng = new SeededRng(seed).fork("sourced state chambers");
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

describe("A79 policy amendment ratification uses actual state chambers", () => {
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
      const next = recordArticleVStateMemberVote(actual, measureId, stateKey);
      expect(next).not.toBeNull();
      if (!next) throw Error("Expected sourced actual-state admission.");
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
      expect(recordArticleVStateMemberVote(loaded, measureId, stateKey)).toBe(
        loaded,
      );
    });
  }

  it("does not substitute Congress for an absent actual state body", () => {
    expect(
      recordArticleVStateMemberVote(world, measureId, states[0]!),
    ).toBeNull();
    expect(
      constitutionalActions(world, measureId).filter(
        (row) => row.detail.kind === "state-ratification",
      ),
    ).toEqual([]);
  });

  it("leaves every unsupported starting jurisdiction without fabricated state approval", () => {
    for (const place of places.filter(
      (row) => !admitted.includes(row.jurisdictionKey),
    )) {
      expect(stateRatificationChambers(place.jurisdictionKey)).toBeNull();
      expect(
        recordArticleVStateMemberVote(world, measureId, place.jurisdictionKey),
        place.jurisdictionKey,
      ).toBeNull();
    }
    console.info(
      "A79 policy ratification coverage",
      JSON.stringify({
        seed,
        home: home.jurisdictionKey,
        startingPlaces: places.length,
        admitted,
        sample: states,
        unboundOrIneligible: places.length - admitted.length,
      }),
    );
  });
});
