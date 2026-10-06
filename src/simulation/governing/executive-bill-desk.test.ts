import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { applyLegislativeStep } from "../../presentation/legislation-session";
import { projectGoverningBriefing } from "../../presentation/governing-briefing";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import { currentPresidentOf } from "../crisis/offices";
import {
  availableMeasureSteps,
  introduceMeasure,
  requireMeasure,
} from "../legislation";
import {
  votePlanKeyForCommittee,
  votePlanKeyForFloor,
  type LegislativeProcedureContext,
} from "../legislation-scenarios";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../national-election-geography";
import { seatedCongressChamber } from "./congress-chambers";
import { openPresidentBillMatter } from "./state-governing";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  councilActHandlers,
  COUNCIL_ACT_EXECUTIVE_DEADLINE,
} from "../municipal-ordinance-procedure";
import { recordedCouncilBillPreview } from "../../../tests/fixtures/session23-executive-bill";
import { DC_GOVERNMENT_KEY } from "../nationwide-world/district-of-columbia-council-opening";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "../nationwide-world/state-executive-candidacy-packs";
import { SeededRng } from "../rng";
import { addDays, daysBetween } from "../dates";
import {
  measureActions,
  measureEnactment,
  measurePosition,
} from "../legislation";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import { municipalOrdinanceStatus } from "../municipal-ordinance-procedure";
import { executiveBillChamber } from "./executive-bill-roster";
import {
  BILL_SIGN,
  BILL_RETURN,
  executiveBillActionWindow,
  overrideCount,
} from "./governor-bill-decision";
import {
  decideGoverningMatter,
  governingMatters,
  openMunicipalBillMatter,
  stateGoverningHandlers,
} from "./state-governing";

const seed = "session23-part2-shared-council-bill-2026-10-06";
const home =
  CHIEF_EXECUTIVE_JURISDICTIONS[
    new SeededRng(seed).integer(0, CHIEF_EXECUTIVE_JURISDICTIONS.length)
  ]!;
function fixture() {
  return recordedCouncilBillPreview(
    smallWorld({ place: home, people: 4, seed }).world,
    seed,
  );
}

describe(`shared executive bill desk (random home ${home}, sourced council procedure)`, () => {
  it("opens one bound bill matter with the actual roster and sourced action window", () => {
    const { world, measure } = fixture();
    const matter = governingMatters(world).find(
      (entry) => entry.measureId === measure.id,
    )!;
    expect(matter).toMatchObject({
      family: "bill",
      status: "open",
      holderPersonId:
        world.control.kind === "person" ? world.control.personId : null,
    });
    expect(matter.options.map((option) => option.key)).toEqual([
      BILL_SIGN,
      BILL_RETURN,
    ]);
    expect(openMunicipalBillMatter(world, measure, DC_GOVERNMENT_KEY)).toBe(
      world,
    );
    expect(openMunicipalBillMatter(world, measure, "not-this-government")).toBe(
      world,
    );
    const presented = measureActions(world, measure.id).find(
      (action) => action.kind === "presented-to-executive",
    )!;
    expect(matter.openedEvent.tags).toContain(
      `source-event:${presented.eventId}`,
    );
    const chamber = executiveBillChamber(world, measure.rulePackId, "council")!;
    expect(chamber.seats).toBe(13);
    expect(chamber.body.members).toHaveLength(13);
    expect(
      overrideCount(world, measure, matter.holderPersonId)?.forums,
    ).toMatchObject([{ forumKey: "council", required: 1 }]);
    const window = executiveBillActionWindow(world, measure)!;
    expect(
      daysBetween(presented.occurredAt, window.lastActionDate),
    ).toBeGreaterThan(10);
    expect(
      municipalOrdinanceStatus(world, DC_GOVERNMENT_KEY, measure.id)
        ?.executiveActsBy,
    ).toBe(window.lastActionDate);
  });

  it.each([BILL_SIGN, BILL_RETURN])(
    "saves %s through the shared matter and one canonical executive action",
    (choice) => {
      const { world, measure } = fixture();
      const matter = governingMatters(world).find(
        (entry) => entry.measureId === measure.id,
      )!;
      const result = decideGoverningMatter(
        world,
        matter.id,
        choice,
        "Recorded executive reasons for this act.",
      );
      if (!result.ok) throw new Error(result.reason);
      const saved = deserializeWorld(serializeWorld(result.world));
      const action = measureActions(saved, measure.id).find(
        (entry) => entry.kind === (choice === BILL_SIGN ? "signed" : "vetoed"),
      )!;
      expect(
        saved.history.events
          .find((event) => event.id === action.eventId)
          ?.participants.some(
            (participant) => participant.personId === matter.holderPersonId,
          ),
      ).toBe(true);
      expect(action.rationale).toBe("Recorded executive reasons for this act.");
      expect(
        governingMatters(saved).find((entry) => entry.id === matter.id)?.status,
      ).toBe("decided");
      expect(measurePosition(saved, measure.id).phase).toBe(
        choice === BILL_SIGN ? "enacted" : "awaiting-override",
      );
      if (choice === BILL_SIGN) {
        expect(measureEnactment(saved, measure.id)).not.toBeNull();
        expect(
          daysBetween(
            saved.currentDate,
            measureEnactment(saved, measure.id)!.effectiveAt!,
          ),
        ).toBeGreaterThan(30);
      }
      const again = decideGoverningMatter(saved, matter.id, choice);
      expect(again.ok).toBe(false);
      expect(again.world).toBe(saved);
      expect(
        measureActions(saved, measure.id).filter(
          (entry) => entry.kind === "signed" || entry.kind === "vetoed",
        ),
      ).toHaveLength(1);
    },
  );

  it("keeps the final action day open, then uses the same unsigned enactment deadline after reload", () => {
    const { world, measure } = fixture();
    const window = executiveBillActionWindow(world, measure)!;
    const handlers = createFutureTransitionHandlerRegistry(
      stateGoverningHandlers(),
    );
    const lastDay = advanceWorld(
      world,
      daysBetween(world.currentDate, window.lastActionDate),
      handlers,
    );
    expect(measurePosition(lastDay, measure.id).phase).toBe(
      "awaiting-executive",
    );
    const reopened = deserializeWorld(serializeWorld(lastDay));
    const closed = advanceWorld(lastDay, 1, handlers);
    expect(advanceWorld(reopened, 1, handlers)).toEqual(closed);
    expect(closed.currentDate).toBe(addDays(window.lastActionDate, 1));
    expect(
      measureActions(closed, measure.id).filter(
        (entry) => entry.kind === "became-law-without-signature",
      ),
    ).toHaveLength(1);
    expect(measureEnactment(closed, measure.id)).not.toBeNull();
    expect(
      governingMatters(closed).find((entry) => entry.measureId === measure.id)
        ?.status,
    ).toBe("lapsed");
    expect(
      advanceWorld(closed, 1, handlers).history.legislativeEnactments,
    ).toEqual(closed.history.legislativeEnactments);
  });
});

it("presents a Congress bill to the actual President in the same briefing without a supplied executive decision", () => {
  let world = smallWorld({
    place: home,
    seed: `${seed}:federal`,
    offices: ["congress"],
  }).world;
  world = ensureNationalElectionJurisdiction(world);
  const president = currentPresidentOf(world)!;
  expect(president).not.toBeNull();
  world = {
    ...world,
    control: { kind: "person", personId: president.personId },
  };
  const pack = US_CONGRESS_RULE_PACK;
  const bodies = pack.chambers.map(
    (chamber) => seatedCongressChamber(world, chamber.chamberKey)!.body,
  );
  const sponsor = bodies
    .find((body) => body.chamberKey === "house")!
    .members.find((member) => member.personId)!;
  world = introduceMeasure(world, {
    stableKey: `${seed}:federal-bill`,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: pack.packId,
    designation: "H.R. Shared desk fixture",
    shortTitle: "Shared President bill desk",
    summary:
      "Supplied committee and floor roll calls isolate the actual President's pending desk matter.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: sponsor.personId,
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  const votePlan: Record<string, { yea: number }> = {};
  for (const chamber of pack.chambers) {
    const body = bodies.find((body) => body.chamberKey === chamber.chamberKey)!;
    for (const committee of chamber.committees)
      votePlan[votePlanKeyForCommittee(committee.committeeKey)] = {
        yea: Math.min(body.members.length, committee.appointedMembers),
      };
    for (const stage of chamber.floorStages)
      votePlan[votePlanKeyForFloor(chamber.chamberKey, stage.stageKey)] = {
        yea: body.members.length,
      };
  }
  const context: LegislativeProcedureContext = {
    pack,
    measureId,
    bodies,
    committeeMemberCount: null,
    votePlan,
    governorAction: null,
    governorRationale: "The real President has not decided.",
  };
  for (let guard = 0; guard < 40; guard += 1) {
    if (measurePosition(world, measureId).phase === "awaiting-executive") break;
    const step = availableMeasureSteps(world, measureId).find(
      (step) => step !== "offer-amendment",
    );
    if (!step) throw new Error("No canonical next Congress step.");
    world = applyLegislativeStep(context, world, step).world;
  }
  expect(measurePosition(world, measureId).phase).toBe("awaiting-executive");
  const measure = requireMeasure(world, measureId);
  const pending = openPresidentBillMatter(world, measure);
  const matter = governingMatters(pending).find(
    (entry) => entry.measureId === measureId,
  )!;
  expect(matter).toMatchObject({
    family: "bill",
    holderPersonId: president.personId,
    status: "open",
    decision: null,
  });
  const briefing = projectGoverningBriefing(pending, president.personId)!;
  expect(
    [...briefing.significant, ...briefing.more]
      .find((entry) => entry.id === matter.id)
      ?.options.map((option) => option.key),
  ).toEqual([BILL_SIGN, BILL_RETURN]);
  expect(executiveBillActionWindow(pending, measure)).not.toBeNull();
  expect(
    measureActions(pending, measureId).some(
      (action) => action.kind === "presented-to-executive",
    ),
  ).toBe(true);
  expect(
    (pending.history.legislativeVotes ?? []).filter(
      (vote) => vote.measureId === measureId,
    ).length,
  ).toBeGreaterThan(1);
  expect(
    (pending.history.executiveDispositions ?? []).filter(
      (entry) => entry.measureId === measureId,
    ),
  ).toHaveLength(0);
  expect(openPresidentBillMatter(pending, measure)).toBe(pending);
  const choice = decideGoverningMatter(pending, matter.id, BILL_SIGN);
  if (!choice.ok) throw new Error(choice.reason);
  expect(measurePosition(choice.world, measureId).phase).toBe(
    "awaiting-enactment",
  );
  expect(
    governingMatters(deserializeWorld(serializeWorld(choice.world))).find(
      (entry) => entry.id === matter.id,
    )?.status,
  ).toBe("decided");
});

it("adapts a saved council deadline to one shared matter using the measure's real pack identity", () => {
  const setup = recordedCouncilBillPreview(
    smallWorld({ place: home, seed: `${seed}:legacy`, people: 4 }).world,
    `${seed}:legacy`,
    { openDesk: false },
  );
  expect(
    governingMatters(setup.world).some(
      (matter) => matter.measureId === setup.measure.id,
    ),
  ).toBe(false);
  const window = executiveBillActionWindow(setup.world, setup.measure)!;
  const legacy = scheduleFutureDueItem(setup.world, {
    stableKey: `${setup.measure.stableKey}:executive-deadline`,
    dueAt: window.inactionAt,
    transitionKey: COUNCIL_ACT_EXECUTIVE_DEADLINE,
    entityIds: [setup.measure.id],
    jurisdictionId: setup.measure.jurisdictionId,
    provenance: {
      kind: "authored",
      note: "Existing save's canonical council deadline.",
    },
  });
  const restored = deserializeWorld(serializeWorld(legacy));
  const closed = advanceWorld(
    restored,
    daysBetween(restored.currentDate, window.inactionAt),
    createFutureTransitionHandlerRegistry([
      ...stateGoverningHandlers(),
      ...councilActHandlers(),
    ]),
  );
  expect(
    governingMatters(closed).filter(
      (matter) => matter.measureId === setup.measure.id,
    ),
  ).toHaveLength(1);
  expect(
    governingMatters(closed).find(
      (matter) => matter.measureId === setup.measure.id,
    )?.status,
  ).toBe("lapsed");
  expect(
    measureActions(closed, setup.measure.id).filter(
      (action) => action.kind === "became-law-without-signature",
    ),
  ).toHaveLength(1);
  expect(closed.history.legislativeMeasures).toEqual(
    legacy.history.legislativeMeasures,
  );
});
