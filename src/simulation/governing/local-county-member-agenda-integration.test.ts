import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { daysBetween, makeIsoDate } from "../dates";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
} from "../government-units";
import type { PrincipleRecordInput } from "../history";
import { measurePosition } from "../legislation";
import { currentMeasureProvisions } from "../legislative-politics";
import { requireLifePlace } from "../life-places";
import {
  LOCAL_ORDINANCE_GAME_PROFILE_VERSION,
  localFiscalGameAuthorityForRulePackId,
} from "../local-ordinance-game-profile";
import { ensureCountyCouncilOpening } from "../municipal-council-opening";
import {
  municipalOrganizationFor,
  municipalSeats,
} from "../municipal-public-work";
import {
  COUNCIL_ACT_HANDLERS,
  COUNCIL_READING_DUE,
} from "../municipal-ordinance-procedure";
import { ensureHomeLocalGovernments } from "../nationwide-world/local-governments";
import { createFormationContext, recordPrinciples } from "../politics";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { IsoDate, World } from "../types";
import { advanceWorld } from "../world";
import {
  LOCAL_MEMBER_AGENDA_HANDLERS,
  LOCAL_MEMBER_AGENDA_INTAKE,
  LOCAL_MEMBER_AGENDA_VERSION,
  scheduleLocalMemberAgendaIntakes,
} from "./member-agenda";

const county = governmentUnit("gus2025:100001")!;
const place = requireLifePlace("county:01001");
const packId = `${county.id}:${LOCAL_ORDINANCE_GAME_PROFILE_VERSION}`;
const scope = localFiscalGameAuthorityForRulePackId(packId)!;
const handlers = createFutureTransitionHandlerRegistry([
  ...LOCAL_MEMBER_AGENDA_HANDLERS,
  ...COUNCIL_ACT_HANDLERS,
]);

function nextQuarterStart(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const next = (Math.floor((month - 1) / 3) + 1) * 3 + 1;
  return makeIsoDate(
    `${next > 12 ? year + 1 : year}-${String(next > 12 ? 1 : next).padStart(2, "0")}-01`,
  );
}

/** Reuse the current Autauga opening's canonical county identity and seats. */
function openedCounty(): World {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "county-member-agenda-autauga",
    placeKey: place.key,
    startAge: 40,
    questionnaire: "skipped",
  });
  let world = ensureHomeLocalGovernments(game.world, game.playerPersonId);
  world = ensureCountyCouncilOpening(world, county.id);
  const seats = municipalSeats(world, county.id).filter(
    (seat) => seat.role === "member" || seat.role === "presiding-member",
  );
  expect(seats).toHaveLength(5);
  // Save one sponsor's reasons for filing. Other members decide their ballots
  // from their own generated principles; the test supplies no vote or result.
  const sponsor = seats[1]!;
  const supporting = ["fiscal-restraint", "environmental-stewardship"].map(
    (key) =>
      Object.values(world.policyCatalog.principles).find(
        (principle) => principle.stableKey === `us-policy-positions:${key}`,
      )!,
  );
  expect(supporting.every(Boolean)).toBe(true);
  const principles: PrincipleRecordInput[] = supporting.map((principle) => ({
    stableKey: `county-agenda-fixture:${sponsor.personId}:${principle.stableKey}`,
    personId: sponsor.personId,
    principleId: principle.id,
    formedAt: world.currentDate,
    stance: "endorses",
    conviction: "settled",
    flexibility: "firm",
    qualification: null,
    formation: createFormationContext("other:drawn-before-play", {
      note: "A county board member's saved reasons for proposing maintenance funding in this fixture.",
    }),
    supersedesPrincipleRecordId: null,
  }));
  world = {
    ...world,
    control: { kind: "person", personId: seats[0]!.personId },
  };
  return recordPrinciples(world, principles);
}

describe("Autauga County's ordinary member agenda", () => {
  it("moves its quarterly fiscal intake through a recorded board decision", () => {
    expect(scope.authority.level).toBe("county");
    expect(scope.jurisdictionId).toBe(governmentUnitJurisdictionId(county));
    expect(place.context.jurisdiction.id).toBe(scope.jurisdictionId);

    const opened = openedCounty();
    const canonical = opened.history.organizations.find(
      (organization) =>
        organization.stableKey === `local-government:${county.id}`,
    )!;
    expect(canonical).toBeDefined();
    expect(municipalOrganizationFor(opened, county.id)?.id).toBe(canonical.id);
    expect(
      opened.history.organizations.some(
        (organization) =>
          organization.stableKey === `municipal-government:${county.id}`,
      ),
    ).toBe(false);

    const scheduled = scheduleLocalMemberAgendaIntakes(opened);
    const dueAt = nextQuarterStart(opened.currentDate);
    const intake = scheduled.history.futureDueItems.find(
      (item) =>
        item.stableKey ===
        `${LOCAL_MEMBER_AGENDA_VERSION}:intake:${encodeURIComponent(county.id)}:${dueAt}`,
    );
    expect(intake).toMatchObject({
      dueAt,
      transitionKey: LOCAL_MEMBER_AGENDA_INTAKE,
      entityIds: [scope.jurisdictionId],
      jurisdictionId: scope.jurisdictionId,
    });
    if (!intake) return;

    let world = advanceWorld(
      scheduled,
      daysBetween(scheduled.currentDate, dueAt),
      handlers,
    );
    expect(
      world.history.futureDueItemStates
        .filter((state) => state.dueItemId === intake.id)
        .at(-1),
    ).toMatchObject({
      status: "resolved",
      context:
        "The local council reached its quarterly game-profile agenda date.",
    });
    const measure = (world.history.legislativeMeasures ?? []).find(
      (entry) =>
        entry.stableKey.startsWith(
          `${LOCAL_MEMBER_AGENDA_VERSION}:${encodeURIComponent(county.id)}:`,
        ) && entry.rulePackId === packId,
    );
    expect(measure).toMatchObject({
      origin: "member-introduction",
      subjectClass: "appropriation",
      jurisdictionId: scope.jurisdictionId,
      rulePackId: packId,
    });
    if (!measure) return;
    const amount = currentMeasureProvisions(world, measure.id).find(
      (provision) => provision.provisionKey === "amount-provided",
    );
    expect(amount?.operativeEffect).toEqual({
      kind: "public-program-appropriation",
    });
    expect(amount?.fiscalExposureMinorUnits).toBeGreaterThan(0);
    expect(
      world.history.legislativeDraftLineages?.find(
        (lineage) => lineage.measureId === measure.id,
      ),
    ).toMatchObject({
      variantKey: "local-fix-it-first-v1",
      authorityKey: scope.authority.authorityKey,
    });

    const reading = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === COUNCIL_READING_DUE &&
        item.entityIds.includes(measure.id),
    );
    expect(reading).toBeDefined();
    if (!reading) return;
    world = advanceWorld(
      world,
      daysBetween(world.currentDate, reading.dueAt),
      handlers,
    );
    const vote = (world.history.legislativeVotes ?? []).find(
      (record) =>
        record.measureId === measure.id &&
        record.purpose === "floor-stage" &&
        record.forum.kind === "chamber",
    );
    expect(vote?.provenance.method).toBe("member-decisions");
    expect(
      vote?.dispositions.some(
        (disposition) =>
          disposition.personId !== null &&
          (disposition.disposition === "yea" ||
            disposition.disposition === "nay") &&
          disposition.reason?.startsWith("member:") === true,
      ),
    ).toBe(true);
    expect(measurePosition(world, measure.id).outcome).toBe(
      vote?.outcome === "passed" ? "enacted" : "failed-on-floor",
    );
    const reloaded = deserializeWorld(serializeWorld(world));
    expect(reloaded.history.legislativeVotes).toEqual(
      world.history.legislativeVotes,
    );
    expect(currentMeasureProvisions(reloaded, measure.id)).toEqual(
      currentMeasureProvisions(world, measure.id),
    );
    expect(measurePosition(reloaded, measure.id)).toEqual(
      measurePosition(world, measure.id),
    );
    expect(municipalOrganizationFor(reloaded, county.id)?.id).toBe(
      canonical.id,
    );
  }, 900_000);
});
