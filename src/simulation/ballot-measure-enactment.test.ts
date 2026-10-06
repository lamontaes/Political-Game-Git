import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { municipalGovernmentForLifePlace } from "./municipal-government";
import { installMunicipalGovernment } from "./municipal-public-work";
import { isEligibleVoterIn } from "./issue-record";
import { createFormationContext, recordPrivateBelief } from "./politics";
import {
  askToSign,
  citizenPetitions,
  petitionRule,
  recallPetitionClosesHandler,
  startCitizenPetition,
} from "./recall";
import {
  ordinaryBallotMeasures,
  proposeConstitutionalMeasure,
} from "./constitutional-process";
import { simulationMomentOnLocalDate } from "./dates";
import { setFutureDueItemTerminalState } from "./future-transitions";
import { nextTownElection } from "./nationwide-world/town-election-calendar";
import { deserializeWorld, serializeWorldPayload } from "./serialization";
import { lawInForce } from "./governing/law-in-force";
import {
  constitutionalReformBallotHandler,
  citizenMeasureChangeBackRule,
  citizenMeasureChangeBackAdmission,
  recordedBallotTally,
  referOrdinaryBallotMeasure,
} from "./living-world/constitutional-reform";
import type { EntityId, World } from "./types";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./nationwide-world/state-executive-candidacy-packs";

const seed = "session-110-ballot-measure-referral";
const place = drawRandomPlace(seed, (row) => {
  const government = municipalGovernmentForLifePlace(row);
  return (
    !!government &&
    !!nextTownElection(government.state, row.key, "2026-01-01") &&
    petitionRule("local-initiative", government.state, {
      governmentKey: government.key,
    }).available
  );
});
function view(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  support: boolean,
  key: string,
) {
  const prior = world.history.privateBeliefs
    .filter(
      (row) => row.personId === personId && row.propositionId === propositionId,
    )
    .at(-1);
  return recordPrivateBelief(world, {
    stableKey: key,
    personId,
    propositionId,
    formedAt: world.currentDate,
    position: support ? "support" : "oppose",
    conviction: "strong",
    salience: "central",
    flexibility: "firm",
    rationale: support
      ? "The resident supports the proposition's recorded terms."
      : "The resident opposes the proposition's recorded terms.",
    formation: createFormationContext("reflection:initial"),
    supersedesBeliefId: prior?.id ?? null,
  });
}
function fixture() {
  const small = smallWorld({
    place: place.key,
    seed,
    people: 12,
    household: true,
  });
  const government = municipalGovernmentForLifePlace(place)!;
  let world = installMunicipalGovernment(small.world, {
    governmentKey: government.key,
    jurisdictionId: small.jurisdictionId,
    formedAt: small.world.currentDate,
  });
  const adults = world.personOrder.filter((id) =>
    isEligibleVoterIn(world, id, small.jurisdictionId, world.currentDate),
  );
  world = { ...world, control: { kind: "person", personId: adults[0]! } };
  const propositionId = Object.values(world.policyCatalog.propositions).find(
    (row) =>
      world.policyCatalog.issues[row.issueId]?.levels?.includes("municipality"),
  )!.id;
  world = startCitizenPetition(world, {
    kind: "local-initiative",
    petitionerPersonId: adults[0]!,
    jurisdictionId: small.jurisdictionId,
    stateUsps: government.state,
    governmentKey: government.key,
    propositionId,
  });
  const petition = citizenPetitions(world)[0]!;
  for (const id of adults.slice(1)) {
    world = view(world, id, propositionId, true, `petition-support:${id}`);
    world = askToSign(world, {
      petition,
      signerPersonId: id,
      circulatorPersonId: adults[0]!,
    });
  }
  const closes = world.history.futureDueItems.find(
    (row) => row.stableKey === `${petition.stableKey}:closes`,
  )!;
  world = {
    ...world,
    currentDate: petition.closesAt,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      petition.closesAt,
    ),
  };
  const closed = recallPetitionClosesHandler(world, closes);
  world = setFutureDueItemTerminalState(closed.world, {
    stableKey: `${closes.stableKey}:resolved`,
    dueItemId: closes.id,
    effectiveAt: closes.dueAt,
    status: closed.status,
    reasonKey: closed.reasonKey,
    context: closed.context,
    outcomeEventId: closed.outcomeEventId,
  });
  expect(citizenPetitions(world)[0]!.phase).toBe("awaiting-election");
  world = referOrdinaryBallotMeasure(world, {
    stableKey: `ballot-measure:${petition.stableKey}`,
    processKind: "ordinance",
    jurisdictionId: small.jurisdictionId,
    governmentKey: government.key,
    designation: "Resident proposal",
    shortTitle: "Recorded town policy",
    text: "The town adopts the recorded proposition as stated.",
    textVersion: "v1",
    propositionId,
    stance: "adopt",
    source: { kind: "qualified-petition", petitionKey: petition.stableKey },
  });
  const measure = ordinaryBallotMeasures(world)[0]!;
  const due = world.history.futureDueItems.find((row) =>
    row.stableKey.startsWith(`${measure.stableKey}:ballot:`),
  )!;
  return { world, measure, due, adults, government };
}
describe("ordinary ballot measures share the recorded electorate and referral calendar", () => {
  it("returns nonblank change-back terms for both measure forms in all 56 places", () => {
    expect(CHIEF_EXECUTIVE_JURISDICTIONS).toHaveLength(56);
    for (const state of CHIEF_EXECUTIVE_JURISDICTIONS)
      for (const kind of ["ordinance", "statute"] as const) {
        const row = citizenMeasureChangeBackRule(state, kind);
        expect(row.reason.trim()).not.toBe("");
        expect(row.sources.length).toBeGreaterThan(0);
        if (row.basis === "estimated-from-average")
          expect(row.reason).toContain("ESTIMATED FROM AVERAGE");
      }
  });
  it("distinguishes protected legislative amendment from repeal and voter change", () => {
    const rule = citizenMeasureChangeBackRule("WA", "statute");
    const request = {
      rule,
      enactedAt: "2026-11-03",
      changeAt: "2027-11-03",
      authority: "legislature",
      change: "amend",
    } as const;
    expect(citizenMeasureChangeBackAdmission(request).requiredShare).toEqual({
      numerator: 2,
      denominator: 3,
      base: "all-elected-members-per-house",
    });
    const refused = citizenMeasureChangeBackAdmission({
      ...request,
      change: "repeal",
    });
    expect(refused.allowed).toBe(false);
    expect(refused.reason).toContain("may not repeal");
    expect(
      citizenMeasureChangeBackAdmission({
        ...request,
        change: "repeal",
        authority: "voters",
      }).allowed,
    ).toBe(true);
    expect(
      citizenMeasureChangeBackAdmission({
        ...request,
        change: "repeal",
        changeAt: "2028-11-03",
      }).requiredShare,
    ).toBeNull();
  });
  it("refuses an uncertified source or a local petition presented as a statute", () => {
    const f = fixture();
    expect(() =>
      proposeConstitutionalMeasure(f.world, {
        ...f.measure,
        stableKey: "uncertified-referral",
        source: { kind: "qualified-petition", petitionKey: "missing-petition" },
      }),
    ).toThrow("certified petition");
    expect(() =>
      proposeConstitutionalMeasure(f.world, {
        ...f.measure,
        stableKey: "wrong-form-referral",
        processKind: "statute",
      }),
    ).toThrow("certified petition");
  });
  it("retains certified text and the next lawful town election through reload", () => {
    const f = fixture();
    expect(f.due.dueAt).toBe(
      nextTownElection(f.government.state, place.key, f.measure.referredAt)!
        .electionDate,
    );
    const loaded = deserializeWorld(serializeWorldPayload(f.world));
    expect(ordinaryBallotMeasures(loaded)).toEqual(
      ordinaryBallotMeasures(f.world),
    );
    expect(f.measure.text).toBe(
      "The town adopts the recorded proposition as stated.",
    );
    const tally = recordedBallotTally(loaded, f.measure)!;
    expect(tally.yes).toBe(f.adults.length - 1);
    expect(tally.recordedBallots.map((row) => row.personId).sort()).toEqual(
      f.adults.slice(1).sort(),
    );
    expect(
      tally.recordedBallots.every((row) =>
        loaded.history.privateBeliefs.some(
          (belief) =>
            belief.id === row.beliefId && belief.personId === row.personId,
        ),
      ),
    ).toBe(true);
  });
  it("does not count or enact a measure before its scheduled election", () => {
    const f = fixture();
    const result = constitutionalReformBallotHandler(f.world, f.due);
    expect(result.reasonKey).toBe("ballot:not-election-day");
    expect(result.world).toBe(f.world);
  });
  it("a failing named electorate changes no law", () => {
    const f = fixture();
    let world = {
      ...f.world,
      currentDate: f.due.dueAt,
      currentMoment: simulationMomentOnLocalDate(
        f.world.currentMoment,
        f.due.dueAt,
      ),
    };
    for (const id of f.adults.slice(1))
      world = view(
        world,
        id,
        f.measure.propositionId,
        false,
        `ballot-opposition:${id}`,
      );
    const before = lawInForce(
      world,
      f.measure.jurisdictionId,
      f.measure.propositionId,
    );
    const result = constitutionalReformBallotHandler(world, f.due);
    expect(result.status).toBe("resolved");
    expect(result.world.history.events.at(-1)!.type).toBe(
      "civic.ballot-measure-rejected",
    );
    expect(
      lawInForce(
        result.world,
        f.measure.jurisdictionId,
        f.measure.propositionId,
      ),
    ).toEqual(before);
    expect(result.world.history.legislativeEnactments).toEqual(
      world.history.legislativeEnactments,
    );
  });
  it("keeps passing text unenacted until the canonical law writer is integrated", () => {
    const f = fixture();
    const world = {
      ...f.world,
      currentDate: f.due.dueAt,
      currentMoment: simulationMomentOnLocalDate(
        f.world.currentMoment,
        f.due.dueAt,
      ),
    };
    const result = constitutionalReformBallotHandler(world, f.due);
    expect(result.reasonKey).toBe("ballot:canonical-enactment-writer-pending");
    expect(result.world).toBe(world);
  });
});
