import { afterEach, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { createFormationContext, recordPrinciples } from "../politics";
import { legislativePackForJurisdiction } from "../legislative-institutions";
import { stateJurisdictionForKey } from "../life-places";
import { legislativeWorkKey } from "../legislative-work-key";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import {
  automaticLawMappingFor,
  compileAutomaticLawDraft,
  type AutomaticLawCompileContext,
} from "./automatic-legislation";
import * as lawQuery from "./law-in-force";
import { deserializeWorld, serializeWorld } from "../serialization";

const seed = "a20-federal-mapping-20261002";
const place = drawRandomPlace(seed, (candidate) => {
  const jurisdiction = candidate.stateJurisdictionKey
    ? stateJurisdictionForKey(candidate.stateJurisdictionKey)
    : null;
  return (
    jurisdiction !== null &&
    legislativePackForJurisdiction(jurisdiction.id) !== null
  );
});
const questionKey =
  "us-federal-positions:transport-water.expand-passenger-rail";

function fixture() {
  const small = smallWorld({ place: place.key, seed, date: "2026-01-05" });
  const question = Object.values(small.world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!;
  const world = recordPrinciples(
    small.world,
    question.principles!.map((bearing) => ({
      stableKey: `a20:federal-mapping:${bearing.principleId}`,
      personId: small.personId,
      principleId: bearing.principleId,
      formedAt: small.world.currentDate,
      stance:
        bearing.bearing === "consistent-with"
          ? ("endorses" as const)
          : ("rejects" as const),
      strength: 4,
      conviction: "settled" as const,
      flexibility: "firm" as const,
      qualification: null,
      formation: createFormationContext("experience:life", {
        note: "Controlled support for federal mapping guard.",
      }),
      supersedesPrincipleRecordId: null,
    })),
  );
  const jurisdictionId = NATIONAL_ELECTION_JURISDICTION.id;
  const pack = legislativePackForJurisdiction(jurisdictionId)!;
  const mapping = automaticLawMappingFor(questionKey, "yes", "federal")!;
  const context: AutomaticLawCompileContext = {
    governmentLevel: "federal",
    jurisdictionId,
    rulePackId: pack.packId,
    scenarioKey: legislativeWorkKey(pack),
    predicateAuthority: {
      kind: "game-profile",
      authorityKey: mapping.authorityKey!,
      authorityVersion: "fixture/v1",
      profileVersion: "fixture/v1",
      rulePackId: pack.packId,
      governmentLevel: "federal",
      publicGovernmentIdentity: { kind: "jurisdiction", jurisdictionId },
      permittedEffects: [mapping.operativeEffectKind],
      citationLabel: "Controlled federal authority",
      programLabel: "Controlled federal service",
      authorizedCeilingMinorUnits: null,
      currency: "USD",
      basis: "game-profile",
    },
  };
  const input = {
    world,
    jurisdictionId,
    propositionId: question.id,
    answer: "yes" as const,
    designation: "Controlled federal bill",
    intakeKey: "a20:federal-mapping",
    sponsorPersonId: small.personId,
    governmentLevel: "federal" as const,
  };
  return { input, context, small };
}

afterEach(() => vi.restoreAllMocks());
describe(`federal mapping in ${place.displayName}, seed ${seed}`, () => {
  it("admits the canonical federal tuple through automatic and supplied contexts", () => {
    const { input, context } = fixture();
    const query = vi.spyOn(lawQuery, "lawInForce").mockReturnValue(null);
    // Admission reaches the existing recorded-law guard; no baseline means no invented draft.
    expect(compileAutomaticLawDraft(input)).toBeNull();
    expect(query).toHaveBeenCalledWith(
      input.world,
      input.jurisdictionId,
      input.propositionId,
    );
    query.mockClear();
    expect(compileAutomaticLawDraft({ ...input, context })).toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("rejects a state pack, wrong pack id and mismatched federal jurisdiction before reading law", () => {
    const { input, context, small } = fixture();
    const statePack = legislativePackForJurisdiction(
      small.stateJurisdictionId,
    )!;
    const query = vi.spyOn(lawQuery, "lawInForce").mockReturnValue(null);
    for (const invalid of [
      {
        ...context,
        scenarioKey: legislativeWorkKey(statePack),
        rulePackId: statePack.packId,
      },
      { ...context, rulePackId: "fixture:unknown-pack" },
      { ...context, jurisdictionId: small.stateJurisdictionId },
    ])
      expect(
        compileAutomaticLawDraft({ ...input, context: invalid }),
      ).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
  it("retains admission and missing-law refusal after Save/Continue", () => {
    const { input } = fixture();
    const query = vi.spyOn(lawQuery, "lawInForce").mockReturnValue(null);
    const world = deserializeWorld(serializeWorld(input.world));
    expect(compileAutomaticLawDraft({ ...input, world })).toBeNull();
    expect(query).toHaveBeenCalledWith(
      world,
      input.jurisdictionId,
      input.propositionId,
    );
  });
  it.todo(
    "plays an enacted federal reference bill through sponsor compilation and filing using admitted numeric terms",
  );
});
