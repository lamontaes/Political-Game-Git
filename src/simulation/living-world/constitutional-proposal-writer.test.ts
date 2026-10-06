import { beforeAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  constitutionalActions,
  constitutionalPosition,
  proposeConstitutionalMeasure,
  type ProposeConstitutionalMeasureInput,
} from "../constitutional-process";
import { addDays, makeIsoDate } from "../dates";
import { currentPresidentOf } from "../crisis/offices";
import { lifePlaceStateIdentities } from "../life-places";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity, createWorld } from "../world";
import * as reform from "./constitutional-reform";
import {
  advanceFederalAmendment,
  FEDERAL_REFORM_PROFILE,
} from "./federal-reform";

const seed = "a86-shared-proposal-20261002";
const places = pickDistinct(new SeededRng(seed), lifePlaceStateIdentities(), 5);
const date = makeIsoDate("2026-10-02");

describe.each(places.map((place) => [place.jurisdictionKey]))(
  `shared amendment proposal in %s (sample seed ${seed})`,
  (place) => {
    let opening: ReturnType<typeof smallWorld>;
    let world: ReturnType<typeof createWorld>;
    beforeAll(() => {
      opening = smallWorld({ place, seed });
      // A fresh dated constructor fixture, with its canonical UTC moment.
      // This does not move an existing save's clock or alter smallWorld.
      world = ensureNationalElectionJurisdiction(
        createWorld({
          seed,
          currentDate: date,
          people: opening.world.personOrder.map(
            (id) => opening.world.people[id]!,
          ),
          jurisdictions: opening.world.jurisdictionOrder.map(
            (id) => opening.world.jurisdictions[id]!,
          ),
          policyCatalog: opening.world.policyCatalog,
        }),
      );
    });

    function input(
      federal: boolean,
    ): Parameters<typeof reform.proposeAmendment>[1] {
      const jurisdiction = federal
        ? NATIONAL_ELECTION_JURISDICTION
        : world.jurisdictions[opening.stateJurisdictionId]!;
      return {
        stableKey: `a86:initial-proposal:${jurisdiction.id}`,
        jurisdictionId: jurisdiction.id,
        jurisdictionKey: federal ? "US" : (place as `US-${string}`),
        processKind: federal ? "federal-amendment" : "state-amendment",
        designation: "An explicitly supplied amendment fixture",
        shortTitle: "Preserve the supplied proposal",
        text: "Explicit fixture text; no substantive rule change is represented.",
        sponsoringAuthority: `The recorded legislature of ${jurisdiction.name}`,
        ratificationMode: federal ? "state-legislatures" : "statewide-electors",
        deadlineAt: federal ? addDays(world.currentDate, 30) : null,
        ruleDelta: {
          kind: "text-only",
          unsupportedEffect: "Fixture has no modeled substantive effect.",
        },
      };
    }

    it.each([false, true])(
      "preserves the canonical saved proposal or refusal (federal=%s)",
      (federal) => {
        const proposed = input(federal);
        const original = serializeWorld(world);
        const explicit: ProposeConstitutionalMeasureInput = {
          ...proposed,
          textVersion: "v1",
          sponsorPersonId: null,
          delayedOperativeAt: null,
          ordinaryMeasureId: null,
        };
        let expected: typeof world;
        try {
          expected = proposeConstitutionalMeasure(world, explicit);
        } catch (error) {
          // An unadmitted sampled state/territory remains refused by the
          // same producer; this is not a positive state-route claim.
          expect(federal).toBe(false);
          expect(error).toBeInstanceOf(Error);
          expect(() => reform.proposeAmendment(world, proposed)).toThrow(
            (error as Error).message,
          );
          expect(serializeWorld(world)).toBe(original);
          return;
        }
        const next = reform.proposeAmendment(world, proposed);
        expect(next.history).toEqual(expected.history);
        const measure = next.history.constitutionalMeasures!.at(-1)!;
        expect(measure).toMatchObject({
          ...explicit,
          introducedAt: world.currentDate,
          provenance: "authored-game-proposal",
        });
        expect(constitutionalPosition(next, measure.id).phase).toBe(
          "consideration",
        );
        expect(
          constitutionalActions(next, measure.id).map((row) => row.detail.kind),
        ).toEqual(["proposed"]);
        assertWorldIntegrity(next);
        expect(deserializeWorld(serializeWorld(next)).history).toEqual(
          next.history,
        );
        expect(serializeWorld(world)).toBe(original);
        expect(() => reform.proposeAmendment(next, proposed)).toThrow(
          "Proposal key already exists",
        );
      },
    );

    it("preserves explicit text version, operative date and convention identity", () => {
      const proposed = {
        ...input(true),
        textVersion: "supplied-v2",
        delayedOperativeAt: addDays(world.currentDate, 20),
        proposedBy: "convention" as const,
      };
      const next = reform.proposeAmendment(world, proposed);
      expect(next.history.constitutionalMeasures!.at(-1)!).toMatchObject({
        ...proposed,
        sponsorPersonId: null,
        ordinaryMeasureId: null,
        proposalRule: { countedAgainst: "members-present" },
      });
      expect(deserializeWorld(serializeWorld(next)).history).toEqual(
        next.history,
      );
    });

    it("retains the canonical authority, date and ordinary-bill refusals", () => {
      const proposed = input(true);
      const original = serializeWorld(world);
      expect(() =>
        reform.proposeAmendment(world, {
          ...proposed,
          textVersion: "",
        }),
      ).toThrow("Proposal identity, authority, version and text are required");
      expect(() =>
        reform.proposeAmendment(world, {
          ...proposed,
          delayedOperativeAt: addDays(world.currentDate, -1),
        }),
      ).toThrow("Proposal date clause precedes proposal");
      expect(() =>
        reform.proposeAmendment(world, {
          ...proposed,
          ordinaryMeasureId: opening.personId,
        }),
      ).toThrow("An ordinary bill is not a constitutional proposal");
      expect(() =>
        reform.proposeAmendment(world, {
          ...proposed,
          sponsorPersonId: opening.personId,
        }),
      ).toThrow(
        "Sponsoring this proposal requires the actual legislative member's office",
      );
      expect(serializeWorld(world)).toBe(original);
    });

    it("routes the actual federal reform proposal through the same writer and retains its replay guard", () => {
      const seated = smallWorld({ place, seed, offices: ["congress"] });
      const at = ensureNationalElectionJurisdiction(seated.world);
      const president = currentPresidentOf(at)!;
      expect(president).toBeDefined();
      const cause = {
        direction: "restore" as const,
        holderPersonId: president.personId,
        value: {
          maxConsecutiveTerms: null,
          maxLifetimeTerms: FEDERAL_REFORM_PROFILE.restoredLimit,
          lookbackYears: null,
        },
        reason:
          "Explicit supplied cause on the actual saved president; not a simulated tenure finding.",
      };
      const spy = vi.spyOn(reform, "proposeAmendment");
      try {
        const next = advanceFederalAmendment(
          at,
          Number(at.currentDate.slice(0, 4)),
          cause,
        );
        expect(spy).toHaveBeenCalledOnce();
        expect(spy.mock.calls[0]![1]).toMatchObject({
          jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
          processKind: "federal-amendment",
          ratificationMode: "state-legislatures",
          ruleDelta: {
            kind: "rule-field",
            field: "executive.term.limit",
            value: cause.value,
            applicability: {
              appliesTo: "terms-beginning-after",
              countsPriorService: false,
            },
          },
        });
        const measure = next.history.constitutionalMeasures!.at(-1)!;
        const votes = constitutionalActions(next, measure.id).filter(
          (row) => row.detail.kind === "proposal-vote",
        );
        expect(votes.length).toBeGreaterThan(0);
        expect(votes.length).toBeLessThanOrEqual(2);
        expect(
          advanceFederalAmendment(
            next,
            Number(at.currentDate.slice(0, 4)),
            cause,
          ),
        ).toBe(next);
        expect(spy).toHaveBeenCalledOnce();
        expect(deserializeWorld(serializeWorld(next)).history).toEqual(
          next.history,
        );
      } finally {
        spy.mockRestore();
      }
    });
  },
);
