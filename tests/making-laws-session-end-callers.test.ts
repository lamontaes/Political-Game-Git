import { afterEach, describe, expect, it, vi } from "vitest";
import { SEED, cases, floorFixture, on } from "./fixtures/seated-floor-session";
import { smallWorld } from "./fixtures/small-world";
import * as clock from "../src/simulation/governing/legislative-clock";
import { applyLegislativeStep } from "../src/presentation/legislation-session";
import {
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../src/simulation/legislation-scenarios";
import {
  measurePosition,
  introduceMeasure,
} from "../src/simulation/legislation";
import { addDays } from "../src/simulation/dates";
import {
  deserializeWorld,
  serializeWorld,
} from "../src/simulation/serialization";
import { dcCouncilSittingHandler } from "../src/simulation/dc-council-sittings";
import {
  ensureDistrictOfColumbiaCouncilOpening,
  DC_GOVERNMENT_KEY,
} from "../src/simulation/nationwide-world/district-of-columbia-council-opening";
import {
  municipalGovernmentByKey,
  municipalRulePackFor,
} from "../src/simulation/municipal-government";
import {
  municipalSeats,
  municipalGovernmentJurisdictionId,
  municipalMeasureKey,
} from "../src/simulation/municipal-public-work";
import { chamberByKey } from "../src/simulation/legislature-rules";
import { nextMeasureNumbering } from "../src/simulation/measure-numbering";

afterEach(() => vi.restoreAllMocks());
function legacyContext(
  fixture: ReturnType<typeof floorFixture>,
): LegislativeProcedureContext {
  const position = measurePosition(fixture.world, fixture.measure.id);
  const chamberKey = position.chamberKey!;
  const stageKey = position.floorStageKey!;
  const bodies = fixture.context.bodies.map((body) => ({
    ...body,
    members: body.members.map((member) => ({ ...member, personId: null })),
  }));
  const body = bodies.find((entry) => entry.chamberKey === chamberKey)!;
  return {
    pack: fixture.pack,
    measureId: fixture.measure.id,
    bodies,
    committeeMemberCount: fixture.context.committeeMemberCount,
    votePlan: {
      [votePlanKeyForFloor(chamberKey, stageKey)]: { yea: body.members.length },
    },
    governorAction: null,
    governorRationale: "Explicit fictional legacy-count control.",
  };
}
function dcFixture() {
  const opening = smallWorld({
    place: "DC",
    seed: `${SEED}:dc`,
    date: "2026-01-05",
  });
  let world = ensureDistrictOfColumbiaCouncilOpening(opening.world);
  const government = municipalGovernmentByKey(DC_GOVERNMENT_KEY)!;
  const rules = municipalRulePackFor(government);
  if (!rules.ok) throw new Error("No actual D.C. council rules");
  const members = municipalSeats(world, DC_GOVERNMENT_KEY);
  expect(members).toHaveLength(13);
  const sponsor = members.find(
    (member) => member.personId !== opening.personId,
  )!;
  const chamber = chamberByKey(rules.pack, "council");
  const jurisdictionId = municipalGovernmentJurisdictionId(
    world,
    DC_GOVERNMENT_KEY,
  )!;
  const numbering = nextMeasureNumbering(world, {
    jurisdictionId,
    rulePackId: rules.pack.packId,
    originChamber: chamber,
  });
  world = introduceMeasure(world, {
    stableKey: municipalMeasureKey(DC_GOVERNMENT_KEY, numbering.designation),
    jurisdictionId,
    rulePackId: rules.pack.packId,
    ...numbering,
    shortTitle: "Meeting records policy",
    summary:
      "Explicit fictional nonplayer D.C. proposal exercises session-guard dispatch.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "council",
    sponsorPersonId: sponsor.personId,
  });
  return {
    world,
    members,
    measure: world.history.legislativeMeasures!.at(-1)!,
  };
}

describe(`Making Laws session-end caller boundaries (seed ${SEED})`, () => {
  describe.each(cases)(
    "$usps actual state with legacy authored caller",
    ({ usps }) => {
      it("keeps the legacy open-session count fallback while invoking the actual shared guard", () => {
        const fixture = floorFixture(usps);
        const spy = vi.spyOn(clock, "applyInstitutionSessionEnd");
        const result = applyLegislativeStep(
          legacyContext(fixture),
          fixture.world,
          "move-floor-vote",
        );
        expect(
          spy.mock.calls.some(
            ([world, measureId]) =>
              world === fixture.world && measureId === fixture.measure.id,
          ),
        ).toBe(true);
        const before = fixture.world.history.legislativeVotes ?? [];
        const added = (result.world.history.legislativeVotes ?? []).slice(
          before.length,
        );
        expect(added).toHaveLength(1);
        expect(added[0]!.forum.kind).toBe("chamber");
        expect(
          added[0]!.dispositions.every(
            (disposition) =>
              disposition.personId === null &&
              disposition.disposition === "yea",
          ),
        ).toBe(true);
        expect(result.world.control).toEqual(fixture.world.control);
        expect(result.world.people).toEqual(fixture.world.people);
      });
      it.each([
        "move-floor-vote",
        "request-referral",
        "move-committee-report",
      ] as const)(
        "guards %s before either legacy fallback or an invalid phase writer",
        (step) => {
          const fixture = floorFixture(usps);
          const closed = on(fixture.world, addDays(fixture.closedOn, 1));
          const spy = vi.spyOn(clock, "applyInstitutionSessionEnd");
          const result = applyLegislativeStep(
            legacyContext(fixture),
            closed,
            step,
          );
          expect(
            spy.mock.calls.some(
              ([world, measureId]) =>
                world === closed && measureId === fixture.measure.id,
            ),
          ).toBe(true);
          expect(result.world.history.legislativeVotes).toEqual(
            closed.history.legislativeVotes,
          );
          expect(result.world.history.committeeReferrals).toEqual(
            closed.history.committeeReferrals,
          );
          const dies = fixture.pack.session.measuresDieAtAdjournment;
          expect(
            measurePosition(result.world, fixture.measure.id).terminal,
          ).toBe(dies.kind === "known" && dies.value);
          const resumed = deserializeWorld(serializeWorld(result.world));
          const repeated = applyLegislativeStep(
            legacyContext(fixture),
            resumed,
            step,
          );
          expect(repeated.world.history.legislativeVotes).toEqual(
            resumed.history.legislativeVotes,
          );
          expect(repeated.world.history.legislativeActions).toEqual(
            resumed.history.legislativeActions,
          );
        },
      );
    },
  );
  it("D.C. invokes the actual open-session guard before advancing its real nonplayer bill", () => {
    const fixture = dcFixture();
    expect(
      clock.applyInstitutionSessionEnd(fixture.world, fixture.measure.id),
    ).toBeNull();
    const spy = vi.spyOn(clock, "applyInstitutionSessionEnd");
    const result = dcCouncilSittingHandler(fixture.world);
    expect(
      spy.mock.calls.some(([, measureId]) => measureId === fixture.measure.id),
    ).toBe(true);
    expect(measurePosition(result.world, fixture.measure.id).phase).toBe(
      "on-floor",
    );
    expect(municipalSeats(result.world, DC_GOVERNMENT_KEY)).toEqual(
      fixture.members,
    );
    expect(
      deserializeWorld(serializeWorld(result.world)).history.legislativeActions,
    ).toEqual(result.world.history.legislativeActions);
  });
  it("HARDWIRED contract control: D.C. honors a fictional blocked guard without attempting referral or reading", () => {
    const fixture = dcFixture();
    // D.C. has no established session cutoff in this fixture. This explicit
    // boundary control proves dispatch only; it is not evidence of a legal end.
    const original = clock.applyInstitutionSessionEnd;
    const spy = vi
      .spyOn(clock, "applyInstitutionSessionEnd")
      .mockImplementation((world, measureId) =>
        measureId === fixture.measure.id
          ? {
              kind: "blocked",
              reason: "Explicit fictional blocked-guard boundary control.",
            }
          : original(world, measureId),
      );
    const result = dcCouncilSittingHandler(fixture.world);
    expect(
      spy.mock.calls.some(([, measureId]) => measureId === fixture.measure.id),
    ).toBe(true);
    expect(measurePosition(result.world, fixture.measure.id)).toEqual(
      measurePosition(fixture.world, fixture.measure.id),
    );
    const actions = (world: typeof fixture.world) =>
      (world.history.legislativeActions ?? []).filter(
        (action) => action.measureId === fixture.measure.id,
      );
    expect(actions(result.world)).toEqual(actions(fixture.world));
    expect(
      (result.world.history.legislativeVotes ?? []).filter(
        (vote) => vote.measureId === fixture.measure.id,
      ),
    ).toHaveLength(0);
    expect(municipalSeats(result.world, DC_GOVERNMENT_KEY)).toEqual(
      fixture.members,
    );
  });
});
