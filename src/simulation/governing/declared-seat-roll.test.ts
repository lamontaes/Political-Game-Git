import { beforeAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { introduceMeasure } from "../legislation";
import {
  legislativeInstitutionContext,
  legislativePackForJurisdiction,
} from "../legislative-institutions";
import { procedureOnlyBlueprint } from "../legislation-scenarios";
import { assertRulePackIntegrity } from "../legislature-rules";
import { legislativeRulePackForWorld } from "../legislative-procedure-world";
import { lifePlaceStateIdentities } from "../life-places";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { stateLegislators } from "../nationwide-world/state-legislature-opening";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { decideChamberVote, seatedChamberForPack } from "./chamber-votes";
import { seatedCongressChamber } from "./congress-chambers";
import * as congressLawmaking from "./congress-lawmaking";
import { executiveDesk } from "./state-governing";

const seed = "team1-a89-seat-source-20261002";
const places = pickDistinct(new SeededRng(seed), lifePlaceStateIdentities(), 5);

describe.each(places.map((place) => [place.jurisdictionKey]))(
  `declared seat rolls in %s (sample seed ${seed})`,
  (place) => {
    let opened: ReturnType<typeof smallWorld>;

    beforeAll(() => {
      opened = smallWorld({
        place,
        seed,
        offices: ["congress", "state-legislature", "governor"],
      });
      opened = {
        ...opened,
        world: ensureNationalElectionJurisdiction(opened.world),
      };
    });

    it("reads actual national seats without changing the opening or its saved records", () => {
      expect(US_CONGRESS_RULE_PACK.seatRollSource).toEqual({
        kind: "national-election-seats",
        partyCueScope: "institution",
      });
      const history = opened.world.history;
      for (const chamber of US_CONGRESS_RULE_PACK.chambers) {
        const actual = seatedCongressChamber(opened.world, chamber.chamberKey);
        expect(actual).not.toBeNull();
        expect(actual!.body.members.length).toBeGreaterThan(0);
        expect(
          seatedChamberForPack(
            opened.world,
            US_CONGRESS_RULE_PACK.packId,
            chamber.chamberKey,
            chamber.name,
          ),
        ).toEqual(actual);
      }
      expect(opened.world.history).toBe(history);
      const saved = serializeWorld(opened.world);
      const reloaded = deserializeWorld(saved);
      for (const chamber of US_CONGRESS_RULE_PACK.chambers) {
        expect(
          seatedChamberForPack(
            reloaded,
            US_CONGRESS_RULE_PACK.packId,
            chamber.chamberKey,
            chamber.name,
          ),
        ).toEqual(seatedCongressChamber(opened.world, chamber.chamberKey));
      }
      expect(serializeWorld(opened.world)).toBe(saved);
    });

    it("keeps older state packs on their recorded candidacy opening and refuses unseated bodies", () => {
      const base = legislativePackForJurisdiction(opened.stateJurisdictionId);
      if (!base) throw new Error("Sampled place has no legislative pack.");
      const pack = legislativeRulePackForWorld(opened.world, base.packId);
      expect(pack.seatRollSource).toBeUndefined();
      const recorded = stateLegislators(
        opened.world,
        `${pack.packId}:candidacy`,
      );
      expect(recorded.length).toBeGreaterThan(0);
      const unseated = smallWorld({ place, seed });
      for (const chamber of pack.chambers) {
        const seats = seatedChamberForPack(
          opened.world,
          pack.packId,
          chamber.chamberKey,
          chamber.name,
        );
        expect(seats).not.toBeNull();
        const holders = recorded.filter(
          (member) =>
            member.officeKey === `${pack.packId}:${chamber.chamberKey}`,
        );
        expect(
          seats!.body.members.map((member) => member.personId).sort(),
        ).toEqual(holders.map((member) => member.personId).sort());
        expect(
          new Set(seats!.body.members.map((member) => member.personId)).size,
        ).toBe(holders.length);
        for (const holder of holders) {
          expect(
            seats!.body.members.find(
              (member) => member.personId === holder.personId,
            ),
          ).toMatchObject({ partyKey: holder.party });
        }
        expect(
          seatedChamberForPack(
            unseated.world,
            pack.packId,
            chamber.chamberKey,
            chamber.name,
          ),
        ).toBeNull();
      }
      for (const chamber of US_CONGRESS_RULE_PACK.chambers) {
        expect(
          seatedChamberForPack(
            unseated.world,
            US_CONGRESS_RULE_PACK.packId,
            chamber.chamberKey,
            chamber.name,
          ),
        ).toBeNull();
      }
    });

    it("hears a sponsor in the other chamber and preserves supplied-member party precedence", () => {
      const [votingChamber, otherChamber] = US_CONGRESS_RULE_PACK.chamberOrder;
      if (!votingChamber || !otherChamber)
        throw new Error("Two chambers required.");
      const voters = seatedCongressChamber(opened.world, votingChamber)!.body
        .members;
      const other = seatedCongressChamber(opened.world, otherChamber)!.body
        .members;
      const sponsor = other.find(
        (member) => member.personId && member.partyKey,
      );
      const voter = voters.find(
        (member) => member.personId && member.partyKey === sponsor?.partyKey,
      );
      const opposition = voters.find(
        (member) => member.partyKey && member.partyKey !== sponsor?.partyKey,
      );
      if (!sponsor?.personId || !voter?.personId || !opposition?.partyKey) {
        throw new Error(
          "Actual national seats must supply two recorded party cues.",
        );
      }
      const world = introduceMeasure(opened.world, {
        stableKey: "a89:cross-chamber-cue",
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: US_CONGRESS_RULE_PACK.packId,
        designation: "A89 cue fixture bill",
        shortTitle: "An explicit neutral cue question",
        summary:
          "A reader fixture with a real seated sponsor and no policy clauses.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: otherChamber,
        sponsorPersonId: sponsor.personId,
      });
      const measure = world.history.legislativeMeasures!.at(-1)!;
      const question = {
        question: {
          measureId: measure.id,
          purpose: "floor-stage" as const,
          forumKey: votingChamber,
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Support the sponsor's bill?",
      };
      const history = world.history;
      expect(
        decideChamberVote(world, {
          stableKey: "a89:other-chamber-sponsor",
          question,
          members: [voter],
          contested: true,
        }),
      ).toEqual([
        expect.objectContaining({
          personId: voter.personId,
          disposition: "yea",
          reason: "member:party-cue:same",
        }),
      ]);
      // This explicit caller-supplied body tests input precedence only; it
      // does not write a party change or claim a watched political outcome.
      expect(
        decideChamberVote(world, {
          stableKey: "a89:supplied-sponsor-precedence",
          question,
          members: [voter, { ...sponsor, partyKey: opposition.partyKey }],
          only: new Set([voter.memberKey]),
          contested: true,
        }),
      ).toEqual([
        expect.objectContaining({
          personId: voter.personId,
          disposition: "nay",
          reason: "member:party-cue:other",
        }),
      ]);
      expect(world.history).toBe(history);
    });

    it("routes introduced bills by their actual jurisdiction level", () => {
      const statePack = legislativePackForJurisdiction(
        opened.stateJurisdictionId,
      )!;
      const spy = vi.spyOn(congressLawmaking, "presidentDesk");
      try {
        for (const pack of [US_CONGRESS_RULE_PACK, statePack]) {
          const context = legislativeInstitutionContext(pack);
          const blueprint = procedureOnlyBlueprint({
            scenarioKey: `institution:${pack.packId}`,
            pack,
            context,
            governorRationale:
              "Explicit route fixture, no executive disposition supplied.",
          });
          const world = introduceMeasure(opened.world, {
            stableKey: `a89:executive-route:${pack.packId}`,
            jurisdictionId: context.jurisdiction.id,
            rulePackId: pack.packId,
            designation: "A89 route fixture bill",
            shortTitle: "The executive desk route",
            summary: "A supplied fixture for jurisdiction-based dispatch.",
            origin: "member-introduction",
            subjectClass: "general-policy",
          });
          const measure = world.history.legislativeMeasures!.at(-1)!;
          const next = executiveDesk(world, measure, blueprint);
          if (context.jurisdiction.kind === "federal") {
            // The actual desk correctly leaves an introduced bill alone;
            // this proves routing, not passage or a presidential signature.
            expect(spy).toHaveBeenCalledExactlyOnceWith(world, measure);
            expect(next).toBe(world);
            spy.mockClear();
          } else {
            expect(spy).not.toHaveBeenCalled();
            expect(next.history.events.length).toBeGreaterThan(
              world.history.events.length,
            );
            expect(next.history.events.at(-1)!.tags).toContain(
              `measure:${measure.id}`,
            );
          }
        }
      } finally {
        spy.mockRestore();
      }
    });
  },
);

describe("seat source admission", () => {
  it("accepts the declared national source and legacy absence", () => {
    expect(() => assertRulePackIntegrity(US_CONGRESS_RULE_PACK)).not.toThrow();
    const legacy = JSON.parse(JSON.stringify(US_CONGRESS_RULE_PACK));
    delete legacy.seatRollSource;
    expect(() => assertRulePackIntegrity(legacy)).not.toThrow();
  });

  it.each([
    null,
    { kind: "invented-seats", partyCueScope: "institution" },
    { kind: "national-election-seats", partyCueScope: "unrecorded-parties" },
  ])("refuses malformed saved seat source %j", (source) => {
    const pack = JSON.parse(JSON.stringify(US_CONGRESS_RULE_PACK));
    pack.seatRollSource = source;
    expect(() => assertRulePackIntegrity(pack)).toThrow(
      "invalid seat roll source",
    );
  });

  it("returns no seats for an unregistered institution", () => {
    const world = smallWorld({ place: places[0]!.jurisdictionKey, seed }).world;
    expect(
      seatedChamberForPack(
        world,
        "unregistered:institution",
        "house",
        "Unregistered body",
      ),
    ).toBeNull();
  });
});
