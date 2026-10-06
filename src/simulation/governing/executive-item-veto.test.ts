import { describe, expect, it } from "vitest";
import { projectExecutiveBillResults } from "../../presentation/executive-bill-results";
import { executiveBillSceneOffers } from "../../presentation/executive-scene-offers";
import { daysBetween } from "../dates";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import {
  enrollMeasure,
  attemptVetoOverride,
  measureActions,
  measurePosition,
  presentMeasureToExecutive,
  recordEnactment,
  requireMeasure,
  takeFloorVote,
} from "../legislation";
import { bodyForChamber } from "../legislation-scenarios";
import { ensureStateExecutiveIncumbent } from "../nationwide-world/state-executives";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  AUTHORED,
  CHAMBER,
  amend,
  billOnTheFloor,
  everyone,
} from "../vote-bundle.fixture";
import { measureAnswersAt } from "../vote-bundle";
import { advanceWorld, assertWorldIntegrity } from "../world";
import { BILL_RETURN, BILL_SIGN } from "./governor-bill-decision";
import {
  applyItemVetoes,
  executiveItemVetoOptions,
  type ExecutiveItemVetoSelection,
} from "./item-veto";
import {
  legislativeBlueprintForMeasure,
  recordGovernorDecisionOnMeasure,
} from "./legislative-clock";
import {
  decideGoverningMatter,
  executiveDesk,
  governorOfficeForJurisdiction,
  governingMatters,
} from "./state-governing";

function fixture() {
  const setup = billOnTheFloor("appropriation");
  let world = amend(setup, setup.world, "yea");
  const handlers = createFutureTransitionHandlerRegistry([]);
  for (let step = 0; step < 12; step += 1) {
    const position = measurePosition(world, setup.measureId);
    if (position.phase === "awaiting-executive") break;
    if (position.phase === "on-floor") {
      if (
        position.earliestNextFloorDate &&
        position.earliestNextFloorDate > world.currentDate
      )
        world = advanceWorld(
          world,
          daysBetween(world.currentDate, position.earliestNextFloorDate),
          handlers,
        );
      world = takeFloorVote(world, {
        stableKey: `player-item:floor:${step}`,
        measureId: setup.measureId,
        dispositions: everyone(setup, "yea"),
        electedMembers: bodyForChamber(setup.scenario, CHAMBER).members.length,
        provenance: AUTHORED,
      });
    } else if (position.phase === "awaiting-enrollment")
      world = enrollMeasure(world, {
        stableKey: "player-item:enroll",
        measureId: setup.measureId,
      });
    else if (position.phase === "awaiting-presentation")
      world = presentMeasureToExecutive(world, {
        stableKey: "player-item:present",
        measureId: setup.measureId,
      });
    else throw new Error(`Unexpected legislative phase ${position.phase}`);
  }
  expect(measurePosition(world, setup.measureId).phase).toBe(
    "awaiting-executive",
  );
  world = ensureStateExecutiveIncumbent(world, setup.memberId, "NE");
  const office = governorOfficeForJurisdiction(world, "US-NE");
  if (!office) throw new Error("The fixture did not seat its executive.");
  world = {
    ...world,
    control: { kind: "person", personId: office.holderPersonId },
  };
  const measure = requireMeasure(world, setup.measureId);
  world = executiveDesk(
    world,
    measure,
    legislativeBlueprintForMeasure(world, measure),
  );
  const matter = governingMatters(world, office.officeKey).find(
    (entry) => entry.measureId === measure.id,
  );
  const provision = executiveItemVetoOptions(world, measure.id)[0];
  const action = measureActions(world, measure.id).at(-1);
  if (!matter || !provision || !action)
    throw new Error("The presented fixture lacks its matter or item.");
  const selection: ExecutiveItemVetoSelection = {
    matterId: matter.id,
    measureActionSequence: action.sequence,
    provisionIds: [provision.id],
  };
  return { setup, world, office, matter, selection };
}

describe("a player's item veto through the shared executive decision", () => {
  it("keeps the pure scene packet and forecast separate from actual override votes and outcome", () => {
    const { setup, world, office, matter } = fixture();
    const saved = serializeWorld(world);
    const projected = projectExecutiveBillResults(
      world,
      office.holderPersonId,
    )[0]!;
    expect(projected.overrideVotes).toEqual([]);
    expect(projected.overrideActions).toEqual([]);
    const packet = executiveBillSceneOffers(world, office.holderPersonId)[0]!;
    expect(packet.sourceEventId).toBe(matter.openedEvent.id);
    expect(packet.authorityRecordId).toBe(office.termId);
    expect(packet.recordedPresenceEventId).toBeNull();
    expect(packet.presentPersonIds).toEqual([]);
    expect(packet.actions.map((action) => action.optionKey)).toEqual([
      BILL_SIGN,
      BILL_RETURN,
    ]);
    expect(serializeWorld(world)).toBe(saved);
    const veto = decideGoverningMatter(world, matter.id, BILL_RETURN);
    if (!veto.ok) throw new Error(veto.reason);
    const overridden = attemptVetoOverride(veto.world, {
      stableKey: "player-item:actual-override",
      measureId: setup.measureId,
      forums: [
        {
          forumKey: CHAMBER,
          dispositions: everyone(setup, "yea"),
          electedMembers: bodyForChamber(setup.scenario, CHAMBER).members
            .length,
        },
      ],
      rationale: "Supplied actual seated-member override votes.",
      provenance: AUTHORED,
    });
    const result = projectExecutiveBillResults(
      overridden,
      office.holderPersonId,
    )[0]!;
    expect(result.overrideForecast).toBeNull();
    expect(result.overrideVotes).toHaveLength(1);
    expect(result.overrideVotes[0]!.outcome).toBe("passed");
    expect(result.overrideActions.at(-1)!.kind).toBe("override-succeeded");
    expect(
      projectExecutiveBillResults(
        deserializeWorld(serializeWorld(overridden)),
        office.holderPersonId,
      ),
    ).toEqual(projectExecutiveBillResults(overridden, office.holderPersonId));
  });
  it("records the chosen item with its signature, excludes it from enacted law, and preserves both on reload", () => {
    const { setup, world, office, matter, selection } = fixture();
    const result = decideGoverningMatter(
      world,
      matter.id,
      BILL_SIGN,
      undefined,
      selection,
    );
    if (!result.ok) throw new Error(result.reason);
    expect(result.world.history.itemVetoes).toHaveLength(1);
    const strike = result.world.history.itemVetoes![0]!;
    expect(strike.provisionId).toBe(selection.provisionIds[0]);
    expect(strike.actorPersonId).toBe(office.holderPersonId);
    expect(strike.executiveDispositionId).toBe(
      result.world.history.executiveDispositions!.at(-1)!.id,
    );
    const enacted = recordEnactment(result.world, {
      stableKey: "player-item:enact",
      measureId: setup.measureId,
    });
    assertWorldIntegrity(enacted);
    expect(measureAnswersAt(enacted, setup.measureId)).toEqual([
      { propositionId: setup.transitId, answer: "yes" },
    ]);
    const restored = deserializeWorld(serializeWorld(enacted));
    expect(restored.history.itemVetoes).toEqual(enacted.history.itemVetoes);
    expect(measureAnswersAt(restored, setup.measureId)).toEqual(
      measureAnswersAt(enacted, setup.measureId),
    );
    expect(
      applyItemVetoes(
        restored,
        setup.measureId,
        office.holderPersonId,
        selection,
      ),
    ).toBe(restored);
    expect(
      decideGoverningMatter(
        restored,
        matter.id,
        BILL_SIGN,
        undefined,
        selection,
      ).world,
    ).toBe(restored);
  });

  it("refuses stale, duplicate, foreign and wrong-decision selections without recording anything", () => {
    const { world, matter, selection, office } = fixture();
    const invalid = [
      {
        ...selection,
        measureActionSequence: selection.measureActionSequence - 1,
      },
      {
        ...selection,
        provisionIds: [...selection.provisionIds, ...selection.provisionIds],
      },
      { ...selection, provisionIds: [office.holderPersonId] },
      { ...selection, matterId: office.holderPersonId },
    ];
    for (const input of invalid) {
      const result = decideGoverningMatter(
        world,
        matter.id,
        BILL_SIGN,
        undefined,
        input,
      );
      expect(result.ok).toBe(false);
      expect(result.world).toBe(world);
    }
    const returned = decideGoverningMatter(
      world,
      matter.id,
      BILL_RETURN,
      undefined,
      selection,
    );
    expect(returned.ok).toBe(false);
    expect(returned.world).toBe(world);
  });

  it("cannot append a player strike to a signature without the matching recorded item choice", () => {
    const { setup, world, office, matter, selection } = fixture();
    const signed = recordGovernorDecisionOnMeasure(
      world,
      setup.measureId,
      "signed",
      "Authored signature without an item decision.",
      office.holderPersonId,
    );
    expect(
      applyItemVetoes(
        signed,
        setup.measureId,
        office.holderPersonId,
        selection,
      ),
    ).toBe(signed);
    const ordinary = decideGoverningMatter(world, matter.id, BILL_SIGN);
    if (!ordinary.ok) throw new Error(ordinary.reason);
    expect(ordinary.world.history.itemVetoes ?? []).toHaveLength(0);
    expect(
      applyItemVetoes(
        ordinary.world,
        setup.measureId,
        office.holderPersonId,
        selection,
      ),
    ).toBe(ordinary.world);
  });
});
