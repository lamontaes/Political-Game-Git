import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  advanceWorld,
  assertWorldIntegrity,
  createScenarioWorld,
  createFutureTransitionHandlerRegistry,
  deserializeWorld,
  measurePosition,
  serializeWorld,
} from "../simulation";
import { requireLifePlace } from "../simulation/life-places";
import { municipalGovernmentForLifePlace } from "../simulation/municipal-government";
import {
  installMunicipalGovernment,
  seatMunicipalMember,
} from "../simulation/municipal-public-work";
import {
  COUNCIL_READING_DUE,
  municipalReadingQuestion,
} from "../simulation/municipal-ordinance-procedure";
import { memberBallotOn } from "../simulation/governing/member-ballots";
import { MunicipalWorkspace } from "../player/MunicipalWorkspace";
import {
  introduceProjectedOrdinance,
  placeProjectedOrdinanceOnAgenda,
  previewAuthoredCouncilBallots,
  projectMunicipalGoverning,
  saveProjectedOrdinanceBallot,
  takeProjectedOrdinanceVote,
} from "./municipal-governing";

function seatedCharlottesville() {
  const place = requireLifePlace("5114968");
  const government = municipalGovernmentForLifePlace(place)!;
  let world = createScenarioWorld(
    "ordinary-council-ballot-persistence",
    place.context,
    {
      peopleCount: 12,
    },
  );
  world = installMunicipalGovernment(world, {
    governmentKey: government.key,
    jurisdictionId: place.context.jurisdiction.id,
    formedAt: world.currentDate,
  });
  for (let index = 0; index < 5; index += 1)
    world = seatMunicipalMember(world, {
      governmentKey: government.key,
      personId: world.personOrder[index]!,
      startedAt: world.currentDate,
      role: index === 0 ? "presiding-member" : "member",
      seatLabel: index === 0 ? "Mayor" : `Seat ${index + 1}`,
    });
  const personId = world.personOrder[0]!;
  world = { ...world, control: { kind: "person", personId } };
  return { world, governmentKey: government.key, personId };
}

describe("ordinary council ballot projection", () => {
  it("schedules the reading, saves a chosen ballot across reload, and uses member decisions for direct passage", () => {
    const seat = seatedCharlottesville();
    const introduced = introduceProjectedOrdinance(
      seat.world,
      seat.governmentKey,
      "Ord. 26-1",
      "Sidewalk dining permits",
    );
    if (!introduced.ok) throw new Error(introduced.reason);
    const measureId = introduced.world.history.legislativeMeasures!.at(-1)!.id;
    const placed = placeProjectedOrdinanceOnAgenda(
      introduced.world,
      seat.governmentKey,
      measureId,
    );
    if (!placed.ok) throw new Error(placed.reason);
    const due = placed.world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === COUNCIL_READING_DUE &&
        item.entityIds.includes(measureId),
    );
    expect(due).toBeDefined();
    const before = projectMunicipalGoverning(placed.world, seat.governmentKey)!;
    expect(before.ordinances[0]).toMatchObject({
      measureId,
      savedBallot: null,
      scheduledReadingOn: due?.dueAt,
    });
    const beforeScreen = renderToStaticMarkup(
      createElement(MunicipalWorkspace, {
        world: placed.world,
        onWorldChange: () => {},
      }),
    );
    expect(beforeScreen).toContain("Choose a ballot to record your decision");
    expect(beforeScreen).toContain("municipal-reading-due");
    const preview = previewAuthoredCouncilBallots(
      placed.world,
      seat.governmentKey,
      measureId,
      "nay",
    )!;
    expect(preview.method).toBe("member-decisions");
    expect(
      preview.dispositions.find((entry) => entry.personId === seat.personId),
    ).toMatchObject({ disposition: "nay", reason: "member:own-ballot" });
    expect(placed.world.history.legislativeVotes ?? []).toHaveLength(0);

    const chosen = saveProjectedOrdinanceBallot(
      placed.world,
      seat.governmentKey,
      measureId,
      "nay",
    );
    if (!chosen.ok) throw new Error(chosen.reason);
    const saved = deserializeWorld(serializeWorld(chosen.world));
    const question = municipalReadingQuestion(
      saved,
      seat.governmentKey,
      measureId,
    )!;
    expect(memberBallotOn(saved, seat.personId, question)).toBe("nay");
    expect(
      projectMunicipalGoverning(saved, seat.governmentKey)!.ordinances[0]
        ?.savedBallot,
    ).toBe("nay");
    const savedScreen = renderToStaticMarkup(
      createElement(MunicipalWorkspace, {
        world: saved,
        onWorldChange: () => {},
      }),
    );
    expect(savedScreen).toContain("municipal-saved-ballot");
    expect(savedScreen).toContain("Saved ballot: Nay");
    expect(
      saveProjectedOrdinanceBallot(saved, seat.governmentKey, measureId, "nay")
        .world,
    ).toBe(saved);
    const tooSoon = takeProjectedOrdinanceVote(
      saved,
      seat.governmentKey,
      measureId,
      "nay",
    );
    expect(tooSoon.ok).toBe(false);
    expect(tooSoon.world).toBe(saved);

    // Hold the automatic reading in this direct-vote fixture. The scheduled
    // handler's own passage is covered by the simulation procedure suite.
    const ready = advanceWorld(
      saved,
      4,
      createFutureTransitionHandlerRegistry([
        [
          COUNCIL_READING_DUE,
          (atDate) => ({
            world: atDate,
            status: "blocked" as const,
            reasonKey: "test:direct-vote-fixture",
            context: "Held for the direct council-vote action test.",
            outcomeEventId: null,
          }),
        ],
      ]),
    );
    const taken = takeProjectedOrdinanceVote(
      ready,
      seat.governmentKey,
      measureId,
      "nay",
    );
    if (!taken.ok) throw new Error(taken.reason);
    expect(taken.world.history.legislativeVotes!.at(-1)).toMatchObject({
      measureId,
      provenance: { method: "member-decisions" },
    });
    expect(
      taken.world.history
        .legislativeVotes!.at(-1)!
        .dispositions.find((entry) => entry.personId === seat.personId),
    ).toMatchObject({ disposition: "nay", reason: "member:own-ballot" });
    expect(measurePosition(taken.world, measureId).terminal).toBe(true);
    assertWorldIntegrity(deserializeWorld(serializeWorld(taken.world)));
  });
});
